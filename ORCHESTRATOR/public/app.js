'use strict';

// ai-flow · Orchestrator — dashboard "por terminal".
// Home = lista de terminais (sessões do Claude Code). Expandir um terminal desce a
// escadinha Terminal → Conteúdo + Agentes → Conteúdo + sub-Agentes → … com custo por nó.

// ---------- estado ----------
const state = {
  view: { type: 'list' }, // {type:'list'} | {type:'terminal', sessionId}
  terminals: [],           // resumos (/api/terminals)
  projects: [],            // {slug,name} p/ o filtro
  trees: {},               // sessionId -> árvore completa (/api/terminal), lazy
  loading: {},             // sessionId -> true enquanto busca a árvore
  expanded: new Set(),     // terminais abertos
  expandedNodes: new Set(),// nós de agente abertos (por node id)
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

const AGENT_ICON = {
  'product-manager': '📋', 'arquiteto-senior': '📐', 'dev-senior': '⚙️',
  'tech-lead': '🔍', 'engineering-manager': '🎯', qa: '🧪',
  'general-purpose': '🤖', 'claude-code-guide': '📖', Explore: '🔭', Plan: '🗺️',
};
const agIcon = (t) => AGENT_ICON[t] || '🤖';

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
  return '$' + n.toFixed(2);
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
  const home = cwd.replace(/^\/Users\/[^/]+/, '~');
  const parts = home.split('/').filter(Boolean);
  return parts.length > 3 ? '…/' + parts.slice(-2).join('/') : home;
}
// rótulo de projeto do terminal: slug do MAPS, senão a pasta do cwd (nunca "sem projeto" à toa)
function projLabel(t) {
  if (t.slug) return t.slug;
  if (!t.cwd) return null;
  const p = t.cwd.replace(/\/+$/, '').split('/').filter(Boolean);
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
      renderLiveBar();
    } catch {}
  });
  es.onerror = () => {
    conn.classList.remove('live');
    el('connLabel').textContent = 'reconectando…';
  };
}

