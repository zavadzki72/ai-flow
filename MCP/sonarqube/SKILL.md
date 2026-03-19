---
name: setup-mcp-sonarqube
description: Configura o MCP oficial do SonarQube (mcp/sonarqube via Docker). Pergunta o modo de conexão (Cloud ou Server), coleta token e credenciais, registra via `claude mcp add` com nome único por instância (sonarqube-cloud-{org} ou sonarqube-server-{slug}) e orienta o dev a reiniciar o Claude Code. Suporta múltiplas instâncias — cada execução adiciona uma entrada sem remover as outras.
---

# Skill: Setup MCP — SonarQube

## Trigger
`/setup-mcp-sonarqube` · "configurar mcp sonarqube" · "setup sonarqube mcp"

---

## Informações Importantes

- **Imagem oficial:** `mcp/sonarqube` (Docker Hub)
- **Dois modos de conexão:**
  - **SonarQube Cloud** — exige `SONARQUBE_TOKEN` + `SONARQUBE_ORG` → nome: `sonarqube-cloud-{org}`
  - **SonarQube Server** — exige `SONARQUBE_TOKEN` + `SONARQUBE_URL` → nome: `sonarqube-server-{slug}`
- **Múltiplas instâncias:** cada execução adiciona uma entrada separada sem remover as outras
- **Token nunca é salvo em arquivo do repositório** — passado via `--env` no `claude mcp add`
- **Método de registro:** usar **exclusivamente** o comando `claude mcp add` (NÃO editar arquivos JSON manualmente)

---

## Pré-requisitos

Verificar antes de iniciar:

```bash
docker --version
docker info
```

Se Docker não estiver instalado ou o daemon não estiver rodando:
```
❌ Docker não encontrado ou não está em execução.

Instale em: https://docs.docker.com/get-docker/
Após instalar e iniciar o Docker Desktop, rode novamente: /setup-mcp-sonarqube
```

---

## Processo

### Passo 1: Identificar o Modo de Conexão

Perguntar:

```
Qual tipo de SonarQube você vai conectar?

1️⃣  SonarQube Cloud (sonarcloud.io)
2️⃣  SonarQube Server (instância própria / self-hosted)

Qual opção? (1/2)
```

---

### Passo 2: Coletar Credenciais e Derivar o Nome da Entrada

#### Se Cloud (opção 1):

```
🔑 Você precisará de:
  • Token de usuário do SonarQube Cloud
  • Chave da organização (Organization Key)

Acesse: https://sonarcloud.io/account/security
  → Gere um token do tipo "User Token"
  → Escopos mínimos: "Execute Analysis", "Administer Quality Profiles" (ou conforme necessidade)

Para a chave da organização:
  → Acesse https://sonarcloud.io/account/organizations
  → Copie o "Organization Key" (não o nome, mas a chave curta)

⚠️ O token NÃO será salvo em nenhum arquivo do repositório.

Informe:
  1. Seu token:
  2. Sua organization key:
```

Perguntar também se é SonarQube Cloud US:
```
Você está usando SonarQube Cloud US (sonarqube.us)? (s/n)
```

**Derivar nome da entrada:** `sonarqube-cloud-{org}`
- Usar a organization key informada diretamente (já é um slug)
- Exemplo: org `minha-empresa` → nome `sonarqube-cloud-minha-empresa`

#### Se Server (opção 2):

```
🔑 Você precisará de:
  • Token de usuário do SonarQube Server
  • URL do servidor SonarQube

No seu SonarQube Server:
  → Acesse: {SUA_URL}/account/security
  → Gere um token do tipo "User Token"

⚠️ O token NÃO será salvo em nenhum arquivo do repositório.

Informe:
  1. Seu token:
  2. URL do servidor (ex: https://sonarqube.empresa.com):
```

**Derivar o slug da URL** para compor o nome da entrada: `sonarqube-server-{slug}`
- Extrair apenas o hostname da URL
- Converter para minúsculas, substituir pontos e underscores por hífens, remover protocolo
- Exemplo: `https://sonarqube.empresa.com` → slug `sonarqube-empresa-com` → nome `sonarqube-server-sonarqube-empresa-com`
- Exemplo: `https://sonar.interno` → nome `sonarqube-server-sonar-interno`

---

### Passo 3: Escolher Scope de Configuração

```
📍 Onde aplicar a configuração?

1️⃣  Global (-s user) — disponível em todos os projetos
2️⃣  Projeto (-s local) — apenas nesta sessão/projeto atual

Qual opção? (1/2)
```

---

### Passo 4: Gerar e Exibir o Comando

Montar o comando baseado nas respostas anteriores, usando o `{nome}` derivado no Passo 2.

#### Cloud (sem Cloud US):
```
📋 Configuração que será registrada:

Nome: sonarqube-cloud-{org}
Token: {primeiros 8 chars}...{últimos 4 chars}
Org: {SONARQUBE_ORG}
Scope: {user ou local}

Comando:
claude mcp add -s {scope} sonarqube-cloud-{org} \
  --env SONARQUBE_TOKEN={TOKEN} \
  --env SONARQUBE_ORG={ORG} \
  -- docker run --init --pull=always -i --rm -e SONARQUBE_TOKEN -e SONARQUBE_ORG mcp/sonarqube

Aplicar? (s/n)
```

