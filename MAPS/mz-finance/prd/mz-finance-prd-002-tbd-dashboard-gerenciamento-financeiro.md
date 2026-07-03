# PRD: Dashboard de Gasto Mensal, Gasto por Categoria, Compras Consolidadas e Reorganização de Navegação

**Sequência**: 002
**Ticket**: TBD
**Versão**: 1
**Data**: 2026-07-02
**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO

**Metadados:**
- **Prioridade**: Alta
- **Complexidade**: 🟡 Média
- **Repositório(s)**: backend (`C:/Projects/Personal/mz-finance/backend`), frontend (`C:/Projects/Personal/mz-finance/frontend`)
- **Domínio(s)**: Transações, Recorrentes, Cartão de Crédito, Financiamento, Projeção de Saldo (leitura/relatórios)

---

## 1. VISÃO GERAL

### 1.1. Contexto

O MVP_000001 (PRD_000001) entregou os CRUDs dos quatro tipos de compromisso financeiro (transação avulsa, recorrente, cartão de crédito, financiamento) mais a projeção de saldo futuro numa data-alvo livre. Hoje o app é orientado a **cadastro**: a rota padrão pós-login (`/`) é a `TransactionsPage` (extrato), e cada tipo de compromisso tem sua própria tela de gerenciamento independente. A navegação é uma barra plana com cinco itens (`Transações`, `Recorrentes`, `Cartões`, `Financiamentos`, `Projeção`).

Falta ao usuário uma **visão de leitura consolidada** que responda às perguntas do dia a dia sem ele ter que abrir tela por tela e fazer contas de cabeça:
- Quanto gastei no mês passado? Quanto estou gastando este mês? Quanto vou gastar no mês que vem?
- Para onde meu dinheiro está indo (gasto por categoria)?
- Quais compras parceladas ainda estou pagando (cartão + financiamento), e quando terminam?

Além disso, à medida que a visão analítica ganha protagonismo, a organização atual (CRUDs no topo, projeção no fim) deixa de fazer sentido como entrada do app.

### 1.2. Objetivo

Transformar o mz-finance de um app de cadastro em um app de **acompanhamento financeiro**, entregando:

1. Um **Dashboard** (nova tela) como rota padrão pós-login, com o gasto do **mês passado (realizado)**, **mês atual (realizado até hoje)** e **mês que vem (projeção)**.
2. Um relatório de **gasto por categoria** no período (mês) selecionado.
3. Uma **visão consolidada read-only de compras parceladas** (cartão + financiamento) com valor total, parcelas restantes e data de término.
4. A **reorganização da navegação**: os quatro CRUDs atuais passam a viver sob uma seção "Gerenciamento" e o Dashboard vira a rota inicial.

Tudo isso **reaproveitando os calculators de domínio já existentes** (`RecurringCommitmentProjector`, `CreditCardBillingCalculator`, `PriceAmortizationCalculator`) e sem introduzir conceito de status de pagamento — que fica explicitamente para o PRD_003 (ver seção 15, Roadmap).

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Dashboard é a rota padrão pós-login
**Dado** que o usuário está autenticado
**Quando** ele acessa a raiz do app (`/`)
**Então** o Dashboard é exibido como página inicial
**E** o extrato de transações deixa de ser a rota raiz, passando a ser acessível sob a seção "Gerenciamento".

### Critério 2 — Gasto do mês passado (realizado)
**Dado** que existem transações de despesa lançadas, faturas de cartão fechadas, ocorrências de recorrentes despesa e parcelas de financiamento referentes ao mês anterior ao atual
**Quando** o usuário abre o Dashboard
**Então** o card "Mês passado" exibe o total de gasto realizado daquele mês, somando: despesas de `Transaction` do mês + total das faturas de cartão cujo ciclo caiu no mês + ocorrências de recorrentes do tipo despesa cuja data caiu no mês + parcelas de financiamento do mês
**E** receitas (Income) não entram no valor de "gasto".

### Critério 3 — Gasto do mês atual (realizado até a data corrente)
**Dado** que hoje é 2026-07-02 e existem compromissos de despesa no mês corrente
**Quando** o usuário abre o Dashboard
**Então** o card "Mês atual" exibe o gasto do mês corrente calculado com a mesma composição do Critério 2 (Transaction + fatura de cartão do ciclo + recorrentes do mês + parcela de financiamento do mês)
**E** o valor considera o mês corrente inteiro (não apenas até o dia de hoje), pois recorrentes/parcelas/faturas do mês são fatos previsíveis do período; a distinção fina de "pago/a pagar" não faz parte deste PRD.

