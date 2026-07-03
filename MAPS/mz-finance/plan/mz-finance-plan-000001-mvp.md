# Plano de Execução: MVP_000001 — Controle Financeiro Pessoal

## Informações
- **PRD Relacionado**: `MAPS/mz-finance/prd/mz-finance-prd-000001-mvp.md`
- **Repositório(s)**: backend (`C:/Projects/Personal/mz-finance/backend`), frontend (`C:/Projects/Personal/mz-finance/frontend`)
- **Domínio(s)**: Controle financeiro pessoal
- **Branch Base**: main
- **Complexidade**: 🔴 Alta
- **Criado em**: 2026-07-01
- **Última atualização**: 2026-07-01

---

## PROGRESSO GERAL

**Status**: ✅ Concluído
**Progresso**: 14/14 etapas concluídas (100%)

```
[🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢] 100%
```

> Este progresso será atualizado automaticamente pelo skill `/implementar`.

---

## VISÃO GERAL

Implementação do fluxo end-to-end do MVP_000001: login (usuário único, JWT self-issued), quatro tipos de compromisso financeiro (transação avulsa, recorrente, compra no cartão de crédito com parcelamento, financiamento com Tabela Price), extrato + saldo atual, e projeção de saldo numa data futura combinando todas as fontes.

O backend parte do boilerplate `dotnet-api` já bootstrapado e renomeado (`Dummy` → `MzFinance`) durante o `/start-project`, com Clean Architecture (`Domain → Application → Infra → WebApi`) + CQRS via MediatR. O frontend parte de uma estrutura vazia (sem boilerplate) e precisa ser inicializado do zero (Vite + React + TS) na ETAPA 4.

As etapas seguem uma organização **vertical por feature**: para cada tipo de compromisso, primeiro o backend completo (domínio → persistência → aplicação → API), depois o frontend correspondente. As etapas 1–3 são a fundação compartilhada (domínio completo, persistência, autenticação) e a etapa 4 inicializa o frontend — todas as etapas seguintes dependem dessas quatro.

---

## OBJETIVOS

- [x] Fundação de domínio e persistência para as 6 entidades do MVP
- [x] Autenticação JWT self-issued funcionando (backend + frontend)
- [x] CRUD completo de transação avulsa, com extrato e saldo atual
- [x] CRUD completo de transação recorrente
- [x] Cartão de crédito: cadastro, lançamento de compra parcelada e visão de fatura
- [x] Financiamento com cálculo automático de parcela via Tabela Price
- [x] Projeção de saldo numa data futura combinando todas as fontes, com simulação hipotética

---

## MAPA DE COMPONENTES IDENTIFICADOS

### Domínio (`backend/src/MzFinance.Domain`)
- `Models/User.cs` (novo)
- `Models/Transaction.cs` (novo)
- `Models/RecurringCommitment.cs` (novo)
- `Models/CreditCard.cs` (novo)
- `Models/CreditCardPurchase.cs` (novo)
- `Models/Financing.cs` (novo)
- `Enums/TransactionType.cs`, `Enums/RecurrenceFrequency.cs`, `Enums/TransactionSourceType.cs` (novos)
- `Models/MzFinanceCategory.cs`, `Models/MzFinanceItem.cs` (do exemplo do boilerplate — **remover**)

### Persistência (`backend/src/MzFinance.Infra`)
- `Maps/UserMap.cs`, `TransactionMap.cs`, `RecurringCommitmentMap.cs`, `CreditCardMap.cs`, `CreditCardPurchaseMap.cs`, `FinancingMap.cs` (novos)
- `Contexts/MzFinanceContext.cs`, `Contexts/MzFinanceReadOnlyContext.cs` (alterados — novos `DbSet<T>`)
- `Migrations/` (nova migration inicial)
- `Builders/PriceAmortizationCalculator.cs` (novo — cálculo de parcela fixa via Tabela Price)
- Maps do exemplo (`MzFinanceCategoryMap.cs`, `MzFinanceItemMap.cs`) — **remover**

### Aplicação (`backend/src/MzFinance.Application`)
- `Commands/Auth/Login/` (novo)
- `Commands/Transactions/{Create,Update,Delete}Transaction/` (novos)
- `Commands/RecurringCommitments/{Create,Update,Delete}RecurringCommitment/` (novos)
- `Commands/CreditCards/CreateCreditCard/`, `Commands/CreditCards/CreateCreditCardPurchase/` (novos)
- `Commands/Financings/{Create,Update,Delete}Financing/` (novos)
- `Queries/Transactions/GetStatement/` (novo)
- `Queries/Balance/GetProjectedBalance/` (novo)
- `Queries/CreditCards/{GetCreditCards,GetCreditCardBill}/` (novos)
- `Queries/RecurringCommitments/GetRecurringCommitments/` (novo)
- `Queries/Financings/GetFinancings/` (novo)
- `Dtos/Auth/`, `Dtos/Transactions/`, `Dtos/RecurringCommitments/`, `Dtos/CreditCards/`, `Dtos/Financings/`, `Dtos/Balance/` (novos)
- Commands/Queries/Dtos do exemplo (`*DummyCategory*`, `*DummyItem*` já renomeados para `*MzFinanceCategory*`/`*MzFinanceItem*`) — **remover**

