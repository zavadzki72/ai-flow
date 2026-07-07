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

---

## Notas Específicas do GitHub Copilot CLI

### Leitura e Edição de Arquivos

Use **sempre** as ferramentas nativas — nunca powershell para ler ou criar arquivos de texto:
- `view` — ler arquivos antes de editar (obrigatório)
- `edit` — modificações pontuais em arquivos existentes
- `create` — apenas para arquivos novos
- `glob` — listar estrutura de pastas
- `grep` — buscar padrões no código

### Execução de Comandos

Use `powershell` para build, testes e git. Ver `docs/architecture/` para os comandos exatos da stack.

**Atenção:** O ambiente é Windows. Adapte os comandos do SHARED (bash/Unix) para PowerShell.

### Git Worktree (Obrigatório)

**Nunca faça checkout no clone principal.** Crie ou reutilize um worktree por branch (ver
`CONVENTIONS.md` § Git Worktree):
```powershell
# Clone principal: só fetch, nunca checkout
Set-Location "{repo.path}"
git fetch origin

# Já existe worktree para esta branch?
git worktree list

# Não existe — branch já existe localmente:
git worktree add "{worktree.path}" {branch}

# Não existe — branch só existe no remoto:
git worktree add "{worktree.path}" -b {branch} origin/{branch}

# Não existe — branch nova:
git worktree add "{worktree.path}" -b {branch}
```
Se o Git recusar com `branch already checked out at ...`, outra sessão está usando a branch agora —
informe o dev e pare, não force.

Todas as operações seguintes (build, testes, edição, commit) rodam em `{worktree.path}`:
```powershell
# Verificar working tree
Set-Location "{worktree.path}"
git status --porcelain

# Adicionar arquivos específicos e commitar (nunca git add -A sem verificar)
Set-Location "{worktree.path}"
git add "{arquivo1}" "{arquivo2}"
git status
git commit -m "feat: descricao`n`n- detalhe 1`n- detalhe 2`n`nRefs: ETAPA N — {slug}-plan-NNN-nome-da-feature"
```

Antes de qualquer `git add`, mostrar ao dev os arquivos que serão incluídos.

### Commits sem coautoria de IA

Nunca adicionar trailer `Co-Authored-By` de IA (Claude, Copilot, etc.) nos commits.

### Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
