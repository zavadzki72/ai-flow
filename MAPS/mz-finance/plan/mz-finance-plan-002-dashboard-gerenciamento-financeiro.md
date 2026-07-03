# Plano de Execução: Dashboard de Gasto Mensal, Gasto por Categoria, Compras Consolidadas e Reorganização de Navegação

## Informações
- **PRD Relacionado**: prd/mz-finance-prd-002-tbd-dashboard-gerenciamento-financeiro.md
- **Repositório(s)**: backend (`C:/Projects/Personal/mz-finance/backend`), frontend (`C:/Projects/Personal/mz-finance/frontend`)
- **Domínio(s)**: Transações, Recorrentes, Cartão de Crédito, Financiamento, Projeção/Relatórios (leitura)
- **Branch Base**: main
- **Complexidade**: 🟡 Média
- **Criado em**: 2026-07-02
- **Última atualização**: 2026-07-02

---

## PROGRESSO GERAL

**Status**: 🟢 Concluído
**Progresso**: 13/13 etapas concluídas (100%)

```
[🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢] 100%
```

> Este progresso será atualizado automaticamente pelo skill `/implementar`.

---

## VISÃO GERAL

O PRD_002 transforma o mz-finance de app de cadastro em app de acompanhamento. Todas as novas funcionalidades de backend são **Queries de leitura** que reaproveitam os calculators de domínio já existentes (`RecurringCommitmentProjector`, `CreditCardBillingCalculator`, `PriceAmortizationCalculator`), mais uma alteração mínima de escrita: o novo campo opcional `Category` em `CreditCardPurchase`.

O motor de cálculo de "gasto de um mês" (Transaction de despesa + fatura de cartão do ciclo + ocorrências de recorrentes-despesa do mês + parcela de financiamento do mês) é **idêntico** para mês passado, atual e futuro — a diferença é apenas de rotulagem (`realizado` vs `projetado`). Para garantir consistência entre o card de total e o relatório por categoria (RN10), o mesmo motor produz simultaneamente os totais por fonte e a quebra por categoria.

Camadas afetadas:
- **Domain**: `CreditCardPurchase` ganha `Category`.
- **Infra**: novo map/migration da coluna; dois novos helpers puros em `Builders/` (resolução de mês + agregador de gasto mensal).
- **Application**: alteração do command de compra; três novas Queries de dashboard + DTOs.
- **WebApi**: novo `DashboardController`; `CreditCardsController` já trafega o command alterado (nenhuma mudança de assinatura necessária).
- **Frontend**: nova feature `dashboard/`; campo categoria no form de compra; reorganização de rotas/navegação.

---

## OBJETIVOS

- [x] Persistir categoria opcional em compra de cartão (retrocompatível, nullable).
- [x] Expor três cards de gasto (mês passado/atual = realizado; próximo = projeção) via query única agregadora.
- [x] Expor relatório de gasto por categoria de um mês, cuja soma bate com o card (RN10).
- [x] Expor visão consolidada read-only de compras parceladas (cartão + financiamento) com parcelas restantes e data de término.
- [x] Deixar o Dashboard como rota raiz e reorganizar a navegação em "Gerenciamento" sem remover nenhum CRUD.
- [x] Não alterar o comportamento da projeção de saldo existente (PRD_000001).

---

## MAPA DE COMPONENTES IDENTIFICADOS

### Domínio
- `backend/src/MzFinance.Domain/Models/CreditCardPurchase.cs` (alterado — nova prop `Category`)

### Persistência (Infra)
- `backend/src/MzFinance.Infra/Maps/CreditCardPurchaseMap.cs` (alterado — coluna `Category`, maxlength 100)
- `backend/src/MzFinance.Infra/Migrations/*_AddCategoryToCreditCardPurchase.cs` (novo — gerado por EF)
- `backend/src/MzFinance.Infra/Builders/MonthlyPeriodResolver.cs` (novo — helper de mês)
- `backend/src/MzFinance.Infra/Builders/MonthlySpendingCalculator.cs` (novo — agregador em memória)

### Aplicação
- `backend/src/MzFinance.Application/Commands/CreditCards/CreateCreditCardPurchase/CreateCreditCardPurchaseCommand.cs` (alterado)
- `.../CreateCreditCardPurchase/CreateCreditCardPurchaseCommandValidator.cs` (alterado)
- `.../CreateCreditCardPurchase/CreateCreditCardPurchaseCommandHandler.cs` (alterado)
- `backend/src/MzFinance.Application/Dtos/Dashboard/*.cs` (novos)
- `backend/src/MzFinance.Application/Queries/Dashboard/GetDashboardSummary/` (novo)
- `backend/src/MzFinance.Application/Queries/Dashboard/GetSpendingByCategory/` (novo)
- `backend/src/MzFinance.Application/Queries/Dashboard/GetInstallmentOverview/` (novo)

### API
- `backend/src/MzFinance.WebApi/Controllers/DashboardController.cs` (novo)

### Frontend
- `frontend/src/features/dashboard/api.ts` (novo)
- `frontend/src/features/dashboard/DashboardPage.tsx` + `.module.css` (novos)
- `frontend/src/features/dashboard/components/*` (novos — cards, categoria, parcelas)
- `frontend/src/features/credit-cards/api.ts` + `CreditCardsPage.tsx` (alterados — campo categoria)
- `frontend/src/app/App.tsx` (alterado — rotas)
- `frontend/src/app/AppLayout.tsx` + `.module.css` (alterados — navegação "Gerenciamento")

### Testes
- `backend/src/MzFinance.UnitTests/Infra/Builders/MonthlyPeriodResolverTests.cs` (novo)
- `backend/src/MzFinance.UnitTests/Infra/Builders/MonthlySpendingCalculatorTests.cs` (novo)
- `backend/src/MzFinance.UnitTests/Application/Commands/CreditCards/CreateCreditCardPurchase*Tests.cs` (novo/alterado)
- `backend/src/MzFinance.UnitTests/Application/Queries/Dashboard/*Tests.cs` (novos)
- `backend/src/MzFinance.UnitTests/Domain/Entities/CreditCardPurchaseTests.cs` (novo/alterado, se existir)

---

## ESTRATÉGIA DE TESTES

- **Backend:** xUnit + NSubstitute + EF InMemory. Convenção `[Method]_[Scenario]_Should[Expected]`, padrão AAA com comentários `//ARRANGE //ACTION //ASSERT` (ver `GetProjectedBalanceQueryHandlerTests`). Contextos via `MzFinanceDbContextFactory.CreateReadWriteContexts()`. `ICurrentUserService` via `Substitute.For<>`.
- **Frontend:** nenhum framework de teste decidido no projeto; validação via `npm run build` (tsc) + verificação manual dos critérios.