### Critério 4 — Gasto do mês que vem (projeção)
**Dado** que existem compromissos futuros (recorrentes, parcelas de cartão, parcelas de financiamento) que incidem no mês seguinte ao atual
**Quando** o usuário abre o Dashboard
**Então** o card "Mês que vem" exibe o gasto **projetado** do próximo mês, calculado exclusivamente pelos calculators (recorrentes + parcelas de cartão do ciclo + parcelas de financiamento do mês), sem depender de nenhuma `Transaction` real
**E** o valor é claramente rotulado como projeção/estimativa.

### Critério 5 — Gasto por categoria no mês selecionado
**Dado** que no mês selecionado existem despesas de diferentes categorias em `Transaction`, `RecurringCommitment` e `CreditCardPurchase`, além de parcelas de `Financing`
**Quando** o usuário visualiza o relatório de gasto por categoria
**Então** o sistema apresenta o total de gasto agrupado por categoria
**E** compras de cartão sem categoria preenchida são agrupadas em uma categoria padrão "Sem categoria"
**E** todo `Financing` é agregado sob a categoria fixa/implícita "Financiamento"
**E** a soma de todas as categorias é igual ao gasto total do mês exibido no card correspondente.

### Critério 6 — Visão consolidada de compras parceladas
**Dado** que existem compras parceladas de cartão (`CreditCardPurchase` com `installmentsCount > 1`) e financiamentos (`Financing`) em andamento
**Quando** o usuário abre a visão de compras consolidadas
**Então** o sistema lista, em modo somente leitura, cada compra/financiamento com: descrição, origem (Cartão / Financiamento), valor total, valor da parcela, nº de parcelas total, nº de parcelas restantes e data de término estimada
**E** compras/financiamentos já totalmente quitados (sem parcelas restantes na data de hoje) podem ser filtrados/ocultados por padrão.

### Critério 7 — Nova categoria em compra de cartão
**Dado** que o usuário está criando ou editando uma compra de cartão
**Quando** ele preenche (opcionalmente) o campo "categoria"
**Então** o valor é persistido em `CreditCardPurchase.category`
**E** compras existentes anteriores à migration permanecem válidas com categoria vazia/nula (retrocompatibilidade).

### Critério 8 — Reorganização de navegação em "Gerenciamento"
**Dado** que o usuário está autenticado
**Quando** ele olha a navegação principal
**Então** vê o item "Dashboard" e uma seção/agrupamento "Gerenciamento" que contém Transações, Recorrentes, Cartões e Financiamentos
**E** nenhuma funcionalidade de CRUD existente é removida — apenas reorganizada
**E** a Projeção de Saldo (PRD_000001) permanece acessível.

---

## 3. ESCOPO TÉCNICO

> Arquitetura: Clean Architecture (Domain → Application → Infra → WebApi) + CQRS via MediatR. Todas as novas funcionalidades deste PRD são de **leitura** (Queries), exceto o novo campo `category` que afeta os Commands de compra de cartão.

### 3.1. Componentes a Alterar

**Backend**
- `MzFinance.Domain/Models/CreditCardPurchase.cs` — adicionar propriedade `Category` (string opcional) ao construtor e (se houver) método de atualização.
- `MzFinance.Infra/Maps/` — mapeamento EF Core de `CreditCardPurchase` para incluir a coluna `Category` (nullable).
- Command(s) de criação/edição de `CreditCardPurchase` em `MzFinance.Application/Commands/CreditCard*/` e respectivos DTOs/validators — aceitar e propagar `category`.
- DTOs de resposta de compra de cartão — expor `category`.
- `MzFinance.WebApi/Controllers/` — controller de cartões (endpoint de compra) para trafegar o novo campo; novo controller (ou ação) de dashboard/relatórios (ver 3.2).

**Frontend**
- `frontend/src/app/App.tsx` — adicionar rota `/` = Dashboard; mover extrato para uma rota sob gerenciamento (ex.: `/gerenciamento/transacoes` ou manter paths atuais reagrupados na navegação); ajustar o redirect `*`.
- `frontend/src/app/AppLayout.tsx` — reestruturar `NAV_ITEMS` para incluir "Dashboard" e agrupar os CRUDs sob "Gerenciamento".
- Formulário de compra de cartão em `frontend/src/features/credit-cards/` — adicionar campo opcional de categoria.

### 3.2. Componentes Novos