// ---------- runs de hook (barra "rodando agora") ----------
function allRuns() {
  return Object.values(state.agentRuns).filter((r) => !r._usageOnly && (r.agent || r.task || r.description) && r.startedAt);
}
function runningRuns() {
  const now = Date.now();
  return allRuns()
    .filter((r) => r.status === 'running' && now - r.startedAt < 15 * 60000)
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

// ---------- filtro/ordenação da lista de terminais ----------
function visibleTerminals() {
  let ts = state.terminals.slice();
  if (state.status === 'ativos') ts = ts.filter((t) => t.live);
  else if (state.status === 'encerrados') ts = ts.filter((t) => !t.live);
  if (state.projectSlug) ts = ts.filter((t) => (t.slug || '—') === state.projectSlug);
  const q = state.q.trim().toLowerCase();
  if (q) ts = ts.filter((t) => [t.slug, t.cwd, t.sessionId, t.model].some((s) => (s || '').toLowerCase().includes(q)));
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
function projectSelectHTML() {
  const slugs = allSlugs();
  if (state.projectSlug && !slugs.includes(state.projectSlug)) slugs.push(state.projectSlug);
  const opts = ['<option value="">Todos os projetos</option>']
    .concat(slugs.map((s) => `<option value="${esc(s)}" ${state.projectSlug === s ? 'selected' : ''}>${s === '—' ? '(sem projeto)' : esc(s)}</option>`))
    .join('');
  return `<label for="projectSelect">projeto</label><select class="select" id="projectSelect">${opts}</select>`;
}

function toolbarHTML() {
  const opt = (v, l) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="toolbar">
    <div class="grow"><input class="input" id="filterInput" type="search" placeholder="Filtrar por projeto, cwd, sessão…" value="${esc(state.q)}" /></div>
    ${projectSelectHTML()}
    <label for="sortSelect">ordenar</label>
    <select class="select" id="sortSelect">
      ${opt('recent', 'Atividade recente')}
      ${opt('cost', 'Custo')}
      ${opt('name', 'Projeto (A–Z)')}
    </select>
  </div>`;
}

// custo do subtree quando o nó tem filhos; senão o próprio
function nodeCostHTML(node) {
  const hasKids = node.children && node.children.length;
  if (hasKids) {
    return `<span class="run-meta">Σ ${fmtUSD(node.subtreeCostUSD)} <span class="muted">· ${fmtUSD(node.ownCostUSD)} próprio</span></span>`;
  }
  return `<span class="run-meta">${fmtUSD(node.ownCostUSD)}</span>`;
}

// linha de um nó de agente (recursiva)
function agentNodeHTML(sessionId, node, depth) {
  const hasKids = node.children && node.children.length;
  const open = state.expandedNodes.has(node.id);
  const pad = 10 + depth * 20;
  const caret = hasKids ? `<span class="tcaret ${open ? 'open' : ''}" data-node-toggle="${esc(node.id)}">▶</span>` : '<span class="tcaret spacer"></span>';
  const running = node.live;
  const label = node.description || node.agentType || 'agent';
  const kids = hasKids && open
    ? `<div class="tchildren">${node.children.map((c) => agentNodeHTML(sessionId, c, depth + 1)).join('')}</div>`
    : '';
  return `<div class="tnode-wrap">
    <div class="tnode run-row ${running ? 'running' : ''}" data-node="${esc(node.id)}" data-session="${esc(sessionId)}" style="padding-left:${pad}px">
      ${caret}
      <span class="run-ic">${agIcon(node.agentType)}</span>
      <span class="run-body">
        <span class="run-agent">${esc(node.agentType || 'agent')}${hasKids ? ` <span class="run-slug">· ${node.children.length} sub</span>` : ''}${node.spawnDepth != null ? ` <span class="run-slug">d${node.spawnDepth}</span>` : ''}</span>
        <span class="run-desc">${esc(String(label).slice(0, 80))}${String(label).length > 80 ? '…' : ''}</span>
      </span>
      ${running ? '<i class="spin">⣷</i>' : ''}
      ${nodeCostHTML(node)}
    </div>
    ${kids}
  </div>`;
}

// escadinha de um terminal expandido
function treeBodyHTML(sessionId, withResume = true) {
  if (state.loading[sessionId] && !state.trees[sessionId]) return `<div class="skeleton" style="padding:10px 14px">montando a escadinha…</div>`;
  const t = state.trees[sessionId];
  if (!t) return `<div class="skeleton" style="padding:10px 14px">carregando…</div>`;
  if (!t.found) return `<div class="muted" style="padding:10px 14px">Transcript não localizado para esta sessão.</div>`;
  const own = t.own || {};
  const contentNode = `<div class="tnode run-row" style="padding-left:10px">
      <span class="tcaret spacer"></span>
      <span class="run-ic">🖥️</span>
      <span class="run-body">
        <span class="run-agent">Conteúdo do terminal <span class="run-slug">main-loop · ${esc(t.model || '—')}</span></span>
        <span class="run-desc">${fmtTok(tokTotal(own.tokens))} tokens próprios</span>
      </span>
      <span class="run-meta">${fmtUSD(own.costUSD)}</span>
    </div>`;
  const agents = (t.agents || []).map((n) => agentNodeHTML(sessionId, n, 0)).join('');
  const resume = withResume ? `<div class="resume" style="margin:10px 14px 4px">
      <code>${esc(t.resumeCommand || '')}</code>
      <button class="copy-btn" data-copy="${esc(t.resumeCommand || '')}">copiar</button>
    </div>` : '';
  return `<div class="tree">${contentNode}${agents || '<div class="muted" style="padding:8px 14px 4px">Nenhum agente neste terminal — só o main-loop.</div>'}</div>${resume}`;
}

function terminalCardHTML(t) {
  const open = state.expanded.has(t.sessionId);
  const badge = t.live ? '<span class="badge active">● ativo</span>' : '<span class="badge done">encerrado</span>';
  const proj = projLabel(t);
  const projChip = proj ? `<span class="tchip">${esc(proj)}</span>` : '';
  return `<div class="tcard ${t.live ? 'live' : ''} ${open ? 'open' : ''}" data-session="${esc(t.sessionId)}">
    <div class="tcard-head" data-toggle="${esc(t.sessionId)}">
      <span class="tcaret ${open ? 'open' : ''}">▶</span>
      <div class="tcard-main">
        <div class="tcard-title">${esc(termTitle(t))} ${badge}</div>
        <div class="tcard-sub">
          ${projChip}<code>${esc(shortCwd(t.cwd))}</code> · ${esc(t.model || '—')} · ${t.agentCount} ${t.agentCount === 1 ? 'agente' : 'agentes'} · ${fmtAge(t.mtime)}
        </div>
      </div>
      <button class="tmore" data-more="${esc(t.sessionId)}" title="Ver detalhes do terminal">ver mais</button>
      <div class="tcard-cost">
        <div class="tc-total">${fmtUSD(t.totalCostUSD)}</div>
        <div class="tc-tok">${fmtTok(t.totalTokens)} tok</div>
      </div>
    </div>
    ${open ? `<div class="tcard-body">${treeBodyHTML(t.sessionId)}</div>` : ''}
  </div>`;
}

// ---------- barra "rodando agora" (hooks) ----------
function runRowHTML(r) {
  const running = r.status === 'running';
  const dur = running ? fmtDuration(Date.now() - (r.startedAt || Date.now())) : fmtDuration((r.endedAt || 0) - (r.startedAt || 0));
  const label = r.description || (r.task ? r.task.split('\n')[0] : '') || '—';
  return `<div class="run-row ${running ? 'running' : ''}" data-run="${esc(r.id)}">
    <span class="run-ic">${agIcon(r.agent)}</span>
    <span class="run-body">
      <span class="run-agent">${esc(r.agent || 'agent')}${r.slug ? ` <span class="run-slug">· ${esc(r.slug)}</span>` : ''}</span>
      <span class="run-desc">${esc(label.slice(0, 72))}${label.length > 72 ? '…' : ''}</span>
    </span>
    <span class="run-meta">${running ? '<i class="spin">⣷</i> ' : ''}${dur}</span>
  </div>`;
}
function renderLiveBar() {
  const bar = el('liveBar');
  if (!bar) return;
  const running = runningRuns();
  if (!running.length) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }
  bar.hidden = false;
  bar.innerHTML = `<div class="livebar-h">⣷ rodando agora <span>${running.length}</span></div>
    <div class="livebar-list">${running.map(runRowHTML).join('')}</div>`;
  bar.querySelectorAll('.run-row').forEach((row) => {
    row.onclick = () => { state.modal = { type: 'run', id: row.dataset.run }; mountModal(); };
  });
}

// ---------- sidebar (status + período) ----------
function renderSidebar() {
  const counts = statusCounts();
  const nav = STATUS.map((s) => `
    <div class="side-link ${state.status === s.key ? 'active' : ''}" data-status="${s.key}">
      <span class="si">${s.icon}</span><span>${s.label}</span><span class="sc">${counts[s.key]}</span>
    </div>`).join('');
  const periods = `<div class="side-period">
    <div class="side-period-h">Período</div>
    ${PERIODS.map((p) => `<button class="pchip ${state.period === p.key ? 'active' : ''}" data-period="${p.key}">${p.label}</button>`).join('')}
  </div>`;
  el('sideNav').innerHTML = nav + periods;
  el('sideNav').querySelectorAll('.side-link').forEach((lnk) => {
    lnk.onclick = () => { state.status = lnk.dataset.status; render(); };
  });
  el('sideNav').querySelectorAll('.pchip').forEach((b) => {
    b.onclick = () => { state.period = b.dataset.period; fetchTerminals(); };
  });
  const live = counts.ativos;
  el('sideFoot').innerHTML = `${counts.todos} terminais · ${live} ativo(s)<br/>custo por terminal → agente → sub-agente`;
}

// ---------- render principal (dispatcher) ----------
function render() {
  renderSidebar();
  renderLiveBar();
  if (state.view.type === 'terminal') {
    renderTerminalPage(state.view.sessionId);
    mountModal();
    return;
  }
  renderList();
  mountModal();
}

function renderList() {
  // preserva foco+cursor da busca através de qualquer re-render (inclusive os
  // disparados por eventos ao vivo), senão a digitação é interrompida.
  const active = document.activeElement;
  const filterFocused = active && active.id === 'filterInput';
  const caret = filterFocused ? active.selectionStart : null;

  const ts = visibleTerminals();
  const live = ts.filter((t) => t.live);
  const dead = ts.filter((t) => !t.live);

  let html = `<div class="section-title">Terminais <span class="count">${ts.length}</span></div>`;
  html += toolbarHTML();

  if (!state.terminals.length) {
    html += `<div class="empty">Nenhum terminal na janela selecionada.<br/>Rode <code>claude</code> em qualquer projeto e ele aparece aqui.</div>`;
  } else if (!ts.length) {
    html += `<div class="empty">Nenhum terminal para este filtro.</div>`;
  } else {
    if (state.status !== 'encerrados' && live.length) {
      html += `<div class="section-title sub">⣷ Ativos agora <span class="count">${live.length}</span></div>`;
      html += `<div class="tlist">${live.map(terminalCardHTML).join('')}</div>`;
    }
    if (state.status !== 'ativos' && dead.length) {
      if (live.length && state.status === 'todos') html += `<div class="section-title sub">Encerrados <span class="count">${dead.length}</span></div>`;
      html += `<div class="tlist">${dead.map(terminalCardHTML).join('')}</div>`;
    }
  }
  el('app').innerHTML = html;
  bindControls();
  bindCards();

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
  const back = `<a class="back" id="backBtn">← terminais</a>`;
  const t = state.trees[sessionId];
  if (!t) {
    app.innerHTML = back + `<div class="skeleton" style="padding:20px 0">carregando o terminal…</div>`;
    bindBack();
    if (!state.loading[sessionId]) loadTree(sessionId);
    return;
  }
  if (!t.found) {
    app.innerHTML = back + `<div class="empty">Transcript não localizado para esta sessão.</div>`;
    bindBack();
    return;
  }

  const live = t.live;
  const proj = projLabel({ slug: t.slug, cwd: t.cwd });
  const title = t.title || shortCwd(t.cwd) || ('Terminal ' + sessionId.slice(0, 8));
  const dur = t.durationMs ? fmtDuration(t.durationMs) : '—';
  const badge = live ? '<span class="badge active">● ativo</span>' : '<span class="badge done">encerrado</span>';

  const chips = [
    proj ? `<span class="chip">${esc(proj)}</span>` : '',
    t.cwd ? `<span class="chip"><code>${esc(shortCwd(t.cwd))}</code></span>` : '',
    t.branch ? `<span class="chip">branch <code>${esc(t.branch)}</code></span>` : '',
    t.model ? `<span class="chip">${esc(t.model)}</span>` : '',
    `<span class="chip">iniciado ${fmtClock(t.startedAt)} · ${dur}</span>`,
  ].join('');

  const models = Object.entries(t.byModel || {}).sort((a, b) => b[1].costUSD - a[1].costUSD);
  const maxCost = models.reduce((m, [, v]) => Math.max(m, v.costUSD), 0) || 1;
  const modelsHTML = models.length ? `<div class="tm-models">${models.map(([m, v]) => `
    <div class="tmodel"><span class="tmname">${esc(m)}</span><span class="tmbar"><i style="width:${Math.max(4, (v.costUSD / maxCost) * 100)}%"></i></span><span class="tmcost">${fmtUSD(v.costUSD)}</span></div>`).join('')}</div>` : '';

  const prompts = t.prompts || [];
  const promptsHTML = prompts.length
    ? `<div class="prompts">${prompts.map((p, i) => {
        const agNote = p.agentCostUSD > 0 ? ` <span class="prompt-ag" title="custo dos agentes disparados por este prompt">+${fmtUSD(p.agentCostUSD)} ag</span>` : '';
        return `<div class="prompt-item">
          <div class="prompt-meta">
            <span class="prompt-n">#${i + 1}</span>
            <span class="prompt-time">${fmtClock(p.ts)}</span>
            <span class="prompt-cost" title="main-loop ${fmtUSD(p.mainCostUSD)}${p.agentCostUSD > 0 ? ' · agentes ' + fmtUSD(p.agentCostUSD) : ''}">${fmtUSD(p.costUSD)}${agNote}</span>
          </div>
          <pre class="prompt-text">${esc(p.text)}</pre>
        </div>`;
      }).join('')}</div>`
    : `<div class="muted">Nenhum prompt de usuário capturado neste transcript.</div>`;

  const flat = flattenAgents(t.agents).filter((n) => n.startedAt).sort((a, b) => a.startedAt - b.startedAt);
  const timeline = flat.length ? `<div class="tm-tl">${flat.map((n) => `
      <div class="tm-tlrow">
        <span class="tm-tltime">${fmtClock(n.startedAt)}</span>
        <span class="run-ic">${agIcon(n.agentType)}</span>
        <span class="tm-tlbody"><b>${esc(n.agentType || 'agent')}</b>${n.depth ? ` <span class="run-slug">d${n.spawnDepth}</span>` : ''} <span class="run-desc">${esc((n.description || '').slice(0, 72))}</span></span>
        <span class="run-meta">${fmtUSD(n.subtreeCostUSD)}</span>
      </div>`).join('')}</div>` : `<div class="muted" style="padding:8px 0">Sem agentes.</div>`;

  app.innerHTML = `
    ${back}
    <div class="tpage-head">
      <h1>🖥️ ${esc(title)} ${badge}</h1>
      <div class="chips">${chips}</div>
      <div class="resume" style="max-width:560px"><code>${esc(t.resumeCommand || '')}</code><button class="copy-btn" data-copy="${esc(t.resumeCommand || '')}">copiar</button></div>
    </div>

    <div class="tm-hero">
      <div class="tm-cost"><span class="cur">$</span>${(t.totalCostUSD || 0).toFixed(2)}</div>
      <div class="tm-sub"><b>${fmtTok(t.totalTokens)}</b> tokens · <b>${t.agentCount}</b> agentes · <b>${dur}</b> · main-loop ${fmtUSD(t.own.costUSD)}</div>
    </div>
    ${modelsHTML}

    <div class="detail-grid">
      <div>
        <div class="section-title">Histórico de prompts <span class="count">${prompts.length}</span></div>
        ${promptsHTML}
      </div>
      <div>
        <div class="section-title sub" style="margin-top:0">Escadinha · agentes</div>
        <div class="tcard-body" style="border:1px solid var(--border-soft);border-radius:var(--radius)">${treeBodyHTML(sessionId, false)}</div>
        <div class="section-title sub">Timeline (${flat.length})</div>
        ${timeline}
      </div>
    </div>`;

  bindBack();
  bindCards();
}

function bindBack() {
  const b = el('backBtn');
  if (b) b.onclick = () => { location.hash = '#/'; };
}

function bindControls() {
  const fi = el('filterInput');
  if (fi) {
    fi.oninput = (e) => {
      state.q = e.target.value;
      render(); // render() preserva foco+cursor da busca
    };
  }
  const ss = el('sortSelect');
  if (ss) ss.onchange = (e) => { state.sort = e.target.value; render(); };
  const ps = el('projectSelect');
  if (ps) ps.onchange = (e) => { state.projectSlug = e.target.value; render(); };
}

function bindCards() {
  // expandir/recolher terminal
  document.querySelectorAll('.tcard-head[data-toggle]').forEach((h) => {
    h.onclick = (e) => {
      if (e.target.closest('[data-more]')) return;
      const sid = h.dataset.toggle;
      if (state.expanded.has(sid)) state.expanded.delete(sid);
      else {
        state.expanded.add(sid);
        if (!state.trees[sid]) loadTree(sid);
      }
      render();
    };
  });
  // "ver mais" → página exclusiva do terminal (URL própria)
  document.querySelectorAll('[data-more]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      location.hash = '#/t/' + encodeURIComponent(b.dataset.more);
    };
  });
  // expandir/recolher nó de agente
  document.querySelectorAll('[data-node-toggle]').forEach((c) => {
    c.onclick = (e) => {
      e.stopPropagation();
      const id = c.dataset.nodeToggle;
      if (state.expandedNodes.has(id)) state.expandedNodes.delete(id);
      else state.expandedNodes.add(id);
      render();
    };
  });
  // abrir modal de um nó de agente
  document.querySelectorAll('.tnode[data-node]').forEach((row) => {
    row.onclick = (e) => {
      if (e.target.closest('[data-node-toggle]') || e.target.closest('.copy-btn')) return;
      state.modal = { type: 'node', sessionId: row.dataset.session, nodeId: row.dataset.node };
      mountModal();
    };
  });
  // copiar comando de restaurar
  document.querySelectorAll('.copy-btn').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(b.dataset.copy).then(() => {
        b.textContent = '✓ copiado';
        b.classList.add('done');
        setTimeout(() => { b.textContent = 'copiar'; b.classList.remove('done'); }, 1600);
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
function usageBlockHTML(node) {
  const t = node.ownTokens || {};
  return `<h4>Custo & uso</h4>
    <div class="modal-times">
      <span>próprio <b>${fmtUSD(node.ownCostUSD)}</b></span>
      ${node.children && node.children.length ? `<span>subtree <b>${fmtUSD(node.subtreeCostUSD)}</b></span>` : ''}
      <span>modelo <b>${esc(node.model || '—')}</b></span>
      <span>tokens <b>${fmtTok(tokTotal(t))}</b></span>
    </div>
    <div class="usage-note">in ${fmtTok(t.input)} · out ${fmtTok(t.output)} · cache write ${fmtTok((t.cacheWrite5m || 0) + (t.cacheWrite1h || 0))} · cache read ${fmtTok(t.cacheRead)}</div>`;
}
function flattenAgents(agents) {
  const out = [];
  const walk = (n, d) => { out.push({ ...n, depth: d }); (n.children || []).forEach((c) => walk(c, d + 1)); };
  (agents || []).forEach((n) => walk(n, 0));
  return out;
}

function modalHTML() {
  if (!state.modal) return '';
  let head, body, running = false, sub = '';
  if (state.modal.type === 'run') {
    const run = state.agentRuns[state.modal.id];
    if (!run) return '';
    running = run.status === 'running';
    const dur = running ? fmtDuration(Date.now() - (run.startedAt || Date.now())) : fmtDuration((run.endedAt || 0) - (run.startedAt || 0));
    head = `${agIcon(run.agent)} ${esc(run.agent || 'agent')}`;
    sub = `${esc(run.slug || '')} · ${esc(run.description || '')}`;
    body = `<div class="modal-times">
        <span>início <b>${fmtClock(run.startedAt)}</b></span>
        <span>fim <b>${running ? '—' : fmtClock(run.endedAt)}</b></span>
        <span>duração <b>${dur || '—'}</b></span>
      </div>
      ${run.task || run.description ? `<h4>Tarefa</h4><pre class="modal-pre">${esc(run.task || run.description)}</pre>` : ''}
      ${run.result || running ? `<h4>Resultado ${running ? '<span class="muted">(rodando…)</span>' : ''}</h4><pre class="modal-pre">${esc(run.result || 'aguardando…')}</pre>` : ''}`;
  } else {
    const node = findNode(state.modal.sessionId, state.modal.nodeId);
    if (!node) return '';
    running = node.live;
    const hookRun = node.toolUseId ? state.agentRuns[node.toolUseId] : null;
    const dur = fmtDuration((node.endedAt || 0) - (node.startedAt || 0));
    head = `${agIcon(node.agentType)} ${esc(node.agentType || 'agent')}`;
    sub = `${esc(node.description || '')}${node.spawnDepth != null ? ` · profundidade ${node.spawnDepth}` : ''}`;
    body = `<div class="modal-times">
        <span>início <b>${fmtClock(node.startedAt)}</b></span>
        <span>fim <b>${running ? '—' : fmtClock(node.endedAt)}</b></span>
        <span>duração <b>${dur || '—'}</b></span>
      </div>
      ${usageBlockHTML(node)}
      ${hookRun && (hookRun.task || hookRun.description) ? `<h4>Tarefa</h4><pre class="modal-pre">${esc(hookRun.task || hookRun.description)}</pre>` : ''}
      ${hookRun && hookRun.result ? `<h4>Resultado</h4><pre class="modal-pre">${esc(hookRun.result)}</pre>` : ''}`;
  }
  return `<div class="modal-backdrop" id="modalBackdrop">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-head">
        <div>
          <div class="modal-title">${head} <span class="badge ${running ? 'active' : 'done'}">${running ? '● rodando' : 'concluído'}</span></div>
          <div class="muted" style="font-size:12px">${sub}</div>
        </div>
        <button class="btn" id="modalClose">✕</button>
      </div>
      ${body}
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
  host.innerHTML = modalHTML();
  if (state.modal) {
    const close = () => { state.modal = null; mountModal(); };
    const bd = el('modalBackdrop');
    if (bd) bd.onclick = close;
    const cl = el('modalClose');
    if (cl) cl.onclick = close;
    host.querySelectorAll('.copy-btn').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(b.dataset.copy).then(() => {
          b.textContent = '✓ copiado';
          b.classList.add('done');
          setTimeout(() => { b.textContent = 'copiar'; b.classList.remove('done'); }, 1600);
        });
      };
    });
  }
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
el('rescanBtn').onclick = async () => { await fetch('/api/rescan'); };
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

// mantém durações "ao vivo" da barra enquanto houver agentes rodando
setInterval(() => {
  if (runningRuns().length) renderLiveBar();
}, 1000);
