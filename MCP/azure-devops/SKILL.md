---
name: setup-mcp-azure-devops
description: Configura o MCP oficial do Azure DevOps de forma agnóstica de cliente. Gera uma especificação MCP portável e aplica em Claude Code, Cursor, Gemini CLI, GitHub Copilot/VS Code ou outro cliente compatível.
---

# Skill: Setup MCP — Azure DevOps

## Trigger
`/setup-mcp-azure-devops` · `/setup-mcp devops` · "configurar mcp azure devops" · "setup azure devops mcp"

---

## Informações Importantes

- **Servidor local oficial:** `@azure-devops/mcp`
- **Servidor remoto oficial:** `https://mcp.dev.azure.com/{org}`
- **Remoto vs local:**
  - Remoto HTTP: recomendado quando o cliente suporta o fluxo Entra/OAuth do Azure DevOps.
  - Local stdio: opção mais portável para Claude Code, Cursor, Gemini CLI e outros clientes MCP.
- **Autenticação local:** OAuth via browser por padrão; opcionalmente Azure CLI com `--authentication azcli`.
- **Autenticação remota:** Microsoft Entra/OAuth pelo cliente.
- **Múltiplas orgs:** cada org deve ter um nome de servidor próprio, como `azure-devops-{org}`.
- **Referência de clientes:** seguir `MCP/CLIENTS.md`.

---

## Pré-requisitos

Para modo local:

```bash
node --version   # requer >= 20
npx --version
```

Se usar `--authentication azcli`:

```bash
az --version
az login
```

Para modo remoto, validar apenas que o cliente escolhido suporta servidor MCP HTTP e autenticação Microsoft Entra.

---

## Processo

### Passo 1: Carregar Contexto do Projeto

Verificar se existe `.ai-project` para identificar o projeto ativo.

Ler:
- `MAPS/{projeto}/map.json`
- `MAPS/{projeto}/context.md`

Se `map.tooling.project-management.type == "azure-devops"`, usar `workitems-project` e `repos-project` como contexto para o teste final. Se o map não tiver organização, pedir ao dev.

---

### Passo 2: Coletar Organização

Perguntar:

```text
Qual é o nome da sua organização no Azure DevOps?

Exemplo: se a URL é https://dev.azure.com/minha-empresa/...
O nome da org é: minha-empresa
```

Validar que o dev informou apenas o nome curto, sem URL e sem barras.

---

### Passo 3: Escolher Cliente MCP

Perguntar:

```text
Em qual cliente você quer configurar este MCP?

1. Claude Code
2. Cursor
3. Gemini CLI
4. GitHub Copilot / VS Code
5. Outro cliente MCP compatível
```

Usar `MCP/CLIENTS.md` para paths, comandos e formato do arquivo.

---

### Passo 4: Escolher Modo de Conexão

Perguntar:

```text
Como você quer conectar ao Azure DevOps?

1. Local stdio via @azure-devops/mcp (mais portável)
2. Remoto HTTP via https://mcp.dev.azure.com/{org}
```

Recomendação:
- Para GitHub Copilot / VS Code, sugerir remoto HTTP primeiro.
- Para Claude Code, Cursor, Gemini CLI e outros clientes, sugerir local stdio primeiro.
- Se o remoto falhar por autenticação Entra no cliente, usar local stdio.

---

### Passo 5: Opções do Servidor Local

Se o modo escolhido for local stdio, perguntar:

```text
Quer limitar os domínios carregados?

1. Sim, carregar apenas core, work e work-items
2. Sim, escolher domínios manualmente
3. Não, carregar todos os domínios
```

Domínios disponíveis:
`core`, `work`, `work-items`, `repositories`, `wiki`, `pipelines`, `search`, `test-plans`, `advanced-security`.

Perguntar também:

```text
Usar autenticação via Azure CLI?

1. Não, usar OAuth via browser
2. Sim, adicionar --authentication azcli
```

Se escolher Azure CLI, confirmar que `az login` já foi executado.

---

### Passo 6: Escolher Escopo

Perguntar o escopo conforme o cliente escolhido:

- Claude Code: `local`, `project` ou `user`
- Cursor: projeto (`.cursor/mcp.json`) ou global (`~/.cursor/mcp.json`)
- Gemini CLI: `project` ou `user`
- GitHub Copilot / VS Code: workspace (`.vscode/mcp.json`) ou user profile
- Outro: gerar instrução portável

Para Azure DevOps local/remoto não é necessário salvar token manualmente no arquivo.

---

### Passo 7: Gerar Especificação Portável

#### Local stdio

Com `{org}` e opções escolhidas:

```json
{
  "name": "azure-devops-{org}",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@azure-devops/mcp", "{org}"]
}
```

