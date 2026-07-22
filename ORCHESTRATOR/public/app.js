'use strict';

// ai-flow · Orchestrator — dashboard "por terminal".
// Visual portado do protótipo Claude Design (Orchestrator.dc.html):
// home = KPIs + feed ao vivo + cards de terminal; página do terminal com
// prompts/escadinha/timeline + sidebar sticky; modal rico por nó de agente.

// ---------- estado ----------
const state = {
  view: { type: 'list' }, // {type:'list'} | {type:'terminal', sessionId}
  terminals: [],           // resumos (/api/terminals)
  projects: [],            // {slug,name} p/ o filtro
  trees: {},               // sessionId -> árvore completa (/api/terminal), lazy
  loading: {},             // sessionId -> true enquanto busca a árvore
  expanded: new Set(),     // terminais abertos
  // filtros
  q: '',
  projectSlug: '',
  status: 'todos',         // todos | ativos | encerrados
  period: '7d',            // hoje | 7d | 30d | tudo
  sort: 'recent',          // recent | cost | name
  // ao vivo
  agentRuns: {},           // runs de hook por id (task/resultado/log)
  liveEvents: [],
  modal: null,             // {type:'run',id} | {type:'node',sessionId,nodeId}
};

// papel do agente → código de duas/três letras + cor (tiles do design)
const ROLE = {
  terminal:            { code: 'SH',  c: '#aab1bd' },
  'product-manager':   { code: 'PM',  c: '#d9a441' },
  'arquiteto-senior':  { code: 'ARQ', c: '#a78bfa' },
  'dev-senior':        { code: 'DEV', c: '#6aa8f5' },
  'tech-lead':         { code: 'TL',  c: '#56c7d6' },
  'engineering-manager': { code: 'EM', c: '#d98d5f' },
  qa:                  { code: 'QA',  c: '#e8809b' },
  'general-purpose':   { code: 'GP',  c: '#9aa4b2' },
  'claude-code-guide': { code: 'DOC', c: '#c9b458' },
  Explore:             { code: 'EXP', c: '#4fd0a8' },
  Plan:                { code: 'PLN', c: '#8390f0' },
};
function tileOf(role) {
  const r = ROLE[role];
  if (r) return r;
  const code = String(role || 'AGT').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'AGT';
  return { code, c: '#9aa4b2' };
}
function tileHTML(role, size) {
  const t = tileOf(role);
  return `<span class="tile ${size || 'md'}" style="background:color-mix(in srgb,${t.c} 15%,transparent);border-color:color-mix(in srgb,${t.c} 34%,transparent);color:${t.c}">${t.code}</span>`;
}

const PERIODS = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'tudo', label: 'Tudo' },
];
const STATUS = [
  { key: 'todos', icon: '≡', label: 'Todos' },
  { key: 'ativos', icon: '⣷', label: 'Ativos' },
  { key: 'encerrados', icon: '○', label: 'Encerrados' },
];

const el = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- formatadores ----------
function fmtAge(ts) {
  if (!ts) return '—';
  const min = (Date.now() - ts) / 60000;
  if (min < 1) return 'agora';
  if (min < 60) return `${Math.round(min)}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}
function fmtDuration(ms) {
  if (ms == null || ms < 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`;
}
function fmtClock(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
function fmtUSD(n) {
  if (n == null) return '—';
  if (n === 0) return '$0';
  if (n < 0.01) return '$' + n.toFixed(4);
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtTok(n) {
  if (n == null) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}
function tokTotal(t) {
  if (!t) return 0;
  if (typeof t === 'number') return t;
  return (t.input || 0) + (t.output || 0) + (t.cacheWrite5m || 0) + (t.cacheWrite1h || 0) + (t.cacheRead || 0);
}
function shortCwd(cwd) {
  if (!cwd) return '';
  const home = cwd.replace(/^\/Users\/[^/]+/, '~').replace(/^[A-Za-z]:[\\/]Users[\\/][^\\/]+/, '~');
  const parts = home.split(/[\\/]/).filter(Boolean);
  return parts.length > 3 ? '…/' + parts.slice(-2).join('/') : home;
}
function projLabel(t) {
  if (t.slug) return t.slug;
  if (!t.cwd) return null;
  const p = t.cwd.replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean);
  return p[p.length - 1] || null;
}
function termTitle(t) {
  return t.title || shortCwd(t.cwd) || ('Terminal ' + (t.sessionId || '').slice(0, 8));
}

// ---------- janela de tempo ----------
function sinceMs() {
  const now = Date.now();
  if (state.period === 'tudo') return 0;
  if (state.period === 'hoje') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (state.period === '30d') return now - 30 * 864e5;
  return now - 7 * 864e5;
}

// ---------- fetch ----------
async function fetchTerminals() {
  try {
    const r = await fetch('/api/terminals?since=' + sinceMs());
    const d = await r.json();
    state.terminals = d.terminals || [];
    state.projects = d.projects || [];
    if (d.root) el('rootPath').textContent = d.root;
    if (d.agentRuns) for (const run of d.agentRuns) state.agentRuns[run.id] = { ...state.agentRuns[run.id], ...run };
    render();
  } catch (e) {
    console.error('terminals falhou', e);
  }
}

async function loadTree(sessionId) {
  state.loading[sessionId] = true;
  try {
    const r = await fetch('/api/terminal?session=' + encodeURIComponent(sessionId));
    state.trees[sessionId] = await r.json();
  } catch (e) {
    state.trees[sessionId] = { found: false, error: String(e) };
  }
  state.loading[sessionId] = false;
  render();
}

// ---------- SSE ----------
let refetchTimer = null;
function scheduleRefetch() {
  clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    // não atualiza enquanto a busca está focada (não interromper a digitação)
    const fi = el('filterInput');
    if (fi && document.activeElement === fi) return scheduleRefetch();
    fetchTerminals();
    // reatualiza árvores abertas de terminais vivos (custo ao vivo)
    for (const sid of state.expanded) {
      const t = state.terminals.find((x) => x.sessionId === sid);
      if (t && t.live) loadTree(sid);
    }
    // a página exclusiva do terminal também precisa da árvore fresca (status/custo ao vivo)
    if (state.view.type === 'terminal') {
      const sid = state.view.sessionId;
      const t = state.terminals.find((x) => x.sessionId === sid);
      if (!t || t.live) loadTree(sid);
    }
  }, 1500);
}
function connectStream() {
  const es = new EventSource('/api/stream');
  const conn = el('conn');
  es.addEventListener('hello', () => {
    conn.classList.add('live');
    el('connLabel').textContent = 'ao vivo';
  });
  es.addEventListener('terminals', () => scheduleRefetch());
  es.addEventListener('agent', (e) => {
    try {
      const evt = JSON.parse(e.data);
      state.liveEvents.unshift(evt);
      state.liveEvents = state.liveEvents.slice(0, 100);
    } catch {}
  });
  es.addEventListener('run', (e) => {
    try {
      const run = JSON.parse(e.data);
      state.agentRuns[run.id] = { ...state.agentRuns[run.id], ...run };
      if (state.view.type === 'list' && !state.modal) render();
    } catch {}
  });
  es.onerror = () => {
    conn.classList.remove('live');
    el('connLabel').textContent = 'reconectando…';
  };
}