**Backend (Application — Queries)**
- `Queries/Dashboard/GetMonthlySpending/` — query + handler que retorna o gasto realizado/projetado de um mês (ver 4.2/4.3).
- `Queries/Dashboard/GetSpendingByCategory/` — query + handler que retorna o gasto agregado por categoria de um mês.
- `Queries/Dashboard/GetInstallmentOverview/` — query + handler que retorna a visão consolidada de compras parceladas (cartão + financiamento).
- DTOs correspondentes em `MzFinance.Application/Dtos/Dashboard/`.
- (Opcional, decisão do Arquiteto) uma query agregadora `GetDashboardSummary` que devolve os três cards de gasto (mês passado/atual/próximo) numa só resposta, para reduzir round-trips.

**Backend (Infra — Builders)**
- Possível helper de período em `MzFinance.Infra/Builders/` para mapear "um mês" (ano+mês) para intervalo de datas e para determinar se uma ocorrência/parcela/ciclo pertence àquele mês. Reaproveita a lógica de `IsWithinFutureCycle` já presente no `GetProjectedBalanceQueryHandler` — considerar extraí-la para reutilização (decisão de refatoração do Arquiteto).

**Backend (WebApi)**
- Controller `DashboardController` (ou similar) expondo os endpoints de leitura acima, todos sob autenticação JWT.

**Frontend**
- `frontend/src/features/dashboard/` — nova feature: `DashboardPage`, componentes de card de gasto mensal, gráfico/lista de gasto por categoria e lista de compras consolidadas; hooks React Query para as novas queries.

### 3.3. Componentes Reutilizados (sem alteração de comportamento)

- `MzFinance.Infra/Builders/RecurringCommitmentProjector.cs` — gerar ocorrências de recorrentes num intervalo (`GenerateFutureOccurrences`). Atenção: hoje ele exclui a ocorrência exatamente na `referenceDate` e só retorna ocorrências estritamente futuras; para "gasto do mês" precisamos das ocorrências **dentro do mês** (ver RN08). O handler novo deve escolher os limites de intervalo adequadamente (ex.: referência = dia anterior ao primeiro dia do mês) OU o Arquiteto avalia um método de conveniência. **Não** alterar a semântica existente usada pela projeção.
- `MzFinance.Infra/Builders/CreditCardBillingCalculator.cs` — `GenerateInstallments(purchase, closingDay)` para saber em qual ciclo (ano/mês) cada parcela cai.
- `MzFinance.Infra/Builders/PriceAmortizationCalculator.cs` — `CalculateInstallmentAmount(...)` para o valor da parcela de financiamento.
- `Queries/CreditCards/GetCreditCardBill/GetCreditCardBillQueryHandler.cs` — referência de como somar itens de um ciclo de fatura (não necessariamente chamado diretamente; a lógica de "fatura fechada do mês" reusa o mesmo `CreditCardBillingCalculator`).
- `Queries/Balance/GetProjectedBalance/GetProjectedBalanceQueryHandler.cs` — referência do padrão de projeção (leitura via `MzFinanceReadOnlyContext`, `ICurrentUserService`); a query do "mês que vem" segue o mesmo padrão, escopada ao mês seguinte.
- `MzFinance.Infra/Contexts/MzFinanceReadOnlyContext` — contexto de leitura para todas as novas queries.

### 3.4. Fluxo de Dados

**Gasto mensal (card de um mês):**
```
1. Frontend solicita o gasto de um mês (ano+mês) — ou os três cards de uma vez.
2. Handler resolve o userId (ICurrentUserService) e o intervalo do mês.
3. Handler soma DESPESAS de Transaction cuja data cai no mês (Income é ignorado).
4. Handler soma as parcelas de CreditCardPurchase cujo ciclo de fatura (CreditCardBillingCalculator) cai no mês.
5. Handler soma as ocorrências de RecurringCommitment do tipo Expense cuja data cai no mês (RecurringCommitmentProjector).
6. Handler soma as parcelas de Financing do mês (PriceAmortizationCalculator + regra de data de parcela).
7. Para o mês que vem: passos 4-6 são projeção pura (não há Transaction real esperada); passo 3 normalmente é zero/irrelevante.
8. Retorna o total consolidado + o detalhamento por fonte (Transaction, Cartão, Recorrente, Financiamento).
```

**Gasto por categoria (mês):**
```
1. Frontend solicita gasto por categoria de um mês.
2. Handler agrupa por categoria as despesas de Transaction do mês.
3. Handler agrega compras de cartão do ciclo do mês por CreditCardPurchase.Category (nulo/vazio => "Sem categoria").
4. Handler agrega recorrentes-despesa do mês por RecurringCommitment.Category.
5. Handler agrega TODAS as parcelas de financiamento do mês sob a categoria fixa "Financiamento".
6. Retorna lista [categoria, total], cuja soma == gasto total do mês (RN10).
```

