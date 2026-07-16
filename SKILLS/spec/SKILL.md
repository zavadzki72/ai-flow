---
name: spec
description: Cria PRD (Product Requirements Document) para nova feature. Lê contexto do projeto via {slug}-map.json e {slug}-context.md, coleta informações via perguntas ou integração com ferramenta de gestão (Azure DevOps, Jira), analisa repositórios e código, e gera PRD completo com critérios BDD, escopo técnico e definição de pronto.
---

# Skill: Spec (Criar PRD)

## Trigger
`/spec` · `/prd` · `/criar-spec` · `/criar-prd` · "criar especificação" · "nova feature"

## Processo Completo
Leia e siga: `SKILLS/SHARED/spec.md`

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

---

## Ambiente — resolva antes do Passo 0

Esta skill é a mesma para qualquer ferramenta. **Não existe adapter por CLI: o adapter é você.**

- **Arquivos** — use suas tools nativas de leitura, busca e edição para o `{slug}-map.json`, o
  `{slug}-context.md`, os `docs/` do projeto e o código relacionado à feature. Invariante: **ler
  antes de editar**, sempre; e **nunca** usar shell (`cat`, `sed`, `awk`, `Get-Content`) para ler ou
  escrever texto.
- **Shell** — os blocos do SHARED são POSIX (ex.: o update de repositório do **Passo 3.2**). O
  dialeto vem do **SO da máquina**, não do seu nome: em Windows, `git`, `gh` e `docker compose`
  funcionam idênticos via Git Bash — não traduza para PowerShell sem necessidade real.
- **Perguntas** — se você tem pergunta estruturada (`AskUserQuestion`, `ask_user`), use, preferindo
  múltipla escolha quando houver caminhos claros (ex.: Passo 1 — *Manual* / *Azure DevOps — ID do
  item* / *Jira — ID do item*). Se não tem — ou se você é subagent, onde ela costuma ser bloqueada —
  lista numerada no chat e **espere a resposta**. Nunca assuma.
- **Tools MCP** — os nomes na tabela abaixo são os nus. Dependendo do cliente eles chegam
  prefixados (`mcp__{server}__{tool}`, ex.: `mcp__azure-devops__wit_get_work_item`). **Confirme que
  a tool existe na sessão antes de usar e nunca invente tool.**

---

## Integração com Ferramenta de Gestão (Passo 1B)

Se `map.tooling.project-management.type == "azure-devops"`:

| Ação | Tool MCP |
|------|----------|
| Buscar work item | `wit_get_work_item` |
| Adicionar comentário | `wit_add_work_item_comment` |
| Atualizar work item (tag) | `wit_update_work_item` |

Projetos a usar:
- Work items / comentários → `map.tooling.project-management.workitems-project`
- Repositórios (se necessário buscar código via DevOps) → `map.tooling.project-management.repos-project`

Se `type == "jira"` (ou outra ferramenta), use a integração equivalente disponível para buscar a
issue e comentar.

**Fallback explícito:** se a integração não estiver disponível na sessão, **não simule e não
invente** — avise o dev, peça os dados do item e siga pelo **Passo 1A (Modo Manual)**.

---

## Invariantes (valem em todos os CLIs)

- **Coleta em blocos** — junte as perguntas em blocos e **confirme as decisões importantes com o dev
  antes de gerar o PRD**. Nada de PRD escrito em cima de suposição.
- **Código antes de escopo** — antes de escrever o Escopo Técnico (Passo 5/6), use a busca do
  workspace para localizar os padrões já existentes nos repos afetados. Escopo técnico que não
  cruzou com o código real é chute.
- **O PRD não vira implementação** — respeite `SKILLS/SHARED/spec.md` § *O Que o PRD NÃO DEVE Conter*.

---

## Próximos Skills na Sequência
- Após gerar o PRD: `/planejar`
