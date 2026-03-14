# MCP — Model Context Protocol Servers

Esta pasta centraliza o setup de MCP servers oficiais utilizados no dia a dia.

> **Regra:** usar apenas MCPs oficiais — nunca criar implementações próprias.

---

## O que é MCP?

MCP (Model Context Protocol) é o protocolo que permite que ferramentas de IA se conectem
a sistemas externos (Azure DevOps, Datadog, GitHub, etc.) de forma padronizada.

No Claude Code, MCPs são configurados em:
- **Global** (`~/.claude/settings.json`) — disponível em todas as sessões
- **Projeto** (`.mcp.json` na raiz do projeto) — disponível apenas naquele projeto

---

## MCPs Disponíveis

| Provider | Status | Pacote Oficial | Skill |
|----------|--------|---------------|-------|
| Azure DevOps | ✅ Disponível | `@microsoft/azure-devops-mcp` | `MCP/azure-devops/SKILL.md` |
| Datadog | 🔜 Em breve | — | — |

---

## Como Usar

Cada pasta contém:
- **`SKILL.md`** — skill guiada que lê o `map.json` do projeto ativo, gera a configuração pré-preenchida e aplica com sua confirmação
- **`config-template.json`** — template de referência do JSON de configuração

Para configurar um MCP:
1. Certifique-se de que o projeto ativo tem `.ai-project` apontando para o `map.json` correto
2. Invoque a skill: `/setup-mcp-azure-devops` (ou conforme o trigger da skill)
3. Siga o processo guiado

---

## Adicionando um Novo MCP

1. Copie `MCP/_template/` para `MCP/{nome-do-provider}/`
2. Preencha `SKILL.md` com o processo de setup do provider
3. Preencha `config-template.json` com o snippet de configuração
4. Adicione na tabela acima
