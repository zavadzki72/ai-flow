# Context: NOME_DO_PROJETO

> Este arquivo contém o contexto rico do projeto. É a fonte de verdade para as skills de IA.
> Referencie seções específicas pelo âncora no map.json (ex: `context.md#arquitetura`).

---

## Visão Geral

Descrição mais detalhada do projeto, seu domínio de negócio, usuários alvo e problemas que resolve.

---

## Arquitetura

Descreva a arquitetura do projeto. Inclua:
- Padrões utilizados (Clean Architecture, MVC, Hexagonal, etc.)
- Principais camadas e responsabilidades de cada uma
- Decisões de design relevantes

```
Exemplo de diagrama ASCII ou referência a um arquivo de diagrama
```

### Estrutura de Pastas

```
NOME_REPO/
  src/
    ...
  tests/
    ...
```

---

## Estrutura de Arquivos

Onde colocar cada tipo de arquivo no projeto. Usado pelas skills para localizar e criar arquivos corretamente.

| O que criar | Caminho |
|-------------|---------|
| [Tipo 1] | `caminho/no/repo/` |
| [Tipo 2] | `caminho/no/repo/` |

---

## Padroes Backend

Descreva os padrões de código do backend:
- Convenções de nomenclatura
- Estrutura de endpoints/handlers
- Como lidar com erros
- Como escrever queries/commands
- Exemplo de código padrão

---

## Padroes Frontend

Descreva os padrões de código do frontend:
- Estrutura de componentes
- Gerenciamento de estado
- Chamadas de API
- Convenções de nomenclatura

---

## Git Workflow

- **Branch principal:** `develop`
- **Nomenclatura de branches:** `feature/descricao`, `fix/descricao`, `chore/descricao`
- **Commit convention:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **Pull Request:** base em `develop`, ao menos 1 aprovação

---

## Testes

- **Estratégia:** descreva a cobertura esperada
- **Ferramentas:** liste as ferramentas de teste
- **Convenções:** como nomear e organizar testes

---

## Glossário

Termos de domínio relevantes para o projeto:

| Termo | Definição |
|-------|-----------|
| TERMO | Definição do termo no contexto do domínio |

---

## Integrações e Dependências Externas

Liste serviços externos, APIs, filas, etc. e como o projeto interage com eles.

| Serviço | Finalidade | Ambiente |
|---------|-----------|----------|
| SERVICO | Para que serve | dev/staging/prod |

---

## Code Review Checklist

Checklist específico do projeto para o skill `/code-review`.
Complementa os itens genéricos (SOLID, segurança, performance, code smells) da skill.

### Bloqueadores Absolutos (impedem merge)

- [ ] [Anti-pattern proibido 1]
- [ ] [Anti-pattern proibido 2]
- [ ] Credenciais ou secrets hardcoded
- [ ] Dados sensíveis logados
- [ ] Autorização ausente em endpoints protegidos
- [ ] Cobertura de testes abaixo do mínimo: [definir threshold]
- [ ] Build com erros
- [ ] Critérios do PRD não atendidos

### [Categoria de Checklist 1 — ex: Padrão de Camadas]

- [ ] [Item 1]
- [ ] [Item 2]

### [Categoria de Checklist 2 — ex: Padrão de Testes]

- [ ] [Item 1]
- [ ] [Item 2]

---

## Comandos

Comandos do dia a dia para build, testes, migrations e outros. Usados pelas skills ao gerar o PLAN.

### Build

```bash
# Compilar o projeto
COMANDO_DE_BUILD
```

### Testes

```bash
# Rodar todos os testes
COMANDO_RODAR_TODOS_TESTES

# Rodar testes de um módulo específico
COMANDO_RODAR_TESTES_MODULO

# Rodar um teste específico por nome
COMANDO_RODAR_TESTE_ESPECIFICO
```

### Migrations / Schema

```bash
# Criar migration
COMANDO_CRIAR_MIGRATION

# Aplicar migrations
COMANDO_APLICAR_MIGRATIONS

# Reverter migration
COMANDO_REVERTER_MIGRATION
```

### Outros

```bash
# Outros comandos úteis do projeto
```
