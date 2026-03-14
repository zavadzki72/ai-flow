---
name: setup-mcp-PROVIDER
description: Configura o MCP oficial do PROVIDER (PACOTE_NPM). Orienta criação de token/credenciais, gera configuração pré-preenchida e aplica no local escolhido (global ou projeto) com confirmação explícita.
---

# Skill: Setup MCP — PROVIDER

## Trigger
`/setup-mcp-PROVIDER` · "configurar mcp PROVIDER" · "setup PROVIDER mcp"

---

## Pré-requisitos

Listar pré-requisitos do MCP:
- [ ] [Pré-requisito 1 — ex: Node.js >= 18]
- [ ] [Pré-requisito 2 — ex: conta no serviço]

```bash
# Verificar pré-requisitos
COMANDO_VERIFICACAO --version
```

---

## Processo

### Passo 1: Carregar Contexto do Projeto

Verificar se existe `.ai-project` para identificar o projeto ativo.
Extrair de `map.json` os valores relevantes para pré-preencher a configuração:
- [Campo do map.json relevante]

---

### Passo 2: Coletar Informações

**2.1.** Confirmar/solicitar [parâmetro de configuração principal]:
```
[Mensagem para o dev]
```

**2.2.** Orientar criação de token/credenciais:
```
🔑 Você precisará de [tipo de credencial].

Acesse: [URL para criação]

[Instruções de escopos/permissões mínimas]

⚠️ O token NÃO será salvo em nenhum arquivo do repositório.
```

---

### Passo 3: Escolher Local de Configuração

```
📍 Onde aplicar a configuração?

1️⃣  Global (~/.claude/settings.json) — todos os projetos
2️⃣  Projeto (.mcp.json) — apenas este projeto

Qual opção? (1/2)
```

---

### Passo 4: Gerar e Exibir Configuração

Gerar JSON com valores coletados (baseado em `config-template.json`).
Exibir ao dev com token parcialmente ocultado.
Pedir confirmação antes de aplicar.

---

### Passo 5: Aplicar Configuração

- Ler arquivo de destino atual (preservar outros MCPs já configurados)
- Fazer merge do novo bloco `mcpServers`
- Se opção projeto: verificar `.gitignore` e adicionar `.mcp.json` se necessário

---

### Passo 6: Verificar e Orientar Reinício

```bash
# Testar instalação do pacote
npx -y PACOTE_OFICIAL_NPM --version
```

Orientar reinício do Claude Code e sugerir teste inicial.

---

### Passo 7: Relatório Final

```
✅ MCP PROVIDER Configurado!

Resumo:
  - Pacote: PACOTE_OFICIAL_NPM
  - Local: {global ou projeto}

Ferramentas disponíveis após reiniciar:
  - [Ferramenta 1]
  - [Ferramenta 2]
```

---

## Troubleshooting

- **MCP não aparece:** verificar JSON válido, local correto, reiniciar Claude Code
- **Erro de autenticação:** token expirado ou sem permissões — gerar novo token
- **Pacote não encontrado:** verificar nome oficial do pacote em https://www.npmjs.com

---

## Referências

- Pacote oficial: https://www.npmjs.com/package/PACOTE_OFICIAL_NPM
- Documentação de autenticação: [URL]
- Configuração MCP no Claude Code: https://docs.anthropic.com/claude-code/mcp