Cenários (do PRD, seção 12):
- [x] Cenário 1 — gasto do mês combina todas as fontes (100+100+50+200=450)
- [x] Cenário 2 — receitas (Income) não entram no gasto
- [x] Cenário 3 — projeção do próximo mês sem Transaction real (350), rotulada como projeção
- [x] Cenário 4 — soma por categoria == total do mês (RN10)
- [x] Cenário 5 — compra de cartão sem categoria → "Sem categoria"
- [x] Cenário 6 — visão consolidada: parcelas restantes e término; quitados ocultos por padrão
- [x] Cenário 7 — migration retrocompatível (Category nulo válido)
- [x] Cenário 8 — Dashboard é a rota raiz
- [x] Cenário 9 — período inválido (month=13) → erro de validação
- [x] RN05 — Transaction com `SourceType != Manual` NÃO é contada (não duplica com calculator)

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Domínio — adicionar `Category` em `CreditCardPurchase`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 1f44db2

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Adicionada `public string? Category { get; init; }` em `CreditCardPurchase`, seguindo o padrão `init` já usado nas demais propriedades da entidade.
- Adicionado `string? category = null` como último parâmetro do construtor público (default preserva os 8 call-sites existentes em testes e no handler — nenhum precisou de alteração).
- Não foi criado método `Update` (compra não tem edição no projeto — confirmado no PLAN).
- Testes adicionados na classe `CreditCardPurchaseTests` já existente em `backend/src/MzFinance.UnitTests/Domain/Entities/CreditCardTests.cs` (não havia um arquivo `CreditCardPurchaseTests.cs` separado; a classe já vivia dentro de `CreditCardTests.cs`, então segui a organização real do código em vez de criar um novo arquivo).
- Testes criados: `Create_WithCategoryInformed_ShouldSetCategory`, `Create_WithoutCategory_ShouldKeepCategoryNull`.
- Build: sucesso (apenas warning NU1903 pré-existente, não relacionado). Testes: 65/65 passando (63 pré-existentes + 2 novos).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Permitir categorizar uma compra de cartão, base para o relatório por categoria (RN06).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Domain/Models/CreditCardPurchase.cs` (alterado)
- `backend/src/MzFinance.UnitTests/Domain/Entities/CreditCardPurchaseTests.cs` (novo, se não existir)

**O que implementar:**
- Adicionar propriedade `public string? Category { get; init; }`.
- Adicionar o parâmetro `string? category = null` como **último** parâmetro do construtor público (valor default para não quebrar os call-sites existentes em testes e no handler), atribuindo `Category = category`.
- Manter o padrão atual (propriedades `init`; não há `Update` para compra — não criar um).

**Testes Necessários:**
- [ ] Construtor com categoria informada persiste `Category`.
- [ ] Construtor sem categoria mantém `Category` nulo.

**Critérios de Aceitação:**
- [ ] Call-sites existentes continuam compilando (default preserva compatibilidade).
- [ ] Build sem erros; testes passando.

**Dependências:** Nenhuma

**Comandos Úteis:** `dotnet build backend/MzFinance.slnx`

---

### ETAPA 2: Persistência — map EF + migration `AddCategoryToCreditCardPurchase`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** d2d9528

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Map: `builder.Property(x => x.Category).HasMaxLength(100)` adicionado em `CreditCardPurchaseMap` (sem `IsRequired`, nullable — alinhado a `Transaction.Category`/`RecurringCommitment.Category`).
- Migration `AddCategoryToCreditCardPurchase` gerada via `dotnet ef migrations add` com `--context MzFinanceContext` (o projeto tem dois `DbContext` — `MzFinanceContext` e `MzFinanceReadOnlyContext` — a ferramenta exige a flag explícita; a migration é criada apenas no context de escrita, como esperado).
- `Up`: `ALTER TABLE "CreditCardPurchases" ADD "Category" character varying(100)` (nullable). `Down`: `DROP COLUMN "Category"`. Diff do `MzFinanceContextModelSnapshot.cs` conferido — só a propriedade `Category` foi adicionada, nenhuma outra coluna/tabela foi tocada.
- Validado contra Postgres local (`mzfinance-postgres`, container já rodando via docker-compose do projeto): `dotnet ef database update` aplicou a coluna; `\d "CreditCardPurchases"` confirmou coluna nullable sem default; rollback para `InitialCreate` executou o `Down` com sucesso (coluna removida, nenhuma outra alteração); migration reaplicada em seguida para deixar o banco local no estado final esperado (Cenário 7 — retrocompatibilidade validada na prática, não só por leitura de código).
- Build: sucesso (apenas warning NU1903 pré-existente). Testes: 65/65 passando (sem testes novos nesta etapa — item "Testes Necessários" do PLAN é verificação de diff, feita manualmente acima).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Criar a coluna `Category` (nullable) sem impacto em dados existentes (RN retrocompat / Cenário 7).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/Maps/CreditCardPurchaseMap.cs` (alterado)
- `backend/src/MzFinance.Infra/Migrations/*_AddCategoryToCreditCardPurchase.cs` (novo, gerado)

**O que implementar:**
- No map: `builder.Property(x => x.Category).HasMaxLength(100);` (nullable — sem `IsRequired`). Comprimento 100 alinhado a `Transaction.Category` e `RecurringCommitment.Category`.
- Gerar a migration Code-First. Conferir que o `Up` adiciona coluna nullable e o `Down` faz o drop (reversível, não destrutivo).

**Testes Necessários:**
- [ ] Verificação de que a migration gerada não altera outras colunas (revisar diff do arquivo).

**Critérios de Aceitação:**
- [ ] Migration criada, `Up`/`Down` corretos, coluna nullable.
- [ ] `dotnet build` OK; snapshot atualizado.

**Dependências:** ETAPA 1

**Comandos Úteis:**
`dotnet ef migrations add AddCategoryToCreditCardPurchase -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi`

---

### ETAPA 3: Aplicação — command de compra aceita `category`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 9bbcd66

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `CreateCreditCardPurchaseCommand` ganhou `public string? Category { get; init; }`.
- Validator: `RuleFor(x => x.Category).MaximumLength(100)` (nova regra, sem `NotNull` — segue o padrão de `Description`).
- Handler: normalização feita exatamente como especificado no PLAN — `string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim()` — antes de construir `CreditCardPurchase` (que já aceitava `category` como último parâmetro default desde a ETAPA 1).
- Testes adicionados em `CreateCreditCardPurchaseCommandHandlerTests.cs`: `Handle_WithCategoryInformed_ShouldPersistTrimmedCategory`, `Handle_WithWhitespaceCategory_ShouldPersistNullCategory`.
- Novo arquivo `CreateCreditCardPurchaseCommandValidatorTests.cs` (não existia validator test para este command ainda; segui o padrão de `CreateTransactionCommandValidatorTests.cs`): `Validate_CategoryAboveMaxLength_ShouldHaveValidationError`, `Validate_WithoutCategory_ShouldBeValid`.
- Build: sucesso (apenas warning NU1903 pré-existente, não relacionado). Testes: 69/69 passando (65 pré-existentes + 4 novos).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Propagar categoria (opcional) na criação da compra (RF05 / Critério 7). Não há Update de compra no projeto — escopo é só o Create.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `.../CreateCreditCardPurchase/CreateCreditCardPurchaseCommand.cs` (alterado)
- `.../CreateCreditCardPurchase/CreateCreditCardPurchaseCommandValidator.cs` (alterado)
- `.../CreateCreditCardPurchase/CreateCreditCardPurchaseCommandHandler.cs` (alterado)
- `backend/src/MzFinance.UnitTests/Application/Commands/CreditCards/CreateCreditCardPurchase*Tests.cs`

**O que implementar:**
- Command: adicionar `public string? Category { get; init; }`.
- Validator: `RuleFor(x => x.Category).MaximumLength(100)` (só valida quando informado — FluentValidation ignora null em MaximumLength).
- Handler: normalizar antes de construir — `var category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim();` e passar ao construtor de `CreditCardPurchase`.

**Testes Necessários:**
- [ ] Handler cria compra com categoria informada (persistida com trim).
- [ ] Handler com categoria vazia/whitespace persiste `null` (CE04 inverso).
- [ ] Validator falha com categoria acima de 100 chars (CE04).

**Critérios de Aceitação:**
- [ ] Categoria opcional aceita e normalizada; ausência mantém compras válidas.
- [ ] Build + testes OK.

**Dependências:** ETAPA 1

**Comandos Úteis:** `dotnet test backend/MzFinance.slnx`

---

