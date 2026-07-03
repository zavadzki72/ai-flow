# PRD: MVP_000001 — Controle Financeiro Pessoal (Fluxo End-to-End Mínimo)

**Sequência**: 000001
**Ticket**: TBD
**Versão**: 1
**Data**: 2026-07-01
**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO

**Metadados:**
- **Prioridade**: Alta
- **Complexidade**: 🔴 Alta
- **Repositório(s)**: backend, frontend
- **Domínio(s)**: Controle financeiro pessoal

---

## 1. VISÃO GERAL

### 1.1. Contexto

O dono do projeto (usuário único da aplicação) precisa controlar suas finanças pessoais de forma mais completa do que um extrato bancário permite. Ele lida com receitas e despesas avulsas, compromissos recorrentes (ex: salário, assinaturas), compras no cartão de crédito (incluindo parceladas) e financiamentos de longo prazo (ex: carro, casa). Hoje não existe um lugar único que junte tudo isso e permita enxergar o impacto combinado desses compromissos no saldo futuro.

### 1.2. Objetivo

Entregar um fluxo end-to-end funcional em que o usuário: faz login, cadastra qualquer um dos quatro tipos de compromisso financeiro (avulso, recorrente, compra no cartão, financiamento), visualiza extrato e saldo atual, e simula o saldo projetado numa data futura considerando todos os compromissos pendentes.

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Login
**Dado** que existe um usuário único cadastrado (seed) com email e senha
**Quando** o usuário informa email e senha corretos na tela de login
**Então** o sistema retorna um token JWT válido
**E** o usuário é redirecionado para a tela principal (extrato)

### Critério 2 — Registrar transação avulsa
**Dado** que o usuário está autenticado
**Quando** ele registra uma transação avulsa informando tipo (receita/despesa), valor, data, categoria (texto livre) e descrição opcional
**Então** a transação aparece no extrato
**E** o saldo atual é recalculado considerando o novo valor

### Critério 3 — Registrar transação recorrente
**Dado** que o usuário está autenticado
**Quando** ele registra um compromisso recorrente informando tipo (receita/despesa), valor, frequência (mensal/semanal/anual), data de início e data de fim opcional
**Então** o compromisso passa a gerar ocorrências futuras na projeção de saldo
**E** ocorrências dentro do período já decorrido não geram transações retroativas automaticamente

### Critério 4 — Cadastrar cartão de crédito
**Dado** que o usuário está autenticado
**Quando** ele cadastra um cartão informando nome, limite, dia de fechamento e dia de vencimento
**Então** o cartão fica disponível para lançar compras

### Critério 5 — Lançar compra parcelada no cartão
**Dado** que o usuário tem um cartão cadastrado
**Quando** ele lança uma compra informando valor total, data, descrição e número de parcelas
**Então** o sistema divide o valor em parcelas iguais (sem juros) distribuídas mensalmente a partir da data da compra
**E** cada parcela é atribuída à fatura correspondente conforme o dia de fechamento do cartão

### Critério 6 — Visualizar fatura do cartão
**Dado** que o usuário tem compras lançadas em um cartão
**Quando** ele acessa a visão de fatura de um período
**Então** o sistema mostra todas as parcelas (de compras à vista ou parceladas) cujo vencimento cai naquele ciclo, com o total da fatura

### Critério 7 — Cadastrar financiamento
**Dado** que o usuário está autenticado
**Quando** ele cadastra um financiamento informando valor total, taxa de juros mensal, número de parcelas e data de início
**Então** o sistema calcula o valor da parcela fixa usando a Tabela Price
**E** as parcelas futuras entram na projeção de saldo

### Critério 8 — Ver extrato e saldo atual
**Dado** que o usuário tem transações avulsas e ocorrências já vencidas de recorrências/parcelas lançadas
**Quando** ele acessa o extrato
**Então** vê a lista de lançamentos já ocorridos (até a data de hoje) e o saldo atual (soma de receitas menos despesas)

### Critério 9 — Simular saldo projetado numa data futura
**Dado** que o usuário tem compromissos recorrentes, compras parceladas e/ou financiamentos ativos
**Quando** ele informa uma data futura e, opcionalmente, um valor hipotético de compra
**Então** o sistema calcula o saldo projetado somando saldo atual + ocorrências futuras de recorrências + parcelas futuras de compras no cartão + parcelas futuras de financiamentos, até a data informada
**E** o valor hipotético informado impacta o resultado exibido, mas **não é salvo** no sistema

---

## 3. ESCOPO TÉCNICO

