'use strict';

// Parser determinístico de um artefato de ÉPICO do ai-flow.
// Formato: SKILLS/SHARED/epic-workflow.md § Template do artefato do épico.
//
// Mesma filosofia do parser.js: campo ausente vira `null`/`[]`, nunca quebra.
// O épico é uma altitude acima do PLAN — aqui a unidade é a FEATURE, não a etapa.

const FEATURE_STATUS = [
  { re: /(✅|conclu[íi])/i, key: 'done', label: 'Concluída' },
  { re: /(⛔|bloquead)/i, key: 'blocked', label: 'Bloqueada' },
  { re: /(⏭️|pulad|skip)/i, key: 'skipped', label: 'Pulada' },
  { re: /(🔄|🟡|em progresso|em andamento)/i, key: 'in_progress', label: 'Em andamento' },
  { re: /(⏳|não iniciad|nao iniciad)/i, key: 'pending', label: 'Não iniciada' },
];

function featureStatus(raw) {
  if (!raw) return { key: 'pending', label: 'Não iniciada' };
  for (const s of FEATURE_STATUS) if (s.re.test(raw)) return { key: s.key, label: s.label };
  return { key: 'pending', label: 'Não iniciada' };
}

// Extrai uma tabela markdown que segue um heading/marcador. Devolve as linhas
// já split em células, sem o separador |---|---|.
function tableAfter(text, markerRe) {
  const m = text.match(markerRe);
  if (!m) return [];
  const rest = text.slice(m.index + m[0].length);
  const rows = [];
  for (const line of rest.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) {
      if (rows.length) break; // tabela acabou
      continue; // ainda não começou
    }
    if (/^\|[\s:|-]+\|$/.test(t)) continue; // separador
    rows.push(
      t
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim())
    );
  }
  return rows;
}

const cell = (row, i) => (row[i] == null ? '' : row[i].replace(/[`*]/g, '').trim());

// "F1, F3" / "F2 × F4" / "—" -> ['F1','F3']
function featureRefs(s) {
  if (!s || /^[—-]$/.test(s.trim())) return [];
  return [...s.matchAll(/\bF(\d+)\b/gi)].map((m) => 'F' + m[1]);
}

// ## PROGRESSO GERAL do épico (§ Template)
function parseEpicProgress(text) {
  const out = {
    status: null,
    statusKey: 'pending',
    phase: null,
    done: null,
    total: null,
    percent: null,
    blocked: null,
    skipped: null,
    planOnly: false,
  };
  const statusM = text.match(/^\*\*Status:?\*\*:?\s*(.+)$/m);
  if (statusM) {
    out.status = statusM[1].trim();
    out.statusKey = featureStatus(out.status).key;
    // "📋 Planejado (--so-planejar) — não implementado" (epic-workflow.md § --so-planejar)
    if (/(📋|planejad|so-planejar)/i.test(out.status)) {
      out.statusKey = 'planned';
      out.planOnly = /so-planejar/i.test(out.status);
    }
  }
  const phaseM = text.match(/^\*\*Fase\s+atual:?\*\*:?\s*(.+)$/im);
  if (phaseM) out.phase = phaseM[1].replace(/[*`]/g, '').trim();

  const featM = text.match(/^\*\*Features:?\*\*:?\s*(.+)$/im);
  if (featM) {
    const line = featM[1];
    const frac = line.match(/(\d+)\s*\/\s*(\d+)/);
    if (frac) {
      out.done = Number(frac[1]);
      out.total = Number(frac[2]);
    }
    const pct = line.match(/(\d+)\s*%/);
    if (pct) out.percent = Number(pct[1]);
    const bl = line.match(/(\d+)\s*bloquead/i);
    if (bl) out.blocked = Number(bl[1]);
    const sk = line.match(/(\d+)\s*(?:pulad|skip)/i);
    if (sk) out.skipped = Number(sk[1]);
  }
  if (out.percent == null && out.done != null && out.total) {
    out.percent = Math.round((out.done / out.total) * 100);
  }
  return out;
}