#### Cloud US:
```
📋 Configuração que será registrada:

Nome: sonarqube-cloud-{org}
Token: {primeiros 8 chars}...{últimos 4 chars}
Org: {SONARQUBE_ORG}
URL: https://sonarqube.us
Scope: {user ou local}

Comando:
claude mcp add -s {scope} sonarqube-cloud-{org} \
  --env SONARQUBE_TOKEN={TOKEN} \
  --env SONARQUBE_ORG={ORG} \
  --env SONARQUBE_URL=https://sonarqube.us \
  -- docker run --init --pull=always -i --rm -e SONARQUBE_TOKEN -e SONARQUBE_ORG -e SONARQUBE_URL mcp/sonarqube

Aplicar? (s/n)
```

#### Server:
```
📋 Configuração que será registrada:

Nome: sonarqube-server-{slug}
Token: {primeiros 8 chars}...{últimos 4 chars}
URL: {SONARQUBE_URL}
Scope: {user ou local}

Comando:
claude mcp add -s {scope} sonarqube-server-{slug} \
  --env SONARQUBE_TOKEN={TOKEN} \
  --env SONARQUBE_URL={URL} \
  -- docker run --init --pull=always -i --rm -e SONARQUBE_TOKEN -e SONARQUBE_URL mcp/sonarqube

Aplicar? (s/n)
```

---

### Passo 5: Verificar se Já Existe e Registrar

#### 5a. Verificar se já existe

```bash
claude mcp list 2>&1
```

Se a saída contiver `{nome}`, informar:
```
⚠️ Já existe uma configuração para {nome}.
Deseja sobrescrever? (s/n)
```

Se sim, remover primeiro:
```bash
claude mcp remove {nome} -s user 2>&1
claude mcp remove {nome} -s local 2>&1
```

#### 5b. Registrar o servidor MCP

Executar o comando montado no Passo 4.

> 🚨 **CRÍTICO — NÃO edite arquivos JSON manualmente.**
> O único método correto é usar o comando `claude mcp add`.
> O `claude mcp add` registra no `~/.claude.json`, que é o arquivo que o Claude Code realmente carrega.

Verificar que o comando retornou mensagem de sucesso contendo "Added stdio MCP server".

---

### Passo 6: Confirmar e Orientar

```
✅ MCP {nome} registrado com sucesso!

🔄 PRÓXIMO PASSO OBRIGATÓRIO:
   Reinicie o Claude Code para que o MCP seja carregado.

   Após reiniciar, teste com:
   /mcp (deve listar o servidor {nome})
   "Liste meus projetos no SonarQube"

   Na primeira execução, o Docker vai baixar a imagem mcp/sonarqube
   (pode levar alguns instantes).

📌 Para adicionar outra instância SonarQube, rode /setup-mcp-sonarqube novamente.
   Cada instância vira uma entrada separada e independente.

📌 Ferramentas disponíveis após reiniciar:
   Análise:
     - analyze_code_snippet  — analisa código inline com SonarLint
     - analyze_file_list     — analisa arquivos locais (requer IDE bridge)
   Projetos e Issues:
     - search_my_sonarqube_projects
     - search_sonar_issues_in_projects
     - change_sonar_issue_status
   Qualidade:
     - get_project_quality_gate_status
     - list_quality_gates
     - get_component_measures
   Segurança:
     - search_security_hotspots
     - show_security_hotspot
     - change_security_hotspot_status
   Cobertura e Duplicações:
     - search_files_by_coverage
     - get_file_coverage_details
     - search_duplicated_files
   Regras e Métricas:
     - show_rule
     - search_metrics
     - list_languages
```

---

## Troubleshooting

**MCP não aparece após reiniciar (`/mcp` mostra vazio):**
- Confirmar que usou `claude mcp add` (NÃO editou JSON manualmente)
- Re-executar o comando de registro
- Verificar se Docker está rodando: `docker info`

**Docker não encontrado / erro ao iniciar container:**
- Verificar instalação: `docker --version`
- Verificar daemon: `docker info`
- No Windows, garantir que o Docker Desktop está aberto

**Erro de autenticação (401):**
- Token expirado ou sem permissões — gerar novo token no SonarQube
- Verificar se o token tem acesso ao projeto/org

**`organization is required` (Cloud):**
- Confirmar que passou `SONARQUBE_ORG` corretamente
- Usar a chave curta da org (não o nome completo)

**`Connection refused` ou timeout (Server):**
- Verificar se a URL está correta e acessível
- Confirmar se o SonarQube Server está rodando
- Testar acesso manual: `curl {SONARQUBE_URL}/api/system/status`

**`No space left on device`:**
- Docker sem espaço em disco — limpar imagens antigas: `docker system prune`

---

## Referências

- Imagem oficial: https://hub.docker.com/r/mcp/sonarqube
- Repositório: https://github.com/SonarSource/sonarqube-mcp-server
- Geração de token Cloud: https://sonarcloud.io/account/security
- Configuração MCP no Claude Code: https://docs.anthropic.com/claude-code/mcp