// ---------- runs de hook ----------
function allRuns() {
  return Object.values(state.agentRuns).filter((r) => !r._usageOnly && (r.agent || r.task || r.description) && r.startedAt);
}
function runningRuns() {
  const now = Date.now();
  return allRuns()
    .filter((r) => r.status === 'running' && now - r.startedAt < 15 * 60000)
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}
// um run de hook só conta como "rodando" enquanto é plausível: eventos de término
// podem se perder (fire-and-forget), então run velho demais é tratado como encerrado
function runLooksRunning(r) {
  return r.status === 'running' && Date.now() - (r.startedAt || 0) < 15 * 60000;
}

// feed "ao vivo": runs recentes (rodando primeiro, depois os últimos concluídos)
function feedRuns() {
  const now = Date.now();
  return allRuns()
    .filter((r) => now - (r.endedAt || r.startedAt) < 60 * 60000)
    .sort((a, b) => {
      const ra = runLooksRunning(a) ? 1 : 0;
      const rb = runLooksRunning(b) ? 1 : 0;
      if (ra !== rb) return rb - ra;
      return (b.endedAt || b.startedAt || 0) - (a.endedAt || a.startedAt || 0);
    })
    .slice(0, 12);
}

// status de um nó da escadinha. Nenhum dos dois sinais é confiável sozinho:
// - o "done" do hook mente para agentes em background (PostToolUse dispara no lançamento);
// - o "running" do hook mente quando o evento de término se perde (fire-and-forget).
// Regra: transcript escrito há <2 min = rodando (agente ativo escreve o tempo todo);
// o "running" do hook só vale na janela de subida (<3 min), quando o transcript
// ainda não existe. Fora disso, transcript parado = concluído.
function nodeStatus(node, terminalLive) {
  if (!terminalLive) return 'done';
  const now = Date.now();
  if (node.endedAt && now - node.endedAt < 2 * 60000) return 'running';
  const hookRun = node.toolUseId ? state.agentRuns[node.toolUseId] : null;
  if (hookRun && hookRun.status === 'running' && now - (hookRun.startedAt || 0) < 3 * 60000) return 'running';
  return 'done';
}

// resultado pode ter sido gravado como objeto/array de blocos por versões antigas do notify.js
function resText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(resText).filter(Boolean).join('\n');
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text;
    if (v.content != null) return resText(v.content);
    return JSON.stringify(v, null, 2);
  }
  return String(v);
}

// ---------- filtro/ordenação da lista de terminais ----------
function visibleTerminals() {
  let ts = state.terminals.slice();
  if (state.status === 'ativos') ts = ts.filter((t) => t.live);
  else if (state.status === 'encerrados') ts = ts.filter((t) => !t.live);
  if (state.projectSlug) ts = ts.filter((t) => (t.slug || '—') === state.projectSlug);
  const q = state.q.trim().toLowerCase();
  if (q) ts = ts.filter((t) => [termTitle(t), t.slug, t.cwd, t.sessionId, t.model].some((s) => (s || '').toLowerCase().includes(q)));
  const cmp = {
    recent: (a, b) => (b.mtime || 0) - (a.mtime || 0),
    cost: (a, b) => (b.totalCostUSD || 0) - (a.totalCostUSD || 0),
    name: (a, b) => (a.slug || 'zzz').localeCompare(b.slug || 'zzz'),
  }[state.sort];
  // vivos sempre no topo, depois o critério escolhido
  return ts.sort((a, b) => Number(b.live) - Number(a.live) || cmp(a, b));
}
function statusCounts() {
  return {
    todos: state.terminals.length,
    ativos: state.terminals.filter((t) => t.live).length,
    encerrados: state.terminals.filter((t) => !t.live).length,
  };
}
function allSlugs() {
  const set = new Set();
  for (const t of state.terminals) set.add(t.slug || '—');
  return [...set].sort((a, b) => (a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b)));
}

