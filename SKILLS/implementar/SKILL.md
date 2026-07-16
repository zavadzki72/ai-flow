---
name: implementar
description: Implementa uma etapa específica do plano de execução (baby step). Lê contexto via {slug}-map.json e {slug}-context.md, verifica dependências, prepara branch, analisa código existente, implementa seguindo padrões do projeto, roda build e testes, faz commit e atualiza PLAN marcando a etapa como concluída.
---

# Skill: Implementar (Executar Etapa do Plano)

## Trigger
`/implementar` · `/executar` · "implementar etapa" · "executar etapa"

Aceita PLAN e etapa inline:
`/implementar {map.docs.plan}/{slug}-plan-001-nome.md ETAPA 1`
`/implementar ETAPA 1` (se PLAN já foi mencionado na conversa)
`/implementar 1`

## Processo Completo
Leia e siga: `SKILLS/SHARED/implementar.md`

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

---

## Ambiente — resolva antes do Passo 0

Esta skill é a mesma para qualquer ferramenta. **Não existe adapter por CLI: o adapter é você.**

- **Arquivos** — use suas tools nativas de leitura, busca e edição. Invariante: **ler antes de
  editar**, sempre; e **nunca** usar shell (`cat`, `sed`, `awk`, `Get-Content`) para ler ou escrever
  texto. Criar arquivo novo só quando o PLAN ou o código exigir; preserve mudanças do dev.
- **Shell** — os blocos do SHARED são POSIX. O dialeto vem do **SO da máquina**, não do seu nome:
  em Windows, `git`, `gh` e `docker compose` funcionam idênticos via Git Bash — não traduza para
  PowerShell sem necessidade real. Comandos exatos de build e teste da stack: `{slug}-context.md#comandos`.
- **Perguntas** — se você tem pergunta estruturada (`AskUserQuestion`, `ask_user`), use. Se não tem —
  ou se você é subagent, onde ela costuma ser bloqueada — lista numerada no chat e **espere a
  resposta**. Nunca assuma.

---

## Invariantes (valem em todos os CLIs)

### Git Worktree (obrigatório)

**Nunca faça checkout no clone principal.** Crie ou reutilize um worktree por branch — os comandos
estão no **Passo 3** do SHARED; ver também `CONVENTIONS.md` § Git Worktree.

Se o Git recusar com `branch already checked out at ...`, outra sessão está usando a branch agora —
**informe o dev e pare, não force.**

A partir do Passo 3, todo comando, leitura e edição roda em `{worktree.path}` — nunca no clone.

### Commits

- Antes de qualquer `git add`, **mostre ao dev os arquivos que serão incluídos**. Nunca `git add -A`
  sem verificar.
- **Nunca** adicione trailer `Co-Authored-By` de IA (Claude, Copilot, Cursor, Gemini…) nos commits.
  Se o seu harness anexa esse trailer por padrão — **o Claude Code anexa** — remova-o.
  Sem exceção, em nenhum CLI.

---

## Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
