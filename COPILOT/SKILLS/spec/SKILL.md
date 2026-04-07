---
name: spec
description: Cria PRD (Product Requirements Document) para nova feature. Lê contexto do projeto via map.json e context.md, coleta informações via perguntas ou integração com ferramenta de gestão (Azure DevOps, Jira), analisa repositórios e código, e gera PRD completo com critérios BDD, escopo técnico e definição de pronto.
---

# Skill: Spec (Criar PRD)

## Trigger
`/spec` · `/prd` · `/criar-spec` · `/criar-prd` · "criar especificação" · "nova feature"

## Processo Completo
Leia e siga: `SKILLS/SHARED/spec.md`

---

## Notas Específicas do GitHub Copilot CLI

### Interação com o Dev

Use a ferramenta `ask_user` para todas as perguntas ao dev — nunca pergunte apenas via texto.
Prefira perguntas com múltipla escolha (`choices`) para maior agilidade:

Exemplo:
```
ask_user(
  question: "Como você quer fornecer as informações do PRD?",
  choices: ["Manual — responder perguntas", "Via Azure DevOps — fornecer ID do item", "Via Jira — fornecer ID do item"]
)
```

### Integração com Azure DevOps (Modo MCP)

Se `map.tooling.project-management.type == "azure-devops"`, usar as ferramentas MCP:

| Ação | Ferramenta MCP |
|------|---------------|
| Buscar work item | `mcp__azure-devops__wit_get_work_item` |
| Adicionar comentário | `mcp__azure-devops__wit_add_work_item_comment` |
| Atualizar work item (tag) | `mcp__azure-devops__wit_update_work_item` |

Projetos a usar:
- Work items / comentários → `map.tooling.project-management.workitems-project`
- Repositórios (se necessário buscar código via DevOps) → `map.tooling.project-management.repos-project`

### Leitura de Arquivos

Use as ferramentas nativas do Copilot CLI para ler arquivos locais:
- `view` para arquivos individuais
- `glob` para listar estrutura de pastas
- `grep` para buscar padrões no código

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
