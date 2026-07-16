'use strict';

// Parser determinístico de um arquivo PLAN do ai-flow.
// Transforma o markdown (estrutura previsível descrita em CONVENTIONS.md) num
// objeto estruturado que o dashboard consome. Tolerante a PLANs antigos:
// campos ausentes (ex.: Paralelizável) viram `null`, nunca quebram o parse.

const STATUS_MAP = [
  { re: /(✅|🟢|conclu[íi])/i, key: 'done', label: 'Concluída' },
  { re: /(⏳|🔄|em andamento|em progresso|wip)/i, key: 'in_progress', label: 'Em andamento' },
  { re: /(❌|🔴|bloquead|falh)/i, key: 'blocked', label: 'Bloqueada' },
  { re: /(pendente|⬜|🟡|a fazer|todo)/i, key: 'pending', label: 'Pendente' },
];

function normalizeStatus(raw) {
  if (!raw) return { key: 'pending', label: 'Pendente' };
  for (const s of STATUS_MAP) {
    if (s.re.test(raw)) return { key: s.key, label: s.label };
  }
  return { key: 'pending', label: 'Pendente' };
}

// "ETAPA 1", "ETAPAS 3, 4, 5", "ETAPA 2 (GameConfig)" -> [1], [3,4,5], [2]
function extractEtapaNumbers(text) {
  if (!text) return [];
  if (/\bnenhuma\b/i.test(text)) return [];
  const nums = new Set();
  const re = /\bETAPAS?\s+([\d,\se]+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const chunk = m[1];
    const parts = chunk.match(/\d+/g) || [];
    for (const p of parts) nums.add(Number(p));
  }
  // fallback: números soltos quando o campo é só "3, 4"
  if (nums.size === 0) {
    const parts = text.match(/\d+/g);
    if (parts) parts.forEach((p) => nums.add(Number(p)));
  }
  return [...nums].sort((a, b) => a - b);
}

function parseFieldValue(line) {
  // "**Campo:** valor" ou "**Campo**: valor"
  const m = line.match(/^\*\*[^*]+\*\*:?\s*(.*)$/);
  return m ? m[1].trim() : '';
}

function parseProgress(headerBlock) {
  const out = { done: null, total: null, percent: null, statusLine: null };
  const statusM = headerBlock.match(/^\*\*Status:?\*\*:?\s*(.+)$/m);
  if (statusM) out.statusLine = statusM[1].trim();
  // Fallback: "## PROGRESSO GERAL — ✅ Concluído (2026-07-16)". Fora do template
  // (planejar.md § PROGRESSO GERAL manda uma linha `**Status**:`), mas acontece —
  // e sem isto o PLAN fica sem status nenhum, que é pior que um status informal.
  if (!out.statusLine) {
    const headM = headerBlock.match(/^##\s*PROGRESSO GERAL\s*[—–-]\s*(.+)$/im);
    if (headM) out.statusLine = headM[1].trim();
  }

  const progM = headerBlock.match(/^\*\*Progresso:?\*\*:?\s*(.+)$/m);
  if (progM) {
    const line = progM[1];
    const frac = line.match(/(\d+)\s*\/\s*(\d+)/);
    if (frac) {
      out.done = Number(frac[1]);
      out.total = Number(frac[2]);
    }
    const pct = line.match(/(\d+)\s*%/);
    if (pct) out.percent = Number(pct[1]);
  }
  if (out.percent == null && out.done != null && out.total) {
    out.percent = Math.round((out.done / out.total) * 100);
  }
  return out;
}

// Log de ondas: "> **Onda 4 fechada (2026-07-10):** ETAPAs 4 ✅ ..."
function parseWaves(text) {
  const waves = [];
  const re = /^>\s*\*\*Onda\s+(\d+)\s+fechada\s*\(([^)]*)\):\*\*\s*(.*)$/gim;
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1]);
    const date = m[2].trim();
    const body = m[3].trim();
    const commits = [...body.matchAll(/`([0-9a-f]{6,40})`/g)].map((x) => x[1]);
    const etapas = extractEtapaNumbers(body);
    waves.push({ n, date, etapas, commits, text: body });
  }
  return waves.sort((a, b) => a.n - b.n);
}

