# ai-flow

Repositório central de configurações, skills e contexto para uso de IA no dia a dia de desenvolvimento.

---

## Estrutura

```
ai-flow/
  CLAUDE/SKILLS/          Skills para Claude Code (adapters)
  GEMINI/SKILLS/          Skills para Gemini (adapters)
  COPILOT/SKILLS/         Skills para GitHub Copilot CLI (adapters)
  CURSOR/SKILLS/          Skills para Cursor (adapters para Commands/Agent)
  CURSOR/RULES/           Regras opcionais para contexto persistente no Cursor
  SKILLS/SHARED/          Lógica central das skills (agnóstica de provider)
  AGENTS/SHARED/          Personas por papel (agnóstico) + lenses/ de linguagem
  CLAUDE/AGENTS/          Agentes para Claude Code (adapters → .claude/agents/)
  BOILERPLATES/
    BACK/                 Boilerplates de backend (dotnet-api, dotnet-worker, ...)
    FRONT/                Boilerplates de frontend (react, angular, ...)
  MAPS/
    _template/            Template para novos projetos
  CONVENTIONS.md          Como escrever skills, maps e boilerplates
  README.md               Este arquivo
```

---

## Como Funciona

### 1. Skills

As skills são instruções para a IA executar tarefas padronizadas (code review, implementação, planejamento, etc.).

Cada skill tem uma lógica central e adapters por ferramenta:
- **SHARED:** lógica central reutilizável, sem contexto de projeto embutido
- **CLAUDE/SKILLS:** adapter com frontmatter e sintaxe do Claude Code
- **GEMINI/SKILLS:** adapter com sintaxe do Gemini
- **COPILOT/SKILLS:** adapter com sintaxe do GitHub Copilot CLI (Windows/PowerShell)
- **CURSOR/SKILLS:** adapter em Markdown para Cursor Commands/Agent

### 2. Maps

O map é o "appsettings" de cada projeto, em `MAPS/{slug}/`. Contém:
- **`{slug}-map.json`:** config estruturada — repos, stack, paths, boilerplates, links para docs
- **`{slug}-context.md`:** prosa rica — arquitetura, padrões, glossário, integrações

Os arquivos levam o slug do projeto no nome (não apenas `map.json`/`context.md`) porque o
repositório também funciona como vault do Obsidian — sem o prefixo, todo projeto teria um
arquivo de nome idêntico, impossível de diferenciar na busca rápida ou no grafo.

As skills **nunca** têm contexto de projeto embutido. Elas leem o map do projeto ativo antes de agir.

### 3. Projeto Ativo

Para que as skills saibam em qual projeto você está trabalhando, crie um arquivo `.ai-project` na raiz do repositório:

```
# .ai-project
MAPS/project
```

Se o arquivo não existir, a skill vai perguntar qual projeto usar.

---

## Skills Disponíveis

| Skill | Trigger | O que faz |
|-------|---------|-----------|
| `code-review` | `/code-review` | Revisa código validando PLAN, padrões e boas práticas |
| `test-e2e` | `/test-e2e` | Sobe o ambiente local (Docker, nativo ou híbrido), simula um usuário navegando pela feature e gera relatório com evidências (screenshots) |
| `implementar` | `/implementar` | Executa uma etapa do PLAN com branch, código, testes e commit |
| `planejar` | `/planejar` | Cria um PLAN de execução a partir de um PRD |
| `spec` | `/spec` | Gera especificação técnica de uma feature |
| `setup` | `/setup` | Configura ambiente de desenvolvimento |
| `setup-project` | `/setup-project` | Cria novo projeto no ai-flow ({slug}-map.json, {slug}-context.md, .ai-project) |
| `start-project` | `/start-project` | Orquestrador zero → MVP rodando: descoberta da ideia, recorte do MVP_000001, boilerplate, bootstrap físico, PRD e PLAN do MVP |
| `feature-workflow` | `/feature-workflow` | Orquestra o ciclo por feature delegando a cada agente por papel (PM → Arquiteto → Dev → Tech Lead) com gates humanos |

---

## Agentes Disponíveis

Personas por papel que **usam as skills** acima. **Agente ≠ Skill:** a skill é o processo; o agente é
quem o executa (mindset + model + tools + especialização). Cada agente roda em **janela de contexto
isolada** e se comunica por consulta + handoff em arquivo. Detalhes em `AGENTS/DESIGN.md`.

| Agente | Papel | Skill que executa |
|--------|-------|-------------------|
| `product-manager` | Product Manager / Owner | `/spec` |
| `arquiteto-senior` | Arquiteto de Software Sênior | `/planejar` |
| `dev-senior` | Dev Sênior (lê a stack do map + lente de linguagem) | `/implementar` |
| `qa` | QA Engenheiro de Testes E2E (sobe ambiente, navega via MCP de browser) | `/test-e2e` |
| `tech-lead` | Tech Lead (guardião de engenharia, read-only) | `/code-review` |

Orquestração: `/feature-workflow` conduz PM → Arquiteto → Dev → Tech Lead com gate humano entre artefatos.
`/test-e2e` roda entre `/implementar` (todas as etapas concluídas) e `/code-review` — ainda fora do
`/feature-workflow`, disparado manualmente enquanto a integração ao orquestrador não é feita.

**Instalação (Claude Code):** copie os adapters de `CLAUDE/AGENTS/*.md` para `.claude/agents/` do
repositório (ou `~/.claude/agents/` para todos os projetos) e **reinicie a sessão**.
`.claude/agents/` também é lido nativamente por Cursor e Copilot (VS Code).

> 1º corte: **só Claude Code**. Gemini (`.gemini/agents/`) fica para quando for cobrir essa ferramenta.

---

## Configurando MCPs

MCPs (Model Context Protocol) conectam a IA a sistemas externos como Azure DevOps, Datadog, etc.
As skills em `MCP/` são agnósticas de cliente e geram configuração para Claude Code, Cursor, Gemini CLI, GitHub Copilot/VS Code ou outro cliente MCP compatível.

| Provider | Skill | Status |
|----------|-------|--------|
| Azure DevOps | `MCP/azure-devops/SKILL.md` | ✅ Disponível |
| Datadog | — | 🔜 Em breve |

Para configurar:
1. Certifique-se de ter o projeto ativo configurado (`.ai-project`)
2. Invoque a skill correspondente: `/setup-mcp-azure-devops`
3. Siga o processo guiado — a skill lê o `{slug}-map.json`, gera uma especificação MCP portável e aplica no cliente escolhido

Consulte `MCP/README.md` e `MCP/CLIENTS.md` para mais detalhes.

---

## Adicionando um Novo Projeto

1. Copie `MAPS/_template/` para `MAPS/{slug}/`
2. Renomeie `map.json` → `{slug}-map.json` e `context.md` → `{slug}-context.md`
3. Preencha os dois arquivos
4. Crie `.ai-project` na raiz de cada repositório do projeto

Consulte `CONVENTIONS.md` para detalhes e regras de nomenclatura.

---

## Adicionando uma Nova Skill

1. Crie a lógica central em `SKILLS/SHARED/nome-skill.md`
2. Crie o adapter em `CLAUDE/SKILLS/nome-skill/SKILL.md`
3. Crie o adapter em `GEMINI/SKILLS/nome-skill/SKILL.md`
4. Crie o adapter em `COPILOT/SKILLS/nome-skill/SKILL.md`
5. Crie o adapter em `CURSOR/SKILLS/nome-skill/SKILL.md`
6. Documente na tabela acima

Consulte `CONVENTIONS.md` para o template e regras de escrita.
