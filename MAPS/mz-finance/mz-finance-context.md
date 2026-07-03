# Context: mz-finance

> Este arquivo contém o contexto rico do projeto. É a fonte de verdade para as skills de IA.
> Referencie seções específicas pelo âncora no mz-finance-map.json (ex: `mz-finance-context.md#arquitetura`).

---

## Visão Geral

App de controle financeiro pessoal, de uso individual (o dono do projeto é o único usuário). Resolve o problema de controlar entradas/saídas de forma mais completa do que um extrato bancário — o usuário quer registrar compromissos financeiros de diferentes naturezas (avulsos, recorrentes, cartão de crédito, financiamentos) num único lugar e conseguir projetar o saldo numa data futura considerando tudo isso junto.

O "momento mágico" do MVP_000001 é: registrar um compromisso financeiro, ver o saldo atualizado, e simular o impacto de um compromisso futuro (parcela, financiamento, recorrência) no saldo projetado.

---

## Arquitetura

**Padrão:** clean-architecture | **Estilo:** cqrs
**Stack Backend:** dotnet10, postgresql
**Stack Frontend:** react, typescript

### Backend

Derivado do boilerplate `dotnet-api` (ver `BOILERPLATES/BACK/dotnet-api/README.md` para os padrões obrigatórios completos):

- Clean Architecture em 4 camadas: `Domain → Application → Infra → WebApi`
- CQRS via MediatR (Commands escrevem, Queries leem — nunca se cruzam)
- PostgreSQL + EF Core (Code-First migrations)
- Notification Pattern para erros de negócio esperados (sem exception)
- Envelope `DataActionResult<T>` padronizado em todas as respostas

**Decisão de autenticação (específica deste projeto):** em vez de plugar um IdP externo (Keycloak/Auth0/IdentityServer, que o boilerplate suporta genericamente), a própria API emite o JWT. Endpoint de login valida um usuário único (seed no banco, senha com hash bcrypt/argon2) e retorna o token. Justificativa: uso pessoal numa VPS própria não justifica a complexidade de um IdP externo.

### Frontend

Sem boilerplate pronto — estrutura genérica por feature:

```
frontend/src/
  app/            → rotas, layout, providers
  features/
    auth/
    transactions/       (transação avulsa)
    recurring/          (transações recorrentes)
    credit-cards/       (cartões + faturas)
    financing/          (financiamentos e parcelamentos)
    projection/         (projeção de saldo futuro)
  shared/         → componentes, hooks, api client
```

- **Estado de servidor:** React Query
- **Estilo:** CSS Modules como placeholder — **sem Tailwind** (restrição explícita do dev). Será substituído por um Design System próprio quando fornecido.

Justificativa da estrutura: cada tipo de compromisso financeiro (recorrente, cartão, financiamento) tem regras e telas próprias — feature-based facilita isolar isso sem acoplar.

### Estrutura de Pastas

```
mz-finance/                    (monorepo)
  backend/
    src/
      MzFinance.Domain/        → entidades, enums, contratos
      MzFinance.Application/   → commands, queries, handlers, DTOs, validators
      MzFinance.Infra/         → DbContexts, mapeamentos EF, migrations
      MzFinance.WebApi/        → controllers, middlewares, Program.cs
      MzFinance.UnitTests/     → xUnit + NSubstitute + EF InMemory
  frontend/
    src/
      app/
      features/
      shared/
```

---

## Modelo de Dados

Entidades separadas por tipo de compromisso financeiro (evita misturar regras muito diferentes numa tabela genérica com campo `type`).

### User
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| email | string | unique |
| passwordHash | string | **(sensível)** — hash bcrypt/argon2, nunca texto puro |

### Transaction *(lançamento avulso/pontual)*
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| type | enum | Income / Expense |
| amount | decimal | |
| date | date | |
| category | string/enum | |
| description | string? | |
| sourceType | enum? | Manual / GeneratedFromRecurring / GeneratedFromFinancing / GeneratedFromCard — rastreia origem quando materializado a partir de outra entidade |

### RecurringCommitment *(transação recorrente — pode ser receita, ex: salário, ou despesa, ex: assinatura)*
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| type | enum | Income / Expense |
| amount | decimal | |
| frequency | enum | Monthly / Weekly / Yearly |
| startDate | date | |
| endDate | date? | nullable = indeterminado |
| category | string/enum | |

### CreditCard
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| name | string | |
| limit | decimal | |
| closingDay | int | dia de fechamento da fatura |
| dueDay | int | dia de vencimento |

### CreditCardPurchase
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| creditCard_id | FK | N:1 com CreditCard |
| amount | decimal | valor total da compra |
| purchaseDate | date | |
| installmentsCount | int | 1 = à vista |
| description | string? | |

### Financing *(financiamento — carro, casa, etc.)*
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| totalAmount | decimal | valor financiado |
| interestRate | decimal | taxa (definir % a.m. ou a.a. na implementação) |
| installmentsCount | int | prazo total |
| installmentAmount | decimal | valor da parcela |
| startDate | date | |
| description | string? | |

### Relações

