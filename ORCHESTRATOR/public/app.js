'use strict';

// ---------- estado ----------
const state = {
  snapshot: null,
  view: { type: 'deck' }, // {type:'deck'} | {type:'feature', slug, planFile}
  tab: 'andamento', // andamento | concluidas | todas | agentes
  filter: '',
  projectSlug: '', // filtro por projeto, compartilhado por todas as telas ('' = todos)
  sort: 'recent', // recent | oldest | progress | name
  liveEvents: [],
  agentRuns: {}, // runs consolidados por id (tarefa/resultado/timeline/log/usage)
  openRun: null, // id do run aberto no modal
  usage: null, // { slug, loading? , data? , error? }
};

const PHASES = [
  { key: 'pm', icon: '📋', label: 'PM' },
  { key: 'arquiteto', icon: '📐', label: 'Arq' },
  { key: 'dev', icon: '⚙️', label: 'Dev' },
  { key: 'techlead', icon: '🔍', label: 'TL' },
];

const TABS = [
  { key: 'andamento', icon: '⣷', label: 'Andamento' },
  { key: 'planejadas', icon: '📋', label: 'Planejadas' },
  { key: 'concluidas', icon: '✓', label: 'Concluídas' },
  { key: 'todas', icon: '≡', label: 'Todas' },
  { key: 'agentes', icon: '🤖', label: 'Agentes' },
];

const AGENT_ICON = { 'product-manager': '📋', 'arquiteto-senior': '📐', 'dev-senior': '⚙️', 'tech-lead': '🔍', 'engineering-manager': '🎯', qa: '🧪' };

