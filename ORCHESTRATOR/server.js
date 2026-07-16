'use strict';

// ai-flow · Orchestrator — daemon local.
// Serve o dashboard (public/) + API JSON + stream SSE de atualizações.
// Observa MAPS/ e faz push pro browser quando um PLAN muda (near-live).
// Zero dependências: só a stdlib do Node.
//
//   node server.js            # porta padrão 4319
//   PORT=5000 node server.js  # porta custom

const http = require('http');
const fs = require('fs');
const path = require('path');
const { scanAll, MAPS_DIR, AI_FLOW_ROOT } = require('./lib/scanner');
const usage = require('./lib/usage');

const PORT = Number(process.env.PORT || 4319);
const PUBLIC_DIR = path.join(__dirname, 'public');

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

// ---- cache do snapshot + rescan debounced ----
let snapshotCache = null;
let scanning = false;
let rescanTimer = null;

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

// Custo & uso (/usage) de uma feature: agrega as sessões do Claude Code envolvidas.
// Fonte primária: os session_ids capturados pelos hooks (agentRuns). Fallback (após
// restart do daemon, quando o buffer de runs esvazia): varre os transcripts em disco
// e casa o cwd de cada sessão ao slug do projeto via resolveSlug.
function usageForSlug(slug) {
  let sessionIds = [
    ...new Set(
      [...agentRuns.values()]
        .filter((r) => r.slug === slug && r.runId && r.runId !== 'unknown')
        .map((r) => r.runId)
    ),
  ];
  let inferred = false;
  if (!sessionIds.length) {
    inferred = true;
    sessionIds = usage
      .listAllSessions()
      .filter((s) => (s.cwds || [s.cwd]).some((c) => resolveSlug(c, null) === slug))
      .slice(0, 12) // teto de segurança
      .map((s) => s.sessionId);
  }
  const data = usage.featureUsage(sessionIds);
  data.inferred = inferred;
  data.slug = slug;
  return data;
}

// Resolve o slug do projeto a partir do cwd do evento, cruzando com os paths dos
// repositórios de cada projeto. Robusto a subdiretórios (ex.: {repo}/backend) e a
// git worktrees (ex.: {repo}-worktrees/feature-x). Sem isso, um dev-senior rodando
// em {projeto}/backend viraria slug="backend" e o evento seria descartado no filtro.
function resolveSlug(cwd, fallback) {
  if (!cwd || !snapshotCache) return fallback;
  let best = fallback;
  let bestLen = -1;
  for (const proj of snapshotCache.projects) {
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

async function rescan(reason) {
  if (scanning) return;
  scanning = true;
  try {
    snapshotCache = await scanAll();
    snapshotCache.reason = reason || 'manual';
    broadcast('snapshot', { generatedAt: snapshotCache.generatedAt, reason: snapshotCache.reason });
  } catch (e) {
    console.error('[rescan] erro:', e);
  } finally {
    scanning = false;
  }
}

function scheduleRescan(reason) {
  clearTimeout(rescanTimer);
  rescanTimer = setTimeout(() => rescan(reason), 400); // debounce
}

// ---- file watcher em MAPS/ ----
function startWatcher() {
  if (!fs.existsSync(MAPS_DIR)) {
    console.warn('[watch] MAPS não encontrado em', MAPS_DIR);
    return;
  }
  try {
    fs.watch(MAPS_DIR, { recursive: true }, (evt, file) => {
      if (!file) return;
      // reage a PLANs e maps; ignora ruído
      if (/\.md$/.test(file) || /-map\.json$/.test(file)) {
        scheduleRescan(`fs:${path.basename(file)}`);
      }
    });
    console.log('[watch] observando', MAPS_DIR, '(recursivo)');
  } catch (e) {
    console.warn('[watch] recursivo indisponível, usando polling 5s:', e.message);
    setInterval(() => scheduleRescan('poll'), 5000);
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
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  // Ingestão de eventos ao vivo (hooks do Claude Code postam aqui) — Camada 2b.
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
      // log de depuração: prova que um hook chegou (ver events.log)
      const line = `[${new Date(evt.receivedAt).toISOString()}] ${evt.event || '?'} agent=${evt.agent || '?'} slug=${evt.slug || '?'} desc=${evt.description || ''}`;
      console.log('[event]', line);
      try {
        fs.appendFileSync(path.join(__dirname, 'events.log'), line + '\n');
      } catch {}
      pushEvent(evt); // guarda no buffer para reenvio
      const run = upsertRun(evt); // correlaciona no registro do agente
      broadcast('agent', evt); // evento cru (log ao vivo)
      broadcast('run', run); // run consolidado (tarefa/resultado/timeline)
      sendJSON(res, 200, { ok: true });
    });
    return;
  }

  if (url === '/api/snapshot') {
    if (!snapshotCache) await rescan('first');
    return sendJSON(res, 200, { ...snapshotCache, recentEvents, agentRuns: recentRuns() });
  }

  if (url === '/api/usage') {
    const q = new URL(req.url, 'http://localhost');
    const slug = q.searchParams.get('slug');
    if (!slug) return sendJSON(res, 400, { error: 'slug obrigatório' });
    if (!snapshotCache) await rescan('first');
    try {
      return sendJSON(res, 200, usageForSlug(slug));
    } catch (e) {
      console.error('[usage] erro:', e);
      return sendJSON(res, 500, { error: String(e) });
    }
  }

  if (url === '/api/rescan') {
    await rescan('manual');
    return sendJSON(res, 200, { ok: true, generatedAt: snapshotCache.generatedAt });
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
  rescan('boot');
  startWatcher();
});