**Compras consolidadas:**
```
1. Frontend solicita a visão de compras parceladas.
2. Handler carrega CreditCardPurchase (via CreditCards.Purchases) e Financing do usuário.
3. Para cada item calcula: valor total, valor da parcela, nº total de parcelas, nº de parcelas restantes (relativo a hoje) e data de término estimada.
4. Por padrão filtra itens já quitados (parcelas restantes = 0), com opção de exibir todos.
5. Retorna a lista consolidada read-only.
```

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos

**CreditCardPurchase** (alteração):
- Novo campo `Category`: `string?` (opcional/nullable). Sem tamanho fixo obrigatório; recomendável limite de comprimento coerente com os demais campos de categoria (ex.: mesmo limite usado em `Transaction.Category` / `RecurringCommitment.Category`).
- Deve ser aceito no construtor e no fluxo de atualização (se existir Update para a compra).

Nenhuma outra entidade é alterada. `Financing` **não** ganha campo de categoria — usa a categoria fixa "Financiamento" apenas na camada de relatório.

### 4.2. Comandos / Queries / DTOs

**Commands alterados:**
- Comando de criação de compra de cartão e (se existir) de edição: incluir `category` (opcional) na entrada e no DTO de resposta.

**Queries novas (todas leitura, retornam via `DataActionResult<T>`):**
- `GetMonthlySpendingQuery`: entrada `year:int`, `month:int` (ou um enum de período relativo). Saída `MonthlySpendingResponse` com `totalExpense`, e detalhamento `{ transactionsTotal, creditCardTotal, recurringTotal, financingTotal }`, além de metadado indicando se é `realizado` ou `projetado`.
- (Opcional) `GetDashboardSummaryQuery`: sem parâmetros; saída com os três `MonthlySpendingResponse` (mês passado, atual, próximo).
- `GetSpendingByCategoryQuery`: entrada `year:int`, `month:int`. Saída `SpendingByCategoryResponse` = lista de `{ category:string, total:decimal }` + `grandTotal`.
- `GetInstallmentOverviewQuery`: entrada opcional `includeSettled:bool` (default false). Saída lista de `InstallmentOverviewItemResponse` = `{ source: "CreditCard"|"Financing", description, totalAmount, installmentAmount, installmentsCount, remainingInstallments, endDate }`.

### 4.3. Handlers / Services

- **GetMonthlySpendingQueryHandler**: resolve `userId` e intervalo do mês; soma despesas de `Transaction` do mês; usa `CreditCardBillingCalculator.GenerateInstallments` filtrando ciclo == mês; usa `RecurringCommitmentProjector` (tipo Expense) filtrando ocorrências no mês; usa `PriceAmortizationCalculator` + regra de data de parcela para financiamentos do mês. Distingue "realizado" (mês passado/atual) de "projetado" (mês futuro) apenas para rotulagem — o cálculo em si é o mesmo motor. Segue o padrão de `GetProjectedBalanceQueryHandler` (contexto read-only + current user).
- **GetSpendingByCategoryQueryHandler**: mesma coleta do handler acima, porém agregando por categoria; aplica "Sem categoria" para cartão sem categoria e "Financiamento" para todos os financiamentos.
- **GetInstallmentOverviewQueryHandler**: carrega compras de cartão e financiamentos do usuário; calcula parcelas restantes e data de término com base em hoje; filtra quitados conforme `includeSettled`.
- Considerar extrair a lógica de "pertence a este mês" (hoje inline como `IsWithinFutureCycle`) para um helper reutilizável — decisão de design do Arquiteto (ver Nota de Handoff).

### 4.4. Persistência

- Todas as leituras via `MzFinanceReadOnlyContext`, filtrando sempre por `UserId` (`ICurrentUserService.UserId`), consistente com os handlers existentes.
- Cartões devem ser carregados com `Include(x => x.Purchases)` para os cálculos de ciclo (mesmo padrão de `GetProjectedBalanceQueryHandler` / `GetCreditCardBillQueryHandler`).
- Migration EF Core Code-First adicionando a coluna `Category` (nullable) em `CreditCardPurchase` (ver seção 8).

### 4.5. Validações