const el = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fmtAge(min) {
  if (min == null || !isFinite(min)) return '—';
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}
function fmtDuration(ms) {
  if (ms == null || ms < 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m${String(s % 60).padStart(2, '0')}s`;
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
  return (t.input || 0) + (t.output || 0) + (t.cacheWrite5m || 0) + (t.cacheWrite1h || 0) + (t.cacheRead || 0);
}

// ---------- mermaid ----------
let mermaidReady = false;
if (window.mermaid) {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      fontSize: '12.5px',
      fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
      background: 'transparent',
      lineColor: '#3a4150',
      clusterBkg: 'rgba(255,255,255,0.02)',
      clusterBorder: '#2b3240',
      titleColor: '#8b93a3',
      edgeLabelBackground: '#191d27',
    },
    flowchart: { curve: 'basis', nodeSpacing: 26, rankSpacing: 46, padding: 10 },
  });
  mermaidReady = true;
}

// ---------- fetch ----------
async function fetchSnapshot() {
  try {
    const r = await fetch('/api/snapshot');
    state.snapshot = await r.json();
    if (state.snapshot.recentEvents && !state.liveEvents.length) {
      state.liveEvents = state.snapshot.recentEvents.slice(0, 100);
    }
    if (state.snapshot.agentRuns) {
      for (const run of state.snapshot.agentRuns) state.agentRuns[run.id] = { ...state.agentRuns[run.id], ...run };
    }
    render();
  } catch (e) {
    console.error('snapshot falhou', e);
  }
}

async function loadUsage(slug) {
  state.usage = { slug, loading: true };
  patchUsage();
  try {
    const r = await fetch('/api/usage?slug=' + encodeURIComponent(slug));
    const data = await r.json();
    mergeUsageIntoRuns(data, slug);
    state.usage = { slug, data };
  } catch (e) {
    state.usage = { slug, error: String(e) };
  }
  if (state.view.type === 'feature' && state.view.slug === slug) patchUsage();
}

// junta o custo por agente nos runs (casando por toolUseId); cria run "usage-only" p/ os sem hook
function mergeUsageIntoRuns(data, slug) {
  if (!data || !data.agents) return;
  for (const a of data.agents) {
    const id = a.toolUseId || `usage:${a.sessionId}:${a.file}`;
    a._runId = id;
    const run = state.agentRuns[id];
    if (run) {
      run.usage = a;
    } else {
      state.agentRuns[id] = {
        id,
        agent: a.agentType,
        description: a.description,
        slug,
        status: 'done',
        task: null,
        result: null,
        log: [],
        usage: a,
        _usageOnly: true,
      };
    }
  }
}

// ---------- SSE ----------
function connectStream() {
  const es = new EventSource('/api/stream');
  const conn = el('conn');
  es.addEventListener('hello', () => {
    conn.classList.add('live');
    el('connLabel').textContent = 'ao vivo';
  });
  es.addEventListener('snapshot', () => fetchSnapshot());
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
      render();
    } catch {}
  });
  es.onerror = () => {
    conn.classList.remove('live');
    el('connLabel').textContent = 'reconectando…';
  };
}

// ---------- helpers de dados ----------
function allPlans() {
  if (!state.snapshot) return [];
  const out = [];
  for (const p of state.snapshot.projects) {
    for (const pl of p.plans) out.push({ ...pl, projectName: p.name });
  }
  return out;
}
function findPlan(slug, planFile) {
  const proj = state.snapshot.projects.find((p) => p.slug === slug);
  if (!proj) return null;
  return proj.plans.find((pl) => pl.planFile === planFile) || null;
}
function currentEtapa(plan) {
  if (!plan.etapas || !plan.etapas.length) return null;
  return plan.etapas.find((e) => e.status === 'in_progress') || plan.etapas.find((e) => e.status === 'pending') || null;
}
function runsForSlug(slug) {
  return Object.values(state.agentRuns)
    .filter((r) => !slug || !r.slug || r.slug === slug)
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}
function activeAgents(slug) {
  const now = Date.now();
  return runsForSlug(slug)
    .filter((r) => r.agent && r.status === 'running' && r.startedAt && now - r.startedAt < 15 * 60000)
    .map((r) => r.agent);
}
// todos os runs de agente, de QUALQUER projeto (mesmo sem PLAN), do mais recente ao mais antigo
function allRuns() {
  return runsForSlug(null).filter((r) => !r._usageOnly && (r.agent || r.task || r.description) && r.startedAt);
}
// só os que estão rodando agora (janela de 15 min descarta runs órfãos sem evento de término)
function runningRuns() {
  const now = Date.now();
  return allRuns().filter((r) => r.status === 'running' && now - r.startedAt < 15 * 60000);
}
// projetos conhecidos (união de PLANs + runs); '—' = sem projeto, sempre por último
function allEpics() {
  if (!state.snapshot) return [];
  const out = [];
  for (const p of state.snapshot.projects) {
    for (const ep of p.epics || []) out.push({ ...ep, projectName: p.name });
  }
  return out.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
}
function visibleEpics() {
  let eps = allEpics();
  if (state.projectSlug) eps = eps.filter((e) => (e.slug || '—') === state.projectSlug);
  const q = state.filter.trim().toLowerCase();
  if (q) eps = eps.filter((e) => [e.title, e.slug, e.epicFile].some((s) => (s || '').toLowerCase().includes(q)));
  return eps;
}
function allSlugs() {
  const set = new Set();
  for (const p of allPlans()) if (p.slug) set.add(p.slug);
  for (const r of allRuns()) set.add(r.slug || '—');
  return [...set].sort((a, b) => (a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b)));
}
// <select> de projeto reutilizável (deck + aba Agentes) — compartilha state.projectSlug
function projectSelectHTML() {
  const slugs = allSlugs();
  if (state.projectSlug && !slugs.includes(state.projectSlug)) slugs.push(state.projectSlug); // preserva a seleção
  const opts = ['<option value="">Todos os projetos</option>']
    .concat(slugs.map((s) => `<option value="${esc(s)}" ${state.projectSlug === s ? 'selected' : ''}>${s === '—' ? '(sem projeto)' : esc(s)}</option>`))
    .join('');
  return `<label for="projectSelect">projeto</label><select class="select" id="projectSelect">${opts}</select>`;
}

// filtro por aba + busca + ordenação
// `planned` sai de "Andamento": um PLAN escrito de propósito e ainda não atacado
// (o normal depois de um /epic-workflow --so-planejar) não é trabalho em curso.
function tabOf(plan) {
  if (plan.liveness.state === 'done') return 'concluidas';
  if (plan.liveness.state === 'planned') return 'planejadas';
  return 'andamento';
}
function tabCounts() {
  const plans = allPlans();
  const c = { andamento: 0, planejadas: 0, concluidas: 0, todas: plans.length };
  for (const p of plans) c[tabOf(p)]++;
  c.agentes = allRuns().length;
  return c;
}
function visiblePlans() {
  let plans = allPlans();
  if (state.tab !== 'todas') plans = plans.filter((p) => tabOf(p) === state.tab);
  if (state.projectSlug) plans = plans.filter((p) => (p.slug || '—') === state.projectSlug);
  const q = state.filter.trim().toLowerCase();
  if (q) {
    plans = plans.filter((p) =>
      [p.title, p.projectName, p.slug, p.planFile].some((s) => (s || '').toLowerCase().includes(q))
    );
  }
  const cmp = {
    recent: (a, b) => (b.mtime || 0) - (a.mtime || 0),
    oldest: (a, b) => (a.mtime || 0) - (b.mtime || 0),
    progress: (a, b) => (b.progress?.percent || 0) - (a.progress?.percent || 0),
    name: (a, b) => (a.title || '').localeCompare(b.title || ''),
  }[state.sort];
  return plans.slice().sort(cmp);
}

// ---------- componentes deck ----------
function pipelineHTML(phases) {
  return (
    '<div class="pipeline">' +
    PHASES.map((ph, i) => {
      const st = (phases && phases[ph.key]) || 'pending';
      const conn = i < PHASES.length - 1 ? `<div class="connector"></div>` : '';
      return `<div class="phase ${st}" title="${ph.label}: ${st}"><div class="node">${ph.icon}</div>${conn}</div>`;
    }).join('') +
    '</div>'
  );
}
// `unit` porque a barra serve às duas altitudes: o PLAN conta etapas, o épico
// conta features.
function progressHTML(pr, unit = 'etapas') {
  const pct = pr ? pr.percent : 0;
  return `<div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="progress-meta"><span>${pr ? pr.done : 0}/${pr ? pr.total : 0} ${unit}</span><span>${pct}%</span></div>
  </div>`;
}
const BADGE_TEXT = {
  active: '● ativo',
  in_progress: 'em progresso',
  planned: '📋 planejada',
  recent: 'recente',
  done: 'concluído',
};

// Chip do épico: só existe quando o PLAN declara `**Épico**` (planejar.md § Modo
// Épico) ou quando o épico o referencia. Feature avulsa não ganha chip.
function epicChipHTML(plan) {
  if (!plan.epicFile) return '';
  const wave = plan.epicWave ? ` · onda ${plan.epicWave}` : '';
  const fid = plan.featureId ? `${plan.featureId} · ` : '';
  return `<div class="card-sub epic-chip" title="${esc(plan.epicTitle || plan.epicFile)}">🧩 ${fid}${esc(plan.epicTitle || plan.epicFile)}${wave}</div>`;
}

function cardHTML(plan) {
  const lv = plan.liveness || { state: 'done', ageMin: null };
  const cur = currentEtapa(plan);
  const running = activeAgents(plan.slug);
  const live = lv.state === 'active' || lv.state === 'in_progress' || running.length > 0;
  const badgeText = BADGE_TEXT[lv.state];
  const conflict = plan.progress && plan.progress.conflict;
  return `<div class="card ${live ? 'live' : ''}" data-slug="${esc(plan.slug)}" data-plan="${esc(plan.planFile)}">
    <div class="card-head">
      <div>
        <div class="card-title">${esc(plan.title || plan.planFile)}</div>
        <div class="card-sub">${esc(plan.projectName || plan.slug)} · ${fmtAge(lv.ageMin)}</div>
      </div>
      <span class="badge ${lv.state}">${badgeText}</span>
    </div>
    ${epicChipHTML(plan)}
    ${pipelineHTML(plan.phases)}
    ${progressHTML(plan.progress)}
    ${conflict ? `<div class="card-sub conflict" title="O PLAN se contradiz — o dashboard não escolhe um lado">⚠️ ${esc(conflict)}</div>` : ''}
    ${running.length ? `<div class="card-sub" style="color:var(--running)">⣷ ${running.map(esc).join(', ')} rodando agora</div>` : ''}
    ${cur ? `<div class="card-sub">▸ próxima: <b>ETAPA ${cur.n}</b> — ${esc(cur.title)}</div>` : ''}
  </div>`;
}

// Card do épico — a altitude que faltava. Mostra o que o épico decidiu (ondas,
// paralelismo) e o que o humano precisa revisar (premissas de negócio), que é o
// único conteúdo do relatório que exige ação dele.
function epicCardHTML(ep) {
  const pr = ep.progress || {};
  const st = pr.statusKey || 'pending';
  const nWaves = (ep.waves || []).length;
  const par = nWaves ? (ep.features.length / nWaves).toFixed(1) : null;
  const badge = pr.planOnly ? '📋 planejado' : (BADGE_TEXT[st] || st);
  return `<div class="card epic-card" data-epic-slug="${esc(ep.slug)}" data-epic="${esc(ep.epicFile)}">
    <div class="card-head">
      <div>
        <div class="card-title">🧩 ${esc(ep.title || ep.epicFile)}</div>
        <div class="card-sub">${esc(ep.projectName || ep.slug)}${ep.entryMode ? ' · ' + esc(ep.entryMode) : ''}${pr.phase ? ' · ' + esc(pr.phase) : ''}</div>
      </div>
      <span class="badge ${st}">${badge}</span>
    </div>
    ${progressHTML({ done: pr.done, total: pr.total, percent: pr.percent }, 'features')}
    <div class="card-sub">${ep.features.length} features${nWaves ? ` · ${nWaves} ondas · ${par} features/onda` : ''}${pr.blocked ? ` · <b>${pr.blocked} bloqueada(s)</b>` : ''}</div>
    ${pr.planOnly ? `<div class="card-sub epic-chip">nenhuma linha de código — <code>--so-planejar</code></div>` : ''}
    ${ep.premissasNegocio ? `<div class="card-sub conflict">⚠️ ${ep.premissasNegocio} premissa(s) de negócio pra revisar</div>` : ''}
  </div>`;
}

function toolbarHTML() {
  const opt = (v, l) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="toolbar">
    <div class="grow"><input class="input" id="filterInput" type="search" placeholder="Filtrar por título…" value="${esc(state.filter)}" /></div>
    ${projectSelectHTML()}
    <label for="sortSelect">ordenar</label>
    <select class="select" id="sortSelect">
      ${opt('recent', 'Mais recentes')}
      ${opt('oldest', 'Mais antigas')}
      ${opt('progress', 'Progresso')}
      ${opt('name', 'Nome (A–Z)')}
    </select>
  </div>`;
}

function renderDeck() {
  const plans = visiblePlans();
  const tabMeta = TABS.find((t) => t.key === state.tab);
  let html = `<div class="section-title">${tabMeta.label} <span class="count">${plans.length}</span></div>`;
  html += toolbarHTML();
  // Épicos primeiro, e só nas abas onde eles dizem algo: em "Concluídas" e
  // "Agentes" seriam ruído.
  const eps = state.tab === 'andamento' || state.tab === 'planejadas' || state.tab === 'todas' ? visibleEpics() : [];
  if (eps.length) {
    html += `<div class="section-title sub">Épicos <span class="count">${eps.length}</span></div>`;
    html += `<div class="grid">${eps.map(epicCardHTML).join('')}</div>`;
    html += `<div class="section-title sub">Features <span class="count">${plans.length}</span></div>`;
  }
  html += plans.length
    ? `<div class="grid">${plans.map(cardHTML).join('')}</div>`
    : `<div class="empty">${state.filter ? 'Nada encontrado para esse filtro.' : 'Nenhuma feature aqui. Rode <code>/feature-workflow</code> num terminal e ela aparece.'}</div>`;
  el('app').innerHTML = html;
  bindDeckControls();
  bindCards();
}

function bindDeckControls() {
  const fi = el('filterInput');
  if (fi) {
    fi.oninput = (e) => {
      state.filter = e.target.value;
      const grid = el('app').querySelector('.grid');
      const plans = visiblePlans();
      const host = el('app');
      const count = host.querySelector('.section-title .count');
      if (count) count.textContent = plans.length;
      if (plans.length) {
        if (grid) grid.innerHTML = plans.map(cardHTML).join('');
        else renderDeck();
      } else {
        renderDeck();
        return;
      }
      bindCards();
    };
    // mantém foco/cursor ao redigitar
    fi.focus();
    fi.setSelectionRange(fi.value.length, fi.value.length);
  }
  const ss = el('sortSelect');
  if (ss) ss.onchange = (e) => { state.sort = e.target.value; renderDeck(); };
  const ps = el('projectSelect');
  if (ps) ps.onchange = (e) => { state.projectSlug = e.target.value; renderDeck(); };
}

// ---------- DAG ----------
function dagDefinition(plan) {
  const byLevel = {};
  for (const e of plan.etapas) (byLevel[e.level] = byLevel[e.level] || []).push(e);
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);
  const short = (t) => (t.length > 26 ? t.slice(0, 24) + '…' : t);
  let def = 'flowchart TD\n';
  for (const lv of levels) {
    def += `  subgraph L${lv}["Onda ${lv + 1}"]\n  direction LR\n`;
    for (const e of byLevel[lv]) {
      const par = e.parallelizable === true ? ' ∥' : '';
      def += `    E${e.n}["ETAPA ${e.n}${par}<br/>${short(e.title).replace(/"/g, "'")}"]:::${e.status}\n`;
    }
    def += '  end\n';
  }
  for (const e of plan.etapas) {
    for (const d of e.deps) {
      if (plan.etapas.some((x) => x.n === d)) def += `  E${d} --> E${e.n}\n`;
    }
  }
  def += `  classDef done fill:#15281b,stroke:#4bbf6b,color:#8fe6a3,stroke-width:1.4px;\n`;
  def += `  classDef in_progress fill:#16233a,stroke:#5b9dff,color:#a9cdff,stroke-width:1.4px;\n`;
  def += `  classDef pending fill:#1c212c,stroke:#39414f,color:#7e8899,stroke-width:1.2px;\n`;
  def += `  classDef blocked fill:#2b1518,stroke:#e5646a,color:#ffb0b3,stroke-width:1.4px;\n`;
  return def;
}