// ---------- componentes ----------
function badgeHTML(live, lg) {
  return `<span class="badge ${live ? 'active' : ''} ${lg ? 'lg' : ''}"><span class="bdot"></span><span class="blabel">${live ? 'ativo' : 'encerrado'}</span></span>`;
}

function sidebarHTML() {
  const counts = statusCounts();
  const statusItems = STATUS.map((s) => `
    <div class="sopt ${state.status === s.key ? 'active' : ''}" data-status="${s.key}">
      <span class="si">${s.icon}</span><span class="sl">${s.label}</span><span class="sc">${counts[s.key]}</span>
    </div>`).join('');
  const periodItems = PERIODS.map((p) => `<button class="pchip ${state.period === p.key ? 'active' : ''}" data-period="${p.key}">${p.label}</button>`).join('');
  const slugs = allSlugs();
  if (state.projectSlug && !slugs.includes(state.projectSlug)) slugs.push(state.projectSlug);
  const opts = ['<option value="">Todos os projetos</option>']
    .concat(slugs.map((s) => `<option value="${esc(s)}" ${state.projectSlug === s ? 'selected' : ''}>${s === '—' ? '(sem projeto)' : esc(s)}</option>`))
    .join('');
  const sortItems = [['recent', 'recentes'], ['cost', 'custo'], ['name', 'nome']]
    .map(([k, l]) => `<button class="${state.sort === k ? 'active' : ''}" data-sort="${k}">${l}</button>`).join('');
  return `<aside class="side oc-scroll">
    <div>
      <div class="side-h">Status</div>
      <div class="sopt-list">${statusItems}</div>
    </div>
    <div>
      <div class="side-h">Período</div>
      <div class="period-grid">${periodItems}</div>
    </div>
    <div>
      <div class="side-h">Projeto</div>
      <select class="select" id="projectSelect">${opts}</select>
    </div>
    <div>
      <div class="side-h">Busca</div>
      <div class="search-wrap"><span class="glass">⌕</span><input id="filterInput" type="search" placeholder="filtrar por título…" value="${esc(state.q)}" /></div>
    </div>
    <div>
      <div class="side-h">Ordenar por</div>
      <div class="sort-seg">${sortItems}</div>
    </div>
    <div class="side-foot">${counts.todos} terminais · ${counts.ativos} ativo(s)<br/><span class="ghost">custo por terminal → agente → sub-agente</span></div>
  </aside>`;
}

function kpisHTML(ts) {
  const counts = statusCounts();
  const total = ts.reduce((a, t) => a + (t.totalCostUSD || 0), 0);
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const today = state.terminals.filter((t) => (t.mtime || 0) >= dayStart.getTime()).reduce((a, t) => a + (t.totalCostUSD || 0), 0);
  const periodLabel = { hoje: 'hoje', '7d': '7 dias', '30d': '30 dias', tudo: 'tudo' }[state.period];
  return `<div class="kpis">
    <div class="kpi"><div class="kpi-k">Gasto na janela</div><div class="kpi-v">${fmtUSD(total)}</div><div class="kpi-s">${ts.length} sessões · ${periodLabel}</div></div>
    <div class="kpi"><div class="kpi-k">Sessões de hoje</div><div class="kpi-v">${fmtUSD(today)}</div><div class="kpi-s">custo total das sessões ativas hoje</div></div>
    <div class="kpi"><div class="kpi-k">Ativos agora</div><div class="kpi-v green">${counts.ativos}${counts.ativos ? '<span class="pulse-dot"></span>' : ''}</div><div class="kpi-s">rodando neste momento</div></div>
    <div class="kpi"><div class="kpi-k">Terminais</div><div class="kpi-v">${counts.todos}</div><div class="kpi-s">${counts.encerrados} encerrados</div></div>
  </div>`;
}

function feedHTML() {
  const runs = feedRuns();
  if (!runs.length) return '';
  const items = runs.map((r) => {
    const running = runLooksRunning(r);
    const verb = running ? 'rodando' : 'terminou';
    // slug pode vir como path completo quando o cwd não casa nenhum projeto do MAPS
    const slug = r.slug && /[\\/]/.test(r.slug) ? r.slug.split(/[\\/]/).filter(Boolean).pop() : r.slug;
    const label = `${r.agent || 'agent'} ${verb}${slug ? ' · ' + slug : ''}`;
    return `<div class="feed-item" data-run="${esc(r.id)}">
      ${tileHTML(r.agent, 'sm')}
      <span class="ftext">${esc(label)}</span>
      <span class="fage">${running ? fmtDuration(Date.now() - (r.startedAt || Date.now())) : fmtAge(r.endedAt || r.startedAt)}</span>
    </div>`;
  }).join('');
  return `<div class="feedbar">
    <div class="feedbar-h"><span class="pulse-dot"></span><span>Ao vivo</span></div>
    <div class="feedbar-sep"></div>
    <div class="feed-list oc-scroll">${items}</div>
  </div>`;
}

