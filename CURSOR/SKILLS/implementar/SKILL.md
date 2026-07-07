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

## Notas Específicas do Cursor

### Uso como Custom Command

Este adapter pode ser instalado em `.cursor/commands/implementar.md`.
No chat do Cursor, o comando fica disponível como `/implementar`.

### Leitura e Edição de Arquivos

Use o Agent do Cursor para ler, buscar e editar arquivos.
Sempre leia o arquivo antes de editá-lo e preserve mudanças existentes do dev.

Prefira:
- Busca do workspace para localizar código, testes e padrões
- Edição pontual via Agent quando o arquivo já existe
- Criação de arquivos novos apenas quando o PLAN ou o código exigir
- Terminal integrado apenas para comandos reais de build, testes, git e tooling

### Execução de Comandos

Use o terminal integrado do Cursor para build, testes e git. Ver `docs/architecture/commands.md` ou `{slug}-context.md#comandos` do projeto ativo para os comandos exatos da stack.

### Git Worktree (Obrigatório)

**Nunca faça checkout no clone principal.** Crie ou reutilize um worktree por branch (ver
`CONVENTIONS.md` § Git Worktree). No Windows, adapte para PowerShell:
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

Todas as operações seguintes rodam em `{worktree.path}`:
```powershell
Set-Location "{worktree.path}"
git status --porcelain
```

Antes de qualquer `git add`, mostrar ao dev os arquivos que serão incluídos.

Para commit, adicionar apenas arquivos específicos:
```powershell
Set-Location "{worktree.path}"
git add "{arquivo1}" "{arquivo2}"
git status
git commit -m "feat: descricao`n`n- detalhe 1`n- detalhe 2`n`nRefs: ETAPA N — {slug}-plan-NNN-nome-da-feature"
```

### Commits sem coautoria de IA

Nunca adicionar trailer `Co-Authored-By` de IA (Claude, Cursor, etc.) nos commits.

### Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
