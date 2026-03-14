# ai-flow

Repositório central de configurações, skills e contexto para uso de IA no dia a dia de desenvolvimento.

---

## Estrutura

```
ai-flow/
  CLAUDE/SKILLS/          Skills para Claude Code (adapters)
  GEMINI/SKILLS/          Skills para Gemini (adapters)
  SKILLS/SHARED/          Lógica central das skills (agnóstica de provider)
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

Cada skill tem três camadas:
- **SHARED:** lógica central reutilizável, sem contexto de projeto embutido
- **CLAUDE/SKILLS:** adapter com frontmatter e sintaxe do Claude Code
- **GEMINI/SKILLS:** adapter com sintaxe do Gemini

### 2. Maps

O map é o "appsettings" de cada projeto. Contém:
- **`map.json`:** config estruturada — repos, stack, paths, boilerplates, links para docs
- **`context.md`:** prosa rica — arquitetura, padrões, glossário, integrações

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
| `implementar` | `/implementar` | Executa uma etapa do PLAN com branch, código, testes e commit |
| `planejar` | `/planejar` | Cria um PLAN de execução a partir de um PRD |
| `spec` | `/spec` | Gera especificação técnica de uma feature |
| `setup` | `/setup` | Configura ambiente de desenvolvimento |

---

## Configurando MCPs

MCPs (Model Context Protocol) conectam a IA a sistemas externos como Azure DevOps, Datadog, etc.

| Provider | Skill | Status |
|----------|-------|--------|
| Azure DevOps | `MCP/azure-devops/SKILL.md` | ✅ Disponível |
| Datadog | — | 🔜 Em breve |

Para configurar:
1. Certifique-se de ter o projeto ativo configurado (`.ai-project`)
2. Invoque a skill correspondente: `/setup-mcp-azure-devops`
3. Siga o processo guiado — a skill lê o `map.json` para pré-preencher a org automaticamente

Consulte `MCP/README.md` para mais detalhes.

---

## Adicionando um Novo Projeto

1. Copie `MAPS/_template/` para `MAPS/{nome-projeto}/`
2. Preencha `map.json` e `context.md`
3. Crie `.ai-project` na raiz de cada repositório do projeto

Consulte `CONVENTIONS.md` para detalhes e regras de nomenclatura.

---

## Adicionando uma Nova Skill

1. Crie a lógica central em `SKILLS/SHARED/nome-skill.md`
2. Crie o adapter em `CLAUDE/SKILLS/nome-skill/SKILL.md`
3. Crie o adapter em `GEMINI/SKILLS/nome-skill/SKILL.md`
4. Documente na tabela acima

Consulte `CONVENTIONS.md` para o template e regras de escrita.