// Pendências/avisos marcados com ⚠️ dentro do bloco de progresso.
function parseWarnings(headerBlock) {
  return headerBlock
    .split('\n')
    .filter((l) => /⚠️|⛔|⏳ Pend/i.test(l))
    .map((l) => l.replace(/^>\s?/, '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

function splitSections(md) {
  // separa cabeçalho (tudo antes de "## ETAPAS") das etapas
  const idx = md.search(/^##\s+ETAPAS/im);
  if (idx === -1) return { header: md, body: '' };
  return { header: md.slice(0, idx), body: md.slice(idx) };
}

function parseEtapas(body) {
  const etapas = [];
  // cada etapa começa em "### ETAPA N: título"
  const re = /^###\s+ETAPA\s+(\d+)\s*:?\s*(.*)$/gim;
  const matches = [...body.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const n = Number(m[1]);
    const title = (m[2] || '').trim();
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    const block = body.slice(start, end);

    // dois-pontos pode estar dentro (`**Status:**`) ou fora (`**Status**:`) do negrito
    const statusM = block.match(/^\*\*Status:?\*\*:?\s*(.+)$/m);
    const status = normalizeStatus(statusM ? statusM[1] : '');

    const depsM = block.match(/^\*\*Depend[êe]ncias?:?\*\*:?\s*(.+)$/m);
    const deps = extractEtapaNumbers(depsM ? depsM[1] : '');
    const depsRaw = depsM ? depsM[1].trim() : '';

    const parM = block.match(/^\*\*Paraleliz[áa]vel:?\*\*:?\s*(.+)$/m);
    let parallelizable = null;
    if (parM) parallelizable = /\bsim\b/i.test(parM[1]) ? true : /\bn[ãa]o\b/i.test(parM[1]) ? false : null;

    // arquivos afetados: lista após "**Arquivo(s) Afetado(s):**"
    const files = [];
    const filesHead = block.search(/^\*\*Arquivo\(s\)\s+Afetado\(s\):?\*\*/im);
    if (filesHead !== -1) {
      const after = block.slice(filesHead).split('\n').slice(1);
      for (const line of after) {
        if (/^\s*[-*]\s+/.test(line)) {
          const code = line.match(/`([^`]+)`/);
          files.push(code ? code[1] : line.replace(/^\s*[-*]\s+/, '').trim());
        } else if (/^\*\*/.test(line) || /^###/.test(line)) {
          break; // próximo campo/etapa
        }
      }
    }

    const obsM = block.match(/>\s*\*\*Observaç[õo]es:?\*\*:?\s*(.+)/i);
    const observations = obsM ? obsM[1].trim() : null;

    const commits = [...block.matchAll(/`([0-9a-f]{7,40})`/g)].map((x) => x[1]);

    etapas.push({
      n,
      title,
      status: status.key,
      statusLabel: status.label,
      deps,
      depsRaw,
      parallelizable,
      files,
      commit: commits[0] || null,
      observations,
    });
  }
  return etapas.sort((a, b) => a.n - b.n);
}

// níveis topológicos a partir das dependências -> "ondas planejadas" para o DAG
function computeTopoLevels(etapas) {
  const byN = new Map(etapas.map((e) => [e.n, e]));
  const level = new Map();
  function resolve(n, seen) {
    if (level.has(n)) return level.get(n);
    if (seen.has(n)) return 0; // ciclo defensivo
    seen.add(n);
    const e = byN.get(n);
    const deps = (e ? e.deps : []).filter((d) => byN.has(d));
    const lv = deps.length ? Math.max(...deps.map((d) => resolve(d, seen))) + 1 : 0;
    level.set(n, lv);
    return lv;
  }
  for (const e of etapas) resolve(e.n, new Set());
  return level;
}

function inferPhases(progress, etapas) {
  // status coarse por fase, inferido do estado atual do PLAN
  const done = etapas.filter((e) => e.status === 'done').length;
  const total = etapas.length;
  const dev =
    total === 0 ? 'pending' : done === total ? 'done' : done > 0 ? 'in_progress' : 'pending';
  const sl = (progress.statusLine || '').toLowerCase();
  const review = /review|revis/.test(sl)
    ? /⚠️|ressalv/.test(sl)
      ? 'warn'
      : /✅|aprovad|concluí/.test(sl)
        ? 'done'
        : 'in_progress'
    : dev === 'done'
      ? 'pending'
      : 'pending';
  return {
    pm: 'done', // se existe PLAN, o PRD existiu
    arquiteto: 'done', // se existe PLAN, o arquiteto rodou
    dev,
    techlead: review,
  };
}

function parsePlan(md, meta = {}) {
  const { header, body } = splitSections(md);
  const titleM = md.match(/^#\s+(.+)$/m);
  const title = titleM ? titleM[1].replace(/^Plano de Execuç[ãa]o:\s*/i, '').trim() : meta.planFile;

  const progress = parseProgress(header);
  const etapas = parseEtapas(body);
  const waves = parseWaves(header);
  const warnings = parseWarnings(header);
  const levels = computeTopoLevels(etapas);
  etapas.forEach((e) => (e.level = levels.get(e.n) ?? 0));

  const prdM = header.match(/PRD\s+Relacionado\*?\*?:?\s*(.+)/i);
  const branchM = header.match(/Branch\s+Base\*?\*?:?\s*[`']?([^`'\n]+)/i);
  // Campo do /epic-workflow: liga este PLAN ao artefato do épico que o gerou.
  const epicM = header.match(/[ÉE]pico\*?\*?:?\s*[`']?([^`'\n]+)/i);
  // Branch da feature ≠ Branch Base. Só a primeira é sinal de vida (ver scanner.js).
  const fbM = header.match(/Branch\s+da\s+Feature\*?\*?:?\s*[`']?([^`'\n]+)/i);
  const complexM = header.match(/Complexidade\*?\*?:?\s*(.+)/i);
  const updatedM = header.match(/[ÚU]ltima\s+atualizaç[ãa]o\*?\*?:?\s*([0-9-]+)/i);

  const maxLevel = etapas.reduce((mx, e) => Math.max(mx, e.level), 0);
  const doneCount = etapas.filter((e) => e.status === 'done').length;

  const pct = progress.percent ?? (etapas.length ? Math.round((doneCount / etapas.length) * 100) : 0);
  // O PLAN pode se contradizer: a prosa do PROGRESSO GERAL diz "✅ Concluído" e
  // nenhuma etapa está marcada (acontece quando o dev fecha o plano na mão e não
  // volta nas etapas). Não escolha um lado em silêncio — os dois números são
  // afirmações do arquivo, e esconder a briga é o que faz o dashboard mentir.
  const saysDone = /(✅|conclu[íi])/i.test(progress.statusLine || '');
  const conflict = saysDone && pct < 100 ? 'status diz concluído, mas as etapas não estão marcadas' : null;

  return {
    ...meta,
    title,
    progress: {
      done: progress.done ?? doneCount,
      total: progress.total ?? etapas.length,
      percent: pct,
      statusLine: progress.statusLine,
      conflict,
    },
    prdRef: prdM ? prdM[1].replace(/[*`]/g, '').trim() : null,
    epicRef: epicM ? epicM[1].replace(/[*`]/g, '').trim() : null,
    branch: branchM ? branchM[1].trim() : null,
    featureBranch: fbM ? fbM[1].trim() : null,
    complexity: complexM ? complexM[1].replace(/[*`]/g, '').trim() : null,
    updatedAt: updatedM ? updatedM[1] : null,
    phases: inferPhases(progress, etapas),
    etapas,
    waves,
    warnings,
    plannedWaves: maxLevel + 1,
  };
}

module.exports = { parsePlan, normalizeStatus, extractEtapaNumbers, computeTopoLevels };
