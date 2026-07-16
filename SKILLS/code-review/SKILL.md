---
name: code-review
description: Revisa código implementado validando PLAN, aderência ao PRD e padrões do projeto (via {slug}-context.md). Analisa git diff, verifica checklist específico do projeto, code smells, segurança e performance. Gera relatório estruturado (🔴 crítico / 🟡 importante / 🟢 nice-to-have) e opcionalmente cria Pull Request.
---

# Skill: Code Review (Revisar Código Implementado)

## Trigger
`/code-review` · `/review` · "revisa este PR" · "faz code review" · "revisar código"

## Processo Completo
Leia e siga: `SKILLS/SHARED/code-review.md`

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

---

## Ambiente — resolva antes do Passo 0

Esta skill é a mesma para qualquer ferramenta. **Não existe adapter por CLI: o adapter é você.**

- **Arquivos** — use suas tools nativas de leitura, busca e edição para PRD, PLAN e código.
  Invariante: **ler antes de editar**, sempre; e **nunca** usar shell (`cat`, `sed`, `awk`,
  `Get-Content`) para ler ou escrever texto. Nenhum achado se conclui sem ter aberto o arquivo.
- **Shell** — os blocos do SHARED são POSIX. O dialeto vem do **SO da máquina**, não do seu nome:
  em Windows, `git`, `gh`, `glab` e `docker compose` funcionam idênticos via Git Bash — não traduza
  para PowerShell sem necessidade real.
- **Tools MCP** — as tabelas abaixo usam o **nome nu**; seu cliente pode expô-las prefixadas como
  `mcp__{server}__{tool}`. **Confirme que a tool existe na sessão antes de usar e nunca invente
  tool** — sem a integração, caia no fallback manual descrito em cada bloco.
- **Perguntas** — se você tem pergunta estruturada (`AskUserQuestion`, `ask_user`), use. Se não tem —
  ou se você é subagent, onde ela costuma ser bloqueada — lista numerada no chat e **espere a
  resposta**. Nunca assuma.

---

## Invariantes (valem em todos os CLIs)

### Git Diff (Passo 4)

O diff roda direto em `{repo.path}`, **sem worktree** — `git diff` só compara referências, não faz
checkout. Comandos exatos no **Passo 4** do SHARED; não os traduza para outro dialeto de shell.

### Criação de Pull Request (Passo 10)

Verificar `map.tooling.project-management.type` do projeto ativo:

**`azure-devops`** — via MCP Azure DevOps:

| Ação | Tool |
|------|------|
| Buscar repositório | `repo_get_repo_by_name_or_id` |
| Criar PR | `repo_create_pull_request` |
| Vincular work item | `wit_link_work_item_to_pull_request` |

- Repositório de código → `map.tooling.project-management.repos-project`
- Work items → `map.tooling.project-management.workitems-project`
- Sem o MCP na sessão: peça os dados ao dev e oriente a criação manual.

**`github`** — executar: `gh pr create --base {repo.branch} --title "[título]" --body "[descrição]"`
Se tiver tools de GitHub na sessão (MCP ou nativas) para ler/buscar PRs, use-as para consultar PRs existentes.

**`gitlab`** — executar: `glab mr create --target-branch {repo.branch} --title "[título]" --description "[descrição]"`

**Outros** — orientar o dev a criar manualmente.

**Sem assinatura de IA — em qualquer um dos casos acima.** Título e corpo do PR não levam
"Generated with", "Co-Authored-By" de IA, emoji de robô nem qualquer outro trailer de autoria de
ferramenta. Se o seu harness anexa isso por padrão, remova antes de criar. Vale também para
comentários em work item e descrição de MR.

### Análise SonarQube (Passo 6.8)

Se `map.tooling.sonar.project-key` estiver preenchido e o dev aceitar, use o MCP SonarQube —
**servidor** em `map.tooling.sonar.mcp-server`:

| Ação | Tool |
|------|------|
| Status do Quality Gate | `get_project_quality_gate_status` |
| Métricas do projeto | `get_component_measures` |
| Issues abertas (HIGH/BLOCKER) | `search_sonar_issues_in_projects` |
| Security hotspots pendentes | `search_security_hotspots` |

Parâmetros: `projectKey` / `projects` = `{map.tooling.sonar.project-key}`; `metricKeys` = a lista de
métricas do Passo 6.8; `severities: ["HIGH","BLOCKER"]` + `issueStatuses: ["OPEN"]`;
hotspots com `status: ["TO_REVIEW"]`. Sem o MCP na sessão: peça as métricas ao dev ou pule a etapa
(o Passo 6.8 permite) — **não invente números**.

---

## Próximos Skills na Sequência
- Após aprovação: merge para `{repo.branch}` após o aval dos reviewers
- Corrigir apontamentos: `/implementar ETAPA N`