### API (`backend/src/MzFinance.WebApi`)
- `Controllers/AuthController.cs` (novo)
- `Controllers/TransactionsController.cs`, `RecurringCommitmentsController.cs`, `CreditCardsController.cs`, `FinancingsController.cs`, `BalanceController.cs` (novos)
- `Configurations/JwtAuthenticationConfiguration.cs` (alterado — de IdP externo para emissão própria)
- `Controllers/MzFinanceCategoriesController.cs`, `MzFinanceItemsController.cs` (exemplo) — **remover**

### Frontend (`frontend/`)
- Scaffold inicial (Vite + React + TS) — todo o projeto é novo
- `src/app/` (rotas, layout, providers)
- `src/features/auth/`, `transactions/`, `recurring/`, `credit-cards/`, `financing/`, `projection/`
- `src/shared/api/` (client HTTP com interceptor JWT)

### Testes
- `backend/src/MzFinance.UnitTests/` — um arquivo de teste por Command/Query Handler novo + `PriceAmortizationCalculatorTests.cs`
- Testes do exemplo (`*MzFinanceCategory*Tests.cs`, `*MzFinanceItem*Tests.cs`) — **remover**

---

## ESTRATÉGIA DE TESTES

- **Backend:** xUnit + NSubstitute + EF InMemory, seguindo o padrão do boilerplate (`Dummy{DbContextFactory}` → `MzFinanceDbContextFactory`, já renomeado). Convenção: `[Method]_[Scenario]_Should[Expected]`, padrão AAA com comentários `//ARRANGE`, `//ACTION`, `//ASSERT`.
- **Frontend:** sem framework de teste definido no MVP_000001 (registrado como "A preencher" no `mz-finance-context.md`) — validação manual da UI a cada etapa.

Cenários mínimos por etapa (detalhados em cada ETAPA abaixo):
- [ ] Happy path de cada Command/Query novo
- [ ] Validação de campos obrigatórios/inválidos
- [ ] `PriceAmortizationCalculator`: parcela fixa calculada corretamente para taxa > 0 e taxa = 0

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Fundação de Domínio

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01
**Commit:** df369d4

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- As 6 entidades criadas seguindo o padrão do boilerplate (construtor protegido/público, EntityBase, métodos de domínio nomeados)
- Removido o exemplo `MzFinanceCategory`/`MzFinanceItem` em **todas** as camadas (Domain, Application, Infra, WebApi, UnitTests) — não só Domain como o PLAN original previa, porque deixar referências quebradas nas outras camadas impediria o build de passar ao fim da etapa
- `DbSet<T>` das 6 entidades já adicionado nos dois DbContexts (adiantado da ETAPA 2, necessário para o projeto compilar) — Maps e migration ficam mesmo para a ETAPA 2
- `MediatRConfiguration` ajustado para usar `typeof(ValidationBehavior<,>)` como âncora do assembly em vez do handler de exemplo removido
- 19/19 testes passando (10 pré-existentes do boilerplate + 9 novos de construtor/métodos de domínio das entidades)
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Criar as 6 entidades de domínio do MVP e remover o exemplo do boilerplate, estabelecendo a base para todas as etapas seguintes.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Domain/Models/User.cs` (novo)
- `backend/src/MzFinance.Domain/Models/Transaction.cs` (novo)
- `backend/src/MzFinance.Domain/Models/RecurringCommitment.cs` (novo)
- `backend/src/MzFinance.Domain/Models/CreditCard.cs` (novo)
- `backend/src/MzFinance.Domain/Models/CreditCardPurchase.cs` (novo)
- `backend/src/MzFinance.Domain/Models/Financing.cs` (novo)
- `backend/src/MzFinance.Domain/Enums/TransactionType.cs`, `RecurrenceFrequency.cs`, `TransactionSourceType.cs` (novos)
- `backend/src/MzFinance.Domain/Models/MzFinanceCategory.cs`, `MzFinanceItem.cs`, `Enums/MzFinanceStatus.cs`, `Enums/MzFinancePriority.cs` (removidos)

**O que implementar:**
Seguir o padrão de entidade do boilerplate (construtor protegido para EF + construtor público para criação válida, `EntityBase` cuidando de `Id`/`CreatedAt`/`UpdatedAt`, mutação só via métodos de domínio nomeados). Campos de cada entidade conforme seção 4.1 do PRD (`mz-finance-prd-000001-mvp.md`). `Financing` **não** tem campo `InstallmentAmount` persistido — é sempre calculado. Todas as entidades (exceto `User`) têm `UserId` como FK.

**Testes Necessários:**
- [ ] Construtor de cada entidade com parâmetros válidos define os campos corretamente
- [ ] Métodos de domínio (ex: eventual `Deactivate`/`Update`) atualizam `UpdatedAt`

**Critérios de Aceitação:**
- [ ] As 6 entidades compilam e seguem o padrão de construtor protegido/público
- [ ] Exemplo do boilerplate (`MzFinanceCategory`/`MzFinanceItem`) removido do Domain
- [ ] Build sem erros
- [ ] Testes passando

**Dependências:** Nenhuma

**Comandos Úteis:**
```bash
dotnet build backend/MzFinance.slnx
dotnet test backend/src/MzFinance.UnitTests
```

---

### ETAPA 2: Persistência — Maps, DbContexts e Migration Inicial

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01
**Commit:** (ver `git log` — "feat: persistencia - EF Maps e migration inicial")

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Migration `InitialCreate` gerada com `--context MzFinanceContext` (havia 2 DbContexts, o comando exige especificar qual)
- **Achado importante:** `docker-compose.yml` original não tinha `name:` de projeto explícito — o Compose derivava o nome do projeto do nome da pasta (`backend`), que colide com outros projetos irmãos que também têm pasta `backend/` com Postgres. Isso causou reuso acidental de um volume `backend_postgres_data` de outro projeto com credenciais diferentes (`password authentication failed`). Corrigido adicionando `name: mzfinance` no compose — validar se outros projetos do ai-flow (velox, zava-finance) têm o mesmo risco
- Migration aplicada e validada contra Postgres real local (6 tabelas + `__EFMigrationsHistory` confirmadas via `psql \dt`)
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Mapear as 6 entidades no EF Core, atualizar os DbContexts e gerar a migration inicial do banco.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/Maps/UserMap.cs`, `TransactionMap.cs`, `RecurringCommitmentMap.cs`, `CreditCardMap.cs`, `CreditCardPurchaseMap.cs`, `FinancingMap.cs` (novos)
- `backend/src/MzFinance.Infra/Contexts/MzFinanceContext.cs`, `MzFinanceReadOnlyContext.cs` (alterados)
- `backend/src/MzFinance.Infra/Migrations/` (nova migration)
- `backend/src/MzFinance.Infra/Maps/MzFinanceCategoryMap.cs`, `MzFinanceItemMap.cs` (removidos)