- `GetMonthlySpendingQuery` / `GetSpendingByCategoryQuery`: `month` entre 1 e 12; `year` num intervalo plausível (ex.: > 2000). Reusar padrão de validator (FluentValidation) já adotado nas outras queries.
- `category` em compra de cartão: opcional; se informado, aplicar trim e limite de comprimento coerente com os demais campos de categoria; string vazia é normalizada para nulo.
- `GetInstallmentOverviewQuery.includeSettled`: opcional, default `false`.

### 4.6. Autorização

- Projeto de usuário único com JWT self-issued (ver `mz-finance-context.md#arquitetura`). Todos os novos endpoints exigem autenticação (mesmo esquema dos endpoints existentes). Não há múltiplos perfis/roles. Todos os dados sempre escopados ao `UserId` do token.

---

## 5. REGRAS DE NEGÓCIO

- **RN01** — "Gasto" considera apenas compromissos de **despesa**. Receitas (`TransactionType.Income`, recorrentes de receita) nunca entram nos cards de gasto nem no gasto por categoria.
- **RN02** — O gasto de um mês é composto por: (a) despesas de `Transaction` com `date` no mês; (b) parcelas de compras de cartão cujo **ciclo de fatura** (via `CreditCardBillingCalculator`, baseado no `closingDay`) cai no mês; (c) ocorrências de `RecurringCommitment` do tipo despesa com data no mês; (d) parcelas de `Financing` do mês (via `PriceAmortizationCalculator` para o valor + regra de data da parcela).
- **RN03** — Mês passado e mês atual são apresentados como **"realizado"**; mês seguinte é **"projeção"**. A composição de cálculo é a mesma; a diferença é apenas de rotulagem e do fato de que no mês futuro não se espera `Transaction` real.
- **RN04** — Este PRD **não** introduz status de pagamento (pago/a pagar/atrasado). Fatura fechada, parcela e recorrente do mês são tratados como fatos do período independentemente de terem virado `Transaction`. O refinamento de "efetivamente pago" fica para o PRD_003 (seção 15).
- **RN05** — Para evitar dupla contagem: uma parcela/recorrente/fatura do mês é contada **ou** pelo seu cálculo (calculator) **ou** por uma `Transaction` materializada de origem correspondente (`TransactionSourceType.GeneratedFrom*`), nunca pelos dois. Como no MVP atual não há materialização automática dessas ocorrências, na prática soma-se calculator + `Transaction` com `SourceType = Manual`. O Arquiteto deve confirmar essa premissa e tratar o caso de `Transaction` gerada a partir de origem para não duplicar (ver Nota de Handoff).
- **RN06** — No relatório por categoria: compra de cartão sem categoria (nula/vazia) é agrupada como **"Sem categoria"**.
- **RN07** — No relatório por categoria: **todo** `Financing` entra sob a categoria fixa/implícita **"Financiamento"** (sem campo no banco).
- **RN08** — Uma ocorrência de `RecurringCommitment` pertence a um mês se sua data calculada cai dentro do intervalo do mês, respeitando `StartDate`/`EndDate`/`frequency`. Observação de implementação: `RecurringCommitmentProjector.GenerateFutureOccurrences` hoje é estritamente futuro (exclui a `referenceDate`); o handler deve escolher os limites do intervalo de forma a incluir corretamente as ocorrências do mês-alvo, sem alterar a semântica usada pela projeção de saldo.
- **RN09** — Uma parcela de `Financing` pertence a um mês se `StartDate.AddMonths(i)` (para `i` de 0 a `installmentsCount-1`) cai no mês. O valor de cada parcela é fixo (Tabela Price) via `PriceAmortizationCalculator`.
- **RN10** — A soma do gasto por categoria de um mês deve ser **igual** ao gasto total daquele mês exibido no card correspondente (consistência entre as duas visões).
- **RN11** — "Parcelas restantes" e "data de término" na visão consolidada são calculadas em relação à **data de hoje**. Item com zero parcelas restantes é considerado quitado e ocultado por padrão.
- **RN12** — Todos os dados são sempre escopados ao usuário autenticado (`UserId`).
- **RN13** — Nenhuma funcionalidade de CRUD do PRD_000001 é removida; a mudança de navegação é puramente organizacional.

---

## 6. REQUISITOS FUNCIONAIS

