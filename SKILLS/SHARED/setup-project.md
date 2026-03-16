# Skill: Setup Project (Criar Novo Projeto)

## Descrição

Guia o dev na criação de um novo projeto no repositório `ai-flow`.
Coleta todas as informações necessárias, cria a estrutura completa em `MAPS/{slug}/`
e configura o arquivo `.ai-project` em cada repositório local informado.

---

## O Que Esta Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Coleta informações do projeto via perguntas guiadas em blocos
- Deriva o slug automaticamente a partir do nome do projeto
- Suporta múltiplos repositórios por projeto
- Cria `MAPS/{slug}/map.json` preenchido com tudo que foi coletado
- Cria `MAPS/{slug}/context.md` com estrutura padrão (seções opcionais preenchidas se o dev fornecer)
- Cria as pastas `prd/`, `plan/`, `adr/` dentro do map
- Cria `.ai-project` nos repositórios locais cujo path existir

### ❌ NÃO FAZ:
- ❌ Clonar repositórios
- ❌ Criar branches ou fazer commits nos projetos
- ❌ Configurar MCPs → use `/setup-mcp-azure-devops`
- ❌ Criar PRDs ou PLANs → use `/spec` e `/planejar`

---

## Processo

### Passo 0: Apresentação

Exibir ao dev:

```
🚀 Setup de Novo Projeto

Vou guiar você na criação de um novo projeto no ai-flow.
As informações serão coletadas em blocos. Algumas são opcionais —
você pode preencher depois diretamente nos arquivos gerados.

Vamos começar!
```

---

### Passo 1: Informações do Projeto

Perguntar ao dev em uma única mensagem:

```
📦 BLOCO 1 — Projeto

1. Nome do projeto:
   [ex: Meu Sistema, Order Manager]

2. Descrição curta (1-2 frases):
   [O que o projeto faz e seu propósito de negócio]

3. Nome do time:
   [ex: Core, Platform, Checkout]

4. Status:
   [active / archived — padrão: active]
```

**Após receber as respostas:**

Derivar o slug automaticamente:
- Converter para minúsculas
- Substituir espaços e underscores por hífens
- Remover caracteres especiais (acentos, pontuação)
- Exemplos: "Meu Sistema" → `meu-sistema`, "Order Manager" → `order-manager`

Confirmar com o dev:
```
📁 A pasta do projeto será: MAPS/{slug}/

Está correto? (sim/não — se não, informe o slug desejado)
```

---

### Passo 2: Stack

```
⚙️ BLOCO 2 — Stack Tecnológica

1. Backend (tecnologias separadas por vírgula, ou deixe vazio):
   [ex: dotnet8, ef-core, postgresql, azure-service-bus]

2. Frontend (tecnologias separadas por vírgula, ou deixe vazio):
   [ex: react, typescript, tailwind]

3. Infra (tecnologias separadas por vírgula, ou deixe vazio):
   [ex: azure, docker, kubernetes]
```

Converter cada lista em array de strings (trim, minúsculas, split por vírgula).
Campos vazios geram arrays vazios `[]`.

---

### Passo 3: Arquitetura

```
🏛️ BLOCO 3 — Arquitetura

1. Padrão arquitetural:
   [ex: clean-architecture, mvc, hexagonal, monolito, microservices]
   (deixe vazio para preencher depois)

2. Estilo:
   [ex: cqs, cqrs, rest, event-driven]
   (deixe vazio para preencher depois)
```

---

### Passo 4: Repositórios

Coletar ao menos um repositório. Repetir o bloco abaixo até o dev dizer que não tem mais.

Para o primeiro repositório:

```
🗂️ BLOCO 4 — Repositório 1

1. Nome/alias do repositório (chave no map.json):
   [ex: backend, frontend, api, worker]

2. Caminho local completo:
   [ex: C:/Projetos/MeuProjeto/backend]

3. URL do repositório git:
   [ex: git@github.com:org/repo.git — deixe vazio se ainda não existir]

4. Branch principal:
   [ex: develop, main — padrão: develop]

5. Boilerplate (opcional):
   [ex: dotnet-api, dotnet-worker, react, angular — deixe vazio se não aplicável]

6. Contextos — palavras-chave que identificam este repo (separadas por vírgula):
   [ex: api, backend, handler, command, query, endpoint]
```