// achata a árvore de agentes (com o main-loop como raiz) para as linhas da escadinha
function flattenTree(t, sessionId) {
  const rows = [];
  const own = t.own || {};
  rows.push({
    kind: 'root', depth: 0, label: `Conteúdo do terminal · main-loop`, role: 'terminal',
    running: false, hasSub: false,
    c1: fmtUSD(own.costUSD), c2: `${fmtTok(tokTotal(own.tokens))} tokens · ${esc(t.model || '—')}`,
  });
  const walk = (n, depth) => {
    const hasSub = n.children && n.children.length > 0;
    const running = nodeStatus(n, t.live) === 'running';
    rows.push({
      kind: 'node', depth, nodeId: n.id, role: n.agentType, running, hasSub,
      label: n.description || n.agentType || 'agent',
      subCount: hasSub ? n.children.length : 0,
      c1: hasSub ? `Σ ${fmtUSD(n.subtreeCostUSD)}` : fmtUSD(n.ownCostUSD),
      c2: hasSub ? `${fmtUSD(n.ownCostUSD)} próprio` : '',
    });
    (n.children || []).forEach((c) => walk(c, depth + 1));
  };
  (t.agents || []).forEach((n) => walk(n, 1));
  return rows;
}

function treeRowsHTML(t, sessionId) {
  return flattenTree(t, sessionId).map((row) => {
    const rail = Math.max(0, (row.depth - 1) * 22);
    const elbow = row.depth > 0 && row.kind === 'node' ? '<span class="node-elbow"></span>' : '';
    const attrs = row.kind === 'node' ? `data-node="${esc(row.nodeId)}" data-session="${esc(sessionId)}"` : '';
    return `<div class="node-line">
      <span class="node-rail" style="width:${rail}px"></span>
      ${elbow}
      <div class="node-row ${row.kind === 'root' ? 'root' : ''} ${row.running ? 'running' : ''}" ${attrs}>
        ${tileHTML(row.role, 'md')}
        <div class="node-mid">
          <span class="node-label">${esc(String(row.label).slice(0, 90))}</span>
          ${row.hasSub ? `<span class="node-subcount">${row.subCount} sub</span>` : ''}
          ${row.running ? '<span class="node-runpill"><span class="bdot"></span>rodando</span>' : ''}
        </div>
        <div class="node-cost"><div class="c1">${row.c1}</div>${row.c2 ? `<div class="c2">${row.c2}</div>` : ''}</div>
      </div>
    </div>`;
  }).join('');
}

function treeBodyHTML(sessionId) {
  if (state.loading[sessionId] && !state.trees[sessionId]) return `<div class="tree-body"><div class="skeleton" style="padding:6px 4px">montando a escadinha…</div></div>`;
  const t = state.trees[sessionId];
  if (!t) return `<div class="tree-body"><div class="skeleton" style="padding:6px 4px">carregando…</div></div>`;
  if (!t.found) return `<div class="tree-body"><div class="muted" style="padding:6px 4px;font-size:12px">Transcript não localizado para esta sessão.</div></div>`;
  return `<div class="tree-body">
    ${treeRowsHTML(t, sessionId)}
    <div class="open-page-btn" data-more="${esc(sessionId)}">abrir página do terminal →</div>
  </div>`;
}

function terminalCardHTML(t, maxCost) {
  const open = state.expanded.has(t.sessionId);
  const proj = projLabel(t);
  const share = Math.max(4, Math.round(((t.totalCostUSD || 0) / (maxCost || 1)) * 100));
  return `<div class="tcard ${t.live ? 'live' : ''}" data-session="${esc(t.sessionId)}">
    <div class="tcard-head" data-toggle="${esc(t.sessionId)}">
      <span class="tcaret ${open ? 'open' : ''}">▸</span>
      <span class="sh-tile ${t.live ? 'live' : ''}">&gt;_</span>
      <div class="tcard-main">
        <div class="tcard-title-row">
          <span class="tcard-title">${esc(termTitle(t))}</span>
          ${badgeHTML(t.live)}
        </div>
        <div class="tcard-sub">
          ${proj ? `<span class="proj">${esc(proj)}</span><span class="sep">/</span>` : ''}
          <span>${t.agentCount} ${t.agentCount === 1 ? 'agente' : 'agentes'}</span>
          <span class="sep">/</span>
          <span>${fmtAge(t.mtime)}</span>
          <span class="sep">/</span>
          <span class="cwd">${esc(shortCwd(t.cwd))}</span>
        </div>
      </div>
      <div class="tcard-cost">
        <div class="tc-total">${fmtUSD(t.totalCostUSD)}</div>
        <div class="tc-share"><i style="width:${share}%"></i></div>
      </div>
    </div>
    ${open ? treeBodyHTML(t.sessionId) : ''}
  </div>`;
}

// ---------- preservação de scroll entre re-renders ----------
// os re-renders trocam o innerHTML inteiro do #app; sem isso, todo refresh
// automático (SSE/ticker) jogava a página de volta pro topo.
const SCROLL_SELS = ['.main', '.tpage', '.side', '.feed-list', '.tree-body', '.prompt-text'];
function captureScrolls(root) {
  const saved = [];
  if (!root) return saved;
  for (const sel of SCROLL_SELS) {
    root.querySelectorAll(sel).forEach((n, i) => {
      if (n.scrollTop || n.scrollLeft) saved.push({ sel, i, top: n.scrollTop, left: n.scrollLeft });
    });
  }
  return saved;
}
function restoreScrolls(root, saved) {
  if (!root || !saved.length) return;
  for (const s of saved) {
    const n = root.querySelectorAll(s.sel)[s.i];
    if (n) { n.scrollTop = s.top; n.scrollLeft = s.left; }
  }
}

