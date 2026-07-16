'use strict';

// ai-flow · Orchestrator — custo & uso a partir dos transcripts do Claude Code.
//
// O Claude Code grava um transcript JSONL por sessão em:
//   <cfg>/projects/<cwd-sanitizado>/<sessionId>.jsonl          (sessão principal)
//   <cfg>/projects/<cwd-sanitizado>/<sessionId>/subagents/agent-*.jsonl   (subagentes)
//   ...cada agent-*.jsonl tem um agent-*.meta.json com { agentType, description, toolUseId }
//
// Cada linha `assistant` traz `message.model` + `message.usage`. Somamos os tokens
// por modelo e aplicamos a tabela de preço → custo em USD (equivalente ao /usage).
// Zero dependências: só a stdlib do Node.

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------- tabela de preço (USD por 1M tokens) ----------
// input/output oficiais; cache write 5m = 1.25×input, 1h = 2×input, cache read = 0.1×input.
function tier(input, output) {
  return {
    input,
    output,
    cacheWrite5m: +(input * 1.25).toFixed(4),
    cacheWrite1h: +(input * 2).toFixed(4),
    cacheRead: +(input * 0.1).toFixed(4),
  };
}

const PRICING = {
  'claude-opus-4-8': tier(5, 25),
  'claude-opus-4-7': tier(5, 25),
  'claude-opus-4-6': tier(5, 25),
  'claude-opus-4-5': tier(5, 25),
  'claude-sonnet-5': tier(3, 15),
  'claude-sonnet-4-6': tier(3, 15),
  'claude-sonnet-4-5': tier(3, 15),
  'claude-haiku-4-5': tier(1, 5),
  'claude-fable-5': tier(10, 50),
};
const DEFAULT_TIER = PRICING['claude-sonnet-5']; // fallback conservador

function priceForModel(model) {
  if (!model) return DEFAULT_TIER;
  if (PRICING[model]) return PRICING[model];
  // casa por prefixo, tolerando sufixos de data (ex.: claude-haiku-4-5-20251001)
  for (const key of Object.keys(PRICING)) {
    if (model.startsWith(key)) return PRICING[key];
  }
  // heurística por família
  if (/opus/.test(model)) return PRICING['claude-opus-4-8'];
  if (/haiku/.test(model)) return PRICING['claude-haiku-4-5'];
  if (/fable|mythos/.test(model)) return PRICING['claude-fable-5'];
  return DEFAULT_TIER;
}

// ---------- soma de tokens por modelo em um transcript ----------
function emptyTok() {
  return { input: 0, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0 };
}
function addTok(a, b) {
  a.input += b.input;
  a.output += b.output;
  a.cacheWrite5m += b.cacheWrite5m;
  a.cacheWrite1h += b.cacheWrite1h;
  a.cacheRead += b.cacheRead;
  return a;
}
function costOf(tok, model) {
  const p = priceForModel(model);
  return (
    (tok.input / 1e6) * p.input +
    (tok.output / 1e6) * p.output +
    (tok.cacheWrite5m / 1e6) * p.cacheWrite5m +
    (tok.cacheWrite1h / 1e6) * p.cacheWrite1h +
    (tok.cacheRead / 1e6) * p.cacheRead
  );
}
function totalTokens(tok) {
  return tok.input + tok.output + tok.cacheWrite5m + tok.cacheWrite1h + tok.cacheRead;
}

