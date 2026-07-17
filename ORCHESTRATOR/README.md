# ai-flow · Orchestrator 🎛️

Dashboard **local** para o ai-flow, organizado **por terminal**. Cada sessão do Claude Code é um terminal, e a partir dele desce a **escadinha**:

```
Terminal (sessão)  →  Conteúdo + Agentes  →  Conteúdo + sub-Agentes  →  …
```

Você vê **custo e atividade real** em cada nível — por terminal, por agente e por sub-agente —, com os terminais **ativos agora** no topo e o histórico filtrável abaixo.

Sem banco, sem build, **sem dependências npm** — só a stdlib do Node.

```
┌─ ai-flow · Orchestrator ─────────────────────────── ● ao vivo ── ↻ ─┐
│  ⣷ Ativos agora (2)                                                   │
│  ▸ mz-finance  ● ativo   $17.31   3 agentes   agora                   │
│  ▸ easy-adv    ● ativo   $20.73   5 agentes   5m atrás                │
│  Encerrados (29)                                                      │
│  ▾ copa-draft  encerrado $566.72  135 agentes 18h atrás               │
│     🖥️ Conteúdo do terminal · main-loop            $211.87            │
│     ⚙️ dev-senior · 1 sub · d1        Σ $6.63 · $0.86 próprio         │
│        ⚙️ dev-senior · d2                            $5.78            │
└──────────────────────────────────────────────────────────────────────┘
```

Clicar num nó de agente abre o detalhe (custo, tokens, modelo, tempos; tarefa/resultado quando os hooks capturaram). Cada terminal tem um **ver mais** que abre uma **página exclusiva** (URL própria, `#/t/<sessão>`) com o **histórico completo de prompts** do usuário — cada prompt com o **custo daquele turno** (main-loop + agentes disparados por ele) —, custo por modelo, branch, escadinha e timeline.

---

## Como rodar

```bash
cd ai-flow/ORCHESTRATOR
node server.js            # http://localhost:4319
PORT=5000 node server.js  # porta custom
```

Abre `http://localhost:4319`. Ele varre os transcripts do Claude Code em
`~/.claude-personal/projects` e `~/.claude/projects`, monta a árvore de cada sessão e
soma o custo por nó. **Não escreve nada** nos teus projetos — é read-only sobre os transcripts.

## Como funciona (arquitetura)

```
~/.claude*/projects/**.jsonl ──▶ lib/usage.js ──▶ server.js ──SSE──▶ browser
   (transcripts + subagents)     (árvore+custo)    (HTTP)          (public/)
                                                      ▲
hooks do Claude Code ──▶ hooks/notify.js ──POST /api/events─┘   (overlay ao vivo)
MAPS/*/*-map.json ──▶ lib/scanner.js ──▶ rótulo terminal→projeto (por cwd)
```

- **Árvore + custo (disco):** `lib/usage.js` lê o transcript principal de cada sessão
  (`<sessionId>.jsonl`) e os subagentes (`<sessionId>/subagents/agent-*.jsonl` + `.meta.json`).
  `sessionTree(sessionId)` reconstrói a escadinha aninhada — a linkagem pai↔filho vem de casar
  o `toolUseId` de cada `.meta.json` com os blocos `tool_use` (Agent/Task) que o transcript do
  pai disparou — e soma custo **próprio** e de **subtree** por nó.
- **Lista de terminais:** `/api/terminals` devolve os resumos (custo total, nº de agentes, cwd,
  modelo, atividade), com um cache por sessão invalidado pelo `mtime` do transcript.
- **Ao vivo (overlay):** os hooks do Claude Code postam em `POST /api/events` quando um subagent
  começa/termina; o painel acende o agente e sobe o terminal para "Ativos agora" em tempo real.
- **Rótulo de projeto:** `lib/scanner.js` lê os `MAPS/*/*-map.json` só para mapear o cwd da
  sessão ao slug do projeto (repositories[].path). Nenhum PLAN/artefato é lido.

**"Ativo" = atividade real:** um terminal aparece como ativo se tem um agente rodando agora
(via hooks) **ou** o transcript foi escrito nos últimos ~10 min. Nada de heurística sobre PLAN.

## Ativar o "ao vivo" (hooks) — opcional

Adicione ao `settings.json` do Claude Code (global `~/.claude/settings.json`, ou o
`.claude-personal/settings.json` deste setup). Cada terminal passa a emitir eventos ao delegar:

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

O `notify.js` é **fire-and-forget**: se o daemon estiver desligado, ele falha calado e nunca
atrapalha o tool. Porta custom via env `AIFLOW_ORCH_PORT`. Mesmo **sem** os hooks o dashboard
funciona: o custo e a árvore vêm dos transcripts; só o "acender em tempo real" depende deles.

## Endpoints

| Rota | O quê |
|------|-------|
| `GET /` | dashboard (SPA) |
| `GET /api/terminals?since=<ms>` | resumos dos terminais na janela de tempo (+ overlay ao vivo) |
| `GET /api/terminal?session=<id>` | árvore aninhada + metadados: título, branch, prompts (histórico), byModel, custo por nó |
| `GET /api/stream` | SSE: `terminals` (lista mudou), `agent`/`run` (hooks) |
| `POST /api/events` | ingestão de eventos de agente (usado pelos hooks) |
| `GET /api/rescan` | recarrega o registro de projetos e força refresh |

## Filtros & UX

- **Status** (sidebar): Todos · Ativos · Encerrados.
- **Período** (sidebar): Hoje · 7 dias · 30 dias · Tudo (padrão 7 dias; "Tudo" carrega o
  histórico inteiro, com a árvore de cada terminal buscada sob demanda ao expandir).
- **Busca** por projeto/cwd/sessão, **filtro por projeto** e **ordenação** (atividade, custo, nome).

## Limitações conhecidas

- O custo usa uma tabela de preço embutida (`lib/usage.js`) — se a Anthropic mudar preços,
  atualize `PRICING` lá.
- Nesting fundo (agente que dá spawn em agente) é reconstruído por `toolUseId`; um spawn cujo
  id não apareça no transcript do pai (raro, ex.: certos workflows) é pendurado no terminal
  como órfão — o custo ainda soma no total, só a posição exata na árvore pode diferir.
- Sessões cujo cwd não casa nenhum repo de `MAPS/` aparecem como "sem projeto" (correto).

## Depois: hospedar

O servidor separa **estado durável** (transcripts em disco, local) de **stream de eventos**
(`/api/events`, que atravessa rede). Para acompanhar de fora, o mesmo daemon roda numa
VPS/Coolify recebendo os eventos dos hooks; a leitura de transcripts continua sendo a fonte
local. Nada precisa ser reescrito.