- **RF01** — Exibir Dashboard como rota inicial pós-login com três cards de gasto (mês passado, atual, próximo).
- **RF02** — Cada card de gasto exibe o total e, opcionalmente, o detalhamento por fonte (transações, cartão, recorrentes, financiamento).
- **RF03** — Exibir relatório de gasto por categoria para o mês selecionado (por padrão o mês atual), com total por categoria e total geral.
- **RF04** — Exibir listagem consolidada read-only de compras parceladas (cartão + financiamento) com valor total, parcela, parcelas restantes e data de término; filtro para incluir/ocultar quitados.
- **RF05** — Permitir informar categoria (opcional) ao criar/editar compra de cartão.
- **RF06** — Reorganizar navegação: item "Dashboard" + seção "Gerenciamento" (Transações, Recorrentes, Cartões, Financiamentos); manter Projeção acessível.
- **RF07** — Manter todos os CRUDs e a projeção do PRD_000001 funcionando.

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01** — Reaproveitar os calculators de domínio existentes; não duplicar regra de cálculo de parcelas/recorrências/faturas.
- **RNF02** — Dados financeiros são sensíveis: nunca logar valores/categorias em texto puro (ver `mz-finance-context.md#restricoes-nao-funcionais`).
- **RNF03** — Todas as leituras via contexto read-only, escopadas por usuário; consistência com o padrão CQRS já estabelecido.
- **RNF04** — Frontend sem Tailwind (CSS Modules como placeholder), consistente com a restrição do projeto.
- **RNF05** — Performance adequada ao volume de uso pessoal (poucos registros); cálculos em memória são aceitáveis, como já feito na projeção.

---

## 8. SCHEMA / MIGRATIONS

**Migration necessária?** ☑ Sim ☐ Não

**Se SIM:**
Adicionar a coluna `Category` (texto, **nullable**) à tabela de `CreditCardPurchase`. Nenhuma outra alteração de schema. Nenhuma nova tabela (Dashboard/relatórios são 100% calculados sobre os dados existentes).

**Impacto em dados existentes?** Não destrutivo. Compras já cadastradas ficam com `Category` nulo e continuam válidas (tratadas como "Sem categoria" nos relatórios).

**Reversível?** Sim (drop da coluna). A migration EF Core Code-First gera up/down.

Comando de referência (ver `mz-finance-context.md#comandos`):
`dotnet ef migrations add AddCategoryToCreditCardPurchase -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi`

---

## 9. INTEGRAÇÕES

### 9.1. Sistemas Externos Afetados
Nenhum. O projeto não possui integrações externas (ver `mz-finance-context.md#integracoes-e-dependencias-externas`).

### 9.2. Alterações em Contratos
- Novos endpoints de leitura (dashboard/relatórios) — **aditivos**, não quebram nada.
- Endpoint de compra de cartão passa a aceitar/retornar `category` opcional — **aditivo**, retrocompatível.
- Frontend: rota `/` muda de significado (agora Dashboard). Como é uma SPA de usuário único, não há contrato externo dependente das rotas.

**Breaking change?** Não (do ponto de vista de API/contrato). A mudança de rota raiz é uma alteração de UX interna, não de contrato.

---

## 10. TRATAMENTO DE ERROS

### CE01 — Mês sem dados
- **Situação**: o mês consultado não tem nenhuma despesa em nenhuma fonte.
- **Tratamento**: retornar total zero e listas vazias (não é erro).
- **Mensagem**: UI exibe estado vazio ("Sem gastos neste período").

### CE02 — Parâmetro de período inválido
- **Situação**: `month` fora de 1-12 ou `year` implausível.
- **Tratamento**: validação falha via Notification Pattern; resposta com erro de validação.
- **Mensagem**: "Período inválido."

### CE03 — Usuário não autenticado
- **Situação**: requisição sem/ com JWT inválido.
- **Tratamento**: 401 pelo middleware de autenticação existente.
- **Mensagem**: padrão do backend.

### CE04 — Compra de cartão com categoria acima do limite
- **Situação**: `category` excede o comprimento permitido.
- **Tratamento**: validação do command falha (Notification Pattern).
- **Mensagem**: "Categoria excede o tamanho máximo permitido."

---

## 11. CASOS DE USO

### UC01: Acompanhar o gasto mensal no Dashboard

**Ator:** Usuário autenticado (dono do app)

**Pré-condições:**
- Usuário logado.
- Existem compromissos financeiros cadastrados.

**Fluxo Principal:**
1. Usuário faz login e é direcionado ao Dashboard (`/`).
2. Sistema calcula e exibe os cards de gasto do mês passado (realizado), mês atual (realizado) e mês que vem (projeção).
3. Sistema exibe o gasto por categoria do mês atual.
4. Sistema exibe a visão consolidada de compras parceladas em andamento.
5. Usuário lê as informações e, se quiser cadastrar/editar algo, navega até a seção "Gerenciamento".

