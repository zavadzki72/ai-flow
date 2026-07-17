'use strict';

// ai-flow · Orchestrator — daemon local.
// Dashboard "por terminal": cada sessão do Claude Code é um terminal, e a partir
// dele desce a escadinha Terminal → Agentes → sub-Agentes, com custo em cada nível.
// Fonte de verdade da árvore + custo = os transcripts em disco (lib/usage.js);
// overlay ao vivo = os hooks do Claude Code (POST /api/events → SSE).
// Zero dependências: só a stdlib do Node.
//
//   node server.js            # porta padrão 4319
//   PORT=5000 node server.js  # porta custom

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanAll, AI_FLOW_ROOT } = require('./lib/scanner');
const usage = require('./lib/usage');

const PORT = Number(process.env.PORT || 4319);
const PUBLIC_DIR = path.join(__dirname, 'public');
const LIVE_WINDOW_MS = 10 * 60 * 1000; // "ativo" = atividade nos últimos 10 min

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ---- SSE: clientes conectados ----
const clients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

// ---- registro de projetos (só p/ rotular terminal→projeto via cwd) ----
let registry = { projects: [], root: AI_FLOW_ROOT };
function refreshRegistry() {
  try {
    registry = scanAll();
  } catch (e) {
    console.error('[registry] erro:', e);
  }
}

// ---- cache de árvore por sessão (invalidado pelo mtime do transcript) ----
const treeCache = new Map(); // sessionId -> { mtime, tree }
function treeForSession(sessionId, mtime) {
  const c = treeCache.get(sessionId);
  if (c && c.mtime === mtime) return c.tree;
  const tree = usage.sessionTree(sessionId);
  treeCache.set(sessionId, { mtime, tree });
  if (treeCache.size > 400) treeCache.delete(treeCache.keys().next().value);
  return tree;
}

// buffer dos últimos eventos de agente (para reenviar a quem abre/reconecta o dashboard)
const recentEvents = [];
function pushEvent(evt) {
  recentEvents.unshift(evt);
  if (recentEvents.length > 200) recentEvents.length = 200;
}

// "runs" de agente: correlaciona início↔fim num registro rico (tarefa, timeline, resultado, log).
const agentRuns = new Map(); // id -> run
function runKey(evt) {
  return evt.toolUseId || `${evt.runId}:${evt.agent}:${evt.description || evt.task || ''}`;
}
function upsertRun(evt) {
  const id = runKey(evt);
  let run = agentRuns.get(id);
  if (!run) {
    run = {
      id,
      runId: evt.runId,
      slug: evt.slug,
      agent: evt.agent,
      task: evt.task,
      description: evt.description,
      status: 'running',
      startedAt: null,
      endedAt: null,
      result: null,
      log: [],
    };
    agentRuns.set(id, run);
    // poda: mantém no máx. 200 runs (remove o mais antigo)
    if (agentRuns.size > 200) agentRuns.delete(agentRuns.keys().next().value);
  }
  run.slug = evt.slug || run.slug;
  run.agent = evt.agent || run.agent;
  // mantém a tarefa mais rica (o prompt completo do Pre; o Post costuma trazer só a descrição curta)
  if (evt.task && evt.task.length > (run.task || '').length) run.task = evt.task;
  if (evt.description) run.description = evt.description;
  run.log.push({ event: evt.event, status: evt.status, toolName: evt.toolName || null, ts: evt.ts });
  if (evt.status === 'started') {
    if (run.status !== 'done') run.status = 'running';
    if (!run.startedAt) run.startedAt = evt.ts;
  }
  if (evt.status === 'finished') {
    run.status = 'done';
    run.endedAt = evt.ts;
    if (evt.result) run.result = evt.result;
  }
  return run;
}
function recentRuns() {
  return [...agentRuns.values()].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)).slice(0, 80);
}

