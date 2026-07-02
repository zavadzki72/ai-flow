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

## Notas Específicas do Claude Code

### Leitura e Edição de Arquivos

Use **sempre** as ferramentas nativas — nunca cat/sed/awk via Bash:
- `Read` — ler arquivos antes de editar (obrigatório)
- `Edit` — modificações pontuais em arquivos existentes
- `Write` — apenas para arquivos novos
- `Glob` — listar estrutura de pastas
- `Grep` — buscar padrões no código

### Execução de Comandos

Use `Bash` para build, testes e git. Ver `{slug}-context.md#comandos` para os comandos exatos da stack.

Antes de qualquer `git add`, mostrar ao dev os arquivos que serão incluídos.

### Git Worktree (Obrigatório)

**Nunca faça checkout no clone principal.** Crie ou reutilize um worktree por branch (Passo 3 da
skill, ver `CONVENTIONS.md` § Git Worktree):
```bash
cd {repo.path} && git fetch origin
git worktree list
git worktree add "{worktree.path}" {branch}                       # branch já existe local
git worktree add "{worktree.path}" -b {branch} origin/{branch}    # branch só existe no remoto
git worktree add "{worktree.path}" -b {branch}                    # branch nova
```
Se o Git recusar com `branch already checked out at ...`, outra sessão está usando a branch agora —
informe o dev e pare, não force. A partir daqui, todo `Bash`/`Edit`/`Write` roda em `{worktree.path}`.

### Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
