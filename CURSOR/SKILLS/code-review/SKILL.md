# Skill: Code Review

## Trigger
`/code-review` · `/review` · "revisa este PR" · "faz code review" · "revisar código"

## Processo Completo
Leia e siga: `SKILLS/SHARED/code-review.md`

---

## Notas Específicas do Cursor

### Uso como Custom Command

Este adapter pode ser instalado em `.cursor/commands/code-review.md`.
No chat do Cursor, o comando fica disponível como `/code-review`.

### Leitura de Arquivos

Use o Agent do Cursor para ler PRD, PLAN e arquivos de código.
Sempre inspecione os arquivos relevantes antes de concluir qualquer achado.

Prefira:
- Busca do workspace para localizar arquivos alterados, entidades, handlers, services e testes
- Referências `@` quando o dev já tiver apontado arquivos, branches ou PRs
- Terminal integrado apenas para diff, build, testes e comandos de tooling

### Git Diff via Terminal Integrado

No Windows, use PowerShell:
```powershell
Set-Location "{repo.path}"

# Arquivos alterados em relação à branch base
git diff {repo.branch}..{feature-branch} --name-only

# Diff completo para análise
git diff {repo.branch}..{feature-branch}
```

### Criação de Pull Request

Verificar `map.tooling.project-management.type` do projeto ativo:

**`azure-devops`** — usar MCP se estiver configurado no Cursor:
| Ação | Ferramenta |
|------|-----------|
| Buscar repositório | `mcp__azure-devops__repo_get_repo_by_name_or_id` |
| Criar PR | `mcp__azure-devops__repo_create_pull_request` |
| Vincular work item | `mcp__azure-devops__wit_link_work_item_to_pull_request` |

- Repositório de código → `map.tooling.project-management.repos-project`
- Work items → `map.tooling.project-management.workitems-project`

**`github`** — usar GitHub CLI via terminal:
```powershell
Set-Location "{repo.path}"
gh pr create --base {repo.branch} --title "[título]" --body "[descrição]"
```

**`gitlab`** — usar GitLab CLI via terminal:
```powershell
Set-Location "{repo.path}"
glab mr create --target-branch {repo.branch} --title "[título]" --description "[descrição]"
```

**Outros** — orientar o dev a criar manualmente.

### Análise SonarQube (Passo 6.8)

Se `map.tooling.sonar.project-key` estiver preenchido e o dev aceitar a análise:

Use MCP SonarQube se estiver configurado no Cursor. Construir o nome do servidor a partir de `map.tooling.sonar.mcp-server` e usar ferramentas no padrão `mcp__{mcp-server}__{tool}`:

| Ação | Ferramenta |
|------|------------|
| Status do Quality Gate | `mcp__{mcp-server}__get_project_quality_gate_status` |
| Métricas do projeto | `mcp__{mcp-server}__get_component_measures` |
| Issues abertas (HIGH/BLOCKER) | `mcp__{mcp-server}__search_sonar_issues_in_projects` |
| Security hotspots pendentes | `mcp__{mcp-server}__search_security_hotspots` |

### Próximos Passos Após Aprovação
- Merge para `{repo.branch}` após aprovação dos reviewers
