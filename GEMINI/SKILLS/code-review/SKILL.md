# Skill: Code Review

## Trigger
`/code-review` · `/review` · "revisa este PR" · "faz code review" · "revisar código"

## Processo Completo
Leia e siga: `SKILLS/SHARED/code-review.md`

---

## Notas Específicas do Gemini

### Leitura de Arquivos

Use as capacidades nativas do Gemini para ler PRD, PLAN e arquivos de código.

### Criação de Pull Request

Verificar `map.tooling.project-management.type` do projeto ativo:

**`azure-devops`** — usar a extensão/plugin do Azure DevOps disponível no Gemini.
- Repositório de código → `map.tooling.project-management.repos-project`
- Work items → `map.tooling.project-management.workitems-project`

**`github`** — orientar o dev a usar `gh pr create` ou criar via interface.

**`gitlab`** — orientar o dev a usar `glab mr create` ou criar via interface.

### Próximos Passos Após Aprovação
- Merge para `{repo.branch}` após aprovação dos reviewers
