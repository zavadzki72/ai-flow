---
name: feature-workflow
description: Orquestra o ciclo completo de uma feature delegando cada fase a um agente por papel em janela isolada — Product Manager (/spec), Arquiteto Sênior (/planejar), Dev Sênior (/implementar) e Tech Lead (/code-review) — com gates humanos entre artefatos e broker de comunicação entre os agentes.
---

# Skill: Feature Workflow (Orquestrador de Papéis)

## Trigger
`/feature-workflow` · `/fluxo-feature` · "roda o ciclo completo da feature" · "orquestra os agentes"

## Processo Completo
Leia e siga: `SKILLS/SHARED/feature-workflow.md`

Esta skill é um **orquestrador**: para cada fase, ela **delega a um subagent por papel**.
Sempre que o processo mandar "delegar ao subagent X", use a tool `Agent` para invocar aquele
subagent, passando **paths** (não o conteúdo inteiro) e as respostas já coletadas do humano.

Agentes referenciados (instalados em `.claude/agents/` — ver `CLAUDE/AGENTS/`):
- `product-manager` (Fase 1 · /spec)
- `arquiteto-senior` (Fase 2 · /planejar)
- `dev-senior` (Fase 3 · /implementar)
- `tech-lead` (Fase 4 · /code-review)

---

## Notas Específicas do Claude Code

### Delegação (tool Agent)
- Invoque cada papel com a tool `Agent` (ex.: "Use the arquiteto-senior subagent to ..."), passando
  no prompt os **paths** do PRD/PLAN/branch + as respostas do humano. O subagent roda em **janela
  própria** e devolve só o resumo.
- Subagents **não recebem `AskUserQuestion`** — por isso o **broker**: o agente **retorna** dúvidas,
  e é **você (sessão principal)** que pergunta ao humano via `AskUserQuestion` e re-invoca o agente.
- Consulta entre agentes (A→B): o agente A retorna "preciso consultar B"; você invoca B com a pergunta
  e devolve a resposta a A. Guardrail: máx. 2 consultas por dúvida.

### Gates
- Use `AskUserQuestion` nos gates (aprovar / ajustar / parar) ao fim de cada fase.

### Reinício após editar agentes
- Editar um arquivo de agente em disco **não** recarrega na sessão ativa — reinicie a sessão (ou crie via `/agents`).

### Ambiente
- Windows → adaptar comandos para PowerShell.