### 3.1. Componentes a Alterar

Nenhum — projeto novo. O exemplo de demonstração do boilerplate (`MzFinanceCategory`/`MzFinanceItem` e seus Commands/Queries/Controllers, originados do exemplo `Dummy` do boilerplate `dotnet-api`) deve ser **removido** e substituído pelas entidades reais listadas em 3.2.

### 3.2. Componentes Novos

**Backend — `MzFinance.Domain`:**
- Entidades: `User`, `Transaction`, `RecurringCommitment`, `CreditCard`, `CreditCardPurchase`, `Financing`
- Enums: tipo de transação (Income/Expense), frequência (Monthly/Weekly/Yearly), origem da transação (sourceType)

**Backend — `MzFinance.Application`:**
- Commands: `Login`, `CreateTransaction`, `UpdateTransaction`, `DeleteTransaction`, `CreateRecurringCommitment`, `UpdateRecurringCommitment`, `DeleteRecurringCommitment`, `CreateCreditCard`, `CreateCreditCardPurchase`, `CreateFinancing`, `UpdateFinancing`, `DeleteFinancing`
- Queries: `GetStatement` (extrato + saldo atual), `GetProjectedBalance` (saldo projetado numa data), `GetCreditCardBill` (fatura de um período), `GetCreditCards`, `GetRecurringCommitments`, `GetFinancings`

**Backend — `MzFinance.Infra`:**
- Maps EF Core para as 6 entidades novas
- Migration inicial (criação das tabelas)
- Lógica de cálculo de amortização (Tabela Price) para `Financing`
- Lógica de cálculo/distribuição de parcelas para `CreditCardPurchase`

**Backend — `MzFinance.WebApi`:**
- `AuthController` (login)
- `TransactionsController`, `RecurringCommitmentsController`, `CreditCardsController`, `CreditCardPurchasesController`, `FinancingsController`
- Configuração de autenticação JWT self-issued (substitui o JWT Bearer genérico do boilerplate, que assume IdP externo)

**Frontend:**
- `features/auth` — tela de login
- `features/transactions` — CRUD de transação avulsa
- `features/recurring` — CRUD de transação recorrente
- `features/credit-cards` — CRUD de cartão, lançamento de compra, visão de fatura
- `features/financing` — CRUD de financiamento
- `features/projection` — tela de simulação de saldo futuro
- `shared/api` — client HTTP autenticado (JWT)

### 3.3. Componentes Reutilizados

Do boilerplate `dotnet-api`, sem alteração estrutural: Clean Architecture (4 camadas), CQRS via MediatR, Notification Pattern, envelope `DataActionResult<T>`, `ValidationBehavior`, PostgreSQL + EF Core, Serilog, Health Checks, Swagger.

### 3.4. Fluxo de Dados

```
1. Usuário faz login → recebe JWT
2. Usuário cadastra compromissos (avulso, recorrente, cartão + compra, financiamento)
3. Cada cadastro persiste na tabela correspondente via Command
4. Extrato (Query) lê Transaction diretamente (lançamentos já ocorridos)
5. Projeção de saldo (Query) combina:
   a. Saldo atual (soma de Transaction)
   b. + ocorrências futuras calculadas de RecurringCommitment (entre hoje e data alvo)
   c. + parcelas futuras calculadas de CreditCardPurchase (amount / installmentsCount)
   d. + parcelas futuras calculadas de Financing (Tabela Price)
   e. + valor hipotético informado na simulação (não persistido)
6. Fatura do cartão (Query) agrupa parcelas de CreditCardPurchase por ciclo (closingDay/dueDay)
```

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos

**User**
| Campo | Tipo | Constraint |
|---|---|---|
| Id | uuid | PK |
| Email | string | unique, obrigatório |
| PasswordHash | string | obrigatório, nunca exposto em DTO |

**Transaction**
| Campo | Tipo | Constraint |
|---|---|---|
| Id | uuid | PK |
| UserId | uuid | FK → User |
| Type | enum (Income/Expense) | obrigatório |
| Amount | decimal(18,2) | obrigatório, > 0 |
| Date | date | obrigatório |
| Category | string | obrigatório, texto livre |
| Description | string | opcional |
| SourceType | enum (Manual/FromRecurring/FromFinancing/FromCard) | obrigatório, default Manual |

