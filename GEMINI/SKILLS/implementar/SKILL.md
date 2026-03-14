# Skill: Implementar (Executar Etapa do Plano)

## Trigger
`/implementar` · `/executar` · "implementar etapa" · "executar etapa"

Aceita PLAN e etapa inline:
`/implementar {map.docs.plan}/PLAN_001_Nome.md ETAPA 1`
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
Consultar `context.md#comandos` para os comandos exatos da stack do projeto ativo.

### Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
