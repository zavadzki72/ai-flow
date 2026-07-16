---
name: planejar
description: Cria plano de execução técnico detalhado baseado em PRD existente. Lê contexto via {slug}-map.json e todos os docs/ do projeto, atualiza repositório(s), explora código profundamente por camada, identifica componentes técnicos com paths completos, quebra implementação em baby steps independentes e gera arquivo PLAN completo.
---

# Skill: Planejar (Criar Plano de Execução)

## Trigger
`/planejar` · `/criar-plano` · "criar plano" · "plano de execução"

Também aceita PRD inline:
`/planejar {map.docs.prd}/001_Nome_Feature.md`

## Processo Completo
Leia e siga: `SKILLS/SHARED/planejar.md`

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

---

## Ambiente — resolva antes do Passo 0

Esta skill é a mesma para qualquer ferramenta. **Não existe adapter por CLI: o adapter é você.**

- **Arquivos** — use suas tools nativas de leitura, busca e edição para PRD, `{slug}-map.json`,
  `{slug}-context.md`, `docs/architecture/` e o código dos repos. Invariante: **ler antes de
  editar**, sempre; e **nunca** usar shell (`cat`, `sed`, `awk`, `Get-Content`) para ler ou escrever
  texto. Quando o dev apontar um PRD, arquivo ou pasta, leia o que ele apontou antes de buscar.
- **Shell** — os blocos do SHARED são POSIX. O dialeto vem do **SO da máquina**, não do seu nome:
  em Windows, `git`, `gh` e `docker compose` funcionam idênticos via Git Bash — não traduza para
  PowerShell sem necessidade real. Use shell **apenas para executar** (git, build, verificação),
  nunca para leitura. Comandos exatos da stack: `{slug}-context.md#comandos`.
- **Perguntas** — se você tem pergunta estruturada (`AskUserQuestion`, `ask_user`), use. Se não tem —
  ou se você é subagent, onde ela costuma ser bloqueada — lista numerada no chat e **espere a
  resposta**. Nunca assuma. Vale para o Passo 0.1 (projeto ativo), o Passo 1 (PRD) e o Passo 5
  (perguntas técnicas, máx. 10).

---

## Invariantes (valem em todos os CLIs)

### Exploração antes do PLAN

Antes de escrever qualquer etapa, **explore o código por camada** (Passo 4) e registre os **paths
completos** de cada componente técnico afetado. PLAN com componente sem path é PLAN que o Dev não
consegue executar.

### HARD STOP ao final

> ⛔ **HARD STOP — NÃO IMPLEMENTAR AUTOMATICAMENTE**
> Após criar o PLAN, a skill termina. Não executar nenhuma etapa de implementação.
> Aguardar o dev acionar explicitamente `/implementar ETAPA N`.

O Passo 8 do SHARED é o ponto de parada. Exceções: **Modo Autônomo** e **Modo Épico** (o SHARED
define o retorno de cada um); no **Modo Crítica de Recorte** não há PLAN e o HARD STOP não se aplica.

---

## Próximos Skills na Sequência
- Para implementar: o dev aciona `/implementar ETAPA 1` (**não automático**)
- Para revisar código: `/code-review`