### ETAPA 4: Infra — helper `MonthlyPeriodResolver`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** bc9255b

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `MonthPeriod` implementado como `record` **aninhado** dentro de `MonthlyPeriodResolver` (`MonthlyPeriodResolver.MonthPeriod`), seguindo o mesmo padrão de `CreditCardBillingCalculator.InstallmentOccurrence` (record aninhado em vez de arquivo próprio).
- `Resolve(year, month)`: `FirstDay = new DateOnly(year, month, 1)`, `LastDay = FirstDay.AddMonths(1).AddDays(-1)` — cobre 28/29/30/31 dias sem lógica condicional (delegado ao próprio `DateOnly`).
- `ContainsCycle`: comparação direta `period.Year == cycleYear && period.Month == cycleMonth`.
- `ForRelativeMonth(today, offset)`: normaliza `today` para o dia 1 antes de aplicar `AddMonths(offset)`, evitando problema de overflow de dia (ex.: dia 31 + offset que caia em mês de 30 dias) e cobrindo virada de ano naturalmente via `DateOnly.AddMonths`.
- `IsProjected(period, today)`: `true` quando `period.FirstDay > mês-corrente.LastDay` (mês estritamente futuro); mês atual e passado retornam `false`.
- Helper 100% puro (sem EF/contexto), como exigido pela ETAPA.
- Não foi tocado `GetProjectedBalanceQueryHandler` nem `IsWithinFutureCycle` (Decisão 2 do PLAN mantida).
- Testes criados em `MonthlyPeriodResolverTests.cs` (17 testes, `[Theory]`/`[Fact]`, padrão AAA com comentários `//ARRANGE //ACTION //ASSERT`, igual a `RecurringCommitmentProjectorTests`/`CreditCardBillingCalculatorTests`): cobrem `Resolve` para janeiro/fevereiro comum/fevereiro bissexto/abril/julho, `ContainsCycle` verdadeiro/falso, `ForRelativeMonth` com offset -1/0/+1 incluindo virada jan→dez do ano anterior e dez→jan do ano seguinte, e `IsProjected` para mês futuro/atual/passado.
- Build: sucesso (apenas warning NU1903 pré-existente, não relacionado). Testes: 86/86 passando (69 pré-existentes + 17 novos).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Centralizar a lógica de "um mês" (ano+mês → intervalo de datas), "ciclo pertence ao mês" e classificação realizado/projetado, reutilizável pelas 3 queries. **Não** toca em `GetProjectedBalanceQueryHandler` (ver Decisão 2).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/Builders/MonthlyPeriodResolver.cs` (novo)
- `backend/src/MzFinance.UnitTests/Infra/Builders/MonthlyPeriodResolverTests.cs` (novo)

**O que implementar:**
- `record MonthPeriod(int Year, int Month, DateOnly FirstDay, DateOnly LastDay)`.
- `MonthPeriod Resolve(int year, int month)` — `FirstDay = new DateOnly(year, month, 1)`, `LastDay = FirstDay.AddMonths(1).AddDays(-1)`.
- `bool ContainsCycle(MonthPeriod period, int cycleYear, int cycleMonth)` — compara ano+mês do ciclo com o mês do período.
- `MonthPeriod ForRelativeMonth(DateOnly today, int offset)` — mês corrente + offset (offset -1 = passado, 0 = atual, +1 = próximo).
- `bool IsProjected(MonthPeriod period, DateOnly today)` — `true` se o mês do período for estritamente futuro (primeiro dia do período > último dia do mês corrente).

**Testes Necessários:**
- [ ] `Resolve` de mês com 28/30/31 dias retorna `LastDay` correto (fevereiro incluso).
- [ ] `ContainsCycle` verdadeiro só quando ano+mês batem.
- [ ] `ForRelativeMonth` com offset -1/0/+1 e virada de ano (jan→dez anterior; dez→jan seguinte).
- [ ] `IsProjected` true para mês futuro, false para atual/passado.

**Critérios de Aceitação:**
- [ ] Helper puro (sem dependências de EF/contexto).
- [ ] Build + testes OK.

**Dependências:** Nenhuma (pode rodar em paralelo às ETAPAS 1-3)

---

### ETAPA 5: Infra — agregador `MonthlySpendingCalculator`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** a1e2b59

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `MonthlySpendingCalculator` implementado como classe estática pura em `Builders/`, sem dependência de EF/contexto, delegando toda a regra de negócio de parcela/recorrência/fatura para os calculators já existentes (`CreditCardBillingCalculator`, `RecurringCommitmentProjector`, `PriceAmortizationCalculator`) e usando `MonthlyPeriodResolver.MonthPeriod`/`ContainsCycle` para os filtros de período (RNF01).
- `MonthlySpendingResult` implementado como `record` aninhado, seguindo o mesmo padrão de `MonthPeriod`/`InstallmentOccurrence` das ETAPAS anteriores. `ByCategory` é `IReadOnlyList<(string Category, decimal Total)>` (tupla nomeada), exatamente como especificado no PLAN — consistente com o uso de tuplas em `CreditCardBillingCalculator.FirstCycle`.
- **Transaction (RN01/RN05):** somadas apenas `Type == Expense && SourceType == Manual` dentro de `[FirstDay, LastDay]`; categoria = `Transaction.Category` (sem normalização — já é obrigatória no domínio).
- **Cartão (RN02b/RN06):** para cada compra de cada cartão, `CreditCardBillingCalculator.GenerateInstallments` filtrado por `ContainsCycle`; categoria normalizada via `NormalizeCategory` (nula/vazia → `"Sem categoria"`). Optei por iterar `purchase` diretamente (em vez de correlacionar por `PurchaseId` depois de gerar todas as ocorrências) — mesmo resultado, menos indireção, já que a compra está disponível no escopo do loop.
- **Recorrentes (RN08):** só `Type == Expense`; ocorrências via `GenerateFutureOccurrences(commitment, period.FirstDay.AddDays(-1), period.LastDay)` (Decisão 3 do PLAN), contadas e multiplicadas pelo valor; categoria = `commitment.Category`.
- **Financiamento (RN07/RN09):** `PriceAmortizationCalculator.CalculateInstallmentAmount` uma vez por financiamento; conta quantos `StartDate.AddMonths(i)` caem em `[FirstDay, LastDay]`; todas as parcelas de todos os financiamentos agregam sob a categoria fixa `"Financiamento"` (não uma categoria por financiamento — confirmado pela redação do PLAN "categoria fixa 'Financiamento' para todos").
- `ByCategory` ordenado por `Total` decrescente (critério de desempate: nome da categoria, ordinal) — não especificado no PLAN, mas necessário para determinismo de testes e faz sentido como exibição futura no relatório (ETAPA 8); nenhuma regra de negócio nova, é só apresentação.
- Arredondamento `Math.Round(..., 2, MidpointRounding.AwayFromZero)` aplicado em cada total por fonte, no total geral e em cada valor de `ByCategory`, coerente com os calculators reutilizados.
- Testes criados em `MonthlySpendingCalculatorTests.cs` (7 testes, AAA com comentários `//ARRANGE //ACTION //ASSERT`): Cenário 1 (4 fontes somam 450 — replicando exatamente os valores do PRD), Cenário 2 (recorrente `Income` ignorada), Cenário 4 (`ByCategory.Sum == Total`), Cenário 5 (compra sem categoria → "Sem categoria"), agregação de múltiplos financiamentos sob "Financiamento", RN05 (`Transaction` com `SourceType = FromCard` não conta) e ocorrências de recorrente exatamente no primeiro/último dia do mês (limites do intervalo, Decisão 3).
- Build: sucesso (apenas warning NU1903 pré-existente, não relacionado). Testes: 93/93 passando (86 pré-existentes + 7 novos).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Motor único, em memória, que dado o conjunto de entidades do usuário + um `MonthPeriod` calcula o gasto do mês por fonte **e** por categoria. Garante RN02/RN10 (mesma engine para card e categoria) e RN05 (desduplicação).

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/Builders/MonthlySpendingCalculator.cs` (novo)
- `backend/src/MzFinance.UnitTests/Infra/Builders/MonthlySpendingCalculatorTests.cs` (novo)

**O que implementar:**
- Método estático `Calculate(IEnumerable<Transaction> transactions, IEnumerable<RecurringCommitment> recurring, IEnumerable<CreditCard> creditCards, IEnumerable<Financing> financings, MonthPeriod period)` retornando um record com: `TransactionsTotal`, `CreditCardTotal`, `RecurringTotal`, `FinancingTotal`, `Total` e `IReadOnlyList<(string Category, decimal Total)> ByCategory`.
- **Transaction (RN01/RN05):** somar apenas `Type == Expense` **e** `SourceType == TransactionSourceType.Manual`, com `Date` dentro de `[FirstDay, LastDay]`. Categoria = `Transaction.Category`. (Filtrar `Manual` evita dupla contagem futura com `GeneratedFrom*` — hoje todas são Manual, portanto sem mudança de comportamento; ver Decisão 1.)
- **Cartão (RN02b):** para cada `CreditCard`, `CreditCardBillingCalculator.GenerateInstallments(purchase, card.ClosingDay)`, filtrar `ContainsCycle(period, ...)`. Somar `InstallmentAmount`. Categoria = `purchase.Category` normalizada; nula/vazia → **"Sem categoria"** (RN06). Precisa correlacionar cada `InstallmentOccurrence.PurchaseId` à compra para obter a categoria.
- **Recorrentes (RN08):** para cada `RecurringCommitment` com `Type == Expense`, chamar `RecurringCommitmentProjector.GenerateFutureOccurrences(commitment, period.FirstDay.AddDays(-1), period.LastDay)` e contar as ocorrências (ver Decisão 3). Somar `occurrences * commitment.Amount`. Categoria = `commitment.Category`.
- **Financiamento (RN07/RN09):** para cada `Financing`, `installment = PriceAmortizationCalculator.CalculateInstallmentAmount(...)`; contar `i` de 0..`InstallmentsCount-1` onde `StartDate.AddMonths(i)` cai em `[FirstDay, LastDay]`; somar `count * installment`. Categoria fixa **"Financiamento"** para todos.
- `ByCategory` = agrupamento consolidado das 4 fontes; a soma de `ByCategory` deve ser exatamente igual a `Total` (RN10). Manter `Math.Round(..., 2, MidpointRounding.AwayFromZero)` coerente com os calculators.

**Testes Necessários:**
- [ ] Cenário 1 — 4 fontes somam 450 (por fonte e total).
- [ ] Cenário 2 — recorrente Income ignorada; só despesa conta.
- [ ] Cenário 4 — `ByCategory.Sum == Total`.
- [ ] Cenário 5 — compra sem categoria vai para "Sem categoria".
- [ ] Financiamento agregado sob "Financiamento".
- [ ] RN05 — Transaction com `SourceType = FromCard` no mês NÃO é somada.
- [ ] Ocorrência de recorrente exatamente no primeiro e no último dia do mês são incluídas (limites do intervalo).

**Critérios de Aceitação:**
- [ ] Motor puro reutilizado por summary e categoria; consistência RN10 provada por teste.
- [ ] Build + testes OK.

**Dependências:** ETAPA 1 (precisa de `CreditCardPurchase.Category`), ETAPA 4

---

### ETAPA 6: Aplicação — DTOs de Dashboard

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** c0e9995

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Quatro records criados em `Dtos/Dashboard/`, seguindo exatamente o padrão de `ProjectedBalanceResponse`/`CreditCardBillResponse`/`FinancingResponse` (propriedades `required { get; init; }`, `string?` para campos opcionais).
- `MonthlySpendingResponse`: `Year`, `Month`, `TotalExpense`, `TransactionsTotal`, `CreditCardTotal`, `RecurringTotal`, `FinancingTotal`, `IsProjected` — nomes alinhados aos campos de `MonthlySpendingCalculator.MonthlySpendingResult` (ETAPA 5), com `TotalExpense` mapeando `Total`.
- `DashboardSummaryResponse`: `PreviousMonth`/`CurrentMonth`/`NextMonth`, cada um `MonthlySpendingResponse`.
- `SpendingByCategoryResponse`: adicionado também `SpendingByCategoryItemResponse` (record com `Category`/`Total`) no mesmo arquivo, seguindo o padrão de `CreditCardBillResponse` (que também define o item-response no mesmo arquivo da response principal); propriedade de lista nomeada `List` (conforme especificado literalmente no PLAN: `List<SpendingByCategoryItemResponse> { Category, Total }`).
- `InstallmentOverviewItemResponse`: `Source` como `string` (não enum — PLAN especifica valores `"CreditCard"`/`"Financing"` como string, e não há enum existente no domínio para essa distinção); `Description` nullable (`string?`), demais campos `required`.
- Sem lógica nova — DTOs puros, sem testes dedicados (conforme o próprio PLAN indica). Build: sucesso (apenas warning NU1903 pré-existente). Testes: 93/93 passando (inalterado — nenhum teste novo nesta etapa).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Contratos de resposta das três queries.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Dtos/Dashboard/MonthlySpendingResponse.cs` (novo)
- `backend/src/MzFinance.Application/Dtos/Dashboard/DashboardSummaryResponse.cs` (novo)
- `backend/src/MzFinance.Application/Dtos/Dashboard/SpendingByCategoryResponse.cs` (novo)
- `backend/src/MzFinance.Application/Dtos/Dashboard/InstallmentOverviewItemResponse.cs` (novo)