// ---------- render principal ----------
function render() {
  if (state.view.type === 'terminal') {
    renderTerminalPage(state.view.sessionId);
    mountModal();
    return;
  }
  renderHome();
  mountModal();
}

function renderHome() {
  // preserva foco+cursor da busca através de qualquer re-render
  const active = document.activeElement;
  const filterFocused = active && active.id === 'filterInput';
  const caret = filterFocused ? active.selectionStart : null;

  const ts = visibleTerminals();
  const maxCost = ts.reduce((m, t) => Math.max(m, t.totalCostUSD || 0), 0);

  let cards;
  if (!state.terminals.length) {
    cards = `<div class="empty">Nenhum terminal na janela selecionada.<br/>Rode <code>claude</code> em qualquer projeto e ele aparece aqui.</div>`;
  } else if (!ts.length) {
    cards = `<div class="empty">Nenhum terminal para este filtro.</div>`;
  } else {
    cards = `<div class="tlist">${ts.map((t) => terminalCardHTML(t, maxCost)).join('')}</div>`;
  }

  const app = el('app');
  const scrolls = captureScrolls(app);
  app.innerHTML = `<div class="home">
    ${sidebarHTML()}
    <main class="main oc-scroll">
      ${kpisHTML(ts)}
      ${feedHTML()}
      ${cards}
    </main>
  </div>`;
  restoreScrolls(app, scrolls);

  bindSidebar();
  bindCards();
  bindFeed();

  if (filterFocused) {
    const fi = el('filterInput');
    if (fi) {
      fi.focus();
      const pos = caret == null ? fi.value.length : caret;
      fi.setSelectionRange(pos, pos);
    }
  }
}