**RecurringCommitment**
| Campo | Tipo | Constraint |
|---|---|---|
| Id | uuid | PK |
| UserId | uuid | FK → User |
| Type | enum (Income/Expense) | obrigatório |
| Amount | decimal(18,2) | obrigatório, > 0 |
| Frequency | enum (Monthly/Weekly/Yearly) | obrigatório |
| StartDate | date | obrigatório |
| EndDate | date | opcional (nulo = indeterminado) |
| Category | string | obrigatório |

**CreditCard**
| Campo | Tipo | Constraint |
|---|---|---|
| Id | uuid | PK |
| UserId | uuid | FK → User |
| Name | string | obrigatório |
| Limit | decimal(18,2) | obrigatório, >= 0 |
| ClosingDay | int | obrigatório, entre 1 e 31 |
| DueDay | int | obrigatório, entre 1 e 31 |

**CreditCardPurchase**
| Campo | Tipo | Constraint |
|---|---|---|
| Id | uuid | PK |
| CreditCardId | uuid | FK → CreditCard |
| Amount | decimal(18,2) | obrigatório, > 0 (valor total da compra) |
| PurchaseDate | date | obrigatório |
| InstallmentsCount | int | obrigatório, >= 1 |
| Description | string | opcional |

**Financing**
| Campo | Tipo | Constraint |
|---|---|---|
| Id | uuid | PK |
| UserId | uuid | FK → User |
| TotalAmount | decimal(18,2) | obrigatório, > 0 |
| InterestRate | decimal(9,4) | obrigatório, >= 0 (taxa mensal, formato percentual) |
| InstallmentsCount | int | obrigatório, >= 1 |
| StartDate | date | obrigatório |
| Description | string | opcional |

> `InstallmentAmount` **não** é um campo persistido — é calculado a partir de `TotalAmount`, `InterestRate` e `InstallmentsCount` via Tabela Price sempre que necessário (query de projeção ou detalhe do financiamento).

### 4.2. Comandos / Queries / DTOs

- `LoginCommand` (email, password) → token JWT
- `CreateTransactionCommand`, `UpdateTransactionCommand`, `DeleteTransactionCommand`
- `CreateRecurringCommitmentCommand`, `UpdateRecurringCommitmentCommand`, `DeleteRecurringCommitmentCommand`
- `CreateCreditCardCommand`
- `CreateCreditCardPurchaseCommand`
- `CreateFinancingCommand`, `UpdateFinancingCommand`, `DeleteFinancingCommand`
- `GetStatementQuery` (período opcional) → lista de transações + saldo atual
- `GetProjectedBalanceQuery` (targetDate, hypotheticalAmount opcional) → saldo projetado + breakdown por origem
- `GetCreditCardBillQuery` (creditCardId, período) → lista de parcelas do ciclo + total
- `GetCreditCardsQuery`, `GetRecurringCommitmentsQuery`, `GetFinancingsQuery` (listagens simples)

### 4.3. Handlers / Services

- **`GetProjectedBalanceQueryHandler`**: agrega saldo atual (soma de `Transaction`) + ocorrências futuras de `RecurringCommitment` (geradas em memória a partir de `Frequency`/`StartDate`/`EndDate`, limitadas à `targetDate`) + parcelas futuras de `CreditCardPurchase` (amount / installmentsCount, distribuídas mensalmente a partir de `PurchaseDate`) + parcelas futuras de `Financing` (calculadas via Tabela Price) + `hypotheticalAmount` informado (não persistido).
- **`GetCreditCardBillQueryHandler`**: para um cartão e período, identifica quais parcelas (de todas as `CreditCardPurchase` daquele cartão) vencem dentro do ciclo definido por `ClosingDay`/`DueDay`.
- **`CreateFinancingCommandHandler`**: valida os dados e persiste; o cálculo da Tabela Price fica isolado numa classe utilitária reaproveitada também pela query de projeção.

### 4.4. Persistência

Operações CRUD padrão via EF Core para todas as entidades. Nenhuma operação em lote ou bulk necessária no MVP_000001.

### 4.5. Validações

- `Amount`/`TotalAmount` > 0 em todas as entidades monetárias
- `InstallmentsCount` >= 1
- `InterestRate` >= 0
- `ClosingDay`/`DueDay` entre 1 e 31
- `Email` formato válido, `Password` não vazio (mínimo de tamanho a definir na implementação)
- `TargetDate` da projeção deve ser >= data atual

### 4.6. Autorização

Usuário único — todos os endpoints exigem `[Authorize]` (JWT) exceto o endpoint de login (`[AllowAnonymous]`). Sem múltiplos perfis/roles neste MVP.

---

## 5. REGRAS DE NEGÓCIO