// ---- sinais "ao vivo" derivados dos hooks ----
// sessões (terminais) com agente rodando agora
function liveSessionIds() {
  const now = Date.now();
  const ids = new Set();
  for (const r of agentRuns.values()) {
    if (r.status === 'running' && r.runId && r.runId !== 'unknown' && (!r.startedAt || now - r.startedAt < LIVE_WINDOW_MS)) {
      ids.add(r.runId);
    }
  }
  return ids;
}
// toolUseIds de agentes rodando agora (p/ acender o nó certo na árvore)
function runningToolUseIds() {
  const now = Date.now();
  const set = new Set();
  for (const r of agentRuns.values()) {
    if (r.status === 'running' && (!r.startedAt || now - r.startedAt < LIVE_WINDOW_MS)) set.add(r.id);
  }
  return set;
}

// Resolve o slug do projeto a partir do cwd, cruzando com os paths dos repositórios.
// Robusto a subdiretórios (ex.: {repo}/backend) e a git worktrees ({repo}-worktrees/x).
function resolveSlug(cwd, fallback) {
  if (!cwd) return fallback;
  let best = fallback;
  let bestLen = -1;
  for (const proj of registry.projects) {
    for (const repo of proj.repositories || []) {
      if (!repo.path) continue;
      const base = repo.path.replace(/\/+$/, '');
      const dir = base.split('/').pop();
      const hit =
        cwd === base ||
        cwd.startsWith(base + '/') ||
        cwd.includes('/' + dir + '/') ||
        cwd.includes('/' + dir + '-worktrees/') ||
        cwd.endsWith('/' + dir);
      if (hit && base.length > bestLen) {
        best = proj.slug;
        bestLen = base.length;
      }
    }
  }
  return best;
}

// ---- lista de terminais (resumos) ----
function listTerminals(sinceMs) {
  const now = Date.now();
  const live = liveSessionIds();
  const out = [];
  for (const s of usage.listAllSessions()) {
    const isLive = live.has(s.sessionId) || now - s.mtime < LIVE_WINDOW_MS;
    if (sinceMs && s.mtime < sinceMs && !isLive) continue; // fora da janela (vivos sempre entram)
    const tree = treeForSession(s.sessionId, s.mtime);
    if (!tree.found) continue;
    const cwd = tree.cwd || s.cwd || null;
    out.push({
      sessionId: s.sessionId,
      slug: resolveSlug(cwd, null),
      cwd,
      title: tree.title,
      branch: tree.branch,
      model: tree.model,
      totalCostUSD: tree.totalCostUSD,
      totalTokens: tree.totalTokens,
      ownCostUSD: tree.own.costUSD,
      agentCount: tree.agentCount,
      startedAt: tree.startedAt,
      endedAt: tree.endedAt,
      durationMs: tree.durationMs,
      mtime: s.mtime,
      live: isLive,
      resumeCommand: tree.resumeCommand,
    });
  }
  out.sort((a, b) => Number(b.live) - Number(a.live) || b.mtime - a.mtime);
  return out;
}

// árvore de um terminal + overlay ao vivo por toolUseId
function terminalTree(sessionId) {
  const sessions = usage.listAllSessions();
  const s = sessions.find((x) => x.sessionId === sessionId);
  const mtime = s ? s.mtime : 0;
  const tree = usage.sessionTree(sessionId); // sempre fresco no detalhe (barato p/ 1 sessão)
  treeCache.set(sessionId, { mtime, tree });
  if (!tree.found) return tree;
  const running = runningToolUseIds();
  const walk = (n) => {
    n.live = running.has(n.id) || (n.toolUseId ? running.has(n.toolUseId) : false);
    n.children.forEach(walk);
  };
  tree.agents.forEach(walk);
  tree.cwd = tree.cwd || (s && s.cwd) || null;
  tree.slug = resolveSlug(tree.cwd, null);
  tree.live = liveSessionIds().has(sessionId) || (mtime > 0 && Date.now() - mtime < LIVE_WINDOW_MS);
  return tree;
}

