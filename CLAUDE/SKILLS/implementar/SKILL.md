---
name: implementar
description: Implementa uma etapa específica do plano de execução (baby step). Lê contexto via map.json e context.md, verifica dependências, prepara branch, analisa código existente, implementa seguindo padrões do projeto, roda build e testes, faz commit e atualiza PLAN marcando a etapa como concluída.
---

# Skill: Implementar (Executar Etapa do Plano)

## Trigger
`/implementar` · `/executar` · "implementar etapa" · "executar etapa"

Aceita PLAN e etapa inline:
`/implementar {map.docs.plan}/PLAN_001_Nome.md ETAPA 1`
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

Use `Bash` para build, testes e git. Ver `context.md#comandos` para os comandos exatos da stack.

Antes de qualquer `git add`, mostrar ao dev os arquivos que serão incluídos.

### Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
