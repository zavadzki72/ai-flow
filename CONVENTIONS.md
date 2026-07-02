# Conventions

Guia de como escrever e manter skills, maps e boilerplates neste repositório.

---

## Skills

### Estrutura de uma Skill

Toda skill tem uma lógica central e um adapter por ferramenta:

```
SKILLS/SHARED/nome-skill.md     ← lógica central, agnóstica de provider
CLAUDE/SKILLS/nome-skill/SKILL.md   ← adapter com sintaxe Claude Code
GEMINI/SKILLS/nome-skill/SKILL.md   ← adapter com sintaxe Gemini
COPILOT/SKILLS/nome-skill/SKILL.md  ← adapter com sintaxe GitHub Copilot CLI
CURSOR/SKILLS/nome-skill/SKILL.md   ← adapter em Markdown para Cursor Commands/Agent
```

### Como as Skills Acessam Contexto de Projeto

**Todas as skills devem começar com um Passo 0:** localizar e ler o map do projeto ativo.

O projeto ativo é determinado por um arquivo `.ai-project` na raiz do repositório onde o dev está trabalhando, com o seguinte conteúdo:

```
MAPS/project
```

Se `.ai-project` não existir, a skill deve perguntar ao dev: `Qual projeto estamos trabalhando? (ex: projeto-1, projeto-2)`

Após identificar o projeto:
1. Ler `MAPS/{projeto}/map.json` para obter configuração estruturada
2. Ler `MAPS/{projeto}/context.md` (ou seção específica) para contexto em prosa
3. Identificar o repositório correto usando o campo `contexts` de cada repo
4. Aplicar os `standards` referenciados

### Regras para Escrever Skills

- **Sem contexto de projeto embutido.** Todo contexto vem do map.
- **Lógica central em SHARED.** Os adapters de Claude/Gemini/Copilot/Cursor apenas traduzem sintaxe.
- **Perguntas obrigatórias primeiro.** Se a skill precisa de PRD, PLAN ou branch, peça antes de agir.
- **Passos numerados e explícitos.** O dev deve conseguir acompanhar o que a skill está fazendo.
- **Saída estruturada.** Relatórios e resultados devem ter formato consistente.

### Frontmatter do Adapter Claude e Copilot CLI

```markdown
---
name: nome-skill
description: Uma linha descrevendo quando e para que a skill é usada.
---
```

### Adapter Cursor

O adapter Cursor deve ser Markdown simples, sem frontmatter obrigatório, para poder ser usado como Custom Command em `.cursor/commands/{nome-skill}.md`.

Todo adapter Cursor deve incluir:
- Trigger esperado no chat (`/nome-skill`)
- Referência ao processo completo em `SKILLS/SHARED/{nome-skill}.md`
- Seção `Notas Específicas do Cursor`
- Orientação para usar o Agent do Cursor para leitura/edição e o terminal integrado apenas para build, testes e git
- Adaptação de comandos para PowerShell quando o ambiente for Windows

Instruções persistentes de comportamento do Cursor devem ficar em `CURSOR/RULES/*.mdc`.

---

## Agentes (Personas por Papel)

Um **agente** é uma **persona** (o "QUEM": mindset + model + tools + especialização) que **usa uma
skill** (o "COMO"). **Agente ≠ Skill:** a skill é o processo; o agente é quem o executa.
Racional completo em `AGENTS/DESIGN.md`.

### Estrutura

```
AGENTS/SHARED/{papel}.md            ← persona canônica, agnóstica (fonte de verdade)
AGENTS/SHARED/lenses/{linguagem}.md ← lentes de linguagem (só conhecimento idiomático)
CLAUDE/AGENTS/{papel}.md            ← adapter Claude Code (instala em .claude/agents/)
```

### Contrato de conteúdo de uma persona (regra de ouro contra duplicação)

O corpo de um agente contém **apenas**:
1. Identidade / mindset do papel;
2. "Seu processo é a skill `/X` — siga `SKILLS/SHARED/X.md`" (**nunca** reescrever os passos);
3. Perfil de tools (least-privilege);
4. **Bloco de isolamento** — cada agente roda em **janela de contexto própria**;
5. **Bloco de comunicação** — quando consultar outro agente e como devolver dúvidas ao humano;
6. `description` acionável (dispara a delegação).

> ❌ Nunca colocar lógica de negócio na persona — isso é da skill. `SKILLS/SHARED` é a fonte única de verdade.

### Papéis atuais

| Papel | Skill | Tools |
|-------|-------|-------|
| `product-manager` | `/spec` | Read/Glob/Grep + Write (só `prd/`) |
| `arquiteto-senior` | `/planejar` | + Write (`plan/`, `adr/`) + Bash (git) |
| `dev-senior` | `/implementar` | + Edit/Write/Bash (lê a stack do map + lente) |
| `qa` | `/test-e2e` | Read/Glob/Grep + Bash (docker) + Write (só `e2e/`) + MCP de browser |
| `tech-lead` | `/code-review` | Read/Glob/Grep + Bash (read-only) |

Orquestração: skill `/feature-workflow` (ver `SKILLS/SHARED/feature-workflow.md`).

### Comunicação e Handoff

- Cada agente roda **isolado**; a comunicação é por **consulta (request/response)** + **estado em arquivo**.
- Todo artefato termina com uma **Nota de Handoff**: *De/Para · Decisões · Dúvidas em aberto · O que o próximo papel deve saber*.
- Decisões relevantes vão para o **log de decisões** (`adr/`).
- Como subagent isolado **não recebe `AskUserQuestion`**, as skills interativas usam **ask-upfront**:
  o agente **retorna** as dúvidas e o orquestrador as leva ao humano.