// ---------- feature detail ----------
async function renderFeature() {
  const plan = findPlan(state.view.slug, state.view.planFile);
  if (!plan) { state.view = { type: 'deck' }; return render(); }

  const app = el('app');
  app.innerHTML = `
    <a class="back" id="backBtn">← voltar</a>
    <div class="detail-head">
      <h1>${esc(plan.title || plan.planFile)}</h1>
      <div class="chips">
        <span class="chip">${esc(plan.projectName || plan.slug)}</span>
        ${plan.branch ? `<span class="chip">branch <code>${esc(plan.branch)}</code></span>` : ''}
        ${plan.complexity ? `<span class="chip">${esc(plan.complexity)}</span>` : ''}
        ${plan.updatedAt ? `<span class="chip">atualizado ${esc(plan.updatedAt)}</span>` : ''}
        <span class="chip">${plan.plannedWaves} ondas (topo)</span>
      </div>
      ${pipelineHTML(plan.phases)}
      <div style="max-width:420px">${progressHTML(plan.progress)}</div>
      ${plan.progress && plan.progress.statusLine ? `<div class="muted" style="font-size:12.5px">${esc(plan.progress.statusLine)}</div>` : ''}
    </div>

    <div class="detail-grid">
      <div style="display:flex;flex-direction:column;gap:20px">
        <details class="collapse" id="dagBox">
          <summary><span class="caret">▶</span> Grafo de ondas · dependências <span class="hint">clique para expandir</span></summary>
          <div class="collapse-body"><div class="dag" id="dag"><div class="muted">renderizando…</div></div></div>
        </details>

        <div class="panel">
          <h3>Etapas</h3>
          ${plan.etapas.map((e) => `
            <div class="etapa-row">
              <span class="sdot ${e.status}"></span>
              <span class="en">${e.n}</span>
              <span class="et">${esc(e.title)}</span>
              ${e.commit ? `<code class="muted" style="font-size:11px">${esc(e.commit.slice(0, 7))}</code>` : ''}
              <span class="par ${e.parallelizable ? 'yes' : ''}">${e.parallelizable === true ? '∥ paralelo' : e.parallelizable === false ? '— seq' : ''}</span>
            </div>`).join('')}
        </div>

        <div class="panel">
          <h3>Agentes & custo</h3>
          <div id="agentTable"><div class="skeleton">calculando custo por agente…</div></div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="panel">
          <h3>Custo & uso <button class="btn icon" id="usageRefresh" title="Recalcular" style="float:right;margin-top:-4px">↻</button></h3>
          <div id="usageHero"><div class="skeleton">carregando /usage…</div></div>
          <div id="usageModels"></div>
        </div>

        <div class="panel">
          <h3>Sessões do Claude</h3>
          <div id="usageSessions"><div class="skeleton">localizando sessões…</div></div>
        </div>

        ${plan.warnings && plan.warnings.length ? `<div class="panel">
          <h3>⚠️ Pendências & avisos</h3>
          ${plan.warnings.map((w) => `<div class="warn-item">${esc(w)}</div>`).join('')}
        </div>` : ''}

        <div class="panel">
          <h3>● Ao vivo (agentes)</h3>
          <div class="live-log" id="liveLog">${liveLogHTML(plan.slug)}</div>
        </div>

        ${plan.waves && plan.waves.length ? `<div class="panel">
          <h3>Timeline de ondas</h3>
          <div class="timeline">
            ${plan.waves.slice().reverse().map((w) => `
              <div class="tl-item">
                <div class="tl-head">Onda ${w.n}<span class="date">${esc(w.date)}</span></div>
                <div class="tl-body">${esc(w.text.slice(0, 180))}${w.text.length > 180 ? '…' : ''}</div>
                <div class="tl-etapas">
                  ${w.etapas.map((n) => `<span class="tl-tag">E${n}</span>`).join('')}
                  ${w.commits.slice(0, 3).map((c) => `<span class="tl-tag">${esc(c.slice(0, 7))}</span>`).join('')}
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>`;

  el('backBtn').onclick = () => { state.view = { type: 'deck' }; render(); };
  const rf = el('usageRefresh');
  if (rf) rf.onclick = () => loadUsage(plan.slug);
  bindRuns();
  patchUsage();

  // renderiza o DAG (mesmo colapsado — o svg fica pronto ao abrir)
  const host = el('dag');
  if (mermaidReady && plan.etapas.length) {
    try {
      const { svg } = await mermaid.render('dagSvg' + Date.now(), dagDefinition(plan));
      host.innerHTML = svg;
    } catch (err) {
      host.innerHTML = `<div class="muted">DAG indisponível (${esc(err.message)}). Veja a lista de etapas.</div>`;
    }
  } else {
    host.innerHTML = `<div class="muted">Mermaid não carregou — veja a lista de etapas.</div>`;
  }
}

// preenche os painéis de custo (sem re-renderizar o DAG)
function patchUsage() {
  if (state.view.type !== 'feature') return;
  const slug = state.view.slug;
  const hero = el('usageHero');
  const models = el('usageModels');
  const sessions = el('usageSessions');
  const table = el('agentTable');
  if (!hero) return;

  const uz = state.usage && state.usage.slug === slug ? state.usage : null;

  if (!uz || uz.loading) {
    hero.innerHTML = `<div class="skeleton">carregando /usage…</div>`;
    if (models) models.innerHTML = '';
    if (sessions) sessions.innerHTML = `<div class="skeleton">localizando sessões…</div>`;
    if (table) table.innerHTML = `<div class="skeleton">calculando custo por agente…</div>`;
    if (!uz) loadUsage(slug); // dispara a busca na primeira montagem
    return;
  }
  if (uz.error) {
    hero.innerHTML = `<div class="muted">Falha ao calcular custo: ${esc(uz.error)}</div>`;
    return;
  }

  const d = uz.data;
  const noData = (!d.sessions || !d.sessions.length) && (!d.agents || !d.agents.length);

  // hero: custo total + tokens
  const tt = tokTotal(d.total.tokens);
  hero.innerHTML = noData
    ? `<div class="muted" style="font-size:12.5px">Sem transcripts localizados para esta feature.${d.inferred ? '' : ' Rode com os hooks ativos para capturar as sessões.'}</div>`
    : `<div class="usage-hero">
        <div class="usage-cost"><span class="cur">$</span>${d.total.costUSD.toFixed(2).replace(/^0\./, '0.')}</div>
        <div class="usage-sub">
          <b>${fmtTok(tt)}</b> tokens · <b>${d.sessions.length}</b> ${d.sessions.length === 1 ? 'sessão' : 'sessões'} · <b>${d.agents.length}</b> agentes
        </div>
      </div>`;

  // por modelo
  if (models) {
    const entries = Object.entries(d.byModel || {}).sort((a, b) => b[1].costUSD - a[1].costUSD);
    const max = entries.reduce((m, [, v]) => Math.max(m, v.costUSD), 0) || 1;
    models.innerHTML = entries.length
      ? `<div class="usage-models" style="margin-top:12px">${entries
          .map(([model, v]) => `<div class="umodel">
            <span class="mname">${esc(model)}</span>
            <span class="umbar"><i style="width:${Math.max(4, (v.costUSD / max) * 100)}%"></i></span>
            <span class="mcost">${fmtUSD(v.costUSD)}</span>
          </div>`)
          .join('')}</div>`
      : '';
  }

  // sessões + comando de restaurar
  if (sessions) {
    sessions.innerHTML = (d.sessions && d.sessions.length)
      ? d.sessions
          .map((s, i) => `<div class="session-item">
            <div class="session-head">
              <span class="smodel">${esc(s.model || 'sessão')}</span>
              <span class="scost">${fmtUSD(s.total.costUSD)}</span>
            </div>
            <div class="resume">
              <code id="resume${i}">${esc(s.resumeCommand)}</code>
              <button class="copy-btn" data-copy="${esc(s.resumeCommand)}">copiar</button>
            </div>
          </div>`)
          .join('') + (d.inferred ? `<div class="usage-note">Sessões inferidas pelo diretório de trabalho (buffer de hooks vazio após restart).</div>` : '')
      : `<div class="muted" style="font-size:12.5px">Nenhuma sessão localizada.</div>`;
    sessions.querySelectorAll('.copy-btn').forEach((b) => {
      b.onclick = () => {
        navigator.clipboard.writeText(b.dataset.copy).then(() => {
          b.textContent = '✓ copiado';
          b.classList.add('done');
          setTimeout(() => { b.textContent = 'copiar'; b.classList.remove('done'); }, 1600);
        });
      };
    });
  }

  // tabela de agentes (clicável)
  if (table) {
    table.innerHTML = (d.agents && d.agents.length)
      ? `<table class="atable">
          <thead><tr><th>Agente</th><th>Tarefa</th><th>Modelo</th><th class="num">Tokens</th><th class="num">Custo</th><th></th></tr></thead>
          <tbody>
            ${d.agents
              .map((a) => `<tr data-run="${esc(a._runId)}">
                <td><span class="ag">${AGENT_ICON[a.agentType] || '🤖'} ${esc(a.agentType || 'agent')}</span></td>
                <td><div class="adesc">${esc(a.description || '—')}</div></td>
                <td><span class="amodel">${esc(a.model || '—')}</span></td>
                <td class="num">${fmtTok(tokTotal(a.tokens))}</td>
                <td class="num acost">${fmtUSD(a.costUSD)}</td>
                <td class="num"><span class="link-ic">↗</span></td>
              </tr>`)
              .join('')}
          </tbody>
        </table>`
      : `<div class="muted" style="font-size:12.5px">Nenhum subagente com custo registrado ainda.</div>`;
    table.querySelectorAll('tr[data-run]').forEach((tr) => {
      tr.onclick = () => { state.openRun = tr.dataset.run; mountModal(); };
    });
  }
}

// lista de runs clicáveis (o que cada agente está/esteve fazendo)
function liveLogHTML(slug) {
  const runs = runsForSlug(slug)
    .filter((r) => !r._usageOnly && (r.agent || r.task || r.description) && r.startedAt)
    .slice(0, 40);
  if (!runs.length) {
    return `<div class="muted">Sem atividade de agente ainda. Quando o <code>feature-workflow</code> delegar, cada agente aparece aqui — clique para ver a tarefa e o resultado.</div>`;
  }
  return runs
    .map((r) => {
      const running = r.status === 'running';
      const dur = running
        ? fmtDuration(Date.now() - (r.startedAt || Date.now()))
        : fmtDuration((r.endedAt || 0) - (r.startedAt || 0));
      const label = r.description || (r.task ? r.task.split('\n')[0] : '') || '—';
      const cost = r.usage ? ` · ${fmtUSD(r.usage.costUSD)}` : '';
      return `<div class="run-row ${running ? 'running' : ''}" data-run="${esc(r.id)}">
        <span class="run-ic">${AGENT_ICON[r.agent] || '🤖'}</span>
        <span class="run-body">
          <span class="run-agent">${esc(r.agent || 'agent')}</span>
          <span class="run-desc">${esc(label.slice(0, 60))}${label.length > 60 ? '…' : ''}</span>
        </span>
        <span class="run-meta">${running ? '<i class="spin">⣷</i> ' : ''}${dur}${cost}</span>
      </div>`;
    })
    .join('');
}

// linha de run reutilizável (barra fixa + aba Agentes) — inclui o projeto (slug)
function runRowHTML(r) {
  const running = r.status === 'running';
  const dur = running
    ? fmtDuration(Date.now() - (r.startedAt || Date.now()))
    : fmtDuration((r.endedAt || 0) - (r.startedAt || 0));
  const label = r.description || (r.task ? r.task.split('\n')[0] : '') || '—';
  const cost = r.usage ? ` · ${fmtUSD(r.usage.costUSD)}` : '';
  return `<div class="run-row ${running ? 'running' : ''}" data-run="${esc(r.id)}">
    <span class="run-ic">${AGENT_ICON[r.agent] || '🤖'}</span>
    <span class="run-body">
      <span class="run-agent">${esc(r.agent || 'agent')}${r.slug ? ` <span class="run-slug">· ${esc(r.slug)}</span>` : ''}</span>
      <span class="run-desc">${esc(label.slice(0, 72))}${label.length > 72 ? '…' : ''}</span>
    </span>
    <span class="run-meta">${running ? '<i class="spin">⣷</i> ' : ''}${dur}${cost}</span>
  </div>`;
}

// aba "Agentes": TODOS os runs, de qualquer projeto (com ou sem PLAN) — ativos primeiro
function renderAgents() {
  const all = allRuns();
  const q = state.filter.trim().toLowerCase();
  const matchText = (r) => !q || [r.agent, r.slug, r.description, r.task].some((s) => (s || '').toLowerCase().includes(q));
  const matchSlug = (r) => !state.projectSlug || (r.slug || '—') === state.projectSlug;
  const runs = all.filter(matchSlug).filter(matchText);
  const rr = runs.filter((r) => r.status === 'running');
  const dd = runs.filter((r) => r.status !== 'running');

  let html = `<div class="section-title">Agentes <span class="count">${rr.length + dd.length}</span></div>`;
  html += `<div class="toolbar">
      <div class="grow"><input class="input" id="filterInput" type="search" placeholder="Filtrar por agente, tarefa…" value="${esc(state.filter)}" /></div>
      ${projectSelectHTML()}
    </div>`;
  if (!all.length) {
    html += `<div class="empty">Nenhum agente disparado ainda.<br/>Assim que você rodar qualquer agente em qualquer terminal, ele aparece aqui — ao vivo.</div>`;
  } else if (!runs.length) {
    html += `<div class="empty">Nenhum agente para este filtro.</div>`;
  } else {
    if (rr.length) html += `<div class="agroup"><div class="agroup-h">⣷ rodando agora <span>${rr.length}</span></div>${rr.map(runRowHTML).join('')}</div>`;
    html += `<div class="agroup"><div class="agroup-h">recentes <span>${dd.length}</span></div>${dd.length ? dd.map(runRowHTML).join('') : '<div class="muted" style="font-size:12px;padding:6px 10px">nada por enquanto</div>'}</div>`;
  }
  el('app').innerHTML = html;
  const fi = el('filterInput');
  if (fi) {
    fi.oninput = (e) => { state.filter = e.target.value; renderAgents(); };
    fi.focus();
    fi.setSelectionRange(fi.value.length, fi.value.length);
  }
  const ss = el('projectSelect');
  if (ss) ss.onchange = (e) => { state.projectSlug = e.target.value; renderAgents(); };
  bindRuns();
}

// barra fixa "rodando agora" — visível em qualquer aba/view; some quando não há agentes ativos
function renderLiveBar() {
  const bar = el('liveBar');
  if (!bar) return;
  const running = runningRuns();
  if (!running.length) { bar.hidden = true; bar.innerHTML = ''; return; }
  bar.hidden = false;
  bar.innerHTML = `<div class="livebar-h">⣷ rodando agora <span>${running.length}</span></div>
    <div class="livebar-list">${running.map(runRowHTML).join('')}</div>`;
  bar.querySelectorAll('.run-row').forEach((row) => {
    row.onclick = () => { state.openRun = row.dataset.run; mountModal(); };
  });
}

// ---------- modal de detalhe do run ----------
function usageBlockHTML(u) {
  if (!u) return '';
  const t = u.tokens || {};
  return `<h4>Custo & uso</h4>
    <div class="modal-times">
      <span>custo <b>${fmtUSD(u.costUSD)}</b></span>
      <span>modelo <b>${esc(u.model || '—')}</b></span>
      <span>tokens <b>${fmtTok(tokTotal(t))}</b></span>
    </div>
    <div class="usage-note">
      in ${fmtTok(t.input)} · out ${fmtTok(t.output)} · cache write ${fmtTok((t.cacheWrite5m || 0) + (t.cacheWrite1h || 0))} · cache read ${fmtTok(t.cacheRead)}
    </div>`;
}
function runModalHTML() {
  const run = state.openRun ? state.agentRuns[state.openRun] : null;
  if (!run) return '';
  const running = run.status === 'running';
  const dur = running
    ? fmtDuration(Date.now() - (run.startedAt || Date.now()))
    : fmtDuration((run.endedAt || 0) - (run.startedAt || 0));
  return `<div class="modal-backdrop" id="modalBackdrop">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-head">
        <div>
          <div class="modal-title">${AGENT_ICON[run.agent] || '🤖'} ${esc(run.agent || 'agent')}
            <span class="badge ${running ? 'active' : 'done'}">${running ? '● rodando' : 'concluído'}</span>
          </div>
          <div class="muted" style="font-size:12px">${esc(run.slug || '')}${run.usage && run.usage.sessionId ? ' · sessão ' + esc(run.usage.sessionId.slice(0, 8)) : ''} · ${esc(run.description || '')}</div>
        </div>
        <button class="btn" id="modalClose">✕</button>
      </div>

      ${run._usageOnly ? '' : `<div class="modal-times">
        <span>início <b>${fmtClock(run.startedAt)}</b></span>
        <span>fim <b>${running ? '—' : fmtClock(run.endedAt)}</b></span>
        <span>duração <b>${dur || '—'}</b></span>
      </div>`}

      ${usageBlockHTML(run.usage)}

      ${run.task || run.description ? `<h4>Tarefa</h4>
      <pre class="modal-pre">${esc(run.task || run.description)}</pre>` : ''}

      ${run.result || running ? `<h4>Resultado ${running ? '<span class="muted">(ainda rodando…)</span>' : ''}</h4>
      <pre class="modal-pre">${esc(run.result || (running ? 'aguardando o agente terminar…' : '(sem resultado capturado)'))}</pre>` : ''}

      ${run.log && run.log.length ? `<h4>Log de eventos</h4>
      <div class="modal-log">
        ${run.log.map((l) => `<div><span class="muted">${fmtClock(l.ts)}</span> ${esc(l.event)} <b>${esc(l.status)}</b>${l.toolName ? ' · ' + esc(l.toolName) : ''}</div>`).join('')}
      </div>` : ''}
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
  host.innerHTML = runModalHTML();
  if (state.openRun) {
    const close = () => { state.openRun = null; mountModal(); };
    el('modalBackdrop').onclick = close;
    el('modalClose').onclick = close;
  }
}
function bindRuns() {
  document.querySelectorAll('.run-row').forEach((row) => {
    row.onclick = () => { state.openRun = row.dataset.run; mountModal(); };
  });
}

// ---------- sidebar ----------
function renderSidebar() {
  const counts = tabCounts();
  el('sideNav').innerHTML = TABS.map((t) => `
    <div class="side-link ${state.view.type === 'deck' && state.tab === t.key ? 'active' : ''}" data-tab="${t.key}">
      <span class="si">${t.icon}</span><span>${t.label}</span><span class="sc">${counts[t.key]}</span>
    </div>`).join('');
  el('sideNav').querySelectorAll('.side-link').forEach((lnk) => {
    lnk.onclick = () => {
      state.tab = lnk.dataset.tab;
      state.view = { type: 'deck' };
      render();
    };
  });
  const wt = state.snapshot ? state.snapshot.projects.reduce((n, p) => n + (p.worktrees ? p.worktrees.length : 0), 0) : 0;
  el('sideFoot').innerHTML = `${state.snapshot ? state.snapshot.projects.length : 0} projetos · ${wt} worktrees<br/><code>/feature-workflow</code>`;
}

// ---------- render dispatcher ----------
function render() {
  if (!state.snapshot) { el('app').innerHTML = '<div class="empty">Carregando…</div>'; return; }
  el('rootPath').textContent = state.snapshot.root || '';
  renderSidebar();
  renderLiveBar();
  if (state.view.type === 'feature') renderFeature();
  else if (state.tab === 'agentes') renderAgents();
  else renderDeck();
  mountModal();
}

function bindCards() {
  document.querySelectorAll('.card').forEach((c) => {
    c.onclick = () => {
      state.view = { type: 'feature', slug: c.dataset.slug, planFile: c.dataset.plan };
      state.usage = null; // força recarga do custo p/ a nova feature
      render();
    };
  });
}

// ---------- boot ----------
el('rescanBtn').onclick = async () => { await fetch('/api/rescan'); };
el('brandHome').onclick = () => { state.view = { type: 'deck' }; render(); };
connectStream();
fetchSnapshot();

// mantém as durações "ao vivo" enquanto houver agentes rodando (sem re-render se estiver digitando o filtro)
setInterval(() => {
  if (!state.snapshot || !runningRuns().length) return;
  renderLiveBar();
  const fi = el('filterInput');
  const ss = el('projectSelect');
  const busy = (fi && document.activeElement === fi) || (ss && document.activeElement === ss);
  if (state.view.type === 'deck' && state.tab === 'agentes' && !busy) renderAgents();
}, 1000);