**O que implementar:**
Um `Map` por entidade herdando `MapBase<T>`, seguindo as convenções do boilerplate: `HasConversion<int>()` para enums, `decimal(18,2)` para campos monetários, `OnDelete(DeleteBehavior.Restrict)` em FKs, índice único em `User.Email`. Adicionar `DbSet<T>` de cada entidade nos dois DbContexts. Gerar e revisar a migration inicial (todas as 6 tabelas de uma vez).

**Testes Necessários:**
- [ ] N/A nesta etapa (mapeamento EF não costuma ter teste unitário direto — cobertura via `MzFinanceDbContextFactory` usado pelos testes de handler nas próximas etapas)

**Critérios de Aceitação:**
- [ ] Migration gerada e aplicada com sucesso contra o Postgres local (via `docker-compose.yml` do boilerplate)
- [ ] Todas as 6 tabelas criadas com FKs corretas
- [ ] Build sem erros

**Dependências:** ETAPA 1

**Comandos Úteis:**
```bash
docker compose -f backend/docker-compose.yml up -d
dotnet ef migrations add InitialCreate -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
dotnet ef database update -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
```

---

### ETAPA 3: Autenticação — Login com JWT Self-Issued

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Hashing de senha via PBKDF2 (`Rfc2898DeriveBytes`, 100k iterações) — sem dependência externa (não usei BCrypt.Net para não adicionar pacote quando o BCL já resolve)
- `IPasswordHasher`/`ITokenService` seguem o mesmo padrão de abstração do `IUnitOfWork` já existente no boilerplate (interface em Domain, implementação em Infra)
- Validado ponta a ponta rodando a API local: login correto retorna JWT válido, senha errada retorna 401 com mensagem genérica
- Seed do usuário único roda apenas em `Development` (mesmo bloco que já rodava as migrations automáticas)
- **Atenção Tech Lead:** o `Jwt:SigningKey` em `appsettings.json` está com um valor placeholder de desenvolvimento (`CHANGE-ME-...`) — precisa virar variável de ambiente/secret antes de qualquer deploy na VPS

**Objetivo:**
Implementar login de usuário único com emissão própria de JWT, substituindo a configuração de IdP externo do boilerplate.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Commands/Auth/Login/LoginCommand.cs`, `LoginCommandHandler.cs`, `LoginCommandValidator.cs` (novos)
- `backend/src/MzFinance.Application/Dtos/Auth/LoginResponse.cs` (novo)
- `backend/src/MzFinance.WebApi/Controllers/AuthController.cs` (novo, `[AllowAnonymous]`)
- `backend/src/MzFinance.WebApi/Configurations/JwtAuthenticationConfiguration.cs` (alterado — emissor próprio em vez de Authority/Audience externos)
- `backend/src/MzFinance.WebApi/appsettings.json` (alterado — chave de assinatura JWT, seed do usuário)

**O que implementar:**
`LoginCommandHandler` busca o `User` pelo email, valida a senha com hash (BCrypt), e retorna um JWT assinado localmente com claim do `UserId`. Configurar `TokenValidationParameters` para validar tokens emitidos pela própria API (chave simétrica). Adicionar seed do usuário único (via migration `Seed` ou verificação no startup em `Development`) — email e senha configuráveis via `appsettings`/variável de ambiente, nunca hardcoded no código.

**Testes Necessários:**
- [ ] `Handle_WithValidCredentials_ShouldReturnToken`
- [ ] `Handle_WithInvalidPassword_ShouldNotifyUnauthorized`
- [ ] `Handle_WithUnknownEmail_ShouldNotifyUnauthorized`

**Critérios de Aceitação:**
- [ ] `POST /api/auth/login` retorna token JWT válido para credenciais corretas
- [ ] Retorna 401 para credenciais inválidas (mensagem genérica, sem indicar qual campo)
- [ ] Demais endpoints (a criar nas próximas etapas) exigem o token
- [ ] Senha nunca aparece em log ou resposta da API
- [ ] Build sem erros, testes passando

**Dependências:** ETAPA 1, ETAPA 2

**Comandos Úteis:**
```bash
dotnet test backend/src/MzFinance.UnitTests --filter LoginCommandHandlerTests
```

---

### ETAPA 4: Frontend — Scaffold, Roteamento e Login

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `npm create vite@latest` recusa rodar direto num diretório não-vazio (tinha `.ai-project`) — contornado gerando num diretório temporário e copiando o conteúdo
- React 19 + react-router-dom 7, sem Tailwind (CSS Modules), conforme restrição do dev
- Ainda sem framework de teste no frontend (decisão já registrada no PRD/context — "A preencher")
- Validação end-to-end completa do login (submeter credenciais reais e ver a tela pós-login) fica para a validação final via `/test-e2e`, já que ainda não há backend + frontend rodando juntos numa mesma verificação nesta etapa
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Inicializar o projeto frontend (Vite + React + TS), configurar roteamento base, client HTTP autenticado e a tela de login funcional.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/` — scaffold completo (novo, via `npm create vite@latest`)
- `frontend/src/app/` — rotas, layout, providers (novo)
- `frontend/src/features/auth/` — tela de login, hook de autenticação (novo)
- `frontend/src/shared/api/httpClient.ts` — client HTTP com interceptor de JWT (novo)

