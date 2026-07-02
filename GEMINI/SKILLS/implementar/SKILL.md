# Skill: Implementar (Executar Etapa do Plano)

## Trigger
`/implementar` · `/executar` · "implementar etapa" · "executar etapa"

Aceita PLAN e etapa inline:
`/implementar {map.docs.plan}/{slug}-plan-001-nome.md ETAPA 1`
`/implementar ETAPA 1` (se PLAN já foi mencionado na conversa)

## Processo Completo
Leia e siga: `SKILLS/SHARED/implementar.md`

---

## Notas Específicas do Gemini

### Leitura e Edição de Arquivos

Use as capacidades nativas do Gemini para ler e editar arquivos.
Sempre ler um arquivo antes de editá-lo.

### Execução de Comandos

Use a capacidade de execução de comandos do Gemini para build, testes e git.
Consultar `{slug}-context.md#comandos` para os comandos exatos da stack do projeto ativo.

### Git Worktree (Obrigatório)

**Nunca faça checkout no clone principal.** Crie ou reutilize um worktree por branch (Passo 3 da
skill, ver `CONVENTIONS.md` § Git Worktree) — `git fetch` no clone, `git worktree add` para a
branch, e todas as operações seguintes rodando dentro do worktree. Se o Git recusar com
`branch already checked out at ...`, outra sessão está usando a branch agora — informe o dev e pare.

### Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