**O que implementar:**
- `MonthlySpendingResponse`: `Year`, `Month`, `TotalExpense`, `TransactionsTotal`, `CreditCardTotal`, `RecurringTotal`, `FinancingTotal`, `IsProjected` (bool — realizado vs projeção, RN03).
- `DashboardSummaryResponse`: `PreviousMonth`, `CurrentMonth`, `NextMonth` (cada um `MonthlySpendingResponse`).
- `SpendingByCategoryResponse`: `Year`, `Month`, `List<SpendingByCategoryItemResponse> { Category, Total }`, `GrandTotal`.
- `InstallmentOverviewItemResponse`: `Source` (`"CreditCard"`/`"Financing"`), `Description`, `TotalAmount`, `InstallmentAmount`, `InstallmentsCount`, `RemainingInstallments`, `EndDate` (DateOnly). Response = `List<InstallmentOverviewItemResponse>`.
- Usar `record` com `required`/`init`, seguindo o padrão de `ProjectedBalanceResponse` e `CreditCardBillResponse`.

**Testes Necessários:** — (DTOs sem lógica; cobertos pelos handlers)

**Critérios de Aceitação:**
- [ ] DTOs compilam; nomenclatura consistente com os DTOs existentes.

**Dependências:** Nenhuma (mas necessária para ETAPAS 7-9)

---

### ETAPA 7: Aplicação — `GetDashboardSummaryQuery` + handler

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** acf8133

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `GetDashboardSummaryQuery` sem parâmetros, herdando `RequestBase<DashboardSummaryResponse>`, `IsValid() => true` — mesmo padrão de `GetCreditCardsQuery`/`GetFinancingsQuery` (sem validator, sem entrada).
- Handler segue exatamente a forma de `GetProjectedBalanceQueryHandler`: `MzFinanceReadOnlyContext` + `ICurrentUserService`, carrega `Transactions`, `RecurringCommitments`, `CreditCards.Include(x => x.Purchases)` e `Financings` uma única vez, todos escopados por `UserId`, e reutiliza essas listas em memória para os três meses (evita 3 round-trips ao banco).
- `today = DateOnly.FromDateTime(DateTime.UtcNow)`; os três períodos vêm de `MonthlyPeriodResolver.ForRelativeMonth(today, -1|0|+1)`. Cada período é passado a `MonthlySpendingCalculator.Calculate(...)` (ETAPA 5) e mapeado para `MonthlySpendingResponse` (ETAPA 6), com `IsProjected = MonthlyPeriodResolver.IsProjected(period, today)` (ETAPA 4).
- Extraído método privado estático `BuildMonthlySpending(...)` para não repetir a chamada period→calculate→map três vezes (nenhuma lógica de negócio nova — só composição das ETAPAS 4/5/6).
- Testes criados em `GetDashboardSummaryQueryHandlerTests.cs` (4 testes, AAA com comentários `//ARRANGE //ACTION //ASSERT`, mesmo padrão de `GetProjectedBalanceQueryHandlerTests`, usando `MzFinanceDbContextFactory.CreateReadWriteContexts()`): Cenário 1 (mês atual soma as 4 fontes = 450), Cenário 3 (próximo mês só via calculators, sem `Transaction` real, total 350, `IsProjected == true`), rotulagem `IsProjected == false` para mês passado/atual, e escopo por usuário (transação de outro `UserId` não conta no total do usuário autenticado).
- Build: sucesso (apenas warning NU1903 pré-existente, não relacionado). Testes: 97/97 passando (93 pré-existentes + 4 novos).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Uma chamada retorna os três cards (mês passado/atual/próximo), reduzindo round-trips (Decisão 4).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Queries/Dashboard/GetDashboardSummary/GetDashboardSummaryQuery.cs` (novo)
- `.../GetDashboardSummary/GetDashboardSummaryQueryHandler.cs` (novo)
- `backend/src/MzFinance.UnitTests/Application/Queries/Dashboard/GetDashboardSummaryQueryHandlerTests.cs` (novo)

**O que implementar:**
- Query sem parâmetros herdando `RequestBase<DashboardSummaryResponse>`; `IsValid()` retorna `true` (sem validator — não há entrada). Seguir a forma de `RequestBase<T>`.
- Handler: `MzFinanceReadOnlyContext` + `ICurrentUserService`. Carregar uma vez, escopado por `UserId`: `Transactions`, `RecurringCommitments`, `CreditCards.Include(x => x.Purchases)`, `Financings`.
- `today = DateOnly.FromDateTime(DateTime.UtcNow)`. Resolver os três períodos via `MonthlyPeriodResolver.ForRelativeMonth(today, -1|0|+1)`.
- Para cada período: `MonthlySpendingCalculator.Calculate(...)` → mapear para `MonthlySpendingResponse` com `IsProjected = MonthlyPeriodResolver.IsProjected(period, today)`.
- Seguir o padrão exato de `GetProjectedBalanceQueryHandler` (leitura read-only, sem tracking).

**Testes Necessários:**
- [ ] Cenário 1 no card do mês atual (todas as fontes somam corretamente).
- [ ] Cenário 3 — próximo mês só por calculators, `IsProjected == true`, sem Transaction real.
- [ ] `IsProjected == false` para mês passado e atual.
- [ ] Escopo por usuário (dados de outro `UserId` não entram).

**Critérios de Aceitação:**
- [ ] Três cards corretos numa resposta; rotulagem realizado/projeção correta.
- [ ] Build + testes OK.

**Dependências:** ETAPA 5, ETAPA 6

---

### ETAPA 8: Aplicação — `GetSpendingByCategoryQuery` + validator + handler

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 0268424

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `GetSpendingByCategoryQuery` com `int? Year`/`int? Month` herdando `RequestBase<SpendingByCategoryResponse>`; `IsValid()` delega ao `GetSpendingByCategoryQueryValidator` (mesmo padrão de `GetCreditCardBillQuery`) — `ValidationBehavior` do pipeline MediatR barra requisições inválidas antes do handler.
- Validator: `RuleFor(x => x.Year).NotNull().GreaterThan(2000)` e `RuleFor(x => x.Month).NotNull().InclusiveBetween(1, 12)`, idêntico ao par `ReferenceYear`/`ReferenceMonth` de `GetCreditCardBillQueryValidator` (CE02/Cenário 9).
- Handler segue exatamente a forma da ETAPA 7 (`GetDashboardSummaryQueryHandler`): `MzFinanceReadOnlyContext` + `ICurrentUserService`, carrega `Transactions`, `RecurringCommitments`, `CreditCards.Include(x => x.Purchases)`, `Financings` escopados por `UserId`; resolve o período via `MonthlyPeriodResolver.Resolve(request.Year!.Value, request.Month!.Value)` e chama o **mesmo** `MonthlySpendingCalculator.Calculate(...)` da ETAPA 5/7 — garante RN10 (mesma engine para card e categoria) por construção, sem lógica duplicada.
- `ByCategory` mapeado para `SpendingByCategoryItemResponse` (`Category`, `Total`); `GrandTotal = result.Total`.
- Testes criados em `GetSpendingByCategoryQueryHandlerTests.cs` (5 testes, AAA com comentários `//ARRANGE //ACTION //ASSERT`, mesmo padrão de `GetDashboardSummaryQueryHandlerTests`): Cenário 4 (soma de `List` == `GrandTotal`, RN10, com as 4 fontes = 450), Cenário 5 (compra sem categoria agrupa em "Sem categoria"), financiamento agrupado sob "Financiamento", Cenário 9 (validator reprova `Month = 13`) e CE01 (mês sem dados → `List` vazia, `GrandTotal = 0`).
- Build: sucesso (apenas warning NU1903 pré-existente, não relacionado). Testes: 102/102 passando (97 pré-existentes + 5 novos).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Relatório de gasto por categoria de um mês selecionável, cuja soma bate com o card (RN10).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `.../GetSpendingByCategory/GetSpendingByCategoryQuery.cs` (novo)
- `.../GetSpendingByCategory/GetSpendingByCategoryQueryValidator.cs` (novo)
- `.../GetSpendingByCategory/GetSpendingByCategoryQueryHandler.cs` (novo)
- `backend/src/MzFinance.UnitTests/Application/Queries/Dashboard/GetSpendingByCategoryQueryHandlerTests.cs` (novo)

