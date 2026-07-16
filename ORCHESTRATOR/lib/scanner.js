'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { parsePlan } = require('./parser');
const { parseEpic } = require('./epic-parser');

// Raiz do ai-flow = pai de ORCHESTRATOR/
const AI_FLOW_ROOT = path.resolve(__dirname, '..', '..');
const MAPS_DIR = path.join(AI_FLOW_ROOT, 'MAPS');

function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function gitWorktrees(repoPath) {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['-C', repoPath, 'worktree', 'list', '--porcelain'],
      { timeout: 4000 },
      (err, stdout) => {
        if (err) return resolve([]);
        const trees = [];
        let cur = {};
        for (const line of stdout.split('\n')) {
          if (line.startsWith('worktree ')) {
            if (cur.path) trees.push(cur);
            cur = { path: line.slice(9).trim() };
          } else if (line.startsWith('branch ')) {
            cur.branch = line.slice(7).trim().replace('refs/heads/', '');
          } else if (line.startsWith('HEAD ')) {
            cur.head = line.slice(5).trim().slice(0, 8);
          } else if (line === 'detached') {
            cur.detached = true;
          }
        }
        if (cur.path) trees.push(cur);
        resolve(trees);
      }
    );
  });
}

// Lista os projetos (dirs em MAPS/ que têm um {slug}-map.json), ignorando _template.
function listProjects() {
  if (!fs.existsSync(MAPS_DIR)) return [];
  return fs
    .readdirSync(MAPS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_template' && !d.name.startsWith('.'))
    .map((d) => {
      const slug = d.name;
      const dir = path.join(MAPS_DIR, slug);
      const map = safeReadJSON(path.join(dir, `${slug}-map.json`));
      return { slug, dir, map };
    })
    .filter((p) => p.map);
}

// Caminho de artefato declarado no map (`docs.plan`, `docs.epic`), com default.
// Maps criados antes do /epic-workflow não têm `docs.epic` — o default cobre.
function docsDir(proj, key, fallback) {
  const rel = (proj.map.docs && proj.map.docs[key]) || fallback;
  return path.join(proj.dir, rel);
}

// Lê e parseia os .md de um diretório de artefato. `parse` recebe (md, meta).
function listArtifacts(dir, proj, fileKey, parse) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const full = path.join(dir, f);
      let parsed = null;
      let mtime = null;
      try {
        const md = fs.readFileSync(full, 'utf8');
        mtime = fs.statSync(full).mtimeMs;
        parsed = parse(md, { [fileKey]: f });
      } catch (e) {
        parsed = { [fileKey]: f, error: String(e) };
      }
      return {
        slug: proj.slug,
        [fileKey]: f,
        path: full,
        relPath: path.relative(AI_FLOW_ROOT, full),
        mtime,
        ...parsed,
      };
    })
    .sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
}

// Todos os PLANs de um projeto, parseados + metadados de arquivo.
function listPlansForProject(proj) {
  return listArtifacts(docsDir(proj, 'plan', 'plan/'), proj, 'planFile', parsePlan);
}

// Todos os ÉPICOS de um projeto (/epic-workflow). Ausente na maioria — é opcional.
function listEpicsForProject(proj) {
  return listArtifacts(docsDir(proj, 'epic', 'epic/'), proj, 'epicFile', parseEpic);
}

// Liga cada PLAN ao épico que o gerou, e cada feature do épico ao PLAN real.
//
// Duas fontes, nesta ordem:
//   1. `**Épico**: {path}` no cabeçalho do PLAN (planejar.md § Informações) — explícito;
//   2. o `**PLAN**: {path}` que o próprio épico registra por feature (§ 2) — fallback
//      para PLANs escritos antes do campo existir.
// Sem nenhuma das duas, o PLAN fica solto (`epicFile: null`) — que é o certo para
// features avulsas, a maioria.
function linkEpics(plans, epics) {
  const byFile = new Map(plans.map((p) => [p.planFile, p]));
  for (const ep of epics) {
    for (const f of ep.features) {
      const plan = f.planPath ? byFile.get(path.basename(f.planPath)) : null;
      f.planFile = plan ? plan.planFile : null; // feature sem PLAN no disco = null
      f.planProgress = plan ? plan.progress : null;
      if (plan && !plan.epicFile) {
        plan.epicFile = ep.epicFile;
        plan.epicTitle = ep.title;
        plan.featureId = f.id;
      }
    }
  }
  // (1) vence (2): o PLAN declara a que épico pertence
  for (const p of plans) {
    if (!p.epicRef) continue;
    const ep = epics.find((e) => e.epicFile === path.basename(p.epicRef));
    if (!ep) continue;
    p.epicFile = ep.epicFile;
    p.epicTitle = ep.title;
    p.featureId = p.featureId || (ep.features.find((f) => f.planFile === p.planFile) || {}).id || null;
  }
  // onda de cada feature — e propagada ao PLAN, que é quem vira card
  for (const ep of epics) {
    for (const w of ep.waves) {
      for (const fid of w.features) {
        const f = ep.features.find((x) => x.id === fid);
        if (!f) continue;
        f.wave = w.n;
        const plan = f.planFile ? byFile.get(f.planFile) : null;
        if (plan) plan.epicWave = w.n;
      }
    }
  }
  return plans;
}