**O que implementar:**
Inicializar com template `react-ts`. Configurar React Router com rota pública `/login` e rotas privadas protegidas (redirecionam para `/login` se não houver token). Client HTTP centralizado que injeta o header `Authorization: Bearer {token}` e trata 401 (logout automático). Tela de login consumindo o endpoint da ETAPA 3, salvando o token (localStorage) após sucesso. **Sem Tailwind** — usar CSS Modules.

**Testes Necessários:**
- [ ] N/A nesta etapa (sem framework de teste frontend definido no MVP)

**Critérios de Aceitação:**
- [ ] `npm run dev` sobe o frontend localmente
- [ ] Login funcional end-to-end contra o backend da ETAPA 3
- [ ] Rota privada redireciona para `/login` sem token válido
- [ ] Build de produção (`npm run build`) sem erros

**Dependências:** ETAPA 3

**Comandos Úteis:**
```bash
npm create vite@latest . -- --template react-ts
npm install
npm run dev
npm run build
```

---

### ETAPA 5: Transação Avulsa — Backend (CRUD + Extrato)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Adicionado `ICurrentUserService` (não previsto explicitamente no PLAN original, mas necessário: todo Command/Query precisa saber qual usuário está autenticado). Lê a claim `sub` do JWT — exigiu setar `MapInboundClaims = false` na config de auth pra manter o nome da claim literal
- Balanço (saldo) é sempre calculado sobre TODAS as transações do usuário, independente do filtro de período do extrato — decisão para bater com o Critério 8 do PRD ("saldo atual")
- Validado ponta a ponta contra Postgres real (não só InMemory) — o `SumAsync` com expressão condicional (`Type == Income ? Amount : -Amount`) traduz corretamente pro Postgres
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
CRUD de transação avulsa e query de extrato + saldo atual.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Commands/Transactions/{Create,Update,Delete}Transaction/` (novos)
- `backend/src/MzFinance.Application/Queries/Transactions/GetStatement/` (novo)
- `backend/src/MzFinance.Application/Dtos/Transactions/TransactionResponse.cs` (novo)
- `backend/src/MzFinance.WebApi/Controllers/TransactionsController.cs` (novo)

**O que implementar:**
Commands padrão (criar/editar/excluir) validando `Amount > 0`, `Date` obrigatória, `Category` obrigatória (texto livre). `GetStatementQuery` retorna lista de transações ordenadas por data (mais recente primeiro) e o saldo atual (soma de `Income` menos soma de `Expense`), com filtro de período opcional.

**Testes Necessários:**
- [ ] `Handle_WithValidCommand_ShouldPersistAndReturnId` (Create)
- [ ] `Validate_AmountZeroOrNegative_ShouldHaveValidationError`
- [ ] `Handle_ShouldReturnStatementOrderedByDateDesc`
- [ ] `Handle_ShouldCalculateBalanceCorrectly` (receitas − despesas)

**Critérios de Aceitação:**
- [ ] Critério 2 e Critério 8 do PRD atendidos
- [ ] Build sem erros, testes passando

**Dependências:** ETAPA 2, ETAPA 3

**Comandos Úteis:**
```bash
dotnet test backend/src/MzFinance.UnitTests --filter Transaction
```

---

### ETAPA 6: Transação Avulsa — Frontend

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `TransactionsPage` virou o conteúdo da rota raiz (`/`), substituindo o placeholder `HomePage` da ETAPA 4 (removido)
- Sem browser real disponível nesta sessão pra validar visualmente — validado build de produção (tsc + vite) e compatibilidade de contrato JSON (camelCase) com a resposta real da API. Validação visual completa fica pro `/test-e2e` no final
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Tela de registro de transação avulsa e extrato com saldo.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/transactions/` (novo — formulário de criação, lista de extrato, exibição de saldo)