// Lê um .jsonl de transcript e devolve { byModel:{model:tok}, tokens:totalTok, costUSD, model:principal }.
function transcriptUsage(file) {
  const byModel = {};
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return { byModel: {}, tokens: emptyTok(), costUSD: 0, model: null, empty: true };
  }
  for (const line of raw.split('\n')) {
    if (!line) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const msg = d.message;
    if (!msg || d.type !== 'assistant') continue;
    const u = msg.usage;
    if (!u) continue;
    const model = msg.model || 'unknown';
    if (/synthetic|<.*>/.test(model)) continue;
    const cc = u.cache_creation || {};
    const w5 = cc.ephemeral_5m_input_tokens != null ? cc.ephemeral_5m_input_tokens : (u.cache_creation_input_tokens || 0);
    const w1 = cc.ephemeral_1h_input_tokens || 0;
    const tok = {
      input: u.input_tokens || 0,
      output: u.output_tokens || 0,
      cacheWrite5m: w5,
      cacheWrite1h: w1,
      cacheRead: u.cache_read_input_tokens || 0,
    };
    byModel[model] = addTok(byModel[model] || emptyTok(), tok);
  }
  const tokens = emptyTok();
  let costUSD = 0;
  let topModel = null;
  let topTok = -1;
  for (const [model, tok] of Object.entries(byModel)) {
    addTok(tokens, tok);
    costUSD += costOf(tok, model);
    const t = totalTokens(tok);
    if (t > topTok) {
      topTok = t;
      topModel = model;
    }
  }
  return { byModel, tokens, costUSD, model: topModel, empty: Object.keys(byModel).length === 0 };
}

// ---------- descoberta de arquivos ----------
function projectsRoots() {
  const home = os.homedir();
  return [
    path.join(home, '.claude-personal', 'projects'),
    path.join(home, '.claude', 'projects'),
  ].filter((p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
}

// acha o transcript principal <sessionId>.jsonl e o dir de subagentes de uma sessão
function locateSession(sessionId) {
  for (const root of projectsRoots()) {
    let projDirs;
    try {
      projDirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
    } catch {
      continue;
    }
    for (const pd of projDirs) {
      const base = path.join(root, pd.name);
      const transcript = path.join(base, `${sessionId}.jsonl`);
      if (fs.existsSync(transcript)) {
        const subDir = path.join(base, sessionId, 'subagents');
        return { transcript, subDir: fs.existsSync(subDir) ? subDir : null, projectDir: base };
      }
    }
  }
  return null;
}

// lista todos os agent-*.jsonl (diretos + workflows/*/), pareando com o .meta.json
function listAgentFiles(subDir) {
  if (!subDir) return [];
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (/^agent-.*\.jsonl$/.test(e.name)) {
        const metaPath = full.replace(/\.jsonl$/, '.meta.json');
        let meta = {};
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch {}
        out.push({ file: full, meta });
      }
    }
  };
  walk(subDir);
  return out;
}

// custo por subagente de uma sessão
function agentUsageList(subDir) {
  return listAgentFiles(subDir)
    .map(({ file, meta }) => {
      const u = transcriptUsage(file);
      return {
        toolUseId: meta.toolUseId || null,
        agentType: meta.agentType || null,
        description: meta.description || null,
        spawnDepth: meta.spawnDepth ?? null,
        model: u.model,
        tokens: u.tokens,
        costUSD: +u.costUSD.toFixed(4),
        byModel: u.byModel,
        file: path.basename(file),
      };
    })
    .filter((a) => !a.empty)
    .sort((a, b) => b.costUSD - a.costUSD);
}

// custo consolidado de UMA sessão (principal + subagentes)
function sessionUsage(sessionId) {
  const loc = locateSession(sessionId);
  if (!loc) {
    return { sessionId, found: false, resumeCommand: `claude --resume ${sessionId}` };
  }
  const main = transcriptUsage(loc.transcript);
  const agents = agentUsageList(loc.subDir);
  const agentsCost = agents.reduce((s, a) => s + a.costUSD, 0);
  const agentsTok = agents.reduce((t, a) => addTok(t, a.tokens), emptyTok());
  const totalTok = addTok(addTok(emptyTok(), main.tokens), agentsTok);
  return {
    sessionId,
    found: true,
    resumeCommand: `claude --resume ${sessionId}`,
    model: main.model,
    main: { model: main.model, tokens: main.tokens, costUSD: +main.costUSD.toFixed(4), byModel: main.byModel },
    agents,
    total: { tokens: totalTok, costUSD: +(main.costUSD + agentsCost).toFixed(4) },
  };
}

