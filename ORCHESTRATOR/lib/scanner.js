'use strict';

// ai-flow · Orchestrator — registro de projetos.
//
// Depois da virada para o dashboard "por terminal", este módulo tem UM só papel:
// mapear o cwd de uma sessão do Claude Code ao slug/nome do projeto, para rotular
// cada terminal. A fonte é o `{slug}-map.json` de cada projeto em MAPS/ (o único
// dado que `resolveSlug` em server.js consome: repositories[].path).
//
// Toda a leitura de PLAN/épico/worktree/liveness saiu — o custo e a atividade real
// agora vêm dos transcripts (lib/usage.js), não dos artefatos em MAPS.

const fs = require('fs');
const path = require('path');

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

// Lista os projetos (dirs em MAPS/ que têm um {slug}-map.json), ignorando _template.
// Entradas de MAPS/ costumam ser symlinks p/ o repo ai-flow-maps (link-maps.sh), então
// resolvemos via statSync (segue o link) em vez de Dirent.isDirectory().
function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
function listProjects() {
  if (!fs.existsSync(MAPS_DIR)) return [];
  return fs
    .readdirSync(MAPS_DIR)
    .filter((name) => name !== '_template' && !name.startsWith('.') && isDir(path.join(MAPS_DIR, name)))
    .map((slug) => {
      const map = safeReadJSON(path.join(MAPS_DIR, slug, `${slug}-map.json`));
      return { slug, map };
    })
    .filter((p) => p.map);
}

// Registro leve de projetos: [{ slug, name, repositories:[{key, path, branch}] }].
function scanAll() {
  const projects = listProjects().map((proj) => {
    const repos = proj.map.repositories || {};
    return {
      slug: proj.slug,
      name: proj.map.project ? proj.map.project.name : proj.slug,
      repositories: Object.keys(repos).map((k) => ({ key: k, ...repos[k] })),
    };
  });
  return { generatedAt: Date.now(), root: AI_FLOW_ROOT, projects };
}

module.exports = { scanAll, listProjects, AI_FLOW_ROOT, MAPS_DIR };
