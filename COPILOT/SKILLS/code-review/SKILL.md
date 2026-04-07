---
name: code-review
description: Revisa código implementado validando PLAN, aderência ao PRD e padrões do projeto (via context.md). Analisa git diff, verifica checklist específico do projeto, code smells, segurança e performance. Gera relatório estruturado (🔴 crítico / 🟡 importante / 🟢 nice-to-have) e opcionalmente cria Pull Request.
---

# Skill: Code Review

## Trigger
`/code-review` · `/review` · "revisa este PR" · "faz code review" · "revisar código"

## Processo Completo
Leia e siga: `SKILLS/SHARED/code-review.md`

---

## Notas Específicas do GitHub Copilot CLI

### Leitura de Arquivos

Use as ferramentas nativas para ler PRD, PLAN e arquivos de código:
- `view` — arquivos individuais
- `glob` — listar arquivos alterados / estrutura de pastas
- `grep` — buscar padrões no código

### Git Diff via PowerShell

```powershell
Set-Location "{repo.path}"

# Arquivos alterados em relação à branch base
git diff {repo.branch}..{feature-branch} --name-only

# Diff completo para análise
git diff {repo.branch}..{feature-branch}
```

### Criação de Pull Request

Verificar `map.tooling.project-management.type` do projeto ativo:

**`azure-devops`** — usar MCP (se configurado):
| Ação | Ferramenta |
|------|-----------|
| Buscar repositório | `mcp__azure-devops__repo_get_repo_by_name_or_id` |
| Criar PR | `mcp__azure-devops__repo_create_pull_request` |
| Vincular work item | `mcp__azure-devops__wit_link_work_item_to_pull_request` |

- Repositório de código → `map.tooling.project-management.repos-project`
- Work items → `map.tooling.project-management.workitems-project`

**`github`** — usar GitHub CLI via powershell:
```powershell
Set-Location "{repo.path}"
gh pr create --base {repo.branch} --title "[título]" --body "[descrição]"
```

Ou usar as ferramentas nativas de GitHub disponíveis no Copilot CLI para consultar PRs existentes:
- `github-mcp-server-pull_request_read` — ler detalhes de um PR
- `github-mcp-server-search_pull_requests` — buscar PRs

**`gitlab`** — usar GitLab CLI via powershell:
```powershell
Set-Location "{repo.path}"
glab mr create --target-branch {repo.branch} --title "[título]" --description "[descrição]"
```

**Outros** — orientar o dev a criar manualmente.

### Análise SonarQube (Passo 6.8)

Se `map.tooling.sonar.project-key` estiver preenchido e o dev aceitar a análise:

**Construir o nome do servidor** a partir de `map.tooling.sonar.mcp-server` e usar as ferramentas no padrão `mcp__{mcp-server}__{tool}`:

| Ação | Ferramenta |
|------|------------|
| Status do Quality Gate | `mcp__{mcp-server}__get_project_quality_gate_status` |
| Métricas do projeto | `mcp__{mcp-server}__get_component_measures` |
| Issues abertas (HIGH/BLOCKER) | `mcp__{mcp-server}__search_sonar_issues_in_projects` |
| Security hotspots pendentes | `mcp__{mcp-server}__search_security_hotspots` |

**Parâmetros recomendados:**
```
# Quality Gate
projectKey: {map.tooling.sonar.project-key}

# Métricas
projectKey: {map.tooling.sonar.project-key}
metricKeys: ["coverage", "duplicated_lines_density", "ncloc", "complexity",
             "bugs", "vulnerabilities", "code_smells", "security_hotspots"]

# Issues críticas
projects: ["{map.tooling.sonar.project-key}"]
severities: ["HIGH", "BLOCKER"]
issueStatuses: ["OPEN"]

# Security hotspots pendentes
projectKey: {map.tooling.sonar.project-key}
status: ["TO_REVIEW"]
```

### Próximos Passos Após Aprovação
- Merge para `{repo.branch}` após aprovação dos reviewers