**O que implementar:**
- Query com `int? Year`, `int? Month` herdando `RequestBase<SpendingByCategoryResponse>`; `IsValid()` invoca o validator.
- Validator (FluentValidation, padrão do projeto): `Month` NotNull entre 1 e 12; `Year` NotNull `> 2000` (CE02/Cenário 9).
- Handler: mesma coleta de dados da ETAPA 7 (uma query cada, escopo `UserId`), resolve `MonthlyPeriodResolver.Resolve(year, month)`, chama `MonthlySpendingCalculator.Calculate(...)`, mapeia `ByCategory` para os itens e `GrandTotal = Total`.

**Testes Necessários:**
- [ ] Cenário 4 — categorias somam == total do mês (RN10).
- [ ] Cenário 5 — "Sem categoria" para compra sem categoria.
- [ ] Financiamento sob "Financiamento".
- [ ] Cenário 9 — `Month = 13` reprova no validator.
- [ ] Mês sem dados → lista vazia, `GrandTotal = 0` (CE01).

**Critérios de Aceitação:**
- [ ] Agrupamento correto e consistente com o card; validação de período.
- [ ] Build + testes OK.

**Dependências:** ETAPA 5, ETAPA 6

---

### ETAPA 9: Aplicação — `GetInstallmentOverviewQuery` + validator + handler

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 15cd49f

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `GetInstallmentOverviewQuery` com `bool? IncludeSettled`, herdando `RequestBase<List<InstallmentOverviewItemResponse>>`; `IsValid() => true` (sem validator — não há entrada obrigatória, mesmo padrão de `GetDashboardSummaryQuery`/`GetCreditCardsQuery`).
- Handler segue a forma das ETAPAS 7/8: `MzFinanceReadOnlyContext` + `ICurrentUserService`, carrega `CreditCards.Include(x => x.Purchases)` e `Financings` escopados por `UserId`. `today = DateOnly.FromDateTime(DateTime.UtcNow)`; `currentCycle = new DateOnly(today.Year, today.Month, 1)`.
- **Cartão:** só compras com `InstallmentsCount > 1` (Critério 6). Reaproveita `CreditCardBillingCalculator.GenerateInstallments` (mesmo calculator das ETAPAS 5/7/8, RNF01); `InstallmentAmount` = valor de qualquer ocorrência (constante); `TotalAmount = InstallmentAmount * InstallmentsCount`; `RemainingInstallments` = ocorrências cujo ciclo (`new DateOnly(CycleYear, CycleMonth, 1)`) é `>= currentCycle` (parcela do mês corrente conta como a pagar — Decisão 8); `EndDate` = maior ciclo gerado.
- **Financiamento:** reaproveita `PriceAmortizationCalculator.CalculateInstallmentAmount`; `TotalAmount = InstallmentAmount * InstallmentsCount`; `RemainingInstallments` = quantos `StartDate.AddMonths(i)` (mês normalizado para dia 1) são `>= currentCycle`; `EndDate = StartDate.AddMonths(InstallmentsCount - 1)`.
- Filtro de quitados: itens com `RemainingInstallments == 0` são removidos da lista final a menos que `request.IncludeSettled == true` (RN11).
- Extraídos dois métodos privados `BuildCreditCardItems`/`BuildFinancingItems` (iteradores `yield return`) para separar a montagem de cada fonte sem duplicar lógica de negócio — toda a regra de parcela/juros continua nos calculators já existentes.
- Testes criados em `GetInstallmentOverviewQueryHandlerTests.cs` (3 testes, AAA com comentários `//ARRANGE //ACTION //ASSERT`, mesmo padrão das ETAPAS 7/8, usando `MzFinanceDbContextFactory.CreateReadWriteContexts()` e datas relativas a `DateOnly.FromDateTime(DateTime.UtcNow)` para não depender de data fixa): Cenário 6 (compra 10x iniciada há 3 ciclos → 7 restantes; financiamento 24x iniciado há 6 meses → 18 restantes; `EndDate` conferido para os dois), quitados ocultos por padrão e visíveis com `IncludeSettled = true`, e compra à vista (`InstallmentsCount == 1`) ausente da visão consolidada mesmo com `IncludeSettled = true`.
- Build: sucesso (apenas warning NU1903 pré-existente, não relacionado). Testes: 105/105 passando (102 pré-existentes + 3 novos).
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Visão consolidada read-only de compras parceladas (cartão + financiamento) com parcelas restantes e término (RF04/Critério 6/RN11).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `.../GetInstallmentOverview/GetInstallmentOverviewQuery.cs` (novo)
- `.../GetInstallmentOverview/GetInstallmentOverviewQueryHandler.cs` (novo)
- `backend/src/MzFinance.UnitTests/Application/Queries/Dashboard/GetInstallmentOverviewQueryHandlerTests.cs` (novo)