- **RN01**: Toda transação, recorrência, compra de cartão e financiamento pertence ao usuário autenticado (campo `UserId`), mesmo havendo um único usuário no sistema.
- **RN02**: Parcelas de compra no cartão são divididas em partes iguais sem juros (`Amount / InstallmentsCount`), distribuídas mensalmente a partir do mês da compra.
- **RN03**: Financiamento usa Tabela Price (parcelas fixas) para calcular o valor de cada parcela a partir de `TotalAmount`, `InterestRate` mensal e `InstallmentsCount`.
- **RN04**: A fatura do cartão agrupa todas as parcelas (de compras à vista ou parceladas) cujo vencimento cai no ciclo definido por `ClosingDay`/`DueDay` do cartão.
- **RN05**: A simulação de saldo projetado com valor hipotético é apenas uma visualização — não persiste nenhum registro. Para registrar de fato, o usuário cadastra a transação normalmente.
- **RN06**: Editar ou excluir um `RecurringCommitment`, `CreditCardPurchase` ou `Financing` reflete automaticamente na projeção de saldo, pois as parcelas futuras são calculadas a partir do registro base, nunca materializadas em tabela própria.
- **RN07**: Categorias de transação são texto livre definido pelo usuário — não existe uma lista fixa pré-cadastrada no MVP_000001.

---

## 6. REQUISITOS FUNCIONAIS

- **RF01**: Login com usuário único (email + senha) retornando JWT.
- **RF02**: CRUD de transação avulsa.
- **RF03**: CRUD de transação recorrente.
- **RF04**: Cadastro de cartão de crédito.
- **RF05**: Lançamento de compra no cartão, com suporte a parcelamento.
- **RF06**: Visualização de fatura de um cartão por período.
- **RF07**: CRUD de financiamento, com cálculo automático de parcela via Tabela Price.
- **RF08**: Visualização de extrato (lançamentos já ocorridos) + saldo atual.
- **RF09**: Simulação de saldo projetado numa data futura, com valor hipotético opcional.

---

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01**: Dados sensíveis (senha, valores financeiros) nunca são logados em texto puro.
- **RNF02**: Senha armazenada com hash (bcrypt ou argon2) — nunca texto puro.
- **RNF03**: Todos os endpoints (exceto login) exigem autenticação JWT válida.
- **RNF04**: Aplicação de uso pessoal — sem exigência de alta disponibilidade, offline-first ou multi-idioma.

---

## 8. SCHEMA / MIGRATIONS

**Migration necessária?** ☑ Sim

**Se SIM:** Criação inicial das tabelas `Users`, `Transactions`, `RecurringCommitments`, `CreditCards`, `CreditCardPurchases`, `Financings`, com as respectivas foreign keys (`UserId` em todas as tabelas de domínio, `CreditCardId` em `CreditCardPurchases`).

**Impacto em dados existentes?** Não — banco novo, sem dados pré-existentes.
**Reversível?** Sim (migration inicial, sem dependência de dados).

---

## 9. INTEGRAÇÕES

### 9.1. Sistemas Externos Afetados

Nenhum — MVP_000001 não possui integrações externas (confirmado durante o `/start-project`). Todos os lançamentos são manuais.

### 9.2. Alterações em Contratos

N/A — API nova.

**Breaking change?** Não.

---

## 10. TRATAMENTO DE ERROS

### CE01 — Cartão de crédito não encontrado ao lançar compra
- **Situação**: `CreditCardId` informado não existe ou não pertence ao usuário autenticado.
- **Tratamento**: retorna notificação `NotFound`.
- **Mensagem**: "Cartão de crédito não encontrado."

### CE02 — Login com credenciais inválidas
- **Situação**: email ou senha não confere com o usuário cadastrado.
- **Tratamento**: retorna notificação `Unauthorized`, sem indicar qual dos dois campos está incorreto.
- **Mensagem**: "Credenciais inválidas."

### CE03 — Valor monetário inválido
- **Situação**: `Amount`/`TotalAmount` <= 0 em qualquer entidade.
- **Tratamento**: `ValidationError` (400), bloqueado pelo `ValidationBehavior` antes do handler.
- **Mensagem**: "O valor deve ser maior que zero."

### CE04 — Data de projeção no passado
- **Situação**: `TargetDate` informado na simulação é anterior à data atual.
- **Tratamento**: `ValidationError` (400).
- **Mensagem**: "A data de projeção deve ser futura."

---

## 11. CASOS DE USO

### UC01: Registrar compra parcelada no cartão e ver impacto na fatura futura

