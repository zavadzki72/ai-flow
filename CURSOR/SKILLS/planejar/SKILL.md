# Skill: Planejar (Criar Plano de Execução)

## Trigger
`/planejar` · `/criar-plano` · "criar plano" · "plano de execução"

Também aceita PRD inline:
`/planejar {map.docs.prd}/001_Nome_Feature.md`

## Processo Completo
Leia e siga: `SKILLS/SHARED/planejar.md`

---

## Notas Específicas do Cursor

### Uso como Custom Command

Este adapter pode ser instalado em `.cursor/commands/planejar.md`.
No chat do Cursor, o comando fica disponível como `/planejar`.

### Leitura de Arquivos e Exploração de Código

Use o Agent do Cursor para ler PRD, `{slug}-map.json`, `{slug}-context.md`, docs do projeto e arquivos de código.

Prefira:
- Busca do workspace para encontrar entidades, handlers, services, tests, migrations e componentes relacionados
- Referências `@` quando o dev apontar PRD, arquivos ou pastas
- Terminal integrado apenas quando precisar executar comandos reais

Antes de criar o PLAN, explore o código por camada e registre paths completos dos componentes técnicos afetados.

### Execução de Comandos

Para comandos de build, verificação ou atualização de repositório, use o terminal integrado. No Windows, use PowerShell:
```powershell
# Buscar arquivos por padrão
Get-ChildItem -Path "{repo.path}" -Recurse -Filter "*{Entidade}*" |
    Where-Object { $_.FullName -notmatch "bin|obj|\.git" }

# Atualizar repositório
Set-Location "{repo.path}"
git fetch origin
git checkout {repo.branch}
git pull origin {repo.branch}
```

### Próximos Skills na Sequência

> HARD STOP — NÃO IMPLEMENTAR AUTOMATICAMENTE
> Após criar o PLAN, a skill termina. Não executar nenhuma etapa de implementação.
> Aguardar o dev acionar explicitamente `/implementar ETAPA N`.

- Para implementar: o dev aciona `/implementar ETAPA 1` (não automático)
- Para revisar código: `/code-review`
