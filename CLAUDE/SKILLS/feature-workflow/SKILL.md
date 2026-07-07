---
name: feature-workflow
description: Orquestra o ciclo completo de uma feature de forma autônoma, delegando cada fase a um agente por papel em janela isolada — Product Manager (/spec), Arquiteto Sênior (/planejar), Dev Sênior (/implementar em ondas paralelas) e Tech Lead (/code-review) — com validação objetiva entre artefatos no lugar de gates humanos. Modo normal tem uma única rodada de perguntas no início; --auto roda sem nenhuma interação.
---

# Skill: Feature Workflow (Orquestrador Autônomo de Papéis)

## Trigger
`/feature-workflow` · `/feature-workflow --auto` · `/fluxo-feature` · "roda o ciclo completo da feature" · "orquestra os agentes"

## Processo Completo
Leia e siga: `SKILLS/SHARED/feature-workflow.md`

Esta skill é um **orquestrador autônomo**: para cada fase, ela **delega a um subagent por papel**
e avança por **validação objetiva** (checklist do artefato, build/testes verdes, review sem 🔴)
— sem gate humano. Sempre que o processo mandar "delegar ao subagent X", use a tool `Agent`,
passando **paths** (não o conteúdo inteiro) + as respostas/premissas já coletadas.

Agentes referenciados (instalados em `.claude/agents/` — ver `CLAUDE/AGENTS/`):
- `product-manager` (Fase 1 · /spec)
- `arquiteto-senior` (Fase 2 · /planejar)
- `dev-senior` (Fase 3 · /implementar — até 3 em paralelo por onda)
- `tech-lead` (Fase 4 · /code-review)

---

## Notas Específicas do Claude Code

### Delegação (tool Agent)
- Invoque cada papel com a tool `Agent`, passando no prompt os **paths** do PRD/PLAN/branch +
  o **modo** (normal | --auto) + respostas/premissas. O subagent roda em **janela própria** e
  devolve só o resumo.
- **Paralelismo (Fase 3):** dispare os `dev-senior` de uma mesma onda **numa única mensagem com
  múltiplas chamadas `Agent`** (uma por etapa) — é isso que os faz rodar concorrentes. Aguarde
  **todos** retornarem antes de fechar a onda (merge + build/testes). Nunca dispare a onda
  seguinte antes de fechar a atual.
- Subagents **não recebem `AskUserQuestion`** — dúvidas que voltarem de um agente **não vão ao
  humano** fora da rodada inicial: viram consulta a outro agente (broker) ou **premissa
  registrada** (ADR + destaque no relatório final).

### Interação humana
- **Modo normal:** UMA chamada de `AskUserQuestion` no início (rodada inicial: ponto de entrada,
  branch, dúvidas do PM em bloco). Depois, nenhuma outra — exceto ⛔ parada por guardrail.
- **Modo `--auto`:** nenhuma chamada de `AskUserQuestion` em hipótese alguma; toda dúvida vira
  premissa assumida registrada.
- Em ambos os modos: **nunca** `git push` nem criação de PR — o relatório final só sugere.

### Git (fechamento de onda — Fase 3.4)
- Merge das branches efêmeras (`{branch}--etapa-{N}`) na branch da feature com
  `git merge --no-ff`, dentro do **worktree da feature**.
- Conflito → aborte o merge (`git merge --abort`), descarte a efêmera e re-invoque o dev sobre a
  feature atualizada. Nunca edite arquivos para resolver conflito.
- Limpeza: `git worktree remove` + `git branch -d` após cada onda.

### Reinício após editar agentes
- Editar um arquivo de agente em disco **não** recarrega na sessão ativa — reinicie a sessão (ou crie via `/agents`).

### Ambiente
- Windows → adaptar comandos para PowerShell.