### Regras

- **Só Claude Code no 1º corte.** `.claude/agents/*.md` é lido nativamente por Claude Code, Cursor e
  Copilot (VS Code); Gemini precisaria de arquivo próprio (`.gemini/agents/`) — fazer ao cobrir Gemini.
- ⚠️ **Editar um agente em disco não recarrega na sessão ativa** — reinicie a sessão (ou crie via `/agents`).

### Adicionando um Novo Agente

1. Crie a persona em `AGENTS/SHARED/{papel}.md` (seguindo o contrato acima).
2. Crie o adapter em `CLAUDE/AGENTS/{papel}.md` (frontmatter + "leia `AGENTS/SHARED/{papel}.md`" + notas Claude).
3. Instale em `.claude/agents/` (copie o adapter) no repositório/cliente.
4. Documente na tabela do `README.md`.

---

## Maps

### Estrutura de um Map

Cada projeto em `MAPS/` deve ter:

```
MAPS/{slug}/
  {slug}-map.json      ← configuração estruturada (obrigatório)
  {slug}-context.md    ← contexto em prosa (obrigatório)
  prd/          ← PRDs de features
  plan/         ← PLANs de execução
  e2e/          ← Relatórios e evidências de teste E2E (/test-e2e)
  adr/          ← Architectural Decision Records
```

`{slug}` é o nome da pasta do projeto (mesmo valor usado em `MAPS/{slug}/` e
no `.ai-project`) — sempre minúsculo, com hífen, sem acento (ex: `copa-draft`,
`gestao-usuarios`). Todo arquivo dentro do map carrega esse prefixo para ficar
único e identificável quando o repositório é aberto como vault do Obsidian
(sem isso, cada projeto teria um `context.md`/`map.json` de nome idêntico,
impossível de diferenciar na busca rápida ou no grafo).

### Schema do map.json

Siga o template em `MAPS/_template/map.json` (ao copiar, renomear para
`{slug}-map.json`). Campos obrigatórios:
- `project.name`, `project.description`, `project.status`
- `repositories` com ao menos um entry com `path`, `branch` e `contexts`
- `stack` com ao menos `backend` ou `frontend`

`environments.local` é **opcional**, mas obrigatório para usar a skill `/test-e2e` — declara como
subir o ambiente local via Docker (`compose-path`, `services` com URL e healthcheck de cada um,
`seed-command`, `teardown-command`) e os usuários de teste (`test-users`, sempre com a senha
referenciada por `password-env`, **nunca** literal).

### Nomenclatura de Documentos

Todos os nomes são `kebab-case` minúsculo, prefixados com `{slug}` do projeto.

| Tipo | Padrão | Exemplo (`slug = gestao-usuarios`) |
|------|--------|---------|
| Map | `{slug}-map.json` | `gestao-usuarios-map.json` |
| Context | `{slug}-context.md` | `gestao-usuarios-context.md` |
| PRD | `{slug}-prd-NNN-id-nome-da-feature.md` | `gestao-usuarios-prd-001-tbd-cadastro-de-usuario.md` |
| PLAN | `{slug}-plan-NNN-nome-da-feature.md` (mesmo NNN do PRD) | `gestao-usuarios-plan-001-cadastro-de-usuario.md` |
| E2E Report | `{slug}-e2e-NNN-nome-da-feature.md` (mesmo NNN do PRD/PLAN) | `gestao-usuarios-e2e-001-cadastro-de-usuario.md` |
| ADR | `{slug}-adr-NNN-titulo-da-decisao.md` | `gestao-usuarios-adr-001-escolha-orm.md` |

`id` no PRD é o número do ticket externo (Azure DevOps/Jira) ou `tbd` se não
houver. `NNN` é sempre zero-padded a 3 dígitos, exceto no MVP inicial gerado
pelo `/start-project` (`000001`, zero-padded a 6 dígitos — ver `start-project.md`).

---

## Boilerplates

Boilerplates ficam em `BOILERPLATES/BACK/` e `BOILERPLATES/FRONT/`.

O nome da pasta deve coincidir com o valor do campo `boilerplate` em `map.json` para que as skills possam localizá-los automaticamente.

Cada boilerplate deve conter um `README.md` explicando:
- O que é o boilerplate
- Como usar
- Variáveis/placeholders que precisam ser substituídos

---

## Adicionando um Novo Projeto

1. Copie `MAPS/_template/` para `MAPS/{slug}/`
2. Renomeie `map.json` → `{slug}-map.json` e `context.md` → `{slug}-context.md`
3. Preencha `{slug}-map.json` com as informações do projeto
4. Preencha `{slug}-context.md` com arquitetura, padrões e glossário
5. Crie o arquivo `.ai-project` na raiz de cada repositório do projeto apontando para `MAPS/{slug}`

---

## Adicionando uma Nova Skill

1. Crie a lógica central em `SKILLS/SHARED/nome-skill.md`
2. Crie o adapter em `CLAUDE/SKILLS/nome-skill/SKILL.md`
3. Crie o adapter em `GEMINI/SKILLS/nome-skill/SKILL.md`
4. Crie o adapter em `COPILOT/SKILLS/nome-skill/SKILL.md`
5. Crie o adapter em `CURSOR/SKILLS/nome-skill/SKILL.md`
6. Documente na tabela em `README.md`