**Fluxos Alternativos:**
- **FA01 — Mês sem dados:** cards e listas exibem estado vazio (CE01).
- **FA02 — Usuário troca o mês do relatório de categoria:** sistema recalcula o agrupamento para o mês selecionado.

### UC02: Categorizar uma compra de cartão

**Ator:** Usuário autenticado

**Pré-condições:** Existe ao menos um cartão cadastrado.

**Fluxo Principal:**
1. Usuário abre a tela de compras do cartão (em "Gerenciamento").
2. Cria/edita uma compra e informa a categoria (opcional).
3. Sistema persiste a compra com a categoria.
4. No próximo carregamento do relatório por categoria, o valor da compra aparece sob a categoria informada.

**Fluxos Alternativos:**
- **FA01 — Sem categoria informada:** a compra é contabilizada sob "Sem categoria".

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: Gasto do mês atual combina todas as fontes (Happy Path)
**Dado** uma despesa avulsa de 100 no mês atual, uma compra de cartão de 300 em 3x cujo ciclo cai no mês atual (parcela 100), uma recorrente-despesa mensal de 50 com ocorrência no mês, e um financiamento com parcela 200 no mês
**Quando** o Dashboard é carregado
**Então** o card "Mês atual" exibe gasto total de 450 (100 + 100 + 50 + 200)
**E** o detalhamento por fonte reflete cada parcela corretamente.

### Cenário 2: Receitas não entram no gasto
**Dado** uma recorrente de receita (salário 5000) e uma despesa avulsa de 100 no mês
**Quando** o Dashboard é carregado
**Então** o gasto do mês é 100 (a receita é ignorada).

### Cenário 3: Projeção do mês que vem sem Transaction real
**Dado** que no próximo mês há parcela de cartão 100, recorrente-despesa 50 e parcela de financiamento 200, e nenhuma `Transaction` no futuro
**Quando** o card "Mês que vem" é calculado
**Então** o gasto projetado é 350
**E** é rotulado como projeção.

### Cenário 4: Gasto por categoria soma igual ao total do mês
**Dado** os dados do Cenário 1 com categorias distintas (avulsa "Mercado", cartão "Eletrônicos", recorrente "Streaming", financiamento => "Financiamento")
**Quando** o relatório por categoria do mês atual é gerado
**Então** as categorias somam 450 (igual ao card)
**E** cada categoria mostra seu subtotal correto.

### Cenário 5: Compra de cartão sem categoria vai para "Sem categoria"
**Dado** uma compra de cartão sem categoria no mês
**Quando** o relatório por categoria é gerado
**Então** o valor aparece sob "Sem categoria".

### Cenário 6: Visão consolidada mostra parcelas restantes e término
**Dado** uma compra em 10x iniciada há 3 ciclos e um financiamento de 24 parcelas iniciado há 6 meses
**Quando** a visão consolidada é carregada
**Então** a compra mostra 7 parcelas restantes com data de término estimada, e o financiamento mostra 18 restantes com sua data de término
**E** itens já quitados não aparecem por padrão.

### Cenário 7: Migration retrocompatível
**Dado** compras de cartão criadas antes da migration
**Quando** a migration de `Category` é aplicada
**Então** essas compras têm `Category` nulo e continuam funcionando, aparecendo como "Sem categoria" nos relatórios.

### Cenário 8: Dashboard é a rota raiz
**Dado** um usuário autenticado
**Quando** ele acessa `/`
**Então** vê o Dashboard (não mais o extrato de transações)
**E** consegue chegar ao extrato pela seção "Gerenciamento".

### Cenário 9: Período inválido
**Dado** uma requisição de gasto por categoria com `month = 13`
**Quando** a query é processada
**Então** retorna erro de validação (CE02).

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Código implementado seguindo Clean Architecture + CQRS (ver `mz-finance-context.md#arquitetura` e boilerplate `dotnet-api`)
- [ ] Novas queries retornam via `DataActionResult<T>` e usam `MzFinanceReadOnlyContext`
- [ ] Testes unitários (xUnit + NSubstitute + EF InMemory) cobrindo os handlers de gasto mensal, por categoria e visão consolidada, incluindo consistência RN10 e não-duplicação RN05
- [ ] Migration `AddCategoryToCreditCardPurchase` criada e testada (reversível)
- [ ] Campo `category` disponível no fluxo de compra de cartão (backend + frontend)
- [ ] Dashboard como rota raiz e navegação reorganizada em "Gerenciamento"
- [ ] Todos os CRUDs e a projeção do PRD_000001 continuam funcionando
- [ ] Autenticação exigida em todos os novos endpoints; dados escopados por usuário
- [ ] Dados sensíveis não logados
- [ ] Build passando (`dotnet build` + `npm run build`)
- [ ] PRD atendido 100%

