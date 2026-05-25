# Clientes MCP Suportados

Este guia define como uma skill de setup MCP deve aplicar a mesma especificação em clientes diferentes.

## Especificação Portável

Toda skill MCP deve primeiro montar uma especificação portável:

```json
{
  "name": "nome-do-servidor",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "pacote-mcp"],
  "env": {
    "VAR": "valor-ou-referencia"
  }
}
```

Para servidores HTTP:

```json
{
  "name": "nome-do-servidor",
  "transport": "http",
  "url": "https://example.com/mcp",
  "headers": {
    "Authorization": "Bearer ${env:TOKEN}"
  }
}
```

## Regras de Segurança

- Nunca salve tokens reais em arquivos versionáveis.
- Para configuração de projeto, prefira variáveis de ambiente, inputs do cliente ou configuração local não versionada.
- Antes de editar qualquer arquivo de configuração, leia o arquivo atual e preserve outros servidores MCP.
- Antes de sobrescrever um servidor existente com o mesmo nome, peça confirmação explícita.

## Escolha de Cliente

Toda skill de setup MCP deve perguntar:

```text
Em qual cliente você quer configurar este MCP?

1. Claude Code
2. Cursor
3. Gemini CLI
4. GitHub Copilot / VS Code
5. Outro cliente MCP compatível
```

## Claude Code

Opções:
- CLI: `claude mcp add`
- JSON de projeto: `.mcp.json`
- JSON privado do usuário/local gerenciado pelo Claude

Comando stdio:

```bash
claude mcp add --transport stdio --scope {local|project|user} {name} -- {command} {args...}
```

Com variáveis:

```bash
claude mcp add --transport stdio --scope {local|project|user} \
  --env KEY=value \
  {name} -- {command} {args...}
```

Com JSON:

```bash
claude mcp add-json {name} '{"type":"stdio","command":"npx","args":["-y","pacote"],"env":{}}'
```

Verificação:

```bash
claude mcp list
```

Dentro do Claude Code, usar `/mcp`.

## Cursor

Locais:
- Projeto: `.cursor/mcp.json`
- Global: `~/.cursor/mcp.json`

Formato:

```json
{
  "mcpServers": {
    "nome-do-servidor": {
      "command": "npx",
      "args": ["-y", "pacote-mcp"],
      "env": {
        "API_KEY": "${env:API_KEY}"
      }
    }
  }
}
```

Para HTTP:

```json
{
  "mcpServers": {
    "nome-do-servidor": {
      "type": "http",
      "url": "https://example.com/mcp"
    }
  }
}
```

Verificação:
- Reiniciar ou recarregar o Cursor se necessário
- Abrir Settings > MCP ou verificar `Available Tools` no Agent

## Gemini CLI

Opções:
- CLI: `gemini mcp add`
- JSON em `settings.json`

Locais:
- Projeto: `.gemini/settings.json`
- Usuário: `~/.gemini/settings.json`

Comando stdio:

```bash
gemini mcp add --scope {project|user} {name} {command} {args...}
```

Com variáveis:

```bash
gemini mcp add --scope {project|user} \
  --env KEY=value \
  {name} {command} {args...}
```

HTTP:

```bash
gemini mcp add --scope {project|user} --transport http {name} {url}
```

Verificação:

```bash
gemini mcp list
```

Dentro do Gemini CLI, usar `/mcp`.

## GitHub Copilot / VS Code

Locais:
- Workspace: `.vscode/mcp.json`
- User profile: abrir via comando `MCP: Open User Configuration`

Formato:

```json
{
  "servers": {
    "nome-do-servidor": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "pacote-mcp"],
      "env": {
        "API_KEY": "${input:api-key}"
      }
    }
  },
  "inputs": [
    {
      "type": "promptString",
      "id": "api-key",
      "description": "API key",
      "password": true
    }
  ]
}
```

Para HTTP:

```json
{
  "servers": {
    "nome-do-servidor": {
      "type": "http",
      "url": "https://example.com/mcp"
    }
  }
}
```

Verificação:
- Command Palette: `MCP: List Servers`
- Chat em Agent mode com ferramentas habilitadas

## Outro Cliente MCP

Gerar a especificação portável e orientar o dev a consultar a documentação do cliente.
Se o cliente aceitar o padrão `mcpServers`, usar o mesmo formato de Claude/Cursor/Gemini.

## Referências

- Claude Code MCP: https://code.claude.com/docs/en/mcp
- Cursor MCP: https://docs.cursor.com/context/mcp
- Gemini CLI MCP: https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html
- VS Code MCP configuration: https://code.visualstudio.com/docs/copilot/reference/mcp-configuration
