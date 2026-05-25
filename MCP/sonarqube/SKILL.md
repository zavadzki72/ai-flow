---
name: setup-mcp-sonarqube
description: Configura o MCP oficial do SonarQube (mcp/sonarqube via Docker) de forma agnóstica de cliente. Gera uma especificação MCP portável e aplica em Claude Code, Cursor, Gemini CLI, GitHub Copilot/VS Code ou outro cliente compatível.
---

# Skill: Setup MCP — SonarQube

## Trigger
`/setup-mcp-sonarqube` · "configurar mcp sonarqube" · "setup sonarqube mcp"

---

## Informações Importantes

- **Imagem oficial:** `mcp/sonarqube` (Docker Hub)
- **Transporte:** stdio via container Docker
- **SonarQube Cloud:** exige `SONARQUBE_TOKEN` + `SONARQUBE_ORG`
- **SonarQube Server:** exige `SONARQUBE_TOKEN` + `SONARQUBE_URL`
- **Múltiplas instâncias:** cada instância deve ter nome próprio, como `sonarqube-cloud-{org}` ou `sonarqube-server-{slug}`
- **Segurança:** token não deve ser salvo em arquivo versionável
- **Referência de clientes:** seguir `MCP/CLIENTS.md`

---

## Pré-requisitos

Verificar antes de iniciar:

```bash
docker --version
docker info
```

Se Docker não estiver instalado ou o daemon não estiver rodando:

```text
Docker não encontrado ou não está em execução.

Instale em: https://docs.docker.com/get-docker/
Após instalar e iniciar o Docker Desktop, rode novamente: /setup-mcp-sonarqube
```

---

## Processo

### Passo 1: Carregar Contexto do Projeto

Verificar se existe `.ai-project` para identificar o projeto ativo.

Ler:
- `MAPS/{projeto}/map.json`
- `MAPS/{projeto}/context.md`

Se `map.tooling.sonar.project-key` e `map.tooling.sonar.mcp-server` existirem, usar como contexto para sugerir nome e teste final.

---

### Passo 2: Identificar o Modo de Conexão

Perguntar:

```text
Qual tipo de SonarQube você vai conectar?

1. SonarQube Cloud (sonarcloud.io)
2. SonarQube Cloud US (sonarqube.us)
3. SonarQube Server (instância própria / self-hosted)
```

---

### Passo 3: Coletar Credenciais

#### Cloud

Orientar:

```text
Você precisará de:
- Token de usuário do SonarQube Cloud
- Organization Key

Acesse: https://sonarcloud.io/account/security
Gere um token de usuário.

O token não deve ser salvo em arquivo versionável.
```

Coletar:
- `SONARQUBE_TOKEN`
- `SONARQUBE_ORG`

Nome da entrada: `sonarqube-cloud-{org}`.

#### Cloud US

Coletar:
- `SONARQUBE_TOKEN`
- `SONARQUBE_ORG`

Usar também:
- `SONARQUBE_URL=https://sonarqube.us`

Nome da entrada: `sonarqube-cloud-{org}`.

#### Server

Orientar:

```text
Você precisará de:
- Token de usuário do SonarQube Server
- URL do servidor SonarQube

No seu SonarQube Server:
acesse {SUA_URL}/account/security e gere um User Token.

O token não deve ser salvo em arquivo versionável.
```

Coletar:
- `SONARQUBE_TOKEN`
- `SONARQUBE_URL`

Derivar slug da URL:
- Extrair hostname
- Converter para minúsculas
- Substituir pontos e underscores por hífens
- Remover protocolo e caracteres inválidos

Nome da entrada: `sonarqube-server-{slug}`.

---

### Passo 4: Escolher Cliente MCP

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

### Passo 5: Escolher Escopo

Perguntar o escopo conforme o cliente escolhido:

- Claude Code: `local`, `project` ou `user`
- Cursor: projeto (`.cursor/mcp.json`) ou global (`~/.cursor/mcp.json`)
- Gemini CLI: `project` ou `user`
- GitHub Copilot / VS Code: workspace (`.vscode/mcp.json`) ou user profile
- Outro: gerar instrução portável

Se o escopo for versionável, usar referência a variável de ambiente ou input seguro em vez de salvar token real.

---

### Passo 6: Gerar Especificação Portável

#### Cloud

```json
{
  "name": "sonarqube-cloud-{org}",
  "transport": "stdio",
  "command": "docker",
  "args": [
    "run", "--init", "--pull=always", "-i", "--rm",
    "-e", "SONARQUBE_TOKEN",
    "-e", "SONARQUBE_ORG",
    "mcp/sonarqube"
  ],
  "env": {
    "SONARQUBE_TOKEN": "{TOKEN}",
    "SONARQUBE_ORG": "{ORG}"
  }
}
```

#### Cloud US

```json
{
  "name": "sonarqube-cloud-{org}",
  "transport": "stdio",
  "command": "docker",
  "args": [
    "run", "--init", "--pull=always", "-i", "--rm",
    "-e", "SONARQUBE_TOKEN",
    "-e", "SONARQUBE_ORG",
    "-e", "SONARQUBE_URL",
    "mcp/sonarqube"
  ],
  "env": {
    "SONARQUBE_TOKEN": "{TOKEN}",
    "SONARQUBE_ORG": "{ORG}",
    "SONARQUBE_URL": "https://sonarqube.us"
  }
}
```

#### Server

```json
{
  "name": "sonarqube-server-{slug}",
  "transport": "stdio",
  "command": "docker",
  "args": [
    "run", "--init", "--pull=always", "-i", "--rm",
    "-e", "SONARQUBE_TOKEN",
    "-e", "SONARQUBE_URL",
    "mcp/sonarqube"
  ],
  "env": {
    "SONARQUBE_TOKEN": "{TOKEN}",
    "SONARQUBE_URL": "{URL}"
  }
}
```

Exibir ao dev com token mascarado (`primeiros 8 chars...últimos 4 chars`) e pedir confirmação antes de aplicar.

---

### Passo 7: Aplicar no Cliente Escolhido

Aplicar conforme `MCP/CLIENTS.md`.

#### Claude Code

Para escopos privados (`local` ou `user`), pode usar `--env`:

```bash
claude mcp add --transport stdio --scope {local|user} \
  --env SONARQUBE_TOKEN={TOKEN} \
  --env SONARQUBE_ORG={ORG} \
  sonarqube-cloud-{org} -- docker run --init --pull=always -i --rm -e SONARQUBE_TOKEN -e SONARQUBE_ORG mcp/sonarqube
```

Para escopo `project`, não salvar token real. Usar variável de ambiente no `.mcp.json`:

```json
{
  "mcpServers": {
    "sonarqube-cloud-{org}": {
      "command": "docker",
      "args": ["run", "--init", "--pull=always", "-i", "--rm", "-e", "SONARQUBE_TOKEN", "-e", "SONARQUBE_ORG", "mcp/sonarqube"],
      "env": {
        "SONARQUBE_TOKEN": "${SONARQUBE_TOKEN}",
        "SONARQUBE_ORG": "{ORG}"
      }
    }
  }
}
```

Verificar:

```bash
claude mcp list
```

#### Cursor

Projeto: `.cursor/mcp.json`.
Global: `~/.cursor/mcp.json`.

Usar variáveis de ambiente para token:

```json
{
  "mcpServers": {
    "sonarqube-cloud-{org}": {
      "command": "docker",
      "args": ["run", "--init", "--pull=always", "-i", "--rm", "-e", "SONARQUBE_TOKEN", "-e", "SONARQUBE_ORG", "mcp/sonarqube"],
      "env": {
        "SONARQUBE_TOKEN": "${env:SONARQUBE_TOKEN}",
        "SONARQUBE_ORG": "{ORG}"
      }
    }
  }
}
```

