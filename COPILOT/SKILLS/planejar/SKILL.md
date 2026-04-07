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

## Notas Específicas do GitHub Copilot CLI

### Leitura de Arquivos e Exploração de Código

Use as ferramentas nativas do Copilot CLI — nunca powershell para leitura de arquivos:
- `view` — ler arquivos individuais (PRD, map.json, arquivos de código)
- `glob` — listar estrutura de pastas e encontrar arquivos por padrão
- `grep` — buscar padrões no código (nome de entidade, handlers, etc.)

Prefira essas ferramentas ao invés de powershell para leitura, pois são mais eficientes.

### Execução de Comandos

Para comandos de build e verificação (ver `docs/architecture/` do projeto ativo),
use a ferramenta `powershell` apenas quando necessário — não para leitura de arquivos.

**Atenção:** O ambiente é Windows. Adapte os comandos do SHARED (bash/Unix) para PowerShell:
```powershell
# Buscar arquivos por padrão (alternativa ao find do Unix)
Get-ChildItem -Path "{repo.path}" -Recurse -Filter "*{Entidade}*" |
    Where-Object { $_.FullName -notmatch "bin|obj|\.git" }

# Atualizar repositório
Set-Location "{repo.path}"
git fetch origin
git checkout {repo.branch}
git pull origin {repo.branch}
```

### Próximos Skills na Sequência

> ⛔ **HARD STOP — NÃO IMPLEMENTAR AUTOMATICAMENTE**
> Após criar o PLAN, a skill termina. Não executar nenhuma etapa de implementação.
> Aguardar o dev acionar explicitamente `/implementar ETAPA N`.

- Para implementar: o dev aciona `/implementar ETAPA 1` (não automático)
- Para revisar código: `/code-review`