// custo de uma feature = agregação de várias sessões (vários terminais/resumes)
function featureUsage(sessionIds) {
  const sessions = [...new Set(sessionIds.filter(Boolean))].map(sessionUsage);
  const found = sessions.filter((s) => s.found);
  const byModel = {};
  const totalTok = emptyTok();
  let costUSD = 0;
  const agents = [];
  for (const s of found) {
    // agrega byModel do principal + subagentes
    const merge = (bm) => {
      for (const [model, tok] of Object.entries(bm || {})) {
        byModel[model] = addTok(byModel[model] || emptyTok(), tok);
      }
    };
    merge(s.main.byModel);
    for (const a of s.agents) {
      merge(a.byModel);
      agents.push({ ...a, sessionId: s.sessionId });
    }
    addTok(totalTok, s.total.tokens);
    costUSD += s.total.costUSD;
  }
  // custo por modelo derivado do byModel agregado
  const byModelOut = {};
  for (const [model, tok] of Object.entries(byModel)) {
    byModelOut[model] = { tokens: tok, costUSD: +costOf(tok, model).toFixed(4) };
  }
  agents.sort((a, b) => b.costUSD - a.costUSD);
  return {
    total: { tokens: totalTok, costUSD: +costUSD.toFixed(4) },
    byModel: byModelOut,
    sessions: found.map((s) => ({
      sessionId: s.sessionId,
      resumeCommand: s.resumeCommand,
      model: s.model,
      main: s.main,
      total: s.total,
    })),
    missing: sessions.filter((s) => !s.found).map((s) => s.sessionId),
    agents,
  };
}

// lê o `cwd` de um transcript sem carregar o arquivo inteiro (primeiras linhas)
function transcriptCwd(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  let count = 0;
  for (const line of raw.split('\n')) {
    if (!line) continue;
    try {
      const d = JSON.parse(line);
      if (d.cwd) return d.cwd;
    } catch {}
    if (++count > 30) break; // cwd aparece cedo; não varre o arquivo todo
  }
  return null;
}

// cwds representativos de subagentes de uma sessão (feature-workflow roda o
// orquestrador no guarda-chuva, mas os subagentes rodam no subdir do repo — é o
// cwd deles que identifica o projeto). Amostra até `max` subagentes diretos.
function subagentCwds(subDir, max = 4) {
  if (!subDir) return [];
  let entries;
  try {
    entries = fs.readdirSync(subDir).filter((f) => /^agent-.*\.jsonl$/.test(f));
  } catch {
    return [];
  }
  const cwds = new Set();
  for (const f of entries.slice(0, max)) {
    const c = transcriptCwd(path.join(subDir, f));
    if (c) cwds.add(c);
  }
  return [...cwds];
}

// lista todas as sessões principais em disco:
// [{sessionId, transcript, mtime, cwd, cwds:[main + subagentes]}]
function listAllSessions() {
  const out = [];
  for (const root of projectsRoots()) {
    let projDirs;
    try {
      projDirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
    } catch {
      continue;
    }
    for (const pd of projDirs) {
      const base = path.join(root, pd.name);
      let files;
      try {
        files = fs.readdirSync(base).filter((f) => /^[0-9a-f-]{36}\.jsonl$/i.test(f));
      } catch {
        continue;
      }
      for (const f of files) {
        const sessionId = f.replace(/\.jsonl$/, '');
        const full = path.join(base, f);
        let mtime = 0;
        try {
          mtime = fs.statSync(full).mtimeMs;
        } catch {}
        const cwd = transcriptCwd(full);
        const subDir = path.join(base, sessionId, 'subagents');
        const cwds = [cwd, ...subagentCwds(fs.existsSync(subDir) ? subDir : null)].filter(Boolean);
        out.push({ sessionId, transcript: full, mtime, cwd, cwds: [...new Set(cwds)] });
      }
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

module.exports = {
  PRICING,
  priceForModel,
  transcriptUsage,
  sessionUsage,
  featureUsage,
  locateSession,
  listAllSessions,
};