#### Gemini CLI

Para escopo `user`, pode usar `--env`:

```bash
gemini mcp add --scope user \
  --env SONARQUBE_TOKEN={TOKEN} \
  --env SONARQUBE_ORG={ORG} \
  sonarqube-cloud-{org} docker run --init --pull=always -i --rm -e SONARQUBE_TOKEN -e SONARQUBE_ORG mcp/sonarqube
```

Para escopo `project`, preferir `.gemini/settings.json` com token via variável de ambiente:

```json
{
  "mcpServers": {
    "sonarqube-cloud-{org}": {
      "command": "docker",
      "args": ["run", "--init", "--pull=always", "-i", "--rm", "-e", "SONARQUBE_TOKEN", "-e", "SONARQUBE_ORG", "mcp/sonarqube"],
      "env": {
        "SONARQUBE_TOKEN": "${SONARQUBE_TOKEN}",
        "SONARQUBE_ORG": "{ORG}"
      }
    }
  }
}
```

Verificar:

```bash
gemini mcp list
```

#### GitHub Copilot / VS Code

Workspace: `.vscode/mcp.json`.
User profile: comando `MCP: Open User Configuration`.

Usar `inputs` para token:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "sonarqube-token",
      "description": "SonarQube token",
      "password": true
    }
  ],
  "servers": {
    "sonarqube-cloud-{org}": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "--init", "--pull=always", "-i", "--rm", "-e", "SONARQUBE_TOKEN", "-e", "SONARQUBE_ORG", "mcp/sonarqube"],
      "env": {
        "SONARQUBE_TOKEN": "${input:sonarqube-token}",
        "SONARQUBE_ORG": "{ORG}"
      }
    }
  }
}
```

Verificar com `MCP: List Servers`.

#### Outro Cliente

Entregar a especificação portável e orientar a converter para o formato esperado pelo cliente.

---

### Passo 8: Confirmar e Orientar Teste

```text
MCP {nome} configurado.

Resumo:
  - Cliente: {cliente}
  - Escopo: {escopo}
  - Servidor: {nome}
  - Transporte: stdio via Docker

Teste sugerido:
  "Liste meus projetos no SonarQube"
```

Na primeira execução, o Docker pode baixar a imagem `mcp/sonarqube`.

Ferramentas esperadas após carregar:
- `search_my_sonarqube_projects`
- `search_sonar_issues_in_projects`
- `get_project_quality_gate_status`
- `get_component_measures`
- `search_security_hotspots`
- `show_security_hotspot`

---

## Troubleshooting

**Servidor não aparece:**
- Verificar se aplicou no escopo correto do cliente.
- Recarregar/reiniciar o cliente.
- Usar o comando de listagem do cliente (`claude mcp list`, `gemini mcp list`, `MCP: List Servers`, Settings > MCP).

**Docker não encontrado / erro ao iniciar container:**
- Verificar `docker --version`.
- Verificar `docker info`.
- No Windows, garantir que o Docker Desktop está aberto.

**Erro de autenticação (401):**
- Token expirado ou sem permissões.
- Verificar se o token tem acesso ao projeto/org.

**`organization is required` no Cloud:**
- Confirmar `SONARQUBE_ORG`.
- Usar a chave curta da org, não o nome completo.

**`Connection refused` ou timeout no Server:**
- Verificar `SONARQUBE_URL`.
- Testar acesso manual: `curl {SONARQUBE_URL}/api/system/status`.

**`No space left on device`:**
- Docker sem espaço em disco. Limpar imagens antigas: `docker system prune`.

---

## Referências

- Guia de clientes: `MCP/CLIENTS.md`
- Imagem oficial: https://hub.docker.com/r/mcp/sonarqube
- Repositório: https://github.com/SonarSource/sonarqube-mcp-server
- Geração de token Cloud: https://sonarcloud.io/account/security
