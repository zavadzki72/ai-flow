# 🔷 Integração Azure — Setup e Autenticação

## Visão Geral

A integração Azure permite que os comandos `/spec`, `/planejar` e `/implementar` se conectem ao Azure DevOps para:

- Buscar Work Items (cards) para o `/spec`
- Criar Tasks por step no `/planejar`
- Atualizar status de Tasks no `/implementar`
- Criar e gerenciar branches no Azure Repos
- Criar Pull Requests automaticamente

---

## Configuração Inicial

### 1. Obter PAT (Personal Access Token)

No Azure DevOps:
1. Acesse `https://dev.azure.com/{sua-org}`
2. Clique no ícone de usuário → **Personal Access Tokens**
3. **New Token** com as seguintes permissões:
   - **Work Items:** Read & Write
   - **Code (Repos):** Read & Write
   - **Build:** Read (opcional, para pipeline status)
4. Copie o token gerado — ele não será exibido novamente

### 2. Configurar no projeto

Crie o arquivo `.azure-mcp.json` na raiz do projeto:

```json
{
  "organization": "https://dev.azure.com/sua-organizacao",
  "project": "nome-do-projeto",
  "repository": "nome-do-repositorio",
  "defaultTeam": "nome-do-time",
  "defaultAreaPath": "projeto\\area",
  "defaultIterationPath": "projeto\\Sprint 1",
  "pat": "SEU_PAT_AQUI"
}
```

> ⚠️ **IMPORTANTE:** Adicione `.azure-mcp.json` ao `.gitignore`. Nunca comite o PAT.

```bash
echo ".azure-mcp.json" >> .gitignore
```

### 3. Verificar a conexão

Quando o agent iniciar, ele tentará ler `.azure-mcp.json`. Se encontrar:
- Fará uma chamada de verificação à API do Azure DevOps
- Confirmará: **"✅ Azure DevOps conectado: [org]/[projeto]"**

Se não encontrar:
- Funcionará normalmente sem integração Azure
- Exibirá: **"ℹ️ Azure DevOps não configurado. Funcionalidades offline disponíveis."**

---

## Autenticação nas Chamadas

Todas as chamadas à API do Azure DevOps usam Basic Auth com PAT:

```
Authorization: Basic base64(":PAT")
Content-Type: application/json
```

Base URL padrão:
```
https://dev.azure.com/{organization}/{project}/_apis/
```

---

## Arquivos de Integração

Cada funcionalidade tem seu próprio arquivo de instruções:

| Funcionalidade | Arquivo |
|---|---|
| Work Items (ler/criar/atualizar) | `integrations/azure/work-items.md` |
| Repos (branches, commits, PRs) | `integrations/azure/repos.md` |
| Boards (sprints, backlogs) | `integrations/azure/boards.md` |

---

## Fallback sem Azure

Se a integração não estiver configurada, todos os comandos funcionam normalmente:

| Com Azure | Sem Azure |
|---|---|
| Busca card pelo número | Dev descreve a feature manualmente |
| Cria Tasks por step | Steps ficam apenas no PLAN local |
| Cria branch automaticamente | Dev cria a branch manualmente |
| Abre PR ao final | Dev abre o PR manualmente |
| Atualiza status de Task | Dev atualiza o board manualmente |