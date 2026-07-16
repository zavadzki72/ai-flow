'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { parsePlan } = require('./parser');

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

// Todos os PLANs de um projeto, parseados + metadados de arquivo.
function listPlansForProject(proj) {
  const planDir = path.join(proj.dir, 'plan');
  if (!fs.existsSync(planDir)) return [];
  return fs
    .readdirSync(planDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const full = path.join(planDir, f);
      let parsed = null;
      let mtime = null;
      try {
        const md = fs.readFileSync(full, 'utf8');
        const stat = fs.statSync(full);
        mtime = stat.mtimeMs;
        parsed = parsePlan(md, { planFile: f });
      } catch (e) {
        parsed = { planFile: f, error: String(e) };
      }
      return {
        slug: proj.slug,
        planFile: f,
        path: full,
        relPath: path.relative(AI_FLOW_ROOT, full),
        mtime,
        ...parsed,
      };
    })
    .sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
}

// Estado de uma feature = está "viva"? (progresso < 100% ou tocada recentemente)
function livenessScore(plan, worktrees) {
  const pct = plan.progress ? plan.progress.percent : 0;
  const ageMin = plan.mtime ? (Date.now() - plan.mtime) / 60000 : Infinity;
  const branchAlive =
    plan.branch &&
    worktrees.some((w) => w.branch && w.branch.includes(plan.branch.replace('feature/', '')));
  let state = 'done';
  if (pct < 100) state = ageMin < 30 ? 'active' : 'in_progress';
  else if (ageMin < 15) state = 'recent';
  if (branchAlive && pct < 100) state = 'active';
  return { state, ageMin: Math.round(ageMin), branchAlive: !!branchAlive };
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
    const plans = listPlansForProject(proj).map((p) => ({
      ...p,
      liveness: livenessScore(p, worktrees),
    }));
    out.push({
      slug: proj.slug,
      name: proj.map.project ? proj.map.project.name : proj.slug,
      description: proj.map.project ? proj.map.project.description : '',
      status: proj.map.project ? proj.map.project.status : 'unknown',
      stack: proj.map.stack || {},
      repositories: Object.keys(repos).map((k) => ({ key: k, ...repos[k] })),
      worktrees,
      plans,
    });
  }
  return { generatedAt: Date.now(), root: AI_FLOW_ROOT, projects: out };
}

module.exports = { scanAll, listProjects, AI_FLOW_ROOT, MAPS_DIR };