// ---- watcher dos transcripts → push "terminals" (near-live sem hooks) ----
let termTimer = null;
function scheduleTerminalsPush(reason) {
  clearTimeout(termTimer);
  termTimer = setTimeout(() => broadcast('terminals', { reason, ts: Date.now() }), 600);
}
function transcriptRoots() {
  const home = os.homedir();
  return [path.join(home, '.claude-personal', 'projects'), path.join(home, '.claude', 'projects')].filter((p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
}
function startWatcher() {
  const roots = transcriptRoots();
  if (!roots.length) {
    console.warn('[watch] nenhum root de transcript encontrado');
    return;
  }
  for (const root of roots) {
    try {
      fs.watch(root, { recursive: true }, (_evt, file) => {
        if (file && /\.jsonl$/.test(String(file))) scheduleTerminalsPush(`fs:${path.basename(String(file))}`);
      });
      console.log('[watch] observando', root, '(recursivo)');
    } catch (e) {
      console.warn('[watch] recursivo indisponível em', root, '— poll 5s:', e.message);
      setInterval(() => scheduleTerminalsPush('poll'), 5000);
    }
  }
}

// ---- helpers HTTP ----
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---- servidor ----
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // Ingestão de eventos ao vivo (hooks do Claude Code postam aqui).
  if (url === '/api/events' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let evt = {};
      try {
        evt = JSON.parse(body || '{}');
      } catch {}
      evt.receivedAt = Date.now();
      // corrige o slug pelo cwd (o dev roda em subdir/worktree; o notify.js só chuta o último segmento)
      evt.slug = resolveSlug(evt.cwd, evt.slug);
      const line = `[${new Date(evt.receivedAt).toISOString()}] ${evt.event || '?'} agent=${evt.agent || '?'} slug=${evt.slug || '?'} desc=${evt.description || ''}`;
      console.log('[event]', line);
      try {
        fs.appendFileSync(path.join(__dirname, 'events.log'), line + '\n');
      } catch {}
      pushEvent(evt);
      const run = upsertRun(evt);
      broadcast('agent', evt); // evento cru (log ao vivo)
      broadcast('run', run); // run consolidado (tarefa/resultado/timeline)
      broadcast('terminals', { reason: 'event', ts: evt.receivedAt }); // pisca a lista
      sendJSON(res, 200, { ok: true });
    });
    return;
  }

  if (url === '/api/terminals') {
    const q = new URL(req.url, 'http://localhost');
    const since = Number(q.searchParams.get('since') || 0) || 0;
    try {
      return sendJSON(res, 200, {
        generatedAt: Date.now(),
        root: registry.root,
        projects: registry.projects.map((p) => ({ slug: p.slug, name: p.name })),
        terminals: listTerminals(since),
        recentEvents,
        agentRuns: recentRuns(),
      });
    } catch (e) {
      console.error('[terminals] erro:', e);
      return sendJSON(res, 500, { error: String(e) });
    }
  }

  if (url === '/api/terminal') {
    const q = new URL(req.url, 'http://localhost');
    const session = q.searchParams.get('session');
    if (!session) return sendJSON(res, 400, { error: 'session obrigatório' });
    try {
      return sendJSON(res, 200, terminalTree(session));
    } catch (e) {
      console.error('[terminal] erro:', e);
      return sendJSON(res, 500, { error: String(e) });
    }
  }

  if (url === '/api/rescan') {
    refreshRegistry();
    treeCache.clear();
    broadcast('terminals', { reason: 'manual', ts: Date.now() });
    return sendJSON(res, 200, { ok: true, generatedAt: Date.now() });
  }

  if (url === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`retry: 3000\n\n`);
    res.write(`event: hello\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    // reenvia os runs consolidados + eventos recentes para o cliente que acabou de abrir
    for (const run of recentRuns().slice().reverse()) {
      res.write(`event: run\ndata: ${JSON.stringify(run)}\n\n`);
    }
    for (const evt of recentEvents.slice().reverse()) {
      res.write(`event: agent\ndata: ${JSON.stringify(evt)}\n\n`);
    }
    clients.add(res);
    const ping = setInterval(() => {
      try {
        res.write(`event: ping\ndata: {}\n\n`);
      } catch {}
    }, 20000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  ai-flow · Orchestrator`);
  console.log(`  ▸ http://localhost:${PORT}`);
  console.log(`  ▸ raiz: ${AI_FLOW_ROOT}`);
  refreshRegistry();
  setInterval(refreshRegistry, 60000); // registro de projetos muda pouco
  startWatcher();
});