**O que implementar:**
- Query com `bool? IncludeSettled` (default tratado como `false`) herdando `RequestBase<List<InstallmentOverviewItemResponse>>`; `IsValid()` retorna `true` (sem validator necessário).
- Handler: `CreditCards.Include(x => x.Purchases)` + `Financings`, escopo `UserId`. `today = DateOnly.FromDateTime(DateTime.UtcNow)`; `currentCycle = new DateOnly(today.Year, today.Month, 1)`.
- **Cartão:** considerar apenas `InstallmentsCount > 1` (parceladas — Critério 6). Via `CreditCardBillingCalculator.GenerateInstallments`: `InstallmentAmount` = valor da parcela; `TotalAmount = InstallmentAmount * InstallmentsCount`; `RemainingInstallments` = nº de parcelas cujo ciclo `>= currentCycle`; `EndDate` = primeiro dia do último ciclo (maior cycle gerado). `Description` = `purchase.Description`.
- **Financiamento:** `InstallmentAmount` via `PriceAmortizationCalculator`; `TotalAmount = InstallmentAmount * InstallmentsCount`; `RemainingInstallments` = nº de `i` onde `StartDate.AddMonths(i)` tem mês `>= currentCycle`; `EndDate = StartDate.AddMonths(InstallmentsCount - 1)`. `Description` = `financing.Description`.
- Filtrar itens com `RemainingInstallments == 0` (quitados) quando `IncludeSettled` não for `true` (RN11).

**Testes Necessários:**
- [ ] Cenário 6 — compra 10x iniciada há 3 ciclos → 7 restantes; financiamento 24x há 6 meses → 18 restantes; datas de término corretas.
- [ ] Quitados ocultos por padrão; visíveis com `IncludeSettled = true`.
- [ ] Compra à vista (`InstallmentsCount == 1`) não aparece na visão de parceladas.

**Critérios de Aceitação:**
- [ ] Lista read-only correta; filtro de quitados funciona.
- [ ] Build + testes OK.

**Dependências:** ETAPA 6 (usa calculators já existentes; não depende da ETAPA 5)

---

### ETAPA 10: WebApi — `DashboardController`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** b9bd466

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `DashboardController` criado exatamente no padrão de `BalanceController`/`CreditCardsController`: herda `MzFinanceControllerBase` (rota `api/[controller]`, `[Authorize]` já aplicados na base), injeta `IMediator` + `INotificationService`, ações finas que só chamam `_mediator.Send` e `ProcessResponse(result)`.
- Três ações: `GET api/dashboard/summary` → `new GetDashboardSummaryQuery()` (sem parâmetros, igual ao padrão de `GetCreditCardsQuery`); `GET api/dashboard/spending-by-category` → `[FromQuery] GetSpendingByCategoryQuery` (bind automático de `year`/`month`); `GET api/dashboard/installments` → `[FromQuery] GetInstallmentOverviewQuery` (bind automático de `includeSettled`).
- Nenhum teste novo — controllers finos não têm teste no projeto (confirmado pelo PLAN e pelo padrão dos demais controllers, nenhum tem teste dedicado).
- Build: sucesso (apenas warning NU1903 pré-existente, não relacionado). Testes: 105/105 passando (sem testes novos nesta etapa).
- **Validação ponta a ponta contra Postgres real** (container `mzfinance-postgres` já rodando via docker-compose do projeto): subida da API via `dotnet run` em `http://localhost:5299`, migrations aplicadas automaticamente no boot (ambiente Development), login via `POST /api/auth/login` com o usuário seed (`dev@mzfinance.local`) retornou JWT válido (200). Os 3 endpoints novos testados com o token real:
  - `GET /api/dashboard/summary` → 200, payload com `previousMonth`/`currentMonth`/`nextMonth`, `nextMonth.isProjected == true`, demais `false`.
  - `GET /api/dashboard/spending-by-category?year=2026&month=7` → 200, soma de `list` (5662.02 + 150.00 = 5812.02) bate exatamente com `currentMonth.totalExpense` do summary (RN10 confirmada em runtime, não só por teste unitário).
  - `GET /api/dashboard/installments` (com e sem `includeSettled=true`) → 200, lista consolidada de compra parcelada de cartão e financiamento com parcelas restantes e data de término coerentes.
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Expor os três endpoints de leitura sob autenticação JWT (RF01-RF04).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.WebApi/Controllers/DashboardController.cs` (novo)

**O que implementar:**
- Herdar `MzFinanceControllerBase` (já aplica `[Authorize]` e rota `api/[controller]`), injetar `IMediator` + `INotificationService`, usar `ProcessResponse(result)`.
- `GET api/dashboard/summary` → `GetDashboardSummaryQuery`.
- `GET api/dashboard/spending-by-category?year=&month=` → `GetSpendingByCategoryQuery` (via `[FromQuery]`).
- `GET api/dashboard/installments?includeSettled=` → `GetInstallmentOverviewQuery` (via `[FromQuery]`).
- Seguir o estilo de `BalanceController`/`CreditCardsController`.

**Testes Necessários:** — (coberto pelos testes de handler; controllers finos não têm teste no projeto)

**Critérios de Aceitação:**
- [x] Endpoints respondem envelopados em `DataActionResult<T>`; exigem JWT.
- [x] Build OK.

**Dependências:** ETAPAS 7, 8, 9

---

### ETAPA 11: Frontend — feature `dashboard` (api + página + componentes)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 2b2db19

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `api.ts` com interfaces TS espelhando os 4 DTOs do backend (`MonthlySpending`, `DashboardSummary`, `SpendingByCategoryItem`/`SpendingByCategory`, `InstallmentOverviewItem`) e as 3 funções (`getDashboardSummary`, `getSpendingByCategory(year, month)`, `getInstallmentOverview(includeSettled?)`), usando `api` de `shared/api/httpClient` — sem React Query (Decisão 5), mesmo padrão de `credit-cards/api.ts`/`projection/api.ts`. Campos em camelCase (confirmado que a API serializa assim, igual a `CreditCardBill`).
- `DashboardPage.tsx`: três `useEffect` independentes (summary uma vez; categoria por mês selecionado; parcelas por `includeSettled`), cada um com seu próprio `loading`/`error`, seguindo exatamente o padrão de `CreditCardsPage`/`RecurringPage`. `changeCategoryMonth` replica a lógica de `changeMonth` de `CreditCardsPage`.
- Três componentes novos em `components/`: `SpendingSummaryCards` (3 cards passado/atual/próximo, badge "Projeção" quando `isProjected`, breakdown por fonte), `CategoryBreakdown` (seletor de mês com setas, lista de categorias, total, estado vazio "Sem gastos neste período" — CE01), `InstallmentsOverview` (lista de parcelas com toggle "Incluir quitadas", rótulo de origem cartão/financiamento). Cada componente com seu `.module.css` dedicado, reaproveitando as variáveis CSS globais (`--surface`, `--border`, `--accent`, `--text-muted`) já usadas nas demais features.
- Não foram tocados `App.tsx`/`AppLayout.tsx` (rota/nav) — isso é escopo da ETAPA 13; `DashboardPage` ainda não está registrada em nenhuma rota, mas compila e é verificada pelo `tsc -b` (incluída pelo glob do `tsconfig`).
- `node_modules` do frontend não estava instalado no worktree; rodei `npm install` para viabilizar o build. Isso normalizou o campo `name` desatualizado (`vite-scaffold` → `mz-finance-frontend`) em `frontend/package-lock.json` — deixei essa alteração **fora do commit** (não é parte do escopo da ETAPA 11; fica pendente no working tree para o Tech Lead decidir se commita à parte).
- Build: `npm run build` (tsc -b && vite build) — sucesso, 0 erros.
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Tela do Dashboard consumindo os três endpoints (RF01-RF04).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/features/dashboard/api.ts` (novo)
- `frontend/src/features/dashboard/DashboardPage.tsx` + `DashboardPage.module.css` (novos)
- `frontend/src/features/dashboard/components/*` (novos — card de gasto, lista por categoria, lista de parcelas)

**O que implementar:**
- `api.ts`: interfaces TS espelhando os DTOs + funções `getDashboardSummary()`, `getSpendingByCategory(year, month)`, `getInstallmentOverview(includeSettled?)` usando `api` de `shared/api/httpClient` (ver `credit-cards/api.ts` e `projection/api.ts`).
- `DashboardPage`: seguir o padrão existente — `useState` + `useEffect` + estados de `loading`/`error` (o projeto **não** usa React Query; ver Decisão 5). Renderizar:
  - Três cards de gasto (mês passado, atual, próximo); o card do próximo mês rotulado como "Projeção" quando `isProjected`.
  - Relatório por categoria do mês atual, com seletor de mês (reusar lógica de `changeMonth` de `CreditCardsPage`); exibir subtotais + total; estado vazio "Sem gastos neste período" (CE01).
  - Lista consolidada de parcelas com toggle "incluir quitados".
- Formatar valores com `shared/formatCurrency`. CSS Modules (sem Tailwind, RNF04).

**Testes Necessários:** — (sem framework de teste front; validar via build + checagem manual dos cenários 1/3/4/6)

