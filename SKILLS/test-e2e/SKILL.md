---
name: test-e2e
description: Sobe o ambiente local (Docker, nativo ou híbrido), simula um usuário navegando pela feature implementada (MCP de browser) e gera relatório com evidências (screenshots) validando PRD e fluxos de impacto. Use após o /implementar terminar todas as etapas do PLAN.
---

# Skill: Test E2E (Validar a Feature no Browser)

## Trigger
`/test-e2e` · `/teste-e2e` · "testa a feature de ponta a ponta" · "roda o teste e2e"

## Processo Completo
Leia e siga: `SKILLS/SHARED/test-e2e.md`

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

---

## Ambiente — resolva antes do Passo 0

Esta skill é a mesma para qualquer ferramenta. **Não existe adapter por CLI: o adapter é você.**

- **Arquivos** — use suas tools nativas de leitura, busca e edição para o PRD, o PLAN, o
  `{slug}-map.json`, o `{slug}-context.md` e para localizar `docs/architecture/` e mapear as
  rotas/telas afetadas pelo diff. Invariante: **ler antes de editar** (e antes de escrever o
  relatório final), sempre; e **nunca** usar shell (`cat`, `sed`, `awk`, `Get-Content`) para ler ou
  escrever texto.
- **Shell** — os blocos do SHARED são POSIX. O dialeto vem do **SO da máquina**, não do seu nome:
  em Windows, `git`, `gh`, `docker compose`, `nohup` e `kill` funcionam idênticos via Git Bash —
  não traduza para PowerShell sem necessidade real. Como o dev sobe o projeto na mão:
  `{slug}-context.md#ambiente-local-e2e` (ou `#comandos`).
- **MCP de browser** — o Playwright MCP é o caso concreto. Os nomes das tools aparecem nus
  (`browser_navigate`, `browser_click`, `browser_take_screenshot`), mas podem chegar prefixados
  (`mcp__{server}__{tool}`, ex.: `mcp__playwright__browser_navigate`) dependendo do cliente.
  **Confirme que a tool existe nesta sessão antes de usar** — via busca de tools, se você tiver — e
  **nunca invente tool**. Sem MCP de browser não há fallback: oriente o dev a configurá-lo e pare.
- **Perguntas** — se você tem pergunta estruturada (`AskUserQuestion`, `ask_user`), use. Se não tem —
  ou se você é subagent, onde ela costuma ser bloqueada — lista numerada no chat e **espere a
  resposta**. Nunca assuma.

---

## Invariantes (valem em todos os CLIs)

### Verifique o MCP antes de subir qualquer coisa

A checagem do MCP de browser e de `map.environments.local` acontece no **Passo 0.4**, **antes** do
ambiente subir. Faltando qualquer um dos dois: informe o dev e pare — **sem** subir containers à toa.

### Git Worktree (obrigatório)

**Nunca suba o ambiente contra o clone principal.** Reutilize ou crie um worktree por branch — os
comandos estão no **Passo 0.5** do SHARED; ver também `CONVENTIONS.md` § Git Worktree.

Se o Git recusar com `branch already checked out at ...`, outra sessão está usando a branch agora —
**informe o dev e pare, não force.**

A partir do Passo 0.5, **toda operação de disco e de Docker roda em `{worktree.path}`** — nunca no clone.

### Teardown é incondicional

O **Passo 7** roda **sempre**, mesmo se o Passo 4 ou o Passo 5 falharem ou lançarem erro. Derrubar o
ambiente é incondicional; **remover o worktree não é** — o dev decide quando, tipicamente após o merge.

---

## Próximos Skills na Sequência
- ✅/⚠️ → `/code-review`
- ❌ → `/implementar` (nova etapa de correção) e repetir `/test-e2e`