// A branch da feature, ou null quando o PLAN não a declara.
//
// 🔴 `plan.branch` vem de `**Branch Base**`, que por desenho é a branch BASE
// (`planejar.md` § Informações) — `main`/`develop`, não a da feature. Compará-la
// com o `worktree list` dá falso positivo garantido: o clone principal está
// checkado na base, então `main` sempre "casa" e TODO plano vira "ativo".
// Por isso: a base nunca conta como sinal de vida. Só `**Branch da Feature**`
// (campo novo) ou uma `Branch Base` que não seja a base de nenhum repo do map
// (PLANs antigos que puseram a branch da feature ali).
function featureBranchOf(plan, baseBranches) {
  const b = (plan.featureBranch || plan.branch || '').trim();
  if (!b || b.length > 80 || /\s/.test(b)) return null; // prosa no campo, não branch
  if (baseBranches.has(b)) return null; // é a base → não diz nada sobre esta feature
  return b;
}

// Estado de uma feature. `planned` ≠ `in_progress`: PLAN escrito de propósito e
// ainda não atacado (o caso normal do /epic-workflow --so-planejar) não é
// trabalho parado, e não deveria aparecer como tal.
function livenessScore(plan, worktrees, baseBranches) {
  const pct = plan.progress ? plan.progress.percent : 0;
  const ageMin = plan.mtime ? (Date.now() - plan.mtime) / 60000 : Infinity;
  const fb = featureBranchOf(plan, baseBranches);
  // igualdade, ou uma branch de etapa daquela feature (`feature/x--etapa-3`).
  // `.includes()` casaria `feature/auth` com `feature/auth-refactor`, de outra feature.
  const branchAlive =
    !!fb && worktrees.some((w) => w.branch && (w.branch === fb || w.branch.startsWith(fb + '--etapa-')));

  const notStarted = /não iniciad|nao iniciad|📋|planejad/i.test(plan.progress?.statusLine || '');

  let state = 'done';
  if (pct < 100) state = ageMin < 30 ? 'active' : 'in_progress';
  else if (ageMin < 15) state = 'recent';
  // nunca tocado + sem branch viva + o próprio PLAN se declara não iniciado
  if (pct === 0 && !branchAlive && notStarted) state = 'planned';
  if (branchAlive && pct < 100) state = 'active';
  return { state, ageMin: Math.round(ageMin), branchAlive, featureBranch: fb };
}

// Snapshot completo consumido pelo dashboard.
async function scanAll() {
  const projects = listProjects();
  const out = [];
  for (const proj of projects) {
    const repos = proj.map.repositories || {};
    // agrega worktrees de todos os repos do projeto
    let worktrees = [];
    for (const key of Object.keys(repos)) {
      const rp = repos[key] && repos[key].path;
      if (rp && fs.existsSync(rp)) {
        const wts = await gitWorktrees(rp);
        worktrees.push(...wts.map((w) => ({ ...w, repo: key })));
      }
    }
    // branches base declaradas no map — não são sinal de vida (ver featureBranchOf)
    const baseBranches = new Set(
      Object.keys(repos)
        .map((k) => repos[k] && repos[k].branch)
        .filter(Boolean)
    );
    const epics = listEpicsForProject(proj);
    const plans = linkEpics(listPlansForProject(proj), epics).map((p) => ({
      ...p,
      liveness: livenessScore(p, worktrees, baseBranches),
    }));
    out.push({
      slug: proj.slug,
      name: proj.map.project ? proj.map.project.name : proj.slug,
      description: proj.map.project ? proj.map.project.description : '',
      status: proj.map.project ? proj.map.project.status : 'unknown',
      stack: proj.map.stack || {},
      repositories: Object.keys(repos).map((k) => ({ key: k, ...repos[k] })),
      worktrees,
      epics,
      plans,
    });
  }
  return { generatedAt: Date.now(), root: AI_FLOW_ROOT, projects: out };
}

module.exports = { scanAll, listProjects, AI_FLOW_ROOT, MAPS_DIR };