**Critérios de Aceitação:**
- [x] Cards, categoria e parcelas exibidos; projeção rotulada; estados de loading/erro/vazio.
- [x] `npm run build` (tsc) sem erros.

**Dependências:** ETAPA 10

---

### ETAPA 12: Frontend — campo `categoria` no form de compra de cartão

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 4be0116

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `CreateCreditCardPurchaseInput` ganhou `category?: string`, ao lado de `description?: string` já existente.
- Novo estado `purchaseCategory` (padrão `useState('')`) e novo `<input type="text">` "Categoria" no form "Nova compra", logo após o campo "Descrição" — mesmo padrão visual/label dos demais campos do form.
- No submit: `category: purchaseCategory || undefined` (idêntico ao tratamento de `description`); campo resetado (`setPurchaseCategory('')`) após sucesso, junto dos demais campos do form.
- Nenhuma mudança em `CreditCardBillItem`/`CreditCardBill` — a categoria só é usada no dashboard (ETAPA 11), não na exibição da fatura.
- `frontend/package-lock.json` seguiu aparecendo como modificado no working tree (normalização de metadado herdada da ETAPA 11, `npm install` local) — mantido fora do commit novamente, mesma decisão da etapa anterior.
- Build: `npm run build` (tsc -b && vite build) — sucesso, 0 erros.
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Permitir informar categoria opcional ao lançar compra (RF05/UC02).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/credit-cards/api.ts` (alterado)
- `frontend/src/features/credit-cards/CreditCardsPage.tsx` (alterado)

**O que implementar:**
- `CreateCreditCardPurchaseInput`: adicionar `category?: string`.
- Form "Nova compra": novo `<input>` opcional de categoria; enviar `category: purchaseCategory || undefined` (mesmo padrão do `description`).

**Testes Necessários:** — (validar via build + envio manual)

**Critérios de Aceitação:**
- [x] Categoria opcional enviada; ausência não quebra o fluxo.
- [x] `npm run build` OK.

**Dependências:** ETAPA 3 (contrato do backend); pode ser desenvolvida em paralelo à ETAPA 11.

---

### ETAPA 13: Frontend — rota raiz = Dashboard + navegação "Gerenciamento"

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** a740ec1

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `App.tsx`: rota `/` agora renderiza `DashboardPage` (import de `features/dashboard/DashboardPage`); nova rota `/transactions` renderiza `TransactionsPage` (extrato movido, Decisão 6); `/recurring`, `/credit-cards`, `/financing`, `/projection` mantidas sem alteração; fallback `*` → `/` já existia e continua correto (agora leva ao Dashboard).
- `AppLayout.tsx`: `NAV_ITEMS` substituído por `MANAGEMENT_ITEMS` (Transações/Recorrentes/Cartões/Financiamentos) renderizados dentro de um agrupamento visual "Gerenciamento"; a nav agora tem três blocos — link solto "Dashboard" (`to="/"`, `end`), o grupo "Gerenciamento" e o link solto "Projeção" — nenhuma rota de CRUD foi removida, apenas reagrupada visualmente.
- `AppLayout.module.css`: adicionadas classes `.navGroup` (borda sutil + padding, usando `var(--border)`), `.navGroupLabel` (rótulo pequeno/uppercase com `var(--text-muted)`) e `.navGroupItems` (flex para os links internos); reaproveita as mesmas variáveis CSS globais já usadas no restante do header — sem Tailwind, sem nova dependência.
- Conferido `PrivateRoute.tsx` (redirect para `/login`, não depende de `/`) e `httpClient.ts` (redirect 401 usa `window.location.href = '/login'`, também não depende de `/`) — nenhum dos dois precisou de alteração (Ponto de Atenção 4 do PLAN).
- `LoginPage.tsx` já navegava para `/` após login bem-sucedido (`navigate('/', { replace: true })`, código pré-existente, não alterado) — com a mudança de rota, isso passa a satisfazer diretamente o Cenário 8 do PRD (Dashboard é a rota padrão pós-login), sem necessidade de tocar no fluxo de login.
- `frontend/package-lock.json` seguiu aparecendo como modificado no working tree (mesma normalização de metadado herdada das ETAPAS 11/12); mantido fora do commit, mesma decisão das etapas anteriores.
- Build: `npm run build` (tsc -b && vite build) — sucesso, 0 erros.
- **Validação de subida real:** processo de backend obsoleto (rodando a partir do bin/ do próprio worktree, porta 5299, de uma sessão anterior) foi finalizado; `dotnet build backend/MzFinance.slnx` reexecutado limpo (0 erros) para confirmar que o código atual compila; backend subido via `dotnet run` (`ASPNETCORE_ENVIRONMENT=Development`, porta 5299) e frontend via `npm run dev` (porta 5174, 5173 já ocupada por outra sessão). Login com usuário seed (`dev@mzfinance.local`) retornou JWT; `GET /api/dashboard/summary` respondeu 200 com os três cards (mês passado/atual/próximo, `nextMonth.isProjected == true`); `GET /` do frontend respondeu 200 com `<div id="root">` presente. Nenhum erro na subida de nenhum dos dois serviços. Ambos os processos de validação finalizados ao término do teste.
- Sem dúvidas em aberto para o Tech Lead nesta etapa.

**Objetivo:** Dashboard como rota inicial e reorganização da navegação sem remover CRUDs (RF06/Critério 1/8, RN13).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/app/App.tsx` (alterado)
- `frontend/src/app/AppLayout.tsx` + `AppLayout.module.css` (alterados)

**O que implementar:**
- `App.tsx`: rota `/` = `DashboardPage`; mover extrato de `/` para `/transactions` (`<Route path="/transactions" element={<TransactionsPage />} />`); manter `/recurring`, `/credit-cards`, `/financing`, `/projection`; fallback `*` → `/` (Decisão 6).
- `AppLayout.tsx`: reestruturar `NAV_ITEMS` para: item "Dashboard" (`/`) + grupo visual "Gerenciamento" (Transações→`/transactions`, Recorrentes, Cartões, Financiamentos) + "Projeção". Ajustar `end={item.to === '/'}` para o link do Dashboard.
- `AppLayout.module.css`: estilo simples para o agrupamento (label/seção). Sem Tailwind.
- `PrivateRoute` e o redirect de 401 do `httpClient` (`/login`) permanecem válidos — conferir que não dependem do extrato em `/`.

**Testes Necessários:** — (validar via build + navegação manual — Cenários 8)

**Critérios de Aceitação:**
- [x] `/` mostra Dashboard; extrato acessível em `/transactions` via "Gerenciamento".
- [x] Nenhum CRUD removido; Projeção acessível; fallback correto.
- [x] `npm run build` OK.

**Dependências:** ETAPA 11 (DashboardPage precisa existir)

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
- [x] `dotnet build backend/MzFinance.slnx` sem erros
- [x] `dotnet test backend/MzFinance.slnx` — todos passando (105/105)
- [x] `npm run build --prefix frontend` sem erros

### Padrões de Código
- [x] Queries retornam via `DataActionResult<T>` (ProcessResponse) e usam `MzFinanceReadOnlyContext`
- [x] Todos os dados escopados por `UserId` (`ICurrentUserService`)
- [x] Calculators reaproveitados; nenhuma regra de parcela/recorrência/fatura duplicada (RNF01)
- [x] Arredondamento `MidpointRounding.AwayFromZero` coerente (RN10)

### Banco de Dados / Schema
- [x] Migration `AddCategoryToCreditCardPurchase` aplica coluna nullable
- [x] `Down` testado (reversível)
- [x] Sem risco a dados existentes (compras antigas → Category nulo)

### Autorização
- [x] `DashboardController` exige JWT (`[Authorize]` via base)
- [x] Sem JWT → 401 pelo middleware existente (CE03)

### Não-Funcionais
- [x] Valores/categorias não logados em texto puro (RNF02)

### PRD
- [x] RF01-RF07 atendidos; Critérios 1-8 atendidos; Cenários 1-9 cobertos

---

## LEGENDA DE STATUS
- ⏳ **Pendente** · 🔄 **Em Progresso** · ✅ **Concluída** · ❌ **Bloqueada**

---

## PONTOS DE ATENÇÃO