**Ator:** Usuário único.

**Pré-condições:**
- Usuário autenticado.
- Cartão de crédito já cadastrado.

**Fluxo Principal:**
1. Usuário acessa a tela de nova compra no cartão.
2. Seleciona o cartão, informa valor total, data, descrição e número de parcelas.
3. Sistema calcula o valor de cada parcela e distribui pelas faturas futuras (mensal, a partir da data da compra).
4. Usuário vê confirmação e a fatura atualizada.

**Fluxos Alternativos:**
- **FA01 — Cartão não encontrado:** sistema retorna CE01.

### UC02: Simular impacto de uma compra futura no saldo

**Ator:** Usuário único.

**Pré-condições:**
- Usuário autenticado.
- Possui ao menos um lançamento (para ter saldo atual de referência).

**Fluxo Principal:**
1. Usuário acessa a tela de projeção de saldo.
2. Informa uma data futura e, opcionalmente, um valor hipotético de compra.
3. Sistema soma saldo atual + compromissos futuros já cadastrados (recorrências, parcelas de cartão, parcelas de financiamento) até a data alvo + o valor hipotético.
4. Usuário vê o saldo projetado, sem nada ser persistido.

**Fluxos Alternativos:**
- **FA01 — Data no passado:** sistema retorna CE04.

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: Projeção com recorrência (Happy Path)
**Dado** um usuário autenticado com saldo atual de R$ 1.000,00
**Quando** ele cadastra uma transação recorrente de despesa de R$ 100,00 mensal a partir de hoje, sem data de fim
**Então** a projeção de saldo para daqui a 3 meses reflete a subtração de 3 ocorrências futuras (R$ 300,00 a menos) em relação ao saldo atual

### Cenário 2: Validação de parcelas inválidas
**Dado** um usuário autenticado com um cartão cadastrado
**Quando** ele tenta cadastrar uma compra no cartão com `InstallmentsCount = 0`
**Então** o sistema retorna erro de validação (CE03) e a compra não é persistida

### Cenário 3: Financiamento com Tabela Price
**Dado** um usuário autenticado
**Quando** ele cadastra um financiamento de R$ 30.000,00, taxa de 1% ao mês, em 24 parcelas
**Então** o sistema calcula e exibe o valor fixo da parcela via Tabela Price
**E** essas parcelas futuras entram na projeção de saldo

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Código implementado seguindo os padrões do boilerplate `dotnet-api` (ver `mz-finance-context.md`)
- [ ] Testes unitários criados e passando (xUnit + NSubstitute + EF InMemory no backend)
- [ ] Migration inicial criada e testada
- [ ] Autenticação JWT funcionando em todos os endpoints exceto login
- [ ] Sem integrações externas pendentes (não há neste MVP)
- [ ] Build passando (backend e frontend)
- [ ] PRD atendido 100% (9 critérios de aceitação)

---

## 14. REFERÊNCIAS

- `MAPS/mz-finance/mz-finance-context.md` — arquitetura, modelo de dados, glossário
- `BOILERPLATES/BACK/dotnet-api/README.md` — padrões obrigatórios do backend
- Ticket/story: TBD (projeto pessoal, sem ferramenta de gestão integrada)

---

## 15. OBSERVAÇÕES

O cálculo de amortização usa a **Tabela Price** (parcelas fixas) por ser o padrão mais comum de financiamento no Brasil. Se o financiamento real do usuário usar o sistema SAC (parcelas decrescentes), isso deve ser ajustado numa iteração futura — assunção registrada aqui para revisão explícita durante o `/planejar` ou `/implementar`.

O escopo deste MVP_000001 é intencionalmente amplo — decisão explícita do dev durante o `/start-project`, que optou por incluir o ciclo completo de cartão de crédito (fatura, limite) em vez de deixá-lo para uma iteração futura, mesmo sabendo que isso ultrapassa "um dia" de implementação. O `/planejar` deve quebrar isso em baby steps independentes para permitir entregas incrementais.

**Riscos Identificados:**
- ⚠️ Cálculo de amortização (Tabela Price) é a parte de maior risco técnico/tempo do MVP — validar a fórmula com casos de teste antes de integrar à projeção de saldo.
- ⚠️ Escopo grande para uma única sessão de implementação — risco de o MVP não fechar "hoje" como o dev gostaria.

**Dependências:**
- 🔗 Nenhuma dependência externa.

---

## 16. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-07-01 | 1 | IA (Claude Code /start-project) | Versão inicial |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
