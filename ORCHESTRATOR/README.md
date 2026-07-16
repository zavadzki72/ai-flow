# ai-flow · Orchestrator 🎛️

Dashboard **local** para o ai-flow. Duas coisas num lugar só:

1. **Feature Map** — o fluxo de cada feature do começo ao fim (PM → Arquiteto → Dev em ondas → Tech Lead), com **grafo de dependências/ondas**, timeline das ondas fechadas, etapas, commits e pendências (⚠️). Tudo lido dos `MAPS/{slug}/plan/*.md` que o `feature-workflow` já gera.
2. **Deck** — visão central de **várias execuções ao mesmo tempo** (ex.: 3 terminais rodando `/feature-workflow`), cada uma como um card com fase atual, progresso e próxima etapa.

Sem banco, sem build, **sem dependências npm** — só a stdlib do Node.

```
┌─ ai-flow · Orchestrator ─────────────────────── ● ao vivo ── ↻ Rescan ─┐
│  EM ANDAMENTO (2)                                                        │
│  ┌ Auth Email+Password ─ ● ativo ┐  ┌ RAG Jurídico ─ ● ativo ┐          │
│  │ 📋─📐─⚙️─🔍   [████████░] 92% │  │ 📋─📐─⚙️─🔍  [░] 0%    │          │
│  │ ▸ próxima: ETAPA 12           │  │ ▸ próxima: ETAPA 1     │          │
│  └──────────────────────────────┘  └────────────────────────┘          │
│  CONCLUÍDAS (12)  ...                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

Clicar num card abre o **Feature Map**: grafo de ondas (Mermaid), timeline, etapas e pendências.

---

## Como rodar

```bash
cd ai-flow/ORCHESTRATOR
node server.js            # http://localhost:4319
PORT=5000 node server.js  # porta custom
```

Abre `http://localhost:4319`. Ele varre `../MAPS/*/plan/*.md`, lê os `*-map.json` e consulta `git worktree list` de cada repo. **Não escreve nada** — é read-only sobre os teus arquivos.

## Como funciona (arquitetura)

```
MAPS/*/plan/*.md ──▶ lib/parser.js ──▶ lib/scanner.js ──▶ server.js ──SSE──▶ browser
    (fs.watch)          (md→JSON)        (+ git worktree)    (HTTP)         (public/)
                                                               ▲
hooks do Claude Code ──▶ hooks/notify.js ──POST /api/events────┘   (Camada 2b, ao vivo)
```

- **Camada 1 (Feature Map):** `parser.js` extrai de cada PLAN as etapas (status, dependências, paralelizável, arquivos, commit), o progresso, o log de ondas fechadas e os avisos ⚠️. `computeTopoLevels` monta os níveis topológicos = "ondas planejadas" do grafo.
- **Camada 2a (Deck near-live):** `fs.watch` recursivo em `MAPS/` → ao salvar um PLAN, o servidor faz rescan (debounce 400ms) e empurra `snapshot` via **SSE**; o browser re-renderiza sozinho. É "quase ao vivo": atualiza quando uma onda fecha e o PLAN é escrito.
- **Camada 2b (ao vivo de verdade — opcional):** hooks do Claude Code postam em `POST /api/events` quando um subagent começa/termina, e o painel "● Ao vivo" mostra os agentes acendendo em tempo real (inclusive os 3 `dev-senior` paralelos de uma onda). Ver abaixo.

## Ativar o "ao vivo" (Camada 2b) — opcional

Adicione ao `settings.json` do Claude Code (global `~/.claude/settings.json`, ou o `.claude-personal/settings.json` deste setup). Isso faz cada terminal emitir eventos quando delega a um agente:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Agent",
        "hooks": [{ "type": "command", "command": "node /Users/zavadzki72/Projects/Personal/ai-flow/ORCHESTRATOR/hooks/notify.js" }] }
    ],
    "PostToolUse": [
      { "matcher": "Agent",
        "hooks": [{ "type": "command", "command": "node /Users/zavadzki72/Projects/Personal/ai-flow/ORCHESTRATOR/hooks/notify.js" }] }
    ]
  }
}
```

O `notify.js` é **fire-and-forget**: se o daemon estiver desligado, ele falha calado e nunca atrapalha o tool. Porta custom via env `AIFLOW_ORCH_PORT`.

## Endpoints

| Rota | O quê |
|------|-------|
| `GET /` | dashboard (SPA) |
| `GET /api/snapshot` | estado completo (projetos, plans parseados, worktrees) |
| `GET /api/stream` | SSE: `snapshot` (rescan) e `agent` (hooks) |
| `POST /api/events` | ingestão de eventos de agente (usado pelos hooks) |
| `GET /api/rescan` | força um rescan |

## Limitações conhecidas

- O grafo usa **Mermaid via CDN** (precisa de internet). Offline, a lista de etapas continua funcionando; o DAG cai num aviso.
- "Em andamento" é heurística: progresso < 100% **ou** worktree vivo da branch **ou** PLAN tocado há < 30min. Sem os hooks (2b), não há sinal real de "agente rodando agora".
- PLANs antigos sem `Paralelizável`/`Arquivo(s) Afetado(s)` são tratados como sequenciais (o parser não inventa paralelismo).

## Depois: hospedar

O servidor já separa **estado durável** (file-watch, local) de **stream de eventos** (`/api/events`, que atravessa rede). Para acompanhar de fora, o mesmo daemon roda numa VPS/Coolify recebendo só os eventos que os hooks postam; o file-watch continua sendo a fonte local. Nada precisa ser reescrito.
```
