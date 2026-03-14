---
name: setup-mcp-azure-devops
description: Configura o MCP oficial do Azure DevOps (@azure-devops/mcp). Pergunta o nome da organização, registra via `claude mcp add` e orienta o dev a reiniciar o Claude Code. Suporta múltiplas orgs — cada execução adiciona uma entrada sem remover as outras.
---

# Skill: Setup MCP — Azure DevOps

## Trigger
`/setup-mcp-azure-devops` · `/setup-mcp devops` · "configurar mcp azure devops" · "setup azure devops mcp"

---

## Informações Importantes

- **Pacote oficial:** `@azure-devops/mcp`
- **Autenticação:** OAuth via browser (padrão) — na primeira vez que uma ferramenta ADO for usada, o browser abre para login com a conta Microsoft
- **PATs não são suportados** por este MCP
- **Múltiplas orgs:** cada org vira uma entrada separada `azure-devops-{org}`
- **Método de registro:** usar **exclusivamente** o comando `claude mcp add` (NÃO editar arquivos JSON manualmente)

---

## Pré-requisitos

Verificar antes de iniciar:

```bash
node --version   # requer >= 20
npx --version
```

Se Node.js não estiver instalado ou for menor que 20:
```
❌ Node.js não encontrado ou versão incompatível.

Instale em: https://nodejs.org (versão LTS recomendada — 20+)
Após instalar, rode novamente: /setup-mcp-azure-devops
```

---

## Processo

### Passo 1: Coletar o Nome da Organização

Perguntar:

```
Qual é o nome da sua organização no Azure DevOps?

Exemplo: se a URL é https://dev.azure.com/minha-empresa/...
O nome da org é: minha-empresa
```

Validar que o dev informou apenas o nome (sem URL, sem barras).

---

### Passo 2: Detectar o Sistema Operacional e Montar o Comando

> ⚠️ **CRÍTICO — Windows requer `npx.cmd`**
> No Windows, o Claude Code não consegue executar `npx` diretamente — é necessário usar `npx.cmd`.
> Detectar automaticamente a plataforma e escolher o comando correto.

**Regra:**
- Se a plataforma for **Windows** (`win32`): usar `npx.cmd`
- Se a plataforma for **Linux/macOS**: usar `npx`

Com o nome da org em `{org}` e o comando correto em `{npx_cmd}`, apresentar ao dev:

```
📋 Configuração que será registrada:

Nome: azure-devops-{org}
Comando: {npx_cmd} -y @azure-devops/mcp {org}
Plataforma detectada: {Windows|Linux|macOS}
Scope: user (disponível em todos os projetos)

Aplicar? (s/n)
```

---

### Passo 3: Verificar se já existe e Registrar via CLI

> 🚨 **CRÍTICO — NÃO edite arquivos JSON manualmente.**
> O único método correto é usar o comando `claude mcp add`.
> O arquivo `~/.claude/mcp.json` NÃO é lido pelo Claude Code.
> O `claude mcp add` registra no `~/.claude.json`, que é o arquivo que o Claude Code realmente carrega.

#### 3a. Verificar se já existe

Rodar:
```bash
claude mcp list 2>&1
```

Se a saída contiver `azure-devops-{org}`, informar:
```
⚠️ Já existe uma configuração para azure-devops-{org}.
Deseja sobrescrever? (s/n)
```

Se sim, remover primeiro:
```bash
claude mcp remove azure-devops-{org} -s user 2>&1
claude mcp remove azure-devops-{org} -s local 2>&1
```

#### 3b. Registrar o servidor MCP

Rodar os dois comandos para garantir cobertura em ambos os scopes:

```bash
claude mcp add -s user azure-devops-{org} -- {npx_cmd} -y @azure-devops/mcp {org}
claude mcp add -s local azure-devops-{org} -- {npx_cmd} -y @azure-devops/mcp {org}
```

Onde:
- `-s user`: registra no nível global (disponível em todos os projetos)
- `-s local`: registra no projeto atual (garante que aparece na sessão corrente)
- `--`: separa os argumentos do `claude mcp add` dos argumentos do comando MCP

Verificar que ambos retornaram mensagens de sucesso contendo "Added stdio MCP server".

---

### Passo 4: Confirmar e Orientar

```
✅ MCP azure-devops-{org} registrado com sucesso!

🔄 PRÓXIMO PASSO OBRIGATÓRIO:
   Reinicie o Claude Code para que o MCP seja carregado.

   Após reiniciar, teste com:
   /mcp (deve listar o servidor)
   "Liste os projetos ADO"

   Na primeira execução de uma ferramenta ADO, o browser vai abrir
   para login com sua conta Microsoft — é o comportamento normal do OAuth.

📌 Para adicionar outra organização, rode /setup-mcp-azure-devops novamente.
   Cada org vira uma entrada separada e independente.
```

---

## Troubleshooting

**MCP não aparece após reiniciar (`/mcp` mostra vazio):**
- Confirmar que usou `claude mcp add` (e NÃO editou `~/.claude/mcp.json` manualmente — esse arquivo NÃO é lido)
- Re-executar: `claude mcp add -s user azure-devops-{org} -- {npx_cmd} -y @azure-devops/mcp {org}`
- Verificar se Node.js 20+ está instalado: `node --version`
- **No Windows:** verificar se o command está como `npx.cmd` (e NÃO `npx`)

**Browser não abre / erro de autenticação:**
- Tentar rodar manualmente no terminal para ver o erro: `npx -y @azure-devops/mcp {org}`
- Se tiver políticas de tenant bloqueando OAuth, usar az CLI: adicionar `--authentication azcli` nos args e rodar `az login` antes:
  ```bash
  claude mcp add -s user azure-devops-{org} -- {npx_cmd} -y @azure-devops/mcp {org} --authentication azcli
  ```

**Erro de organização não encontrada:**
```
Error fetching projects: Failed to find api location for area...
```
- O nome da org está errado ou com URL completa — usar apenas o nome curto (`contoso`, não `https://dev.azure.com/contoso`)

**Conta pessoal não funciona:**
- Contas pessoais (não vinculadas ao Entra ID) não são suportadas pelo MCP

**Muitas ferramentas carregadas (limite de 128):**
- Adicionar `-d` com domínios específicos nos args:
  ```bash
  claude mcp add -s user azure-devops-{org} -- {npx_cmd} -y @azure-devops/mcp {org} -d core work work-items
  ```
  Domínios disponíveis: `core`, `work`, `work-items`, `repositories`, `wiki`, `pipelines`, `search`, `test-plans`, `advanced-security`

---

## Referências

- Repositório oficial: https://github.com/microsoft/azure-devops-mcp
- Documentação getting started: https://github.com/microsoft/azure-devops-mcp/blob/main/docs/GETTINGSTARTED.md
- Configuração MCP no Claude Code: https://docs.anthropic.com/claude-code/mcp
