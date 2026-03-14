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

## Notas Específicas do Claude Code

### Leitura de Arquivos

Use as ferramentas nativas para ler PRD, PLAN e arquivos de código:
- `Read` — arquivos individuais
- `Glob` — listar arquivos alterados / estrutura de pastas
- `Grep` — buscar padrões no código

### Criação de Pull Request

Verificar `map.tooling.project-management.type` do projeto ativo:

**`azure-devops`** — usar MCP:
| Ação | Ferramenta |
|------|-----------|
| Buscar repositório | `mcp__azure-devops__repo_get_repo_by_name_or_id` |
| Criar PR | `mcp__azure-devops__repo_create_pull_request` |
| Vincular work item | `mcp__azure-devops__wit_link_work_item_to_pull_request` |

- Repositório de código → `map.tooling.project-management.repos-project`
- Work items → `map.tooling.project-management.workitems-project`

**`github`** — usar Bash:
```bash
gh pr create --base {repo.branch} --title "[título]" --body "[descrição]"
```

**`gitlab`** — usar Bash:
```bash
glab mr create --target-branch {repo.branch} --title "[título]" --description "[descrição]"
```

### Próximos Passos Após Aprovação
- Merge para `{repo.branch}` após aprovação dos reviewers