- `User` 1—N tudo (dados isolados por usuário, mesmo sendo 1 usuário só — evita retrabalho se um dia virar multi-usuário)
- `CreditCard` 1—N `CreditCardPurchase`
- `CreditCardPurchase.installmentsCount` → gera N parcelas futuras **calculadas em memória**, não materializadas em tabela própria
- `Financing.installmentsCount` → gera parcelas futuras do mesmo jeito (calculado)
- **Projeção de saldo futuro** = `Transaction` (já lançadas) + ocorrências futuras de `RecurringCommitment` + parcelas futuras de `CreditCardPurchase` + parcelas futuras de `Financing`, tudo calculado até a data alvo, sem materializar cada parcela no banco

---

## Estrutura de Arquivos

| O que criar | Caminho |
|-------------|---------|
| Command (feature de escrita) | `backend/src/MzFinance.Application/Commands/<Aggregate>/<Feature>/` |
| Query (feature de leitura) | `backend/src/MzFinance.Application/Queries/<Aggregate>/<Feature>/` |
| DTO de Response | `backend/src/MzFinance.Application/Dtos/<Aggregate>/` |
| Entidade de domínio | `backend/src/MzFinance.Domain/Models/` |
| Map EF Core | `backend/src/MzFinance.Infra/Maps/` |
| Controller | `backend/src/MzFinance.WebApi/Controllers/` |
| Feature de frontend | `frontend/src/features/<feature>/` |
| Componente compartilhado | `frontend/src/shared/` |

---

## Padrões Backend

> A preencher: convenções de nomenclatura, estrutura de handlers/endpoints,
> tratamento de erros, padrão de queries, exemplos de código.
> (Base já documentada em `BOILERPLATES/BACK/dotnet-api/README.md` — preencher aqui só o que for específico do domínio conforme o código evoluir.)

---

## Padrões Frontend

> A preencher: estrutura de componentes, gerenciamento de estado,
> chamadas de API, convenções de nomenclatura.
> (Sem boilerplate pronto — convenções nascem conforme a Etapa 1 do PLAN é implementada.)

---

## Git Workflow

- **Branch principal:** `main`
- **Nomenclatura de branches:** `feature/descricao`, `fix/descricao`
- **Commit convention:** Conventional Commits (feat:, fix:, chore:)
- **Pull Request:** base em `main`, ao menos 1 aprovação (uso pessoal — revisão pode ser dispensada, mas a convenção fica registrada para consistência)

---

## Testes

- **Backend:** xUnit + NSubstitute + EF InMemory (padrão do boilerplate `dotnet-api`). Convenção de nome: `[Method]_[Scenario]_Should[Expected]`. Padrão AAA (Arrange/Action/Assert) com comentários explícitos.
- **Frontend:** A preencher — nenhum framework de teste decidido ainda.

---

## Glossário

| Termo | Definição |
|-------|-----------|
| Transação avulsa | Lançamento pontual de receita ou despesa, sem repetição (`Transaction`) |
| Transação recorrente | Compromisso que se repete numa frequência (mensal/semanal/anual). Pode ser receita (ex: salário) ou despesa (ex: assinatura, conta fixa) (`RecurringCommitment`) |
| Fatura | Agrupamento mensal das compras de um cartão de crédito, fechada no `closingDay` e paga no `dueDay` |
| Compra parcelada (cartão) | Compra no cartão dividida em N parcelas, calculadas a partir de `installmentsCount` (`CreditCardPurchase`) |
| Financiamento | Dívida de longo prazo com juros e parcelas fixas (ex: carro, casa) (`Financing`) |
| Projeção de saldo | Cálculo do saldo esperado numa data futura, somando transações já lançadas + ocorrências futuras de recorrentes/parcelas/financiamento |

---

## Integrações e Dependências Externas

Nenhuma integração externa no MVP_000001 — sem gateway de pagamento, sem OAuth externo (login é próprio, JWT self-issued), sem envio de email/notificação. Todos os lançamentos são manuais.

---

## Restrições Não-Funcionais

- **Dados sensíveis:** senha (hash) e todos os dados financeiros (valores, cartões, financiamentos) são tratados como sensíveis — nunca logados em texto puro.
- **Escala:** uso pessoal, poucos dados, sem expectativa de múltiplos usuários simultâneos.
- **Autenticação:** usuário único, sem múltiplos perfis/roles por enquanto.
- **Disponibilidade:** sem exigência de SLA/offline/multi-idioma — roda na VPS Hostinger do dev, sem alta disponibilidade formal.

---

## Roadmap / MVPs Futuros

> Capturado durante /start-project. Cada item pode virar um PRD/PLAN futuro.

- MVP_000002: Controle de investimentos (aportes, valor atual, rentabilidade) — ficou fora do momento mágico do MVP_000001, que focou em controle de finanças e projeção de compras futuras.

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
dotnet build backend/MzFinance.slnx
npm run build --prefix frontend
```

### Testes

```bash
dotnet test backend/MzFinance.slnx
```

### Migrations / Schema

```bash
dotnet ef migrations add NomeDaMigration -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
dotnet ef database update -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
```

### Outros

```bash
# A preencher
```