Após preencher um repositório:

```
➕ Deseja adicionar mais um repositório? (sim/não)
```

Se sim, repetir o bloco com "Repositório N" até o dev dizer não.

---

### Passo 5: Tooling

```
🔧 BLOCO 5 — Ferramenta de Gestão

Você usa alguma ferramenta de gestão de projetos integrada?

1. Tipo:
   [azure-devops / jira / none — padrão: none]

Se azure-devops ou jira:

2. Projeto de work items (tickets, stories):
   [ex: GHQ_Supply_GlobalTechHub]

3. Projeto de repositórios:
   [ex: GHQ_Supply_Chain_MeuProjeto]
   (deixe vazio se for o mesmo que o de work items)
```

Se `none`, registrar `tooling` com campos vazios.

---

### Passo 6: Contexto (Opcional)

```
📝 BLOCO 6 — Contexto do Projeto (Opcional)

Estas informações preencherão o context.md.
Você pode responder agora ou preencher depois diretamente no arquivo.

1. Visão geral detalhada:
   [Descrição do domínio de negócio, usuários alvo, problemas que resolve]
   (deixe vazio para preencher depois)

2. Branch principal para desenvolvimento:
   [ex: develop, main — padrão: develop]

3. Nomenclatura de branches:
   [ex: feature/descricao, fix/descricao — padrão: feature/descricao, fix/descricao]

4. Convenção de commits:
   [ex: Conventional Commits (feat:, fix:, chore:) — padrão: Conventional Commits]

5. Comando de build:
   [ex: dotnet build MeuProjeto.sln — deixe vazio para preencher depois]

6. Comando para rodar todos os testes:
   [ex: dotnet test — deixe vazio para preencher depois]
```

---

### Passo 7: Confirmar e Criar

Exibir resumo de tudo que será criado:

```
✅ Resumo — O que será criado:

📁 MAPS/{slug}/
   ├── map.json
   ├── context.md
   ├── prd/
   ├── plan/
   └── adr/

🔗 .ai-project em:
   {lista de caminhos locais que existirem}
   (caminhos não encontrados: {lista ou "nenhum"})

Confirma? (sim/não)
```

Se o dev confirmar, executar o Passo 8.

---

### Passo 8: Criar Arquivos

#### 8.1. Criar pasta e estrutura de diretórios

Criar as seguintes pastas (com `.gitkeep` se necessário para rastrear no git):
- `MAPS/{slug}/prd/`
- `MAPS/{slug}/plan/`
- `MAPS/{slug}/adr/`

#### 8.2. Criar `map.json`

Preencher com todos os dados coletados:

```json
{
  "project": {
    "name": "{nome}",
    "description": "{descricao}",
    "team": "{time}",
    "status": "{status}"
  },
  "stack": {
    "backend": [{backend}],
    "frontend": [{frontend}],
    "infra": [{infra}]
  },
  "architecture": {
    "pattern": "{pattern}",
    "style": "{style}"
  },
  "repositories": {
    "{alias1}": {
      "path": "{path}",
      "url": "{url}",
      "branch": "{branch}",
      "boilerplate": "{boilerplate}",
      "contexts": [{contexts}]
    }
  },
  "tooling": {
    "project-management": {
      "type": "{tipo}",
      "workitems-project": "{workitems-project}",
      "repos-project": "{repos-project}"
    }
  },
  "docs": {
    "business": "docs/business/",
    "architecture": "docs/architecture/",
    "code-review": "docs/code-review/",
    "prd": "prd/",
    "plan": "plan/",
    "adr": "adr/"
  }
}
```

#### 8.3. Criar `context.md`

Usar o template abaixo, preenchendo as seções com o que foi fornecido no Passo 6.
Seções não preenchidas devem manter os placeholders do template (comentados com `> A preencher`).

```markdown
# Context: {nome do projeto}

> Este arquivo contém o contexto rico do projeto. É a fonte de verdade para as skills de IA.
> Referencie seções específicas pelo âncora no map.json (ex: `context.md#arquitetura`).

