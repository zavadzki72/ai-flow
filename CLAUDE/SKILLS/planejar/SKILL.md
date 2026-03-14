---
name: planejar
description: Cria plano de execução técnico detalhado baseado em PRD existente. Lê contexto via map.json e todos os docs/ do projeto, atualiza repositório(s), explora código profundamente por camada, identifica componentes técnicos com paths completos, quebra implementação em baby steps independentes e gera arquivo PLAN completo.
---

# Skill: Planejar (Criar Plano de Execução)

## Trigger
`/planejar` · `/criar-plano` · "criar plano" · "plano de execução"

Também aceita PRD inline:
`/planejar {map.docs.prd}/001_Nome_Feature.md`

## Processo Completo
Leia e siga: `SKILLS/SHARED/planejar.md`

---

## Notas Específicas do Claude Code

### Leitura de Arquivos e Exploração de Código

Use as ferramentas nativas do Claude Code:
- `Read` — ler arquivos individuais (PRD, context.md, arquivos de código)
- `Glob` — listar estrutura de pastas e encontrar arquivos por padrão
- `Grep` — buscar padrões no código (nome de entidade, handlers, etc.)

Prefira essas ferramentas ao invés de comandos bash para leitura, pois são mais eficientes.

### Execução de Comandos

Para comandos de build e verificação (ver `docs/architecture/commands.md` do projeto ativo),
use a ferramenta `Bash` apenas quando necessário executar algo — não para leitura de arquivos.

### Próximos Skills na Sequência
- Após criar o PLAN: `/implementar ETAPA 1`
- Para revisar código: `/code-review`
