# MCP — Model Context Protocol Servers

Esta pasta centraliza o setup de MCP servers oficiais utilizados no dia a dia.

> **Regra:** usar apenas MCPs oficiais — nunca criar implementações próprias.

---

## O que é MCP?

MCP (Model Context Protocol) é o protocolo que permite que ferramentas de IA se conectem
a sistemas externos (Azure DevOps, SonarQube, Datadog, GitHub, etc.) de forma padronizada.

As skills desta pasta são **agnósticas de cliente**. Elas geram uma especificação MCP portável
e aplicam no cliente escolhido pelo dev: Claude Code, Cursor, Gemini CLI, GitHub Copilot/VS Code
ou outro cliente compatível com MCP.

Consulte `MCP/CLIENTS.md` para os formatos e comandos por cliente.

---

## MCPs Disponíveis

| Provider | Status | Servidor Oficial | Skill |
|----------|--------|------------------|-------|
| Azure DevOps | Disponível | `@azure-devops/mcp` local ou `https://mcp.dev.azure.com/{org}` remoto | `MCP/azure-devops/SKILL.md` |
| SonarQube | Disponível | `mcp/sonarqube` (Docker) | `MCP/sonarqube/SKILL.md` |
| Datadog | Em breve | — | — |

---

## Como Usar

Cada pasta contém:
- **`SKILL.md`** — skill guiada que lê o `map.json` do projeto ativo, gera a configuração pré-preenchida e aplica com confirmação
- **`config-template.json`** — template de referência da configuração MCP

Para configurar um MCP:
1. Certifique-se de que o projeto ativo tem `.ai-project` apontando para o `map.json` correto
2. Invoque a skill: `/setup-mcp-azure-devops` ou `/setup-mcp-sonarqube`
3. Escolha o cliente de IA que receberá a configuração
4. Siga o processo guiado

---

## Adicionando um Novo MCP

1. Copie `MCP/_template/` para `MCP/{nome-do-provider}/`
2. Preencha `SKILL.md` com o processo de setup do provider
3. Preencha `config-template.json` com o snippet portável de configuração
4. Adicione na tabela acima
