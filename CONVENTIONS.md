# Conventions

Guia de como escrever e manter skills, maps e boilerplates neste repositório.

---

## Skills

### Estrutura de uma Skill

Toda skill tem três camadas:

```
SKILLS/SHARED/nome-skill.md     ← lógica central, agnóstica de provider
CLAUDE/SKILLS/nome-skill/SKILL.md   ← adapter com sintaxe Claude Code
GEMINI/SKILLS/nome-skill/SKILL.md   ← adapter com sintaxe Gemini
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
- **Lógica central em SHARED.** Os adapters de Claude/Gemini apenas traduzem sintaxe.
- **Perguntas obrigatórias primeiro.** Se a skill precisa de PRD, PLAN ou branch, peça antes de agir.
- **Passos numerados e explícitos.** O dev deve conseguir acompanhar o que a skill está fazendo.
- **Saída estruturada.** Relatórios e resultados devem ter formato consistente.

### Frontmatter do Adapter Claude

```markdown
---
name: nome-skill
description: Uma linha descrevendo quando e para que a skill é usada.
---
```

---

## Maps

### Estrutura de um Map

Cada projeto em `MAPS/` deve ter:

```
MAPS/{projeto}/
  map.json      ← configuração estruturada (obrigatório)
  context.md    ← contexto em prosa (obrigatório)
  prd/          ← PRDs de features
  plan/         ← PLANs de execução
  adr/          ← Architectural Decision Records
```

### Schema do map.json

Siga o template em `MAPS/_template/map.json`. Campos obrigatórios:
- `project.name`, `project.description`, `project.status`
- `repositories` com ao menos um entry com `path`, `branch` e `contexts`
- `stack` com ao menos `backend` ou `frontend`

### Nomenclatura de Documentos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| PRD | `PRD_NNN_Nome_Feature.md` | `PRD_001_Gestao_Usuarios.md` |
| PLAN | `PLAN_NNN_Nome_Feature.md` | `PLAN_001_Gestao_Usuarios.md` |
| ADR | `ADR_NNN_Titulo_Decisao.md` | `ADR_001_Escolha_ORM.md` |

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

1. Copie `MAPS/_template/` para `MAPS/{nome-projeto}/`
2. Preencha `map.json` com as informações do projeto
3. Preencha `context.md` com arquitetura, padrões e glossário
4. Crie o arquivo `.ai-project` na raiz de cada repositório do projeto apontando para `MAPS/{nome-projeto}`
