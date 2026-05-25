# Skill: Spec (Criar PRD)

## Trigger
`/spec` · `/prd` · `/criar-spec` · `/criar-prd` · "criar especificação" · "nova feature"

## Processo Completo
Leia e siga: `SKILLS/SHARED/spec.md`

---

## Notas Específicas do Cursor

### Uso como Custom Command

Este adapter pode ser instalado em `.cursor/commands/spec.md`.
No chat do Cursor, o comando fica disponível como `/spec`.

### Interação com o Dev

Use o chat do Cursor para todas as perguntas ao dev.
Colete as informações em blocos e confirme decisões importantes antes de gerar o PRD.

Quando houver caminhos claros, prefira opções curtas:
1. Manual — responder perguntas
2. Azure DevOps — fornecer ID do item
3. Jira — fornecer ID do item

### Integração com Azure DevOps (Modo MCP)

Se `map.tooling.project-management.type == "azure-devops"`, usar MCP se estiver configurado no Cursor:

| Ação | Ferramenta MCP |
|------|---------------|
| Buscar work item | `mcp__azure-devops__wit_get_work_item` |
| Adicionar comentário | `mcp__azure-devops__wit_add_work_item_comment` |
| Atualizar work item (tag) | `mcp__azure-devops__wit_update_work_item` |

Projetos a usar:
- Work items / comentários → `map.tooling.project-management.workitems-project`
- Repositórios (se necessário buscar código via DevOps) → `map.tooling.project-management.repos-project`

### Leitura de Arquivos

Use o Agent do Cursor para ler arquivos locais:
- `map.json`
- `context.md`
- docs do projeto
- arquivos de código relacionados à feature

Use busca do workspace para localizar padrões existentes antes de escrever escopo técnico.

### Atualização de Repositórios (Windows/PowerShell)

```powershell
$repoPath = "{repo.path}"
if (Test-Path $repoPath -PathType Container) {
    Set-Location $repoPath
    git fetch origin
    git checkout {repo.branch}
    git pull origin {repo.branch}
} else {
    Write-Host "Repositório não encontrado em $repoPath"
    Write-Host "Clone com: git clone {repo.url}"
}
```

### Próximo Skill na Sequência
Após gerar o PRD, sugerir: `/planejar`