**O que implementar:**
Formulário com tipo (receita/despesa), valor, data, categoria (input livre) e descrição. Lista de extrato consumindo `GetStatement`, exibindo saldo atual em destaque.

**Testes Necessários:**
- [ ] N/A (sem framework de teste frontend no MVP)

**Critérios de Aceitação:**
- [ ] Usuário consegue criar uma transação e vê-la no extrato imediatamente
- [ ] Saldo atualiza corretamente após criação
- [ ] Build de produção sem erros

**Dependências:** ETAPA 5, ETAPA 4

**Comandos Úteis:**
```bash
npm run build --prefix frontend
```

---

### ETAPA 7: Transação Recorrente — Backend

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Segue exatamente o mesmo padrão de `Transaction` (ETAPA 5) — reaproveitado `ICurrentUserService`
- Validação ponta a ponta manual não repetida aqui (endpoints seguem o mesmo padrão REST/CQRS já comprovado contra Postgres real na ETAPA 5); coberto pelos testes unitários (42/42)
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
CRUD de compromisso recorrente (receita ou despesa).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Commands/RecurringCommitments/{Create,Update,Delete}RecurringCommitment/` (novos)
- `backend/src/MzFinance.Application/Queries/RecurringCommitments/GetRecurringCommitments/` (novo)
- `backend/src/MzFinance.WebApi/Controllers/RecurringCommitmentsController.cs` (novo)

**O que implementar:**
Commands padrão validando `Frequency` (enum), `StartDate` obrigatória, `EndDate` opcional (deve ser >= `StartDate` quando informada). Query simples de listagem.

**Testes Necessários:**
- [ ] `Handle_WithValidCommand_ShouldPersistAndReturnId`
- [ ] `Validate_EndDateBeforeStartDate_ShouldHaveValidationError`

**Critérios de Aceitação:**
- [ ] Critério 3 do PRD atendido
- [ ] Build sem erros, testes passando

**Dependências:** ETAPA 2, ETAPA 3

**Comandos Úteis:**
```bash
dotnet test backend/src/MzFinance.UnitTests --filter RecurringCommitment
```

---

### ETAPA 8: Transação Recorrente — Frontend

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Adicionada navegação (`AppLayout` ganhou `<nav>` com `NavLink`) — não estava explícito no PLAN original, mas virou necessário assim que passamos a ter mais de uma feature/rota
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Tela de cadastro e listagem de compromissos recorrentes.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/recurring/` (novo)

**O que implementar:**
Formulário (tipo, valor, frequência, datas, categoria) e lista dos recorrentes ativos.

**Testes Necessários:**
- [ ] N/A

**Critérios de Aceitação:**
- [ ] Usuário cadastra um recorrente e ele aparece na listagem
- [ ] Build de produção sem erros

**Dependências:** ETAPA 7, ETAPA 4

---

### ETAPA 9: Cartão de Crédito — Backend (Cadastro, Compra Parcelada, Fatura)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-01

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `CreditCardBillingCalculator` ficou em `MzFinance.Infra/Builders/` como classe estática pura (sem dependência de DbContext), pra ser 100% testável isoladamente e reaproveitada na ETAPA 13 (projeção)
- Regra de ciclo: compra até o dia de fechamento (inclusive) entra na fatura do mesmo mês; depois disso, rola pro mês seguinte. Testado inclusive virada de ano (dezembro → janeiro)
- `GetCreditCardBillQuery` usa `Include(x => x.Purchases)` pra materializar as compras e só then aplica o calculador em memória (LINQ-to-Objects) — `GenerateInstallments` não é traduzível para SQL, então não pode encadear direto numa `IQueryable`
- Validado ponta a ponta contra Postgres real: compra parcelada em 3x distribuída corretamente entre as faturas de julho e agosto de 2026
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Cadastro de cartão, lançamento de compra (com parcelamento) e consulta de fatura por período.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Commands/CreditCards/CreateCreditCard/`, `CreateCreditCardPurchase/` (novos)
- `backend/src/MzFinance.Application/Queries/CreditCards/GetCreditCards/`, `GetCreditCardBill/` (novos)
- `backend/src/MzFinance.WebApi/Controllers/CreditCardsController.cs` (novo)

**O que implementar:**
`CreateCreditCardCommand` valida `ClosingDay`/`DueDay` entre 1 e 31. `CreateCreditCardPurchaseCommand` valida `CreditCardId` existente (pertencente ao usuário) e `InstallmentsCount >= 1`. `GetCreditCardBillQueryHandler` calcula, para cada `CreditCardPurchase` do cartão, quais parcelas (`Amount / InstallmentsCount`) vencem dentro do ciclo informado (a partir de `PurchaseDate` + `ClosingDay`/`DueDay`), sem persistir cada parcela — cálculo em memória (RN02 e RN04 do PRD).

**Testes Necessários:**
- [ ] `Handle_WithValidCommand_ShouldPersistCard`
- [ ] `Handle_WithUnknownCard_ShouldNotifyNotFound` (compra)
- [ ] `Handle_ShouldDistributeInstallmentsEquallyAcrossMonths`
- [ ] `Handle_ShouldGroupInstallmentsByBillingCycle`

**Critérios de Aceitação:**
- [ ] Critério 4, 5 e 6 do PRD atendidos
- [ ] Build sem erros, testes passando

**Dependências:** ETAPA 2, ETAPA 3

**Comandos Úteis:**
```bash
dotnet test backend/src/MzFinance.UnitTests --filter CreditCard
```

---

### ETAPA 10: Cartão de Crédito — Frontend

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Navegação de mês (anterior/próximo) na fatura implementada com aritmética de `Date` do JS puro, sem lib de datas — ok pro escopo do MVP
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Telas de cadastro de cartão, lançamento de compra e visualização de fatura.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/features/credit-cards/` (novo)