// ---------- página do terminal (URL própria: #/t/<sessão>) ----------
function renderTerminalPage(sessionId) {
  const app = el('app');
  const back = `<a class="back" id="backBtn">← todos os terminais</a>`;
  const t = state.trees[sessionId];
  if (!t) {
    app.innerHTML = `<div class="tpage oc-scroll"><div class="tpage-inner">${back}<div class="skeleton" style="padding:20px 0">carregando o terminal…</div></div></div>`;
    bindBack();
    if (!state.loading[sessionId]) loadTree(sessionId);
    return;
  }
  if (!t.found) {
    app.innerHTML = `<div class="tpage oc-scroll"><div class="tpage-inner">${back}<div class="empty">Transcript não localizado para esta sessão.</div></div></div>`;
    bindBack();
    return;
  }

  const live = t.live;
  const proj = projLabel({ slug: t.slug, cwd: t.cwd });
  const title = t.title || shortCwd(t.cwd) || ('Terminal ' + sessionId.slice(0, 8));
  const dur = t.durationMs ? fmtDuration(t.durationMs) : '—';

  const chips = [
    proj ? `<span class="chip"><span class="ck">projeto</span><span class="cv">${esc(proj)}</span></span>` : '',
    t.branch ? `<span class="chip"><span class="ck">branch</span><span class="cv">${esc(t.branch)}</span></span>` : '',
    t.cwd ? `<span class="chip"><span class="ck">cwd</span><span class="cv">${esc(shortCwd(t.cwd))}</span></span>` : '',
    t.model ? `<span class="chip"><span class="ck">modelo</span><span class="cv">${esc(t.model)}</span></span>` : '',
    `<span class="chip"><span class="ck">início</span><span class="cv">${fmtClock(t.startedAt)} · ${dur}</span></span>`,
    t.resumeCommand ? `<span class="chip copy" data-copy="${esc(t.resumeCommand)}" title="${esc(t.resumeCommand)}"><span class="ck">retomar</span><span class="cv">copiar comando ⧉</span></span>` : '',
  ].join('');

  // custo por modelo
  const models = Object.entries(t.byModel || {}).sort((a, b) => b[1].costUSD - a[1].costUSD);
  const maxM = models.reduce((m, [, v]) => Math.max(m, v.costUSD), 0) || 1;
  const modelRows = models.map(([m, v], i) => `
    <div>
      <div class="model-row-h"><span class="model-name">${esc(m)}</span><span class="model-cost">${fmtUSD(v.costUSD)}</span></div>
      <div class="model-bar"><i style="width:${Math.max(3, Math.round((v.costUSD / maxM) * 100))}%;background:${i === 0 ? 'linear-gradient(90deg,#43dd88,#1c8552)' : 'linear-gradient(90deg,#79a9f2,#3d6fc4)'}"></i></div>
    </div>`).join('') || '<div class="muted" style="font-size:12px">Sem dados por modelo.</div>';

  // prompts
  const prompts = t.prompts || [];
  const promptRows = prompts.length ? prompts.map((p, i) => {
    const metaBits = [`main-loop ${fmtUSD(p.mainCostUSD)}`];
    if (p.agentCostUSD > 0) metaBits.push(`agentes ${fmtUSD(p.agentCostUSD)}`);
    return `<div class="prompt-row">
      <div class="prompt-time">#${i + 1} · ${fmtClock(p.ts)}</div>
      <div class="prompt-body">
        <pre class="prompt-text oc-scroll">${esc(p.text)}</pre>
        <div class="prompt-meta">${metaBits.join(' · ')}</div>
      </div>
      <div class="prompt-cost">${fmtUSD(p.costUSD)}</div>
    </div>`;
  }).join('') : '<div class="muted" style="padding:16px 17px;font-size:12px">Nenhum prompt de usuário capturado neste transcript.</div>';

  // timeline
  const flat = [];
  const walkFlat = (n, d) => { flat.push({ ...n, depth: d }); (n.children || []).forEach((c) => walkFlat(c, d + 1)); };
  (t.agents || []).forEach((n) => walkFlat(n, 0));
  const tlNodes = flat.filter((n) => n.startedAt).sort((a, b) => a.startedAt - b.startedAt);
  const timeline = tlNodes.length ? tlNodes.map((n, i) => {
    const running = nodeStatus(n, live) === 'running';
    const d = running ? fmtDuration(Date.now() - n.startedAt) : fmtDuration((n.endedAt || 0) - (n.startedAt || 0));
    const tile = tileOf(n.agentType);
    return `<div class="tl-row ${running ? 'running' : ''}" data-node="${esc(n.id)}" data-session="${esc(sessionId)}">
      <div class="tl-time">${fmtClock(n.startedAt)}</div>
      <div class="tl-spine">
        <span class="tile md" style="background:color-mix(in srgb,${tile.c} 15%,transparent);border-color:color-mix(in srgb,${tile.c} 34%,transparent);color:${tile.c};${running ? 'box-shadow:0 0 16px -3px rgba(63,208,125,.6)' : ''}">${tile.code}</span>
        ${i < tlNodes.length - 1 ? '<span class="tl-line"></span>' : ''}
      </div>
      <div class="tl-body">
        <div class="tl-label-row"><span class="tl-label">${esc(n.agentType || 'agent')}${n.spawnDepth != null ? ` · d${n.spawnDepth}` : ''}</span>${running ? '<span class="tl-blink"></span>' : ''}</div>
        <div class="tl-meta">${esc((n.description || '').slice(0, 80))}${d ? ` · ${running ? 'há ' + d : 'dur ' + d}` : ''} · ${fmtUSD(n.subtreeCostUSD)}</div>
      </div>
    </div>`;
  }).join('') : '<div class="muted" style="font-size:12px">Sem agentes.</div>';

  // resumo (tokens agregados: main-loop + agentes)
  const acc = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const addTok = (tok) => {
    if (!tok || typeof tok === 'number') return;
    acc.input += tok.input || 0;
    acc.output += tok.output || 0;
    acc.cacheRead += tok.cacheRead || 0;
    acc.cacheWrite += (tok.cacheWrite5m || 0) + (tok.cacheWrite1h || 0);
  };
  addTok((t.own || {}).tokens);
  flat.forEach((n) => addTok(n.ownTokens));
  const summary = [
    ['Agentes', String(t.agentCount || 0)],
    ['Tokens in', fmtTok(acc.input)],
    ['Tokens out', fmtTok(acc.output)],
    ['Cache read', fmtTok(acc.cacheRead)],
    ['Cache write', fmtTok(acc.cacheWrite)],
    ['Main-loop', fmtUSD((t.own || {}).costUSD)],
    ['Duração', dur],
  ].map(([k, v]) => `<div class="summary-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');

  const scrolls = captureScrolls(app);
  app.innerHTML = `<div class="tpage oc-scroll"><div class="tpage-inner">
    ${back}
    <div class="tpage-head">
      <span class="sh-tile lg ${live ? 'live' : ''}">&gt;_</span>
      <div class="tpage-main">
        <div class="tpage-title-row"><h1>${esc(title)}</h1>${badgeHTML(live, true)}</div>
        <div class="chips">${chips}</div>
      </div>
      <div class="tpage-cost">
        <div class="big">${fmtUSD(t.totalCostUSD || 0)}</div>
        <div class="cap">custo total da sessão</div>
      </div>
    </div>

    <div class="tpage-grid">
      <div class="tpage-col">
        <section class="section">
          <div class="section-head"><span class="st">Histórico de prompts</span><span class="scount">${prompts.length} prompts</span><div class="grow"></div><span class="shint">custo por turno</span></div>
          <div>${promptRows}</div>
        </section>

        <section class="section">
          <div class="section-head"><span class="st">Escadinha · agentes</span><span class="shint">clique num nó para detalhes</span></div>
          <div class="tree-pad">${treeRowsHTML(t, sessionId)}</div>
        </section>

        <section class="section">
          <div class="section-head"><span class="st">Timeline</span><span class="scount">${tlNodes.length}</span></div>
          <div class="tl-pad">${timeline}</div>
        </section>
      </div>

      <div class="tpage-side">
        <section class="section">
          <div class="section-head"><span class="st">Custo por modelo</span></div>
          <div class="model-pad">${modelRows}</div>
        </section>
        <section class="section summary-pad">
          <div class="summary-h">Resumo da sessão</div>
          <div class="summary-list">${summary}</div>
        </section>
      </div>
    </div>
  </div></div>`;
  restoreScrolls(app, scrolls);

  bindBack();
  bindCards();
}

// ---------- bindings ----------
function bindBack() {
  const b = el('backBtn');
  if (b) b.onclick = () => { location.hash = '#/'; };
}

function bindSidebar() {
  document.querySelectorAll('.sopt[data-status]').forEach((lnk) => {
    lnk.onclick = () => { state.status = lnk.dataset.status; render(); };
  });
  document.querySelectorAll('.pchip[data-period]').forEach((b) => {
    b.onclick = () => { state.period = b.dataset.period; fetchTerminals(); };
  });
  document.querySelectorAll('.sort-seg [data-sort]').forEach((b) => {
    b.onclick = () => { state.sort = b.dataset.sort; render(); };
  });
  const fi = el('filterInput');
  if (fi) {
    fi.oninput = (e) => {
      state.q = e.target.value;
      render(); // renderHome preserva foco+cursor da busca
    };
  }
  const ps = el('projectSelect');
  if (ps) ps.onchange = (e) => { state.projectSlug = e.target.value; render(); };
}

function bindFeed() {
  document.querySelectorAll('.feed-item[data-run]').forEach((row) => {
    row.onclick = () => { state.modal = { type: 'run', id: row.dataset.run }; mountModal(); };
  });
}

function bindCards() {
  // expandir/recolher terminal
  document.querySelectorAll('.tcard-head[data-toggle]').forEach((h) => {
    h.onclick = () => {
      const sid = h.dataset.toggle;
      if (state.expanded.has(sid)) state.expanded.delete(sid);
      else {
        state.expanded.add(sid);
        if (!state.trees[sid]) loadTree(sid);
      }
      render();
    };
  });
  // "abrir página do terminal" → URL própria
  document.querySelectorAll('[data-more]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      location.hash = '#/t/' + encodeURIComponent(b.dataset.more);
    };
  });
  // abrir modal de um nó de agente (escadinha + timeline)
  document.querySelectorAll('[data-node]').forEach((row) => {
    row.onclick = (e) => {
      e.stopPropagation();
      state.modal = { type: 'node', sessionId: row.dataset.session, nodeId: row.dataset.node };
      mountModal();
    };
  });
  // copiar comando de retomar
  document.querySelectorAll('.chip.copy[data-copy]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(b.dataset.copy).then(() => {
        const cv = b.querySelector('.cv');
        if (cv) {
          cv.textContent = '✓ copiado';
          setTimeout(() => { cv.textContent = 'copiar comando ⧉'; }, 1600);
        }
      });
    };
  });
}

// ---------- modal ----------
function findNode(sessionId, nodeId) {
  const t = state.trees[sessionId];
  if (!t || !t.agents) return null;
  let found = null;
  const walk = (n) => {
    if (found) return;
    if (n.id === nodeId) { found = n; return; }
    (n.children || []).forEach(walk);
  };
  t.agents.forEach(walk);
  return found;
}

function metricHTML(k, v, green) {
  return `<div class="metric"><div class="mk">${k}</div><div class="mv ${green ? 'green' : ''}">${v}</div></div>`;
}

function modalHTML() {
  if (!state.modal) return '';
  let role, label, running = false, metrics = '', task = '', result = '', hasResult = false;

  if (state.modal.type === 'run') {
    const run = state.agentRuns[state.modal.id];
    if (!run) return '';
    running = runLooksRunning(run);
    role = run.agent || 'agent';
    label = run.description || run.agent || 'agent';
    const dur = running ? fmtDuration(Date.now() - (run.startedAt || Date.now())) : fmtDuration((run.endedAt || 0) - (run.startedAt || 0));
    metrics = [
      metricHTML('início', fmtClock(run.startedAt)),
      metricHTML('fim', running ? '—' : fmtClock(run.endedAt), running),
      metricHTML('duração', running ? 'em curso' : (dur || '—')),
      run.slug ? metricHTML('projeto', esc(run.slug)) : '',
      metricHTML('agente', esc(run.agent || '—')),
      metricHTML('eventos', String((run.log || []).length)),
    ].filter(Boolean).join('');
    task = resText(run.task || run.description);
    result = resText(run.result);
    hasResult = !!result || running;
  } else {
    const node = findNode(state.modal.sessionId, state.modal.nodeId);
    if (!node) return '';
    const t = state.trees[state.modal.sessionId] || {};
    running = nodeStatus(node, t.live) === 'running';
    const hookRun = node.toolUseId ? state.agentRuns[node.toolUseId] : null;
    role = node.agentType || 'agent';
    label = node.description || node.agentType || 'agent';
    const tok = node.ownTokens || {};
    const dur = running ? fmtDuration(Date.now() - (node.startedAt || Date.now())) : fmtDuration((node.endedAt || 0) - (node.startedAt || 0));
    const kids = (node.children || []).length;
    metrics = [
      metricHTML('início', fmtClock(node.startedAt)),
      metricHTML('fim', running ? '—' : fmtClock(node.endedAt), running),
      metricHTML('duração', running ? 'em curso' : (dur || '—')),
      metricHTML('custo próprio', fmtUSD(node.ownCostUSD)),
      kids ? metricHTML('custo subtree', fmtUSD(node.subtreeCostUSD)) : metricHTML('modelo', esc(node.model || '—')),
      metricHTML('tokens i/o', `${fmtTok(tok.input)} / ${fmtTok(tok.output)}`),
      metricHTML('cache read', fmtTok(tok.cacheRead)),
      metricHTML('cache write', fmtTok((tok.cacheWrite5m || 0) + (tok.cacheWrite1h || 0))),
      metricHTML('sub-agentes', String(kids)),
    ].join('');
    task = hookRun ? resText(hookRun.task || hookRun.description) : '';
    result = hookRun ? resText(hookRun.result) : '';
    hasResult = !!result || running;
  }

  const tile = tileOf(role);
  return `<div class="modal-backdrop" id="modalBackdrop">
    <div class="modal oc-scroll ${running ? 'running' : ''}" onclick="event.stopPropagation()">
      <div class="modal-head">
        <span class="tile lg" style="background:color-mix(in srgb,${tile.c} 15%,transparent);border-color:color-mix(in srgb,${tile.c} 34%,transparent);color:${tile.c}">${tile.code}</span>
        <div class="modal-head-main">
          <div class="modal-title">${esc(String(label).slice(0, 90))}</div>
          <div class="modal-role">${esc(role)}</div>
        </div>
        <span class="badge lg ${running ? 'active' : ''}"><span class="bdot"></span><span class="blabel">${running ? 'rodando' : 'concluído'}</span></span>
        <button class="modal-close" id="modalClose">✕</button>
      </div>
      <div class="modal-body">
        <div class="metric-grid">${metrics}</div>
        ${task ? `<div><div class="block-h"><span class="bt">Tarefa</span><span class="bhint">prompt de delegação</span></div><pre class="modal-pre oc-scroll">${esc(task)}</pre></div>` : ''}
        ${hasResult ? `<div><div class="block-h"><span class="bt">Resultado</span>${running ? '<span class="bhint">rodando…</span>' : ''}</div><pre class="modal-pre oc-scroll ${running && !result ? 'running' : ''}">${esc(result || 'aguardando…')}</pre></div>` : ''}
      </div>
    </div>
  </div>`;
}

function mountModal() {
  let host = el('modalHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'modalHost';
    document.body.appendChild(host);
  }
  const key = state.modal ? JSON.stringify(state.modal) : '';
  const html = modalHTML();
  if (!html) {
    if (host.innerHTML) host.innerHTML = '';
    host.dataset.key = '';
    return;
  }
  // mesma modal já aberta: patch só do conteúdo interno, mantendo o backdrop
  // (senão o fade do .modal-backdrop replaya a cada refresh e a modal "pisca")
  // e preservando o scroll da modal e dos <pre>
  const curModal = key === host.dataset.key ? host.querySelector('.modal') : null;
  if (curModal) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const newModal = tpl.content.querySelector('.modal');
    if (newModal && newModal.innerHTML !== curModal.innerHTML) {
      const top = curModal.scrollTop;
      const preScrolls = [...curModal.querySelectorAll('.modal-pre')].map((p) => ({ top: p.scrollTop, left: p.scrollLeft }));
      curModal.className = newModal.className;
      curModal.innerHTML = newModal.innerHTML;
      curModal.scrollTop = top;
      curModal.querySelectorAll('.modal-pre').forEach((p, i) => {
        if (preScrolls[i]) { p.scrollTop = preScrolls[i].top; p.scrollLeft = preScrolls[i].left; }
      });
    }
  } else {
    host.innerHTML = html;
    host.dataset.key = key;
  }
  const close = () => { state.modal = null; mountModal(); };
  const bd = el('modalBackdrop');
  if (bd) bd.onclick = close;
  const cl = el('modalClose');
  if (cl) cl.onclick = close;
}

// ---------- roteamento por hash (#/ = lista, #/t/<sessão> = página do terminal) ----------
function parseHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  const m = h.match(/^t\/(.+)$/);
  if (m) return { type: 'terminal', sessionId: decodeURIComponent(m[1]) };
  return { type: 'list' };
}
function applyHash() {
  state.view = parseHash();
  state.modal = null;
  if (state.view.type === 'terminal' && !state.trees[state.view.sessionId]) loadTree(state.view.sessionId);
  render();
}
window.addEventListener('hashchange', applyHash);

// ---------- boot ----------
el('rescanBtn').onclick = async () => {
  const btn = el('rescanBtn');
  btn.classList.add('spinning');
  try { await fetch('/api/rescan'); await fetchTerminals(); } catch {}
  setTimeout(() => btn.classList.remove('spinning'), 600);
};
el('brandHome').onclick = () => {
  state.q = '';
  state.status = 'todos';
  state.expanded.clear();
  state.view = { type: 'list' };
  if (location.hash) location.hash = ''; // dispara applyHash se havia hash
  else render();
};
state.view = parseHash();
connectStream();
fetchTerminals();
if (state.view.type === 'terminal') loadTree(state.view.sessionId);

// ticker: mantém durações/idades/status frescos sem depender de eventos SSE.
// Na home só quando a busca não está focada. Com modal aberta, atualiza só a
// modal (mountModal faz patch incremental, sem piscar nem perder scroll).
setInterval(() => {
  if (state.modal) { mountModal(); return; }
  if (state.view.type === 'terminal') {
    const t = state.trees[state.view.sessionId];
    if (t && t.live) render();
    return;
  }
  const fi = el('filterInput');
  if (fi && document.activeElement === fi) return;
  if (state.terminals.some((t) => t.live)) render();
}, 5000);