Se usar Azure CLI:

```json
{
  "name": "azure-devops-{org}",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@azure-devops/mcp", "{org}", "--authentication", "azcli"]
}
```

Se limitar domínios:

```json
{
  "name": "azure-devops-{org}",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@azure-devops/mcp", "{org}", "-d", "core", "work", "work-items"]
}
```

No Windows, se o cliente falhar ao iniciar `npx`, trocar `command` para `npx.cmd`.

#### Remoto HTTP

```json
{
  "name": "azure-devops-{org}",
  "transport": "http",
  "url": "https://mcp.dev.azure.com/{org}"
}
```

Exibir a especificação ao dev e pedir confirmação antes de aplicar.

---

### Passo 8: Aplicar no Cliente Escolhido

Aplicar conforme `MCP/CLIENTS.md`.

#### Claude Code

Local stdio:

```bash
claude mcp add --transport stdio --scope {local|project|user} azure-devops-{org} -- npx -y @azure-devops/mcp {org}
```

Remoto HTTP:

```bash
claude mcp add --transport http --scope {local|project|user} azure-devops-{org} https://mcp.dev.azure.com/{org}
```

Verificar:

```bash
claude mcp list
```

#### Cursor

Projeto: `.cursor/mcp.json`.
Global: `~/.cursor/mcp.json`.

Local stdio:

```json
{
  "mcpServers": {
    "azure-devops-{org}": {
      "command": "npx",
      "args": ["-y", "@azure-devops/mcp", "{org}"]
    }
  }
}
```

Remoto HTTP:

```json
{
  "mcpServers": {
    "azure-devops-{org}": {
      "type": "http",
      "url": "https://mcp.dev.azure.com/{org}"
    }
  }
}
```

#### Gemini CLI

Local stdio:

```bash
gemini mcp add --scope {project|user} azure-devops-{org} npx -y @azure-devops/mcp {org}
```

Remoto HTTP:

```bash
gemini mcp add --scope {project|user} --transport http azure-devops-{org} https://mcp.dev.azure.com/{org}
```

Verificar:

```bash
gemini mcp list
```

#### GitHub Copilot / VS Code

Workspace: `.vscode/mcp.json`.
User profile: comando `MCP: Open User Configuration`.

Local stdio:

```json
{
  "inputs": [
    {
      "id": "ado_org",
      "type": "promptString",
      "description": "Azure DevOps organization name"
    }
  ],
  "servers": {
    "azure-devops": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@azure-devops/mcp", "${input:ado_org}"]
    }
  }
}
```

Remoto HTTP:

```json
{
  "servers": {
    "azure-devops-{org}": {
      "type": "http",
      "url": "https://mcp.dev.azure.com/{org}"
    }
  }
}
```

Verificar com `MCP: List Servers`.

#### Outro Cliente

Entregar a especificação portável e orientar a converter para o formato esperado pelo cliente.

---

### Passo 9: Confirmar e Orientar Teste

```text
MCP azure-devops-{org} configurado.

Resumo:
  - Cliente: {cliente}
  - Escopo: {escopo}
  - Modo: {local stdio|remoto http}
  - Servidor: azure-devops-{org}

Teste sugerido:
  "Liste meus projetos no Azure DevOps"
```

Se for local OAuth, avisar que a primeira execução de uma ferramenta pode abrir o browser para login com a conta Microsoft.

---

## Troubleshooting

**Servidor não aparece:**
- Verificar se aplicou no escopo correto do cliente.
- Recarregar/reiniciar o cliente.
- Usar o comando de listagem do cliente (`claude mcp list`, `gemini mcp list`, `MCP: List Servers`, Settings > MCP).

**`npx` não encontrado no Windows:**
- Trocar `command` de `npx` para `npx.cmd`.
- Verificar `node --version` e `npx --version`.

**Browser não abre / erro de autenticação no modo local:**
- Rodar manualmente: `npx -y @azure-devops/mcp {org}`.
- Tentar Azure CLI: adicionar `--authentication azcli` e executar `az login`.

**Erro de organização não encontrada:**
- Usar apenas o nome curto da organização (`contoso`, não `https://dev.azure.com/contoso`).

**Muitas ferramentas carregadas:**
- Adicionar `-d` com domínios específicos, por exemplo:
  ```bash
  npx -y @azure-devops/mcp {org} -d core work work-items
  ```

---

## Referências

- Guia de clientes: `MCP/CLIENTS.md`
- Servidor local oficial: https://github.com/microsoft/azure-devops-mcp
- Servidor remoto oficial: https://learn.microsoft.com/azure/devops/mcp-server/remote-mcp-server