**O que implementar:**
Formulário de cadastro de cartão, formulário de nova compra (com campo de parcelas), tela de fatura por período mostrando total e parcelas do ciclo.

**Testes Necessários:**
- [ ] N/A

**Critérios de Aceitação:**
- [ ] Usuário cadastra cartão, lança compra parcelada e vê a fatura refletindo as parcelas corretas
- [ ] Build de produção sem erros

**Dependências:** ETAPA 9, ETAPA 4

---

### ETAPA 11: Financiamento — Backend (CRUD + Tabela Price)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- **Ponto de atenção validado:** o valor de referência inicialmente escrito no PONTO DE ATENÇÃO do PLAN (R$ 1.412,37 para PV=30000/i=1%/n=24) estava incorreto — o valor correto da fórmula Price é **R$ 1.412,20**, confirmado por dois cálculos independentes (decimal no código + double num script de verificação à parte). Testes escritos com o valor correto
- Toda a matemática do `PriceAmortizationCalculator` usa `decimal` (potenciação via loop inteiro, não `Math.Pow` com `double`) para evitar imprecisão em valores monetários
- `InstallmentAmount` nunca é persistido — sempre recalculado em memória na query, a partir de `TotalAmount`/`InterestRate`/`InstallmentsCount` (RN do PRD)
- Validado ponta a ponta contra Postgres real
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
CRUD de financiamento com cálculo de parcela fixa via Tabela Price.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/Builders/PriceAmortizationCalculator.cs` (novo)
- `backend/src/MzFinance.Application/Commands/Financings/{Create,Update,Delete}Financing/` (novos)
- `backend/src/MzFinance.Application/Queries/Financings/GetFinancings/` (novo)
- `backend/src/MzFinance.WebApi/Controllers/FinancingsController.cs` (novo)

**O que implementar:**
`PriceAmortizationCalculator` recebe `TotalAmount`, `InterestRate` (mensal) e `InstallmentsCount`, retorna o valor fixo da parcela pela fórmula da Tabela Price (`PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)`, com caso especial para `InterestRate = 0`: `PMT = PV / n`). `GetFinancingsQuery` retorna os financiamentos com a parcela já calculada (via o mesmo calculator, não persistida).

**Testes Necessários:**
- [ ] `Calculate_WithPositiveRate_ShouldReturnFixedInstallment` (validar contra valor conhecido)
- [ ] `Calculate_WithZeroRate_ShouldDivideEqually`
- [ ] `Handle_WithValidCommand_ShouldPersistFinancing`

**Critérios de Aceitação:**
- [ ] Critério 7 do PRD atendido, incluindo Cenário 3 dos testes do PRD
- [ ] Build sem erros, testes passando

**Dependências:** ETAPA 2, ETAPA 3

**Comandos Úteis:**
```bash
dotnet test backend/src/MzFinance.UnitTests --filter PriceAmortization
```

---

### ETAPA 12: Financiamento — Frontend

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Tela de cadastro e listagem de financiamentos, exibindo a parcela calculada.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/financing/` (novo)

**O que implementar:**
Formulário (valor total, taxa, prazo, data) e listagem mostrando parcela calculada pelo backend.

**Testes Necessários:**
- [ ] N/A

**Critérios de Aceitação:**
- [ ] Usuário cadastra financiamento e vê o valor da parcela calculada
- [ ] Build de produção sem erros

**Dependências:** ETAPA 11, ETAPA 4

---

### ETAPA 13: Projeção de Saldo — Backend

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- "Hoje" é obtido via `DateOnly.FromDateTime(DateTime.UtcNow)` direto no handler/validator — não há abstração `IDateTimeProvider` no boilerplate. Aceitável pro MVP; os testes usam datas relativas ao relógio real (`DateTime.UtcNow`) para continuarem válidos em qualquer dia
- Cartão de crédito usa granularidade de **ciclo (ano/mês)** para decidir "futuro" (mês da fatura estritamente após o mês atual); financiamento e recorrência usam granularidade de **data exata**. É uma inconsistência proposital — cartão não tem uma data de vencimento exata modelada, só `ClosingDay`/`DueDay`
- Validado ponta a ponta contra Postgres real, combinando saldo + fatura de cartão + parcelas de financiamento reais de etapas anteriores; validação de data no passado retorna 400 corretamente
- Sem dúvidas em aberto para o Tech Lead nesta etapa