// § 2. RECORTE EM FEATURES — tabela + os blocos "### F1 — nome" com PRD/PLAN/Branch
function parseFeatures(text) {
  const rows = tableAfter(text, /^##\s*2\.\s*RECORTE EM FEATURES\s*$/im);
  const feats = [];
  for (const r of rows) {
    const id = cell(r, 0);
    if (!/^F\d+$/i.test(id)) continue; // pula o header da tabela
    const st = featureStatus(cell(r, 7));
    feats.push({
      id: id.toUpperCase(),
      name: cell(r, 1),
      value: cell(r, 2),
      repos: cell(r, 3)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      complexity: (r[4] || '').trim(),
      deps: featureRefs(cell(r, 5)),
      isolated: /sim/i.test(cell(r, 6)),
      status: st.key,
      statusLabel: st.label,
      prdPath: null,
      planPath: null,
      branch: null,
    });
  }
  // detalhe por feature: "### F1 — nome" traz PRD/PLAN/Branch em paths reais
  for (const f of feats) {
    const re = new RegExp(`^###\\s+${f.id}\\s*[—-].*$`, 'im');
    const m = text.match(re);
    if (!m) continue;
    const start = m.index + m[0].length;
    const nxt = text.slice(start).search(/^###\s+F\d+\s|^##\s+\d/im);
    const block = nxt === -1 ? text.slice(start) : text.slice(start, start + nxt);

    const prd = block.match(/\*\*PRD\*\*:?\s*`([^`]+)`/i);
    if (prd) f.prdPath = prd[1].trim();
    const plan = block.match(/\*\*PLAN\*\*:?\s*`([^`]+)`/i);
    if (plan) f.planPath = plan[1].trim();
    const br = block.match(/\*\*Branch\*\*:?\s*`([^`]+)`/i);
    if (br) f.branch = br[1].trim();
  }
  return feats;
}

// § 3. GRAFO E ONDAS — a tabela de ondas e a de colisões
function parseGraph(text) {
  const waves = [];
  for (const r of tableAfter(text, /\|\s*Onda\s*\|\s*Features\s*\|/i)) {
    const n = Number(cell(r, 0));
    if (!Number.isFinite(n)) continue;
    waves.push({
      n,
      features: featureRefs(cell(r, 1)),
      devsPerFeature: Number(cell(r, 2)) || null,
      reason: cell(r, 3),
    });
  }
  const collisions = [];
  for (const r of tableAfter(text, /\|\s*Features\s*\|\s*Arquivos\s*\|/i)) {
    const fs = featureRefs(cell(r, 0));
    if (!fs.length) continue;
    collisions.push({
      features: fs,
      files: cell(r, 1)
        .split(/[,\s]+/)
        .filter(Boolean),
      kind: /hot/i.test(cell(r, 2)) ? 'hot-file' : 'domain',
      effect: cell(r, 3),
    });
  }
  return { waves: waves.sort((a, b) => a.n - b.n), collisions };
}

// § 5. PREMISSAS ASSUMIDAS — o que o humano precisa revisar. É o valor do relatório.
function parsePremissas(text) {
  const i = text.search(/^##\s*5\.\s*PREMISSAS ASSUMIDAS\s*$/im);
  if (i === -1) return [];
  const nxt = text.slice(i + 5).search(/^##\s+\d/im);
  const block = nxt === -1 ? text.slice(i) : text.slice(i, i + 5 + nxt);
  const out = [];
  let bucket = null;
  for (const line of block.split('\n')) {
    const h = line.match(/^###\s+(.+?)\s*(⚠️)?\s*$/);
    if (h) {
      bucket = h[1].trim();
      continue;
    }
    const m = line.match(/^-\s*\*\*(P\d+)\*\*\s*(?:\*\(([^)]*)\)\*)?\s*:?\s*(.+)$/);
    if (!m) continue;
    out.push({
      id: m[1],
      scope: (m[2] || '').trim() || null,
      kind: bucket,
      business: /neg[óo]cio/i.test(bucket || ''),
      text: m[3].replace(/\*\*/g, '').trim(),
    });
  }
  return out;
}

function parseEpic(md, meta = {}) {
  const titleM = md.match(/^#\s*[ÉE]pico:\s*(.+)$/im) || md.match(/^#\s+(.+)$/m);
  const title = titleM ? titleM[1].trim() : meta.epicFile;

  const seqM = md.match(/^\*\*Sequ[êe]ncia\*\*:?\s*(\d+)/im);
  const modeM = md.match(/^\*\*Modo de entrada\*\*:?\s*(.+)$/im);
  const branchM = md.match(/^\*\*Branch de integração\*\*:?\s*`?([^`\s(]+)/im);
  const updM = md.match(/[ÚU]ltima\s+atualizaç[ãa]o\*?\*?:?\s*([0-9-]+)/i);
  const reposM = md.match(/^\*\*Repositórios\*\*:?\s*(.+)$/im);

  const progress = parseEpicProgress(md);
  const features = parseFeatures(md);
  const { waves, collisions } = parseGraph(md);
  const premissas = parsePremissas(md);

  // Fonte de verdade do total: a tabela de features vence o cabeçalho, que é
  // escrito à mão e envelhece (mesma razão do doneCount no parser.js).
  const total = features.length || progress.total || 0;
  const done = features.length
    ? features.filter((f) => f.status === 'done').length
    : progress.done || 0;

  return {
    ...meta,
    title,
    seq: seqM ? seqM[1] : null,
    entryMode: modeM ? modeM[1].replace(/[*`]/g, '').trim() : null,
    integrationBranch: branchM ? branchM[1].trim() : null,
    repos: reposM
      ? reposM[1]
          .replace(/[*`[\]]/g, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    updatedAt: updM ? updM[1] : null,
    progress: {
      done,
      total,
      percent: progress.percent ?? (total ? Math.round((done / total) * 100) : 0),
      status: progress.status,
      statusKey: progress.statusKey,
      phase: progress.phase,
      blocked: progress.blocked ?? features.filter((f) => f.status === 'blocked').length,
      skipped: progress.skipped ?? features.filter((f) => f.status === 'skipped').length,
      // --so-planejar: N PLANs, 0 código, de propósito. Sem isto o dashboard
      // mostraria N features "paradas" e o dev não saberia que é o estado esperado.
      planOnly: progress.planOnly,
    },
    features,
    waves,
    collisions,
    premissas,
    premissasNegocio: premissas.filter((p) => p.business).length,
  };
}

module.exports = { parseEpic };