1. **Dupla contagem (RN05):** o `MonthlySpendingCalculator` soma `Transaction` apenas com `SourceType == Manual`. Hoje 100% das transações são `Manual` (nenhum código gera `GeneratedFrom*`), então não há mudança de comportamento; o filtro é a salvaguarda para o PRD_003. Coberto por teste explícito.
2. **Semântica do `RecurringCommitmentProjector` (RN08):** o método é estritamente futuro e exclui a `referenceDate`. Reuso sem alterá-lo passando `referenceDate = period.FirstDay.AddDays(-1)` e `targetDate = period.LastDay`. Testar ocorrências nos limites do mês.
3. **Consistência card × categoria (RN10):** garantida por usar o mesmo motor (`MonthlySpendingCalculator`) para os dois; teste assertando `ByCategory.Sum == Total`.
4. **Mudança de rota raiz:** conferir `PrivateRoute`, fallback `*` e o redirect 401 do `httpClient` após mover o extrato de `/` para `/transactions`.
5. **`InstallmentsCount == 1` no cartão:** compras à vista não são "parceladas" — excluídas da visão consolidada (Critério 6 fala em `installmentsCount > 1`), mas continuam entrando no gasto do mês.

---

## DECISÕES TÉCNICAS

### Decisão 1: Desduplicação por `SourceType == Manual`
- **Opção escolhida**: no cálculo de gasto, somar apenas `Transaction` com `SourceType == Manual`; ocorrências de cartão/recorrente/financiamento vêm sempre dos calculators.
- **Justificativa**: confirmado que não há materialização automática (busca no código: `SourceType` só é setado como `Manual` no construtor; nunca `GeneratedFrom*`). O filtro deixa o handler pronto para o PRD_003 (quando "pagar" materializar `Transaction GeneratedFrom*`) sem retrabalho e sem risco de contagem dobrada.
- **Alternativas consideradas**: somar todas as `Transaction` (arriscado no PRD_003); introduzir flag de materialização (fora de escopo).

### Decisão 2: Não refatorar `GetProjectedBalanceQueryHandler`; criar helper novo de mês
- **Opção escolhida**: `MonthlyPeriodResolver` novo, com semântica de **mês único**; deixar `IsWithinFutureCycle` (semântica de **intervalo** hoje→alvo) intacto na projeção.
- **Justificativa**: os dois conceitos são diferentes (intervalo aberto de projeção vs mês fechado). Reaproveitar forçaria generalização arriscada num handler já entregue e testado. O handoff pedia "avaliar" — a avaliação conclui por não tocar na projeção (RN: não alterar comportamento existente).
- **Alternativas consideradas**: extrair `IsWithinFutureCycle` para o helper e a projeção passar a consumi-lo — rejeitado pelo risco de regressão sem ganho real.

### Decisão 3: Reuso do projector via limites de intervalo
- **Opção escolhida**: obter ocorrências do mês chamando `GenerateFutureOccurrences(commitment, FirstDay.AddDays(-1), LastDay)`.
- **Justificativa**: `current > referenceDate` ⇒ `>= FirstDay`; `current <= targetDate` ⇒ `<= LastDay`. Cobre o mês fechado sem alterar o método.
- **Alternativas consideradas**: novo método `GenerateOccurrencesInRange` inclusivo — desnecessário e aumentaria superfície de mudança.

### Decisão 4: Query agregadora `GetDashboardSummary` (3 cards em 1 chamada)
- **Opção escolhida**: um endpoint `summary` devolve os três meses; `spending-by-category` e `installments` separados.
- **Justificativa**: os três cards são fixos (passado/atual/próximo) e sempre exibidos juntos → menos round-trips (RNF05). O relatório por categoria precisa de mês selecionável e a visão de parcelas tem parâmetro próprio, logo endpoints dedicados.
- **Alternativas consideradas**: 3 queries `GetMonthlySpending` separadas (mais round-trips, sem ganho para o dashboard).

### Decisão 5: Frontend sem React Query
- **Opção escolhida**: seguir o padrão real do código (`useState`/`useEffect` + `shared/api/httpClient`).
- **Justificativa**: React Query **não** está instalado (`package.json` só tem react/react-dom/react-router-dom) e nenhuma feature o usa; o context menciona React Query mas o código o supera. Introduzi-lo seria mudança de infra fora do escopo do PRD.
- **Alternativas consideradas**: instalar React Query — rejeitado (escopo/consistência).

### Decisão 6: Rota — Dashboard em `/`, extrato em `/transactions`
- **Opção escolhida**: mover só o extrato para `/transactions`; manter os demais paths; agrupamento "Gerenciamento" é visual na nav; fallback `*` → `/`.
- **Justificativa**: menor churn e menor risco (Critério 8 exige apenas Dashboard na raiz + agrupamento; não exige prefixar todas as rotas).
- **Alternativas consideradas**: prefixar tudo com `/gerenciamento/...` — mais mudanças e mais superfície de bug sem benefício funcional.

### Decisão 7: `Category` limite 100 + só no Create
- **Opção escolhida**: `HasMaxLength(100)` / `MaximumLength(100)`, alinhado a `Transaction`/`RecurringCommitment`. Category só no fluxo de criação (não há Update/Delete de compra no projeto).
- **Justificativa**: consistência de schema e escopo real do código (só existe `CreateCreditCardPurchase`).

### Decisão 8: "Total" e "parcelas restantes" na visão consolidada
- **Opção escolhida**: `TotalAmount = InstallmentAmount * InstallmentsCount` (total a pagar) para cartão e financiamento; `RemainingInstallments` = parcelas cujo ciclo/mês é `>= mês corrente` (parcela do mês atual conta como a pagar).
- **Justificativa**: uniformidade entre as duas origens e coerência com "ainda estou pagando" (sem status de pagamento, PRD_003). Para financiamento isso inclui juros (total a pagar), diferente do principal `Financing.TotalAmount`.
- **Alternativas consideradas**: usar `Financing.TotalAmount` (principal) — inconsistente com o total do cartão; restantes estritamente futuros — excluiria a parcela do mês corrente.

---

## RISCOS E MITIGAÇÕES

### Risco 1: Dupla contagem (RN05)
- **Impacto**: Alto · **Probabilidade**: Baixa (hoje) → Média (com PRD_003)
- **Mitigação**: filtro `SourceType == Manual` + teste dedicado (Decisão 1).

### Risco 2: Divergência card × categoria por arredondamento (RN10)
- **Impacto**: Médio · **Probabilidade**: Baixa
- **Mitigação**: motor único (`MonthlySpendingCalculator`), mesmo `MidpointRounding.AwayFromZero`; teste `Sum == Total`.

### Risco 3: Regressão na projeção de saldo
- **Impacto**: Alto · **Probabilidade**: Baixa
- **Mitigação**: não tocar em `GetProjectedBalanceQueryHandler` (Decisão 2); helper novo isolado.

### Risco 4: Quebra de navegação/redirect ao mover rota raiz
- **Impacto**: Médio · **Probabilidade**: Média
- **Mitigação**: revisar `PrivateRoute`, fallback `*` e redirect 401; teste manual do Cenário 8.

---

## DOCUMENTAÇÃO DE REFERÊNCIA
- **PRD**: prd/mz-finance-prd-002-tbd-dashboard-gerenciamento-financeiro.md
- **Contexto**: mz-finance-context.md
- **Map**: mz-finance-map.json
- **Código de referência**:
  - `backend/src/MzFinance.Application/Queries/Balance/GetProjectedBalance/GetProjectedBalanceQueryHandler.cs`
  - `backend/src/MzFinance.Application/Queries/CreditCards/GetCreditCardBill/GetCreditCardBillQueryHandler.cs`
  - `backend/src/MzFinance.Infra/Builders/{CreditCardBillingCalculator,RecurringCommitmentProjector,PriceAmortizationCalculator}.cs`
  - `frontend/src/app/{App.tsx,AppLayout.tsx}`, `frontend/src/features/credit-cards/{api.ts,CreditCardsPage.tsx}`

---

## COMANDOS ÚTEIS

```bash
# Build
dotnet build backend/MzFinance.slnx
npm run build --prefix frontend

# Testes
dotnet test backend/MzFinance.slnx

# Migration
dotnet ef migrations add AddCategoryToCreditCardPurchase -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
dotnet ef database update -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
```

---

## INSTRUÇÕES DE ATUALIZAÇÃO

Atualizado automaticamente pelo `/implementar` após cada etapa: status + data, barra de progresso, checklists.

---

## OBSERVAÇÕES
1. Implementar uma etapa por vez; build + testes verdes antes de avançar.
2. Seguir os padrões reais do código (CQRS + Notification + `DataActionResult`; frontend `useState`/`useEffect`).
3. `/code-review` após cada etapa.

---

**Criado em:** 2026-07-02
**Próximo passo:** `/implementar ETAPA 1`