**Objetivo:**
Query que combina saldo atual + ocorrências futuras de todas as fontes até uma data alvo, com valor hipotético opcional.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Queries/Balance/GetProjectedBalance/` (novo)
- `backend/src/MzFinance.WebApi/Controllers/BalanceController.cs` (novo)

**O que implementar:**
`GetProjectedBalanceQueryHandler` calcula: saldo atual (mesma lógica da ETAPA 5) + ocorrências futuras de `RecurringCommitment` (gerar datas entre hoje e `TargetDate` conforme `Frequency`, respeitando `EndDate`) + parcelas futuras de `CreditCardPurchase` (reaproveitar lógica de distribuição da ETAPA 9) + parcelas futuras de `Financing` (reaproveitar `PriceAmortizationCalculator` da ETAPA 11, distribuindo mensalmente a partir de `StartDate`) + `HypotheticalAmount` informado (não persistido). Validar `TargetDate >= hoje` (CE04 do PRD).

**Testes Necessários:**
- [ ] `Handle_WithRecurringCommitment_ShouldProjectFutureOccurrences` (Cenário 1 do PRD)
- [ ] `Handle_WithPastTargetDate_ShouldNotifyValidationError`
- [ ] `Handle_ShouldCombineAllSourcesIntoSingleProjectedBalance`

**Critérios de Aceitação:**
- [ ] Critério 9 do PRD atendido
- [ ] Build sem erros, testes passando

**Dependências:** ETAPA 5, ETAPA 7, ETAPA 9, ETAPA 11

**Comandos Úteis:**
```bash
dotnet test backend/src/MzFinance.UnitTests --filter ProjectedBalance
```

---

### ETAPA 14: Projeção de Saldo — Frontend

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Todas as 14 etapas do MVP_000001 concluídas. Próximo passo: validação end-to-end via `/test-e2e`
- Sem dúvidas em aberto para o Tech Lead

**Objetivo:**
Tela de simulação de saldo projetado.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/projection/` (novo)

**O que implementar:**
Formulário com data alvo e valor hipotético opcional, exibindo o saldo projetado retornado pela ETAPA 13.

**Testes Necessários:**
- [ ] N/A

**Critérios de Aceitação:**
- [ ] Usuário informa uma data futura e vê o saldo projetado combinando todas as fontes
- [ ] Valor hipotético não é persistido (recarregar a tela não o mantém)
- [ ] Build de produção sem erros

**Dependências:** ETAPA 13, ETAPA 4

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
- [x] `dotnet build backend/MzFinance.slnx` sem erros
- [x] `dotnet test backend/MzFinance.slnx` — 63/63 testes passando
- [x] `npm run build --prefix frontend` sem erros

### Padrões de Código
- [x] Todas as entidades seguem o padrão construtor protegido/público do boilerplate
- [x] Todos os Commands/Queries seguem o padrão CQRS (nunca leem por Command nem escrevem por Query)
- [x] Erros de negócio via Notification Pattern, nunca `throw`

### Banco de Dados / Schema
- [x] Migration inicial testada localmente (Postgres via docker-compose)
- [x] Sem risco de perda de dados (banco novo)

### Autorização
- [x] Todos os endpoints exceto `/api/auth/login` exigem JWT válido
- [x] Testado acesso sem token (retorna 401 — validado via curl real)

### Integrações
- [x] N/A — sem integrações externas neste MVP

### PRD
- [x] Todos os 9 requisitos funcionais atendidos
- [x] Todos os 9 critérios de aceitação atendidos (validado via chamadas HTTP reais, ver seção abaixo)

---

## VALIDAÇÃO END-TO-END (`/test-e2e`)

**Data:** 2026-07-02
**Resultado:** ⚠️ Validado no nível de API (não no browser) — ver limitação abaixo

### Limitação encontrada

A skill `/test-e2e` exige um MCP de automação de browser (Playwright ou equivalente) para
navegar a UI e capturar evidências visuais. **Esse MCP não está instalado nesta sessão**
(`ToolSearch` por `mcp__playwright__*` não retornou nenhuma ferramenta). Conforme a própria
skill instrui ("Se não estiverem [as ferramentas], orientar o dev a configurar o MCP e parar"),
a validação 100% fiel ao processo `/test-e2e` (navegação real na UI + screenshots) não pôde
ser executada.

**Para rodar a validação visual completa depois:** configurar o MCP Playwright no Claude Code
e então rodar `/test-e2e` normalmente — o ambiente (Postgres + backend + frontend) já está
validado e pronto para subir.

### O que foi validado como substituto

Com Postgres, backend (`dotnet run`, porta 5280) e frontend (`npm run dev`, porta 5174) rodando
**simultaneamente**, simulei a jornada completa do usuário via chamadas HTTP reais contra a API
(equivalente ao que a UI faz), cobrindo os 9 critérios de aceitação do PRD:

| Critério | Cenário | Resultado |
|---|---|---|
| 1 | Login retorna JWT válido | ✅ |
| 2 | Criar transação avulsa | ✅ |
| 3 | Criar transação recorrente | ✅ |
| 4/5 | Cadastrar cartão + lançar compra parcelada (2x) | ✅ |
| 6 | Fatura de julho mostra parcela 1/2 = R$300 | ✅ |
| 7 | Financiamento retorna parcela calculada (Tabela Price) | ✅ |
| 8 | Extrato retorna lista + saldo | ✅ |
| 9 | Projeção com valor hipotético retorna `projectedBalance` | ✅ |
| Segurança | Endpoint protegido sem token → 401 | ✅ |
| Frontend | `index.html` serve com `<title>mz-finance</title>`, sem erros no log do Vite | ✅ |

Todos os cenários passaram. **Não foi possível**, porém, confirmar visualmente que a UI
renderiza os dados corretamente (layout, formulários, navegação por clique) — isso depende do
MCP de browser ausente.