---

## Visão Geral

{visao-geral se fornecida, ou:}
> A preencher: descreva o domínio de negócio, usuários alvo e problemas que o projeto resolve.

---

## Arquitetura

**Padrão:** {pattern} | **Estilo:** {style}
**Stack Backend:** {backend-stack}
**Stack Frontend:** {frontend-stack}

> A preencher: detalhe as camadas, responsabilidades e decisões de design relevantes.

### Estrutura de Pastas

> A preencher:
```
{alias-repo}/
  src/
    ...
  tests/
    ...
```

---

## Estrutura de Arquivos

> A preencher: onde colocar cada tipo de arquivo no projeto.

| O que criar | Caminho |
|-------------|---------|
| [Tipo 1] | `caminho/no/repo/` |

---

## Padrões Backend

> A preencher: convenções de nomenclatura, estrutura de handlers/endpoints,
> tratamento de erros, padrão de queries, exemplos de código.

---

## Padrões Frontend

> A preencher: estrutura de componentes, gerenciamento de estado,
> chamadas de API, convenções de nomenclatura.

---

## Git Workflow

- **Branch principal:** `{branch-principal}`
- **Nomenclatura de branches:** `{nomenclatura-branches}`
- **Commit convention:** {commit-convention}
- **Pull Request:** base em `{branch-principal}`, ao menos 1 aprovação

---

## Testes

> A preencher: estratégia de cobertura, frameworks, convenções de nomenclatura.

---

## Glossário

> A preencher: termos de domínio relevantes para o projeto.

| Termo | Definição |
|-------|-----------|
| TERMO | Definição do termo no contexto do domínio |

---

## Integrações e Dependências Externas

> A preencher: serviços externos, APIs, filas e como o projeto interage com eles.

| Serviço | Finalidade | Ambiente |
|---------|-----------|----------|
| SERVICO | Para que serve | dev/staging/prod |

---

## Code Review Checklist

> A preencher: checklist específico do projeto para o skill `/code-review`.

### Bloqueadores Absolutos (impedem merge)

- [ ] Credenciais ou secrets hardcoded
- [ ] Dados sensíveis logados
- [ ] Autorização ausente em endpoints protegidos
- [ ] Build com erros
- [ ] Critérios do PRD não atendidos

---

## Comandos

### Build

```bash
{build-command ou "# A preencher"}
```

### Testes

```bash
{test-command ou "# A preencher"}
```

### Migrations / Schema

```bash
# A preencher
```

### Outros

```bash
# A preencher
```
```

#### 8.4. Criar `.ai-project` nos repositórios locais

Para cada repositório informado:
- Verificar se o caminho local existe
- Se existir: criar (ou sobrescrever) o arquivo `{path}/.ai-project` com o conteúdo:
  ```
  MAPS/{slug}
  ```
- Se não existir: registrar para avisar no passo 9

---

### Passo 9: Apresentar Resultado

```
✅ Projeto "{nome}" criado com sucesso!

📁 Estrutura criada em MAPS/{slug}/:
   ✅ map.json
   ✅ context.md
   ✅ prd/
   ✅ plan/
   ✅ adr/

🔗 .ai-project configurado em:
   ✅ {path1}
   ✅ {path2}
   ⚠️  {path3} — caminho não encontrado, configure manualmente

📝 Próximos passos:
   1. Complete as seções marcadas com "> A preencher" em MAPS/{slug}/context.md
   2. Em qualquer repositório do projeto, invoque /spec para criar seu primeiro PRD
```

---

## Regras

- O slug deve ser derivado automaticamente — nunca perguntar diretamente ao dev
- Campos opcionais com valor vazio geram strings vazias `""` ou arrays `[]` no `map.json`
- O `context.md` nunca deve ter seções em branco — use placeholders `> A preencher` nas seções não fornecidas
- Nunca sobrescrever um `map.json` existente sem confirmação explícita do dev
- Se `MAPS/{slug}/` já existir, avisar o dev e perguntar se deseja prosseguir (pode ser uma reconfiguração)