---

## 14. REFERÊNCIAS

- Contexto de negócio/arquitetura: `MAPS/mz-finance/mz-finance-context.md`
- Map do projeto: `MAPS/mz-finance/mz-finance-map.json`
- PRD anterior: `MAPS/mz-finance/prd/mz-finance-prd-000001-mvp.md`
- Plano do MVP: `MAPS/mz-finance/plan/mz-finance-plan-000001-mvp.md`
- Código-fonte de referência:
  - `backend/.../Queries/Balance/GetProjectedBalance/GetProjectedBalanceQueryHandler.cs`
  - `backend/.../Queries/CreditCards/GetCreditCardBill/GetCreditCardBillQueryHandler.cs`
  - `backend/.../Infra/Builders/{CreditCardBillingCalculator,RecurringCommitmentProjector,PriceAmortizationCalculator}.cs`
  - `frontend/src/app/{App.tsx,AppLayout.tsx}`
- Boilerplate backend: `BOILERPLATES/BACK/dotnet-api/README.md`

---

## 15. OBSERVAÇÕES

Este PRD é a **Fase 1** de um faseamento em dois PRDs, decidido para isolar o risco:

- **PRD_002 (este):** dashboard analítico + gasto por categoria + compras consolidadas + reorganização de navegação. Baixo risco, migration mínima (apenas `Category` nullable em `CreditCardPurchase`). Tudo reaproveita calculators existentes.
- **PRD_003 (próximo, fora de escopo agora):** **Status de pagamento (pago / a pagar / atrasado)** por compromisso/parcela.

**Decisão já tomada e registrada para o PRD_003 (Q1):** a ação de "pagar" deve **materializar uma `Transaction`** vinculada à origem/parcela, reaproveitando o `TransactionSourceType` já existente no schema (`Manual / GeneratedFromRecurring / GeneratedFromFinancing / GeneratedFromCard`). Consequências a tratar quando o PRD_003 for escrito:
- Ao materializar ocorrências pagas em `Transaction`, o cálculo de gasto do PRD_002 precisará **desduplicar** (RN05): uma ocorrência paga passa a existir como `Transaction` (`GeneratedFrom*`) e não deve ser contada também pelo calculator. Este PRD já assume essa regra (RN05) para que a migração ao PRD_003 seja suave.
- "Atrasado" deriva de comparar a data de vencimento da ocorrência com hoje e a ausência de `Transaction` de pagamento correspondente.

**Suposição adotada (Q2, não respondida explicitamente pelo humano):** "gasto mensal" de mês passado/atual = **realizado**, combinando o que já é `Transaction` real com o que é calculável do mês (fatura fechada de cartão via `CreditCardBillingCalculator`, ocorrência de recorrente via `RecurringCommitmentProjector`, parcela de financiamento via `PriceAmortizationCalculator`); mês que vem = **projeção** pura pelos mesmos calculators. Não exige status de pagamento (isso é o PRD_003). Esta suposição está refletida em RN02/RN03/RN04 e deve ser confirmada pelo Arquiteto/dev antes da implementação.

**Riscos Identificados:**
- ⚠️ **Dupla contagem** (RN05): risco central. Se no futuro (ou já hoje, via importação manual) existir uma `Transaction` com `SourceType = GeneratedFrom*` representando uma ocorrência que o calculator também gera, haverá contagem dobrada. Mitigação: definir claramente a regra de desduplicação no handler já neste PRD.
- ⚠️ **Semântica do `RecurringCommitmentProjector`** (RN08): o método atual é estritamente futuro e exclui a `referenceDate`; usá-lo para "ocorrências do mês" exige cuidado com os limites do intervalo. Não alterar a semântica usada pela projeção de saldo existente.
- ⚠️ **Consistência entre visões** (RN10): card de total e soma por categoria precisam bater; risco de divergência por arredondamento (os calculators já usam `MidpointRounding.AwayFromZero`, manter coerência).
- ⚠️ **Mudança de rota raiz**: garantir que redirects, `PrivateRoute` e o fallback `*` continuem corretos após mover o extrato de `/`.

**Dependências:**
- 🔗 PRD_000001 (MVP) — reutiliza entidades, calculators e handlers já entregues.
- 🔗 PRD_003 (futuro) — depende conceitualmente das regras de desduplicação estabelecidas aqui.

---

## 16. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-07-02 | 1 | Product Manager (IA) | Versão inicial |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