---

## LEGENDA DE STATUS

- ⏳ **Pendente**: Não iniciada
- 🔄 **Em Progresso**: Sendo implementada
- ✅ **Concluída**: Finalizada e testada
- ❌ **Bloqueada**: Com impedimento

---

## PONTOS DE ATENÇÃO

1. **Cálculo da Tabela Price (ETAPA 11)**: é a lógica matemática mais arriscada do MVP. Validar a fórmula com um exemplo numérico conhecido antes de integrar à ETAPA 13 (projeção).
2. **Escopo grande para "hoje"**: 14 etapas cobrindo o ciclo completo (incluindo cartão de crédito). Se o tempo apertar, um corte seguro é parar após a ETAPA 8 (transações avulsas + recorrentes funcionando) e tratar cartão/financiamento/projeção como continuação — mas isso é decisão do dev, não uma alteração automática deste plano.
3. **Parcelas calculadas em memória**: nenhuma parcela individual é marcada como "paga" no MVP_000001 — isso é uma limitação conhecida, não um bug.

---

## DECISÕES TÉCNICAS

### Decisão 1: Autenticação self-issued em vez de IdP externo
- **Opção escolhida**: a própria API emite e valida o JWT (usuário único, seed no banco).
- **Justificativa**: uso pessoal numa VPS própria não justifica a complexidade operacional de um Keycloak/Auth0.
- **Alternativas consideradas**: usar o JWT Bearer genérico do boilerplate (Authority/Audience externos) — descartado por exigir infraestrutura adicional sem benefício pro caso de uso.

### Decisão 2: Parcelas calculadas em memória, não materializadas
- **Opção escolhida**: parcelas futuras de cartão e financiamento são calculadas a partir do registro base (`CreditCardPurchase`/`Financing`) sempre que consultadas.
- **Justificativa**: evita duplicar dado e manter sincronia entre tabela de parcelas e o registro original; editar/excluir o registro base já reflete automaticamente (RN06 do PRD).
- **Alternativas consideradas**: materializar cada parcela como linha própria — permitiria marcar "paga" individualmente, mas fora do escopo do MVP_000001 (ver Roadmap).

### Decisão 3: Compra parcelada no cartão sem juros
- **Opção escolhida**: `CreditCardPurchase` divide o valor total igualmente entre as parcelas (`Amount / InstallmentsCount`), sem cálculo de juros.
- **Justificativa**: parcelamento sem juros é o padrão mais comum em compras no cartão no Brasil; juros de cartão ficariam associados à *fatura em atraso*, fora do escopo do MVP_000001.

---

## RISCOS E MITIGAÇÕES

### Risco 1: Erro na fórmula da Tabela Price
- **Impacto**: Alto (afeta ETAPA 11 e 13 — financiamento e projeção)
- **Probabilidade**: Média
- **Mitigação**: testes unitários com valores de referência conhecidos antes de integrar à projeção (ETAPA 11 termina só quando os testes batem com uma calculadora de amortização de mercado)

### Risco 2: Escopo não fechar no mesmo dia
- **Impacto**: Médio (expectativa do dev era MVP "hoje")
- **Probabilidade**: Alta (14 etapas, complexidade 🔴 Alta)
- **Mitigação**: etapas são incrementais e cada uma entrega valor sozinha — dev pode parar em qualquer etapa concluída com um subconjunto funcional do fluxo

### Risco 3: Atrito no scaffold do frontend (sem boilerplate pronto)
- **Impacto**: Baixo
- **Probabilidade**: Baixa
- **Mitigação**: ETAPA 4 usa scaffold padrão do Vite (`react-ts`), sem customização além do essencial (roteamento + client HTTP)

---

## DOCUMENTAÇÃO DE REFERÊNCIA

- **PRD**: `MAPS/mz-finance/prd/mz-finance-prd-000001-mvp.md`
- **Contexto do Projeto**: `MAPS/mz-finance/mz-finance-context.md`
- **Padrões do Backend**: `BOILERPLATES/BACK/dotnet-api/README.md`
- **Código relacionado**: `backend/src/MzFinance.*` (estrutura já bootstrapada e validada com `dotnet build`)

---

## COMANDOS ÚTEIS

```bash
# Backend
dotnet build backend/MzFinance.slnx
dotnet test backend/MzFinance.slnx
docker compose -f backend/docker-compose.yml up -d
dotnet ef migrations add NomeDaMigration -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
dotnet ef database update -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi

# Frontend
npm install --prefix frontend
npm run dev --prefix frontend
npm run build --prefix frontend
```

---

## INSTRUÇÕES DE ATUALIZAÇÃO

Este arquivo será atualizado automaticamente pelo skill `/implementar` durante a execução.

Após cada etapa concluída:
1. Status da etapa → ✅ Concluída + data de conclusão
2. Progresso geral atualizado (% e barra visual)
3. Checklist de tarefas marcado

---

## OBSERVAÇÕES

1. **Implementar uma etapa por vez** — garantir testes passando antes de avançar
2. **Seguir os padrões do projeto** — ver `MAPS/mz-finance/mz-finance-context.md` e `BOILERPLATES/BACK/dotnet-api/README.md`
3. **Code review contínuo** — usar `/code-review` após cada etapa

---

**Criado em:** 2026-07-01
**Próximo passo:** `/implementar ETAPA 1`
