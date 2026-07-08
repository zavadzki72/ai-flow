# Plano de Execução: Importar Compras de Cartão de Crédito do Visor Finance

## Informações
- **PRD Relacionado**: prd/mz-finance-prd-005-tbd-import-visor-cartao.md
- **Repositório(s)**: monorepo `mz-finance` (backend `/Users/zavadzki72/Projects/Personal/mz-finance/backend` + frontend `/Users/zavadzki72/Projects/Personal/mz-finance/frontend`) — **um único repositório git** (`.git` na raiz `mz-finance/`).
- **Domínio(s)**: Cartão de Crédito (`CreditCard` / `CreditCardPurchase`), **reaproveitando** a integração externa **Visor Finance** (OAuth + MCP) e a fonte de **câmbio** (PTAX/BCB) já entregues em produção pela feature 004.
- **Branch Base**: main
- **Branch de Trabalho**: `feature/import-visor-cartao` (criada no `/implementar ETAPA 1`)
- **Complexidade**: 🔴 Alta (fluxo preview→confirm de 3 fases, rastreabilidade + câmbio em `CreditCardPurchase`, migration aditiva com backfill, mapeamento conta Visor→cartão local)
- **Criado em**: 2026-07-07

> ### ✏️ Emenda pós-teste manual (2026-07-07) — bug de semântica do valor em N>1
> No preview, o valor da linha do Visor é o **valor da parcela**, mas o confirm enviava esse valor como `Amount` (total) — com 12x, a fatura mostrava parcela/12 (ex.: 59,90 → R$ 4,99). **Fix no `ImportVisorCardModal`**: campo renomeado para "Valor da parcela (R$)"; ao confirmar, `amountBrl` e `originalAmount` enviados como **parcela × N** (total real da compra); aviso de N>1 mostra o total ("12× R$ 59,90 = R$ 718,80"). Backend inalterado (`Amount` continua total). Build + lint verdes.
>
> **Emenda 2 — "Fatura atual" por cartão (`CreditCardsPage`):** o botão "Mês atual" usava o mês-calendário; virou **"Fatura atual"** = ciclo aberto do cartão (`hoje ≤ ClosingDay → mês; senão → mês+1`, espelhando `CreditCardBillingCalculator`), e a troca de cartão navega direto para o ciclo aberto daquele cartão. Motivação: cartões com fechamento no começo do mês (Itau dia 1) têm fatura aberta = mês seguinte. Descoberto no teste manual da 005. Nota de dados: fechamentos reais corrigidos no banco local (Itau Master 3→1, Mercado Livre 29→27) — fechamento errado fazia compras caírem um mês antes do banco (sintoma: compra "no limbo").

> ⚠️ **Política de commits (memória do projeto)**: neste projeto o `/implementar` **NÃO commita por etapa** — commit único apenas ao final de todas as etapas (feature completa). Cada etapa deixa build + testes verdes, mas **não** faz `git commit`. Ignore instruções da skill `/implementar` que mandem commitar por etapa. **Sem coautoria de IA** em nenhum commit.

> ⚠️ **Nota de path**: o `mz-finance-map.json` registra os repositórios em caminhos Windows (`C:/Projects/...`), errado. O ambiente real é macOS; todos os paths deste PLAN usam o local real (`/Users/zavadzki72/Projects/Personal/mz-finance/...`). Corrigir o map fica fora do escopo.

> 🔁 **Feature gêmea**: esta feature é o **inverso** da 004 (ver PLAN `plan/mz-finance-plan-004-import-visor.md` e Emenda pós-teste / ADR 0009). A 004 importa transações bancárias e **exclui** contas de cartão (CREDIT). Esta importa **só** as compras de cartão (contas CREDIT) para o módulo de Cartões. As portas de infra (`IVisorMcpClient`, `IExchangeRateProvider`, `IVisorTokenProvider`), o vínculo OAuth (connect-ticket), o câmbio PTAX e o helper `VisorImportCategory` são **reaproveitados sem alteração**. Ver **ADR 0011** para as decisões estruturais desta feature.

---

## PROGRESSO GERAL

**Status**: ✅ Concluído / Implementado
**Progresso**: 10/10 etapas concluídas (100%)

```
[🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩] 100%
```

> **Fechamento (2026-07-07):** 8 ondas (onda 3 paralela com 3 devs, merges sem conflito). Validação integrada final: `dotnet build` 0 erros, `dotnet test` **234/234**, `npm run build` + lint verdes. Commit único (squash, política do projeto): `cff94e0` na `feature/import-visor-cartao`.

> Este progresso será atualizado automaticamente pelo skill `/implementar`.

---

## VISÃO GERAL

O mz-finance modela a **compra** (`CreditCardPurchase`: `Amount` total, `PurchaseDate`, `InstallmentsCount`, `Description`, `Category`); a **fatura e as parcelas são calculadas** pelo `ClosingDay` do cartão (`Infra/Builders/CreditCardBillingCalculator.cs`) — nada de fatura é armazenado. O Visor entrega a **parcela já lançada** (uma linha por parcela do mês, `amount` = valor da parcela), com o número da parcela **embutido na descrição** ("NN/NN"). Esta feature adota a granularidade que a fonte suporta sem invenção: **cada lançamento vira uma compra 1x** na data do lançamento com o valor da parcela; o marcador "NN/NN" é só informação (ADR 0011 D5).

**Fonte de verdade = o código real.** A exploração das 4 camadas do backend e da feature `credit-cards` do frontend estabeleceu os fatos que guiam este PLAN:

1. **CQRS via MediatR + Notification Pattern.** Commands escrevem em `MzFinanceContext` e chamam `SaveChangesAsync` (transação atômica implícita do EF); Queries leem de `MzFinanceReadOnlyContext` (NoTracking). Erros de negócio → `INotificationService.Notify(NotificationKey.*, msg)` (sem exception); `MzFinanceControllerBase.ProcessResponse` traduz para 400/401/404/409 no envelope `DataActionResult<T>`. Padrões vivos: `PreviewVisorImportQueryHandler.cs`, `ConfirmVisorImportCommandHandler.cs`, `CreateCreditCardPurchaseCommandHandler.cs`.
2. **Par preview/confirm da 004 é o molde.** `Application/Queries/Visor/PreviewVisorImport/*` (leitura, não persiste) + `Application/Commands/Transactions/ConfirmVisorImport/*` (persiste editado, insert-only, dedup por `ExternalId`). Reaproveitamos a **estrutura** (não o mesmo handler — comportamento inverso, ADR 0011 D1).
3. **Portas Visor/câmbio já existem** em `Domain/Interfaces` (`IVisorMcpClient` com `GetAccountsAsync`/`GetTransactionsAsync`, `IExchangeRateProvider`, `IVisorTokenProvider`) e `Domain/Integrations/Visor` (`VisorAccountDto` com `IsCreditCard`, `VisorTransactionDto` com `AccountId`+`Amount` sempre positivo, `VisorTransactionQuery`). `VisorImportCategory.Resolve(...)` (Application/Common) normaliza categoria — reusar.
4. **`CreditCardPurchase` hoje**: `Amount` (decimal), `PurchaseDate`, `InstallmentsCount`, `Description`, `Category`, sem `UserId` (o usuário vem por `CreditCard.UserId`), sem rastreabilidade externa. `CreditCardPurchaseMap` mapeia colunas simples, sem índice de dedup.
5. **Fatura/limite/projeção derivam de `purchase.Amount`** via `CreditCardBillingCalculator.GenerateInstallments` (`installmentAmount = Amount / InstallmentsCount`). Consumidores: `GetCreditCardBillQueryHandler`, `GetCreditCardBillForecastQueryHandler`, `GetCreditCardsQueryHandler.CalculateUsedLimit`. ⇒ **sentinela `Amount=0`** para compra pendente de câmbio mantém tudo fora dos totais com **zero alteração** nesses cálculos (mesma jogada da 004).
6. **`type=expense` isola as compras.** No `get_transactions`, `amount` é sempre positivo e o sinal vem do **filtro `type`**; pagamentos de fatura/estornos (negativos na conta CREDIT — DE2) são `income` na fonte. Logo, **uma única chamada `type=expense`** + filtro por `account_id` CREDIT já entrega só compras/despesas positivas (RN05) — nem precisamos das duas chamadas da 004.
7. **Frontend sem React Query nem Tailwind.** Telas usam `useState`/`useEffect` + `shared/api/httpClient` (bearer automático) e CSS Modules + Design System `shared/ui`. Molde a reusar: `features/transactions/ImportVisorModal.tsx` (3 fases) e `features/credit-cards/CreditCardsPage.tsx`. Helpers de conexão Visor já em `features/transactions/api.ts` (`getVisorConnectionState`, `requestVisorConnectTicket`) e `shared/formatCurrency.ts::formatCurrencyIn`.
8. **Rotas**: `MzFinanceControllerBase` usa `[Route("api/[controller]")]` + `[Authorize]`. O `VisorController` já concentra a superfície de import da 004 (`/api/visor/import/preview|confirm`); os endpoints de cartão entram nele por coesão.

**Ordem de execução (por dependência real):** Domínio (`CreditCardPurchase`) → Persistência/migração → [rastreabilidade na fatura ‖ preview ‖ confirm] → WebApi (endpoints) → Frontend (api → modal → integração na página → rastreabilidade na fatura). Cada etapa mantém build + testes verdes.

---

## OBJETIVOS

- [ ] `CreditCardPurchase` guarda `ExternalId`, `OriginalCurrency`/`OriginalAmount`, `ExchangeRate`/`ExchangeRateDate` e `ExchangeReviewPending`; `Amount` sempre em BRL (=0 enquanto pendente de revisão). Construtor manual intacto/coerente; novo construtor de importação (RN11/RN18).
- [ ] Migração aditiva e reversível: colunas novas + backfill (`OriginalCurrency='BRL'`, `OriginalAmount=Amount`, `ExchangeReviewPending=false`) + **índice único filtrado** `(CreditCardId, ExternalId) WHERE ExternalId IS NOT NULL` (§8, ADR 0011 D3).
- [ ] Preview (leitura, não persiste): valida vínculo; identifica contas CREDIT (`GetAccountsAsync`); busca `type=expense` paginando; mantém só linhas de conta CREDIT e valor positivo; converte estrangeiras via PTAX (BRL editável); sugere categoria; marca já-importadas por `ExternalId` (escopo usuário); agrupa por conta (RN04/RN05/RN16/C4/C5).
- [ ] Confirm (escrita, insert-only, atômico): recebe linhas revisadas + `creditCardId` por linha; valida cartões do usuário (C20 = rejeita tudo se algum sumiu); dedup por `ExternalId`; sentinela de câmbio; um `SaveChanges` (RN10/RN15/C19).
- [ ] Fatura/lista de compras distingue origem Visor e expõe moeda/valor originais (C21/RN18); pendentes de câmbio fora dos totais (sentinela).
- [ ] Frontend: botão "Importar compras do Visor" no módulo de Cartões, gate de conexão (conectar/reconectar reusando a 004), modal 3 fases com escolha de cartão de destino por conta, edição por linha, aviso de dupla contagem (C10) e sinalização de pendência de câmbio (C15).
- [ ] `dotnet build`/`dotnet test` + `npm run build` verdes ao fim de cada etapa; dados sensíveis nunca logados.

---

## MAPA DE COMPONENTES IDENTIFICADOS

### Domínio (`backend/src/MzFinance.Domain`)
- `Models/CreditCardPurchase.cs` (alterado) — campos de rastreabilidade/câmbio + novo construtor de importação.
- *(reuso, sem alteração)* `Interfaces/IVisorMcpClient.cs`, `IExchangeRateProvider.cs`, `IVisorTokenProvider.cs`; `Integrations/Visor/VisorAccountDto.cs`, `VisorTransactionDto.cs`, `VisorTransactionQuery.cs`, `VisorIntegrationException.cs`; `Enums/VisorImportType.cs` (não usado aqui — cartão só importa despesa).

### Persistência (`backend/src/MzFinance.Infra`)
- `Maps/CreditCardPurchaseMap.cs` (alterado) — colunas novas + índice único filtrado.
- `Migrations/*_AddVisorFieldsToCreditCardPurchase.cs` (novo) + `MzFinanceContextModelSnapshot.cs` (regenerado pelo EF).
- *(reuso, sem alteração)* `Builders/CreditCardBillingCalculator.cs` (o sentinela `Amount=0` dispensa mudança).

### Aplicação (`backend/src/MzFinance.Application`)
- `Queries/Visor/PreviewVisorCardImport/` (novo) — `PreviewVisorCardImportQuery.cs`, `...Handler.cs`, `...Validator.cs`.
- `Dtos/CreditCards/VisorCardImportPreviewItem.cs`, `Dtos/CreditCards/VisorCardImportPreviewResponse.cs` (novos).
- `Commands/CreditCards/ConfirmVisorCardImport/` (novo) — `ConfirmVisorCardImportCommand.cs`, `ConfirmVisorCardImportItem.cs`, `...Handler.cs`, `...Validator.cs`.
- `Dtos/CreditCards/CreditCardBillResponse.cs` (alterado) — `CreditCardBillItemResponse` expõe origem/câmbio.
- `Queries/CreditCards/GetCreditCardBill/GetCreditCardBillQueryHandler.cs` (alterado) — projeção dos campos novos.
- *(reuso, sem alteração)* `Common/VisorImportCategory.cs`; `Dtos/Transactions/ImportVisorSummaryResponse.cs` (reaproveitado como resumo — ver ETAPA 5).

### WebApi (`backend/src/MzFinance.WebApi`)
- `Controllers/VisorController.cs` (alterado) — `POST /api/visor/card-import/preview` e `/card-import/confirm`.
- *(reuso, sem alteração)* `Configurations/VisorIntegrationConfiguration.cs` (DI das portas já registrada pela 004; nada novo a registrar).

### Frontend (`frontend/src`)
- `features/credit-cards/api.ts` (alterado) — tipos + `previewVisorCardImport`/`confirmVisorCardImport`; reexport/uso dos helpers de conexão de `../transactions/api`.
- `features/credit-cards/components/ImportVisorCardModal.tsx` + `.module.css` (novos) — 3 fases.
- `features/credit-cards/CreditCardsPage.tsx` (alterado) — botão + gate conectar/reconectar + retorno OAuth + reload; rastreabilidade Visor nas linhas de fatura.
- `features/credit-cards/CreditCardsPage.module.css` (alterado, se preciso).
- *(reuso, sem alteração)* `shared/formatCurrency.ts::formatCurrencyIn`, `shared/ui/*`.

### Testes (`backend/src/MzFinance.UnitTests`)
- `Domain/Entities/CreditCardPurchaseVisorTests.cs` (novo).
- `Application/Queries/Visor/PreviewVisorCardImport/PreviewVisorCardImportQueryHandlerTests.cs` + `...ValidatorTests.cs` (novos).
- `Application/Commands/CreditCards/ConfirmVisorCardImport/ConfirmVisorCardImportCommandHandlerTests.cs` + `...ValidatorTests.cs` (novos).
- `Application/Queries/CreditCards/GetCreditCardBillQueryHandlerTests.cs` (alterado — projeção de origem/câmbio).

---

## ESTRATÉGIA DE TESTES

- **Framework**: xUnit + NSubstitute + EF Core InMemory (padrão do projeto). Convenção `[Method]_[Scenario]_Should[Expected]`, AAA com comentários.
- **Portas mockadas com NSubstitute**: os handlers de preview/confirm são testados com `IVisorMcpClient`, `IExchangeRateProvider` e `IVisorTokenProvider` **substituídos** — não tocam Visor/PTAX reais. Persistência via InMemory.
- **O índice único filtrado** não é exercido pelo InMemory; validá-lo aplicando a migração no `/test-e2e`. Os testes cobrem o dedup pela **checagem app** (escopo usuário).

Cenários-chave a cobrir (mapeados ao PRD §7):
- [ ] Happy path: 3 compras positivas de conta CREDIT com destino → 3 `CreditCardPurchase` origem Visor (1x) no cartão certo; resumo 3/0 (Cenário 1).
- [ ] Exclusão de pagamentos/estornos: `type=expense` + `Amount>0` só traz compras (Cenário 2/RN05).
- [ ] Reimport insert-only: já importadas marcadas; confirmar não duplica; resumo 0/3 (Cenários 3–4/RN10).
- [ ] Estrangeira convertida (PTAX da data) + original/moeda/taxa preservados; BRL editável (Cenário 5/C14).
- [ ] IOF em linha separada BRL entra como compra própria (Cenário 6/RN13).
- [ ] Câmbio indisponível → sugerido 0 + pendente; confirmar com BRL≤0 grava `Amount=0` pendente, fora dos totais; nunca aborta (Cenário 7/C15).
- [ ] Conta CREDIT sem cartão de destino: suas linhas não são enviadas; outras contas importam (Cenário 8/C7).
- [ ] Parcelas editadas N>1: persiste `InstallmentsCount=N` (aviso é UI) (Cenário 9/C10).
- [ ] Estado vazio: período sem compras de cartão → sem erro (Cenário 10/C16).
- [ ] Prazo ausente/inválido / janela > 24 meses barra antes do Visor (Cenário 11/C3).
- [ ] Sem conexão / vínculo expirado orienta (re)conectar; nada importado (Cenário 12/C2/C17).
- [ ] Falha do Visor no preview → sem preview parcial, nada persistido (Cenário 13/C18).
- [ ] Confirmação atômica: falha na persistência → nada criado; retry não duplica (Cenário 14/C19).
- [ ] Cartão removido entre preview e confirm → rejeita tudo, nada persiste (Cenário 15/C20).
- [ ] Marcador "NN/NN" read-only; compra continua 1x por padrão (Cenário 16/C6).
- [ ] Fatura distingue origem Visor e expõe moeda/valor originais (C21).

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Domínio — rastreabilidade de câmbio/importação em `CreditCardPurchase`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 1):** construtor manual preservado na assinatura (call-sites confirmados via grep); novo construtor de importação espelha `Transaction.cs` (sentinela `Amount=0` p/ pendente, `ThrowIfNullOrWhiteSpace(externalId)`); `Category` obrigatória só no construtor de importação (como especificado). 5 testes novos; suite total 204 passed/0 failed. Sem commit por etapa (política — commit único no fechamento).

**Objetivo:** preparar o modelo da compra para receber lançamentos do Visor com identidade externa e rastreabilidade de moeda/câmbio, mantendo `Amount` sempre em BRL. Base de tudo; puramente domínio, sem estado externo.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Domain/Models/CreditCardPurchase.cs` (alterado)
- `backend/src/MzFinance.UnitTests/Domain/Entities/CreditCardPurchaseVisorTests.cs` (novo)

**O que implementar:**
- Adicionar propriedades (espelhando `Transaction` da 004): `OriginalCurrency` (string, get privado), `OriginalAmount` (decimal), `ExchangeRate` (decimal?), `ExchangeRateDate` (DateOnly?), `ExternalId` (string?), `ExchangeReviewPending` (bool). Manter `Amount` como magnitude **em BRL**, não-nullable.
- **Construtor manual existente** (`CreditCardPurchase(CreditCard, decimal amount, DateOnly, int, string?, string?)`): preservar a assinatura e preencher defaults coerentes → `OriginalCurrency="BRL"`, `OriginalAmount=amount`, `ExchangeRate/ExchangeRateDate/ExternalId` nulos, `ExchangeReviewPending=false`. O `protected CreditCardPurchase()` deve inicializar `OriginalCurrency = string.Empty` (padrão do `Transaction()` protegido, p/ EF).
- **Novo construtor de importação**: `(CreditCard creditCard, decimal amountBrl, decimal originalAmount, string originalCurrency, decimal? exchangeRate, DateOnly? exchangeRateDate, DateOnly purchaseDate, int installmentsCount, string? description, string category, string externalId, bool exchangeReviewPending)`. Regras: `ArgumentException.ThrowIfNullOrWhiteSpace(externalId)`; setar `OriginalAmount/OriginalCurrency/ExternalId/ExchangeReviewPending`; **sentinela** — se `exchangeReviewPending` → `Amount=0`, `ExchangeRate=null`, `ExchangeRateDate=null`; senão `Amount=amountBrl`, `ExchangeRate=exchangeRate`, `ExchangeRateDate=exchangeRateDate`. (Espelha o 2º construtor de `Transaction.cs` linhas 39–80.)
- **Não** alterar o método `Update()` (edição manual é insert-only-safe e não mexe em câmbio → preserva rastreabilidade). Resolver a pendência (converter de fato) fica fora do escopo — futura "revisão de câmbio".

**Testes Necessários:**
- [ ] `Ctor_Manual_ShouldDefaultToBrlOriginalCurrencyAndNotPendingReview`
- [ ] `Ctor_Import_ShouldSetExternalIdAndTraceabilityFields`
- [ ] `Ctor_ImportForeignCurrency_ShouldKeepAmountInBrlAndPreserveOriginal`
- [ ] `Ctor_ImportPendingReview_ShouldZeroBrlAmountAndNullRate`
- [ ] `Ctor_Import_BlankExternalId_ShouldThrow`

**Critérios de Aceitação:**
- [ ] Ambos os construtores compilam e preenchem os campos conforme acima; construtor manual mantém a assinatura atual (nenhum call-site existente quebra).
- [ ] `dotnet build backend/MzFinance.slnx` sem erros.
- [ ] `dotnet test backend/MzFinance.slnx` verde.

**Dependências:** Nenhuma
**Paralelizável:** Não (base do resto)

---

### ETAPA 2: Persistência — `CreditCardPurchaseMap` + migração (colunas, backfill, índice único filtrado)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 2):** migração `20260707172602_AddVisorFieldsToCreditCardPurchase` com defaults + backfill (`OriginalAmount=Amount`) e índice único filtrado; **preservado o índice de FK `IX_CreditCardPurchases_CreditCardId`** com `HasIndex` explícito (o EF ia dropá-lo em favor do composto filtrado, que não cobre compras manuais `ExternalId IS NULL`). `--context MzFinanceContext` necessário (dois DbContexts). `database update` NÃO aplicado (validação no /test-e2e). Suite 205/205. ⚠️ Handoff ao tech-lead: build criou dirs literais `bin\Debug` (escapam do .gitignore) — removidos manualmente, causa raiz não investigada.

**Objetivo:** materializar os campos novos no schema, com backfill não destrutivo das compras existentes e a blindagem de deduplicação por índice único filtrado.

**Complexidade:** 🟡 Média (migração com backfill + índice parcial no PostgreSQL)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/Maps/CreditCardPurchaseMap.cs` (alterado)
- `backend/src/MzFinance.Infra/Migrations/*_AddVisorFieldsToCreditCardPurchase.cs` (novo)
- `backend/src/MzFinance.Infra/Migrations/MzFinanceContextModelSnapshot.cs` (regenerado pelo EF)

**O que implementar:**
- No `CreditCardPurchaseMap` (espelhar `TransactionMap.cs` linhas 22–42): `OriginalCurrency` `IsRequired().HasMaxLength(3)`; `OriginalAmount` `IsRequired().HasColumnType("decimal(18,2)")`; `ExchangeRate` `HasColumnType("decimal(18,6)")` (nullable); `ExchangeRateDate` nullable; `ExternalId` `HasMaxLength(64)` (nullable); `ExchangeReviewPending` `IsRequired()`.
- **Índice único filtrado** (ADR 0011 D3): `builder.HasIndex(x => new { x.CreditCardId, x.ExternalId }).IsUnique().HasFilter("\"ExternalId\" IS NOT NULL")`. (Nota: `CreditCardId` já é FK indexada via `CreditCardMap.HasMany`; este índice composto filtrado não substitui o de FK, então **não** removê-lo — comportamento análogo ao comentário do `TransactionMap` sobre `HasIndex(UserId)`.)
- Gerar migração: `dotnet ef migrations add AddVisorFieldsToCreditCardPurchase -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi`.
- **Editar o `Up`** (espelhar `20260707030844_AddVisorTransactionFields.cs`): defaults na criação (`OriginalCurrency` default `'BRL'`, `OriginalAmount` default `0`, `ExchangeReviewPending` default `false`) e **backfill** `migrationBuilder.Sql("UPDATE \"CreditCardPurchases\" SET \"OriginalAmount\" = \"Amount\";")`. Índice criado com `filter: "\"ExternalId\" IS NOT NULL"`.
- Verificar `Down`: drop do índice + drop das colunas (reversível).

**Testes Necessários:**
- [ ] `SaveImportedPurchase_ShouldPersistTraceabilityFields` (InMemory — round-trip do mapeamento; o índice parcial não é exercido pelo InMemory, validar aplicando a migração no `/test-e2e`).

**Critérios de Aceitação:**
- [ ] `dotnet ef database update` sobe as colunas e faz backfill sem perda; compras existentes ficam `OriginalCurrency='BRL'`, `OriginalAmount=Amount`, taxa/data/externalId nulos, `ExchangeReviewPending=false`.
- [ ] `Down` reverte sem erro.
- [ ] Build + testes verdes.

**Dependências:** ETAPA 1
**Paralelizável:** Não (migração — mudança de schema; ordem linear das migrações)

---

### ETAPA 3: Aplicação — rastreabilidade de origem/câmbio na fatura (`CreditCardBillItemResponse`)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 3, paralela):** contrato 100% aditivo; `OriginalCurrency/OriginalAmount/ExchangeReviewPending` como `required` (padrão `TransactionResponse`), `ExternalId` nullable (null = manual). `CreditCardBillingCalculator` intocado — teste confirma item pendente em `Items` com `InstallmentAmount=0` sem inflar `bill.Total`. +3 testes.

**Objetivo:** levar a origem (Visor vs. manual) e a moeda/valor originais ao contrato da fatura (aditivo/retrocompatível) para a UI distinguir e mostrar "US$105,91 → R$…" mantendo o principal em BRL (C21/RN18).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Dtos/CreditCards/CreditCardBillResponse.cs` (alterado)
- `backend/src/MzFinance.Application/Queries/CreditCards/GetCreditCardBill/GetCreditCardBillQueryHandler.cs` (alterado)
- `backend/src/MzFinance.UnitTests/Application/Queries/CreditCards/GetCreditCardBillQueryHandlerTests.cs` (alterado)

**O que implementar:**
- Em `CreditCardBillItemResponse`, adicionar: `ExternalId` (string?), `OriginalCurrency` (string), `OriginalAmount` (decimal), `ExchangeReviewPending` (bool). (`OriginalCurrency`/`OriginalAmount` sempre presentes pós-migração; `ExternalId` nulo ⇒ compra manual.)
- Na projeção do `GetCreditCardBillQueryHandler` (`.Select(occurrence => new CreditCardBillItemResponse {...}`), preencher os campos novos a partir de `purchase.ExternalId`/`OriginalCurrency`/`OriginalAmount`/`ExchangeReviewPending`.
- **Totais:** nenhuma mudança nos somatórios — a compra pendente tem `Amount=0` (sentinela), logo `InstallmentAmount=0` e não infla `bill.Total` nem os `Items` (aparece com R$0,00, marcada na UI — ETAPA 10). Não alterar `CreditCardBillingCalculator`.

**Testes Necessários:**
- [ ] `GetBill_VisorForeignPurchase_ShouldProjectExternalIdOriginalAndFlag`
- [ ] `GetBill_ManualPurchase_ShouldProjectNullExternalIdAndBrlOriginal`
- [ ] `GetBill_PendingReviewPurchase_ShouldProjectZeroInstallmentAndFlag` (fora do total)

**Critérios de Aceitação:**
- [ ] Contrato aditivo (nada removido/renomeado); `bill.Total` inalterado para os casos existentes.
- [ ] Origem Visor e original/moeda projetados por item.
- [ ] Build + testes verdes.

**Dependências:** ETAPA 2 (campos existem)
**Paralelizável:** Sim (independente de ETAPA 4 e 5)

---

### ETAPA 4: Aplicação — `PreviewVisorCardImportQuery` + Validator + DTOs (leitura, não persiste)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 3, paralela):** uma única chamada `Type=Expense` + filtro `AccountId ∈ CREDIT` + guarda `Amount>0`; dedup escopado ao usuário (linha ainda sem cartão de destino); regex do marcador pega a **última** ocorrência "NN/NN" (testado com data e parcela na mesma descrição); `Accounts` derivado por `DistinctBy` dos itens; `VisorCardImportPreviewAccount` nested no arquivo do response. +11 testes. Nota do dev p/ review: cenários de validação combinados num único método com múltiplos asserts (vs. métodos separados do molde 004).

**Objetivo:** montar o preview das compras de cartão do Visor: valida vínculo; identifica contas CREDIT; busca `type=expense` paginando; mantém só linhas de conta CREDIT e valor positivo; converte estrangeiras (sugestão BRL); sugere categoria; marca já-importadas por `ExternalId` (escopo usuário); agrupa por conta. **Nada persiste.**

**Complexidade:** 🟡 Média (regra de negócio; reusa portas da 004 — molde `PreviewVisorImportQueryHandler`)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Queries/Visor/PreviewVisorCardImport/PreviewVisorCardImportQuery.cs` (novo)
- `.../PreviewVisorCardImportQueryHandler.cs` (novo)
- `.../PreviewVisorCardImportQueryValidator.cs` (novo)
- `backend/src/MzFinance.Application/Dtos/CreditCards/VisorCardImportPreviewItem.cs` (novo)
- `backend/src/MzFinance.Application/Dtos/CreditCards/VisorCardImportPreviewResponse.cs` (novo)
- `backend/src/MzFinance.UnitTests/Application/Queries/Visor/PreviewVisorCardImport/PreviewVisorCardImportQueryHandlerTests.cs` (novo)
- `.../PreviewVisorCardImportQueryValidatorTests.cs` (novo)

**O que implementar:**
- **Query** (`RequestBase<VisorCardImportPreviewResponse>`, padrão `PreviewVisorImportQuery`): `StartDate` (DateOnly?), `EndDate` (DateOnly?), `IncludeIgnored` (bool), `Search` (string?). **Sem** `Type` (cartão só importa despesa) e **sem** cartão de destino (escolhido na UI depois do preview). `IsValid()` chama o Validator.
- **Validator** (espelhar `PreviewVisorImportQueryValidator`): `StartDate`/`EndDate` `NotNull`; `EndDate >= StartDate`; **janela ≤ 24 meses**; `Search` `MaximumLength(200)`.
- **DTO `VisorCardImportPreviewItem`** (espelhar `VisorImportPreviewItem`, adaptado a cartão): `AccountId` (string), `AccountName` (string?), `ExternalId` (string), `Date` (DateOnly), `Description` (string), `OriginalCurrency` (string), `OriginalAmount` (decimal), `SuggestedCategory` (string), `SuggestedAmountBrl` (decimal), `ExchangeRate` (decimal?), `ExchangeRateDate` (DateOnly?), `ExchangeReviewPending` (bool), `InstallmentMarker` (string?, ex.: "08/10" — read-only), `AlreadyExists` (bool). **Sem** `Type` (não há tipo em compra).
- **DTO `VisorCardImportPreviewResponse`**: `Items` (lista), `Accounts` (lista de `{ AccountId, AccountName }` distintos presentes nos itens — para a UI montar o mapeamento conta→cartão), `TotalFound`, `NewCount`, `ExistingCount`.
- **Handler** (`MzFinanceReadOnlyContext` + `ICurrentUserService` + `INotificationService` + `IVisorMcpClient` + `IExchangeRateProvider` + `IVisorTokenProvider` + `ILogger`; molde `PreviewVisorImportQueryHandler`):
  1. Resolver `userId`; se usuário não existe → `Notify(NotFound)` + preview vazio.
  2. **Gate de conexão**: `try { await _tokenProvider.GetValidAccessTokenAsync(userId, ct); }` → `VisorNotConnectedException` → `Notify(Conflict, "Conecte sua conta do Visor para importar compras de cartão.")` (C2/CE01); `VisorReauthRequiredException` → `Notify(Conflict, "Sua conexão com o Visor expirou. Reconecte para continuar.")` (C17/CE02); `VisorIntegrationException` → `Notify(RequestHandler, "Não foi possível se comunicar com o Visor. Tente novamente.")` (CE07). Todos retornam preview vazio, **sem** chamar dados.
  3. **Buscar**: `accounts = await _visorClient.GetAccountsAsync(userId, ct)`; `fetched = await _visorClient.GetTransactionsAsync(userId, query, ct)` com `query.Type = TransactionType.Expense` (uma única chamada — DE2/RN05), paginado internamente. Envolver em `try/catch VisorIntegrationException` → `Notify(RequestHandler, ...)` + preview vazio (C18/CE07).
  4. **Manter só cartão** (inverso da 004): `creditAccountIds = accounts.Where(a => a.IsCreditCard).Select(a => a.Id).ToHashSet(Ordinal)`; `cardItems = fetched.Where(x => x.AccountId != null && creditAccountIds.Contains(x.AccountId) && x.Amount > 0)`. (O `Amount > 0` é guarda defensiva de RN05 — o contrato já garante positivo.)
  5. **Dedup (marcação)**: carregar `ExternalId`s já importados **escopados ao usuário** — `_context.CreditCardPurchases.Where(p => p.CreditCard!.UserId == userId && p.ExternalId != null && ids.Contains(p.ExternalId)).Select(p => p.ExternalId!)`. `AlreadyExists = existing.Contains(dto.ExternalId)` (ADR 0011 D3). Dedup intra-lote com `HashSet` (a chamada única já não repete, mas manter a guarda do molde).
  6. **Conversão** (idêntica ao molde `ConvertAsync`, cache por `(Currency, Date)`): `Currency=="BRL"` → `(Amount, null, null, false)`; senão `IExchangeRateProvider.GetRateToBrlAsync` — `null` → `(0, null, null, true)` (pendente), senão `(round(Amount*Rate,2), Rate, RateDate, false)`.
  7. **Categoria sugerida**: `VisorImportCategory.Resolve(dto.CategoryName)` (reuso).
  8. **Marcador de parcela**: extrair "NN/NN" da descrição por regex (ex.: `Regex.Match(desc, @"\b(\d{1,2}/\d{1,2})\b")` — pegar a última ocorrência para robustez); apenas exibição (ADR 0011 D5). Se não casar → `null`.
  9. Montar `Items`, `Accounts` (distintos), contar `ExistingCount`/`NewCount`; log sem dados sensíveis (só contagens/ids). Retornar.

**Testes Necessários:** (NSubstitute nas portas + InMemory)
- [ ] `Preview_CreditAccountsOnly_ShouldKeepOnlyCardExpenses` (exclui contas não-CREDIT)
- [ ] `Preview_ExpenseCallOnly_ShouldNotFetchIncome` (uma chamada, `type=expense`)
- [ ] `Preview_ForeignPurchase_ShouldSuggestBrlAndPreserveOriginal`
- [ ] `Preview_RateUnavailable_ShouldFlagPendingWithZeroBrl`
- [ ] `Preview_AlreadyImported_ShouldMarkAcrossUserCards` (dedup escopo usuário, cartão diferente)
- [ ] `Preview_InstallmentMarkerInDescription_ShouldExposeReadOnly`
- [ ] `Preview_NotConnected_ShouldNotifyAndNotFetch`
- [ ] `Preview_LinkExpired_ShouldNotifyReconnect`
- [ ] `Preview_VisorFailure_ShouldReturnEmptyNoPartial`
- [ ] `Preview_EmptyPeriod_ShouldReturnEmptyNoError`
- [ ] `Preview_MissingOrInvalidDateRange_ShouldFailValidation` + janela > 24 meses

**Critérios de Aceitação:**
- [ ] Só compras de contas CREDIT e valor positivo; nada persiste; agrupamento por conta disponível.
- [ ] Estrangeiras convertidas/ sinalizadas; já-importadas marcadas por usuário; marcador read-only presente.
- [ ] Gate de conexão e falha do Visor tratados sem preview parcial.
- [ ] Build + testes verdes.

**Dependências:** ETAPA 2 (campo `ExternalId`/pendência em `CreditCardPurchase` para a checagem de já-importadas). Runtime: portas da 004 (já em produção).
**Paralelizável:** Sim (independente de ETAPA 3 e 5)

---

### ETAPA 5: Aplicação — `ConfirmVisorCardImportCommand` + Validator + Handler + resumo

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 3, paralela):** C20 + RN17/C22 cobertos pelo mesmo guard-clause (dicionário de cartões filtrado por `UserId`; qualquer `CreditCardId` fora dele ⇒ `Notify(Conflict)` + nada persiste); sentinela de câmbio delegada ao construtor de importação (sem lógica duplicada); um único `SaveChangesAsync` insert-only; `ImportVisorSummaryResponse` reusado sem alteração. +15 testes (8 handler, 7 validator). **Fechamento da onda 3:** merges --no-ff sem conflito; integrado 234/234 verde; efêmeras removidas.

**Objetivo:** persistir as linhas revisadas do preview como `CreditCardPurchase` no cartão de destino escolhido — insert-only, atômico, sem falar com o Visor; valida cartões do usuário (C20 = rejeita tudo se algum sumiu); dedup por `ExternalId` escopado ao usuário; sentinela de câmbio.

**Complexidade:** 🟡 Média (molde `ConfirmVisorImportCommandHandler` + validação de cartão de destino)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Commands/CreditCards/ConfirmVisorCardImport/ConfirmVisorCardImportCommand.cs` (novo)
- `.../ConfirmVisorCardImportItem.cs` (novo)
- `.../ConfirmVisorCardImportCommandHandler.cs` (novo)
- `.../ConfirmVisorCardImportCommandValidator.cs` (novo)
- `backend/src/MzFinance.UnitTests/Application/Commands/CreditCards/ConfirmVisorCardImport/ConfirmVisorCardImportCommandHandlerTests.cs` (novo)
- `.../ConfirmVisorCardImportCommandValidatorTests.cs` (novo)

**O que implementar:**
- **Command** (`RequestBase<ImportVisorSummaryResponse>` — **reusar** `Dtos/Transactions/ImportVisorSummaryResponse.cs`, cujos campos `Found/Imported/SkippedExisting/ImportedPendingExchangeReview` cobrem C12/C15): `Items` (`List<ConfirmVisorCardImportItem>`). `IsValid()` chama o Validator.
- **`ConfirmVisorCardImportItem`** (espelhar `ConfirmVisorImportItem`, adaptado a cartão): `CreditCardId` (Guid — destino da linha), `ExternalId` (string), `PurchaseDate` (DateOnly), `Description` (string?), `Category` (string), `InstallmentsCount` (int), `AmountBrl` (decimal — `<=0` marca pendente), `OriginalCurrency` (string), `OriginalAmount` (decimal), `ExchangeRate` (decimal?), `ExchangeRateDate` (DateOnly?). **Sem** `Type`.
- **Validator** (espelhar `ConfirmVisorImportCommandValidator` + `CreateCreditCardPurchaseCommandValidator`): `Items` `NotEmpty` + teto (ex.: `MaxItems = 5000`); `RuleForEach`: `CreditCardId NotEqual(Guid.Empty)`, `ExternalId NotEmpty`, `OriginalCurrency NotEmpty().MaximumLength(3)`, `AmountBrl GreaterThanOrEqualTo(0)`, `InstallmentsCount GreaterThanOrEqualTo(1)`, `Description MaximumLength(500)`, `Category MaximumLength(100)`, `PurchaseDate NotEqual(default)`.
- **Handler** (`MzFinanceContext` write + `ICurrentUserService` + `INotificationService` + `ILogger`; molde `ConfirmVisorImportCommandHandler`):
  1. Carregar `user`; ausente → `Notify(NotFound)` + `EmptySummary`.
  2. **Validar cartões de destino (C20 — ADR 0011 D4)**: `neededCardIds = items.Select(i => i.CreditCardId).Distinct()`; carregar `cards = _context.CreditCards.Where(c => c.UserId == user.Id && neededCardIds.Contains(c.Id))` para um dicionário. Se **algum** `CreditCardId` referenciado não estiver no dicionário → `Notify(Conflict, "O cartão de destino não está mais disponível.")` (CE09) e retornar `EmptySummary` **sem persistir nada** (rejeita a operação inteira).
  3. **Dedup (insert-only, escopo usuário)**: carregar `ExternalId`s já persistidos — `_context.CreditCardPurchases.Where(p => p.CreditCard!.UserId == user.Id && p.ExternalId != null && ids.Contains(p.ExternalId)).Select(...)`; `seen = HashSet(existing)`. Iterar itens: se `!seen.Add(item.ExternalId)` → `skippedExisting++` e pular.
  4. **Sentinela de câmbio**: `reviewPending = item.AmountBrl <= 0`; se true → `pendingReview++`.
  5. **Criar** `CreditCardPurchase` pelo **construtor de importação** (ETAPA 1), usando `cards[item.CreditCardId]`, `VisorImportCategory.Resolve(item.Category)`, `installmentsCount = item.InstallmentsCount`. `Add` na lista.
  6. Se houver itens → `_context.CreditCardPurchases.AddRange(toInsert)` + **um** `SaveChangesAsync` (atômico, insert-only — C19). Como só há inserts, o `SaveChanges` único basta (Decisão 8 do PLAN 004).
  7. Log sem dados sensíveis; retornar `ImportVisorSummaryResponse { Found = Items.Count, Imported = toInsert.Count, SkippedExisting = skipped, ImportedPendingExchangeReview = pendingReview }`.

**Testes Necessários:** (InMemory)
- [ ] `Confirm_HappyPath_ShouldCreatePurchasesOnChosenCards` (Cenário 1)
- [ ] `Confirm_Reimport_ShouldSkipExistingAndNotDuplicate` (Cenários 3–4/RN10)
- [ ] `Confirm_EditedManualPurchase_ShouldNotBeAltered` (insert-only preserva edição)
- [ ] `Confirm_ForeignPurchase_ShouldPersistOriginalAndRate` (Cenário 5)
- [ ] `Confirm_AmountBrlZero_ShouldPersistPendingWithZeroAmount` (Cenário 7/C15)
- [ ] `Confirm_InstallmentsGreaterThanOne_ShouldPersistInstallmentsCount` (Cenário 9/C10)
- [ ] `Confirm_TargetCardRemoved_ShouldRejectWholeAndPersistNothing` (Cenário 15/C20)
- [ ] `Confirm_TargetCardOfAnotherUser_ShouldReject` (RN17/C22)
- [ ] `Confirm_EmptyItems_ShouldFailValidation`

**Critérios de Aceitação:**
- [ ] Insert-only atômico; nenhuma compra existente alterada/apagada em reimport.
- [ ] C20: qualquer cartão de destino inválido/ausente → nada persiste, mensagem clara.
- [ ] Pendente de câmbio persiste com `Amount=0` (fora dos totais).
- [ ] Build + testes verdes.

**Dependências:** ETAPA 1 (construtor de importação), ETAPA 2 (persistência)
**Paralelizável:** Sim (independente de ETAPA 3 e 4)

---

### ETAPA 6: WebApi — endpoints de import de cartão no `VisorController`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 4):** `CardImportPreview`/`CardImportConfirm` no molde fino dos vizinhos da 004 (`mediator.Send` + `ProcessResponse`); zero mudança de DI (scan do MediatR). 234/234. Smoke do endpoint fica para o /test-e2e.

**Objetivo:** expor a superfície HTTP do import de cartão (preview + confirm), autenticada por JWT, no controller que já concentra o import da 004.

**Complexidade:** 🟢 Baixa (endpoints finos — só `mediator.Send` + `ProcessResponse`)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.WebApi/Controllers/VisorController.cs` (alterado)

**O que implementar:**
- **`POST /api/visor/card-import/preview`** (JWT) → `[FromBody] PreviewVisorCardImportQuery query` → `ProcessResponse(await _mediator.Send(query, ct))`. (Molde exato do `ImportPreview` da 004, linhas 59–64.)
- **`POST /api/visor/card-import/confirm`** (JWT) → `[FromBody] ConfirmVisorCardImportCommand command` → `ProcessResponse(await _mediator.Send(command, ct))`. (Molde do `ImportConfirm`, linhas 69–74.)
- Adicionar os `using` das namespaces novas (`Queries/Visor/PreviewVisorCardImport`, `Commands/CreditCards/ConfirmVisorCardImport`). Nenhuma mudança de DI: as portas (`IVisorMcpClient`/`IExchangeRateProvider`/`IVisorTokenProvider`) já estão registradas em `VisorIntegrationConfiguration` pela 004; os handlers novos são captados pelo scan do MediatR.
- O gate de conexão fica no **handler** (ETAPA 4), não no controller — coerente com a 004.

**Testes Necessários:** endpoints finos — cobertura via handlers (ETAPAs 4/5) + `/test-e2e`. Sem novo unit test obrigatório (padrão dos controllers atuais, sem teste unitário).

**Critérios de Aceitação:**
- [ ] Ambos exigem JWT (herdam `[Authorize]` da base); respondem no envelope `DataActionResult`.
- [ ] Build verde; smoke manual no `/test-e2e`.

**Dependências:** ETAPA 4, ETAPA 5
**Paralelizável:** Não (depende dos dois handlers)

---

### ETAPA 7: Frontend — `credit-cards/api.ts` (tipos + endpoints do import de cartão)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 5):** tipos conferidos 1:1 contra os DTOs C# reais (não contra o PLAN isolado); `ImportVisorSummary` importado de `../transactions/api` (não duplicado); helpers de conexão NÃO reexportados (a ETAPA 9 importa direto de transactions/api — menor diff). `npm run build` verde (com `npm install` inicial no worktree).

**Objetivo:** estender a camada de acesso a dados do módulo de Cartões com os tipos e as funções do import do Visor, reusando os helpers de conexão da 004. Sem tocar UI ainda.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/credit-cards/api.ts` (alterado)

**O que implementar:**
- Em `CreditCardBillItem`, adicionar os campos aditivos da ETAPA 3: `externalId: string | null`, `originalCurrency: string`, `originalAmount: number`, `exchangeReviewPending: boolean`.
- Tipos novos (espelhar `transactions/api.ts`): `VisorCardImportPreviewItem { accountId; accountName: string | null; externalId; date; description; originalCurrency; originalAmount; suggestedCategory; suggestedAmountBrl; exchangeRate: number | null; exchangeRateDate: string | null; exchangeReviewPending; installmentMarker: string | null; alreadyExists }`; `VisorCardImportPreviewAccount { accountId; accountName: string | null }`; `VisorCardImportPreview { items; accounts; totalFound; newCount; existingCount }`; `PreviewVisorCardInput { startDate; endDate; includeIgnored; search? }`; `ConfirmVisorCardItemInput { creditCardId; externalId; purchaseDate; description: string | null; category; installmentsCount; amountBrl; originalCurrency; originalAmount; exchangeRate: number | null; exchangeRateDate: string | null }`; reusar `ImportVisorSummary` (importar de `../transactions/api`).
- Funções: `previewVisorCardImport(input): Promise<VisorCardImportPreview>` (`POST /api/visor/card-import/preview`); `confirmVisorCardImport(items): Promise<ImportVisorSummary>` (`POST /api/visor/card-import/confirm`, body `{ items }`).
- **Conexão**: reusar `getVisorConnectionState` e `requestVisorConnectTicket` importando de `../transactions/api` (já existem — não duplicar). Reexportar os tipos `VisorConnectionStatus`/`ImportVisorSummary` conforme necessário.

**Testes Necessários:** sem framework de teste no frontend. Critério = `npm run build --prefix frontend` (tsc) verde.

**Critérios de Aceitação:**
- [ ] Tipos e funções compilam; `CreditCardBillItem` cobre os campos de origem/câmbio.
- [ ] `npm run build --prefix frontend` verde.

**Dependências:** ETAPA 6 (contratos reais no backend para integração)
**Paralelizável:** Sim (lane de frontend)

---

### ETAPA 8: Frontend — `ImportVisorCardModal` (3 fases, escolha de cartão por conta, edição por linha)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 6):** molde `ImportVisorModal` adaptado (sem pills de tipo; agrupamento por conta com `Select` de destino; linhas de conta sem cartão desabilitadas com `Feedback info`; aviso de dupla contagem em N>1; `paraFields` com 3 colunas valor/data/parcelas; CSS morto das pills removido). Build + lint verdes. Notas p/ review: sem "selecionar todas" global (fora do critério; aditivo futuro) e cor do aviso usa `--color-down` (não há token `--color-warning`) — validar semântica.

**Objetivo:** construir o modal de importação de compras de cartão em 3 fases (filtros → preview agrupado por conta com escolha de cartão de destino + edição por linha → resumo), reusando o Design System e o padrão de `ImportVisorModal.tsx`.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/features/credit-cards/components/ImportVisorCardModal.tsx` (novo)
- `frontend/src/features/credit-cards/components/ImportVisorCardModal.module.css` (novo)

**O que implementar:**
- Props: `open`, `onClose`, `onImported` (callback p/ a página recarregar fatura/projeção/cartões), `cards: CreditCard[]` (cartões já carregados na página, para os Selects de destino).
- **Fase filtros**: **prazo** (dois `Input type="date"`, obrigatórios), **busca** (opcional), **toggle "incluir ignoradas"**. **Sem** pills de tipo (cartão só importa despesa — C1). Validação client-side do prazo (final ≥ inicial) espelhando o backend (autoridade). Hint: "Pagamentos de fatura e estornos ficam de fora — só compras entram."
- **Fase preview**: agrupar `preview.items` por `accountId` (usando `preview.accounts` para os cabeçalhos). Para **cada conta**, um `Select` de **cartão de destino** populado por `cards` (C8); a conta sem destino escolhido tem suas linhas desabilitadas para seleção e um aviso "Escolha um cartão para importar as compras desta conta." (C7/CE05). Por **linha** (molde `EditableRow`): checkbox de seleção; lado "de" (Visor, read-only: descrição, `formatCurrencyIn(originalAmount, originalCurrency)`, data, `installmentMarker` como badge/informação — C6/Cenário 16, badges "Já importada"/"Informe o valor em BRL"); lado "para" editável: descrição, **valor R$** (`Input number`; vazio quando `exchangeReviewPending`), data, **parcelas** (`Input number min=1`) e categoria (`ComboBox` com `getCategories()`). Já-importadas começam **desmarcadas** (`selected = !alreadyExists`).
- **Aviso de dupla contagem (C10/RN07)**: quando o usuário edita parcelas de uma linha para **N>1**, exibir aviso explícito na linha ("O mz-finance projetará N parcelas a partir desta compra; parcelas futuras deste plano chegarão como novos lançamentos em imports futuros e podem contar em dobro."). Padrão continua 1x.
- **Confirmar**: montar `ConfirmVisorCardItemInput[]` só das linhas **marcadas de contas com cartão escolhido**, carimbando `creditCardId` = cartão da conta e `amountBrl = Number(row.amountBrl) || 0`, `installmentsCount = Number(row.installments) || 1`. `confirmVisorCardImport(items)`; enquanto processa, botão em loading; erros do backend → `Feedback` (CE01/CE02/CE09); sucesso → **fase resumo** (`imported` / `skippedExisting` / `importedPendingExchangeReview`, com `Feedback info` para pendentes — C15). Se `imported > 0`, chamar `onImported()`.
- **Estados**: carregando/vazio (`EmptyState` "Nenhuma compra de cartão encontrada para importar neste período" — C16)/erro (`Feedback`).

**Testes Necessários:** `npm run build --prefix frontend` (tsc) verde.

**Critérios de Aceitação:**
- [ ] 3 fases; prazo obrigatório barrado client-side; sem filtro de tipo.
- [ ] Escolha de cartão de destino por conta; conta sem cartão orienta e não importa; demais importam (C7/C8).
- [ ] Edição por linha (incl. parcelas) + aviso de dupla contagem para N>1 (C10).
- [ ] Sinalização de pendência de câmbio; resumo pós-import; CSS Modules (sem Tailwind).
- [ ] `npm run build --prefix frontend` verde.

**Dependências:** ETAPA 7
**Paralelizável:** Não (precisa do api.ts)

---

### ETAPA 9: Frontend — botão "Importar compras do Visor" + gate Conectar/Reconectar na `CreditCardsPage`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 7):** gate e retorno OAuth espelham `TransactionsPage` (`useSearchParams`, `?visor=` com limpeza `replace:true`, connect-ticket + redirect full-page); botão desabilitado sem cartões com `title` nativo (padrão da página; `Feedback info` dedicado seria decisão de UX extra); `onImported` → `Promise.all(loadBill, loadForecast, loadCards)`; sem CSS novo (`headerActions` reusado). Build + lint verdes.

**Objetivo:** integrar o modal à tela de Cartões: botão no header, gate de conexão (conectar/reconectar reusando a 004), retorno do OAuth e reload de fatura/projeção/cartões após import.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/features/credit-cards/CreditCardsPage.tsx` (alterado)
- `frontend/src/features/credit-cards/CreditCardsPage.module.css` (alterado, se preciso)

**O que implementar:**
- No `header`/`headerActions` (ao lado de "Nova compra"), botão **"Importar do Visor"** (`Button variant="secondary"`).
- Ao clicar: `getVisorConnectionState()` (importado de `../transactions/api`).
  - `Connected` → abrir `ImportVisorCardModal` (passando `cards`).
  - `NotConnected`/`Expired`/`Revoked` → afordância **Conectar/Reconectar**: `requestVisorConnectTicket()` → `window.location.assign(loginUrl)` (navegação full-page, padrão D2 da 004). Ao voltar do callback com `?visor=connected`, reconsultar o estado e abrir o modal; `?visor=error` → `Feedback`.
  - Enquanto não há cartões cadastrados, o import fica desabilitado com dica de cadastrar cartão antes (C7 no nível macro).
- Detectar retorno do OAuth: ler `?visor=` da URL no mount e reagir (limpar o query param depois). Espelhar o mecanismo já usado pela `TransactionsPage` da 004.
- `onImported` do modal → `Promise.all([loadBill(), loadForecast(), loadCards()])` (o resumo já é mostrado no modal).

**Testes Necessários:** `npm run build --prefix frontend` verde + verificação manual no `/test-e2e`.

**Critérios de Aceitação:**
- [ ] Botão presente; import bloqueado e orientado quando não conectado/expirado (C2/C17).
- [ ] Fatura/projeção/cartões recarregam após import.
- [ ] `npm run build --prefix frontend` verde.

**Dependências:** ETAPA 7, ETAPA 8
**Paralelizável:** Não

---

### ETAPA 10: Frontend — rastreabilidade de origem/câmbio nas linhas de fatura

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

> **Observações da Implementação (onda 8):** padrão 1:1 da `TransactionsPage` da 004 (`itemTitleRow`, `.pendingValue`); pendente mostra o valor ORIGINAL como principal + badge "Revisão de câmbio" ("fora da fatura"). Nota: o detalhe estrangeiro NÃO mostra taxa/data porque `CreditCardBillItemResponse` (ETAPA 3) não expõe `exchangeRate/exchangeRateDate` — dentro do contrato; se quiser o trace completo como na 004, é aditivo na ETAPA 3 + 7 + 10. Build + lint verdes.

**Objetivo:** distinguir na fatura as compras de origem Visor das manuais e mostrar moeda/valor originais como detalhe, sem quebrar o principal em BRL; sinalizar compras pendentes de revisão de câmbio (C21/C15/RN18).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/credit-cards/CreditCardsPage.tsx` (alterado — `renderTransactionRow`/`visibleBillItems`)

**O que implementar:**
- Na linha da fatura (`DataList`/`ListRow` da fatura, ~linhas 498–539 de `CreditCardsPage.tsx`):
  - `item.externalId != null` → `Badge` discreto "Visor" (origem — C21).
  - `item.originalCurrency !== 'BRL'` **e** não pendente → detalhe discreto `formatCurrencyIn(item.originalAmount, item.originalCurrency) + ' → '` antes do `MoneyValue` BRL, ou como `itemMeta` (mantém o principal em BRL — RN18).
  - `item.exchangeReviewPending === true` → **não** exibir R$0,00 como principal (enganoso): mostrar o valor original (`formatCurrencyIn(item.originalAmount, item.originalCurrency)`) como principal + `Badge`/`Feedback` "revisão de câmbio" indicando que não entra nos totais (C15).
- Reusar `formatCurrencyIn` de `shared/formatCurrency.ts` (já existe da 004) — **não** alterar `formatCurrency` (BRL) do resto do app.

**Testes Necessários:** `npm run build --prefix frontend` verde + inspeção visual no `/test-e2e`.

**Critérios de Aceitação:**
- [ ] Linha estrangeira convertida mostra original + BRL; linha BRL inalterada.
- [ ] Linha pendente de câmbio mostra o original + selo "revisão de câmbio" (nunca R$0,00 enganoso).
- [ ] Origem "Visor" distinguível na fatura (C21).
- [ ] `npm run build --prefix frontend` verde.

**Dependências:** ETAPA 7 (tipos), ETAPA 3 (campos na resposta da fatura), ETAPA 9 (mesmo arquivo — serializa a edição de `CreditCardsPage.tsx`)
**Paralelizável:** Não (edita o mesmo arquivo da ETAPA 9)

---

## GRAFO DE DEPENDÊNCIAS (sem ciclos)

```
E1 (Domínio)
  └─ E2 (Migração)
       ├─ E3 (Fatura: rastreabilidade)      [‖ com E4, E5]
       ├─ E4 (Preview query)                [‖ com E3, E5]
       └─ E5 (Confirm command)              [‖ com E3, E4; usa E1]
             E4 + E5 ─ E6 (WebApi endpoints)
                            └─ E7 (Frontend api)
                                 ├─ E8 (Modal)
                                 │    └─ E9 (Página: botão/gate/reload)
                                 │         └─ E10 (Fatura: rastreabilidade UI)  [usa E3]
```

| Etapa | Camada | Dependências | Paralelizável | Arquivos-chave |
|-------|--------|--------------|---------------|----------------|
| E1 | Domínio | — | Não | `Domain/Models/CreditCardPurchase.cs` |
| E2 | Persistência | E1 | Não (migração) | `Infra/Maps/CreditCardPurchaseMap.cs`, `Infra/Migrations/*_AddVisorFieldsToCreditCardPurchase.cs` |
| E3 | Application | E2 | Sim | `Dtos/CreditCards/CreditCardBillResponse.cs`, `Queries/CreditCards/GetCreditCardBill/GetCreditCardBillQueryHandler.cs` |
| E4 | Application | E2 | Sim | `Queries/Visor/PreviewVisorCardImport/*`, `Dtos/CreditCards/VisorCardImportPreview*.cs` |
| E5 | Application | E1, E2 | Sim | `Commands/CreditCards/ConfirmVisorCardImport/*` |
| E6 | WebApi | E4, E5 | Não | `WebApi/Controllers/VisorController.cs` |
| E7 | Frontend | E6 | Sim | `frontend/src/features/credit-cards/api.ts` |
| E8 | Frontend | E7 | Não | `frontend/.../components/ImportVisorCardModal.tsx` (+ `.module.css`) |
| E9 | Frontend | E7, E8 | Não | `frontend/.../credit-cards/CreditCardsPage.tsx` |
| E10 | Frontend | E7, E3, E9 | Não | `frontend/.../credit-cards/CreditCardsPage.tsx` |

---

## DECISÕES TÉCNICAS

> As decisões estruturais estão detalhadas no **ADR 0011**. Resumo:

### Decisão 1: Par preview/confirm novo e dedicado (ADR 0011 D1)
- **Escolhida:** `PreviewVisorCardImportQuery` + `ConfirmVisorCardImportCommand` novos, reusando as **portas** da 004 (`IVisorMcpClient`, `IExchangeRateProvider`, `IVisorTokenProvider`, `VisorImportCategory`).
- **Justificativa:** comportamento inverso ao da 004 (mantém só CREDIT, escreve `CreditCardPurchase`, só despesa). Ramificar o par bancário poluiria o handler mais crítico em produção. Reuso no seam estável (portas), não na orquestração.

### Decisão 2: Rastreabilidade espelha `Transaction`; sentinela `Amount=0` (ADR 0011 D2)
- **Escolhida:** mesmos campos (`ExternalId`, `OriginalCurrency`/`OriginalAmount`, `ExchangeRate`/`ExchangeRateDate`, `ExchangeReviewPending`); `Amount` sempre BRL; pendente → `Amount=0`.
- **Justificativa:** fatura/limite/projeção derivam de `purchase.Amount` — `Amount=0` mantém pendentes fora dos totais **sem alterar** `CreditCardBillingCalculator`, `GetCreditCardBill*`, `GetCreditCards` (zero ripple, igual à 004).

### Decisão 3: Dedup = índice único filtrado `(CreditCardId, ExternalId)` + checagem app por usuário (ADR 0011 D3)
- **Escolhida:** índice de banco no par cartão×externalId (blindagem no mesmo cartão) + checagem autoritativa no handler escopada ao usuário (via `CreditCard.UserId`) para "já importada" e insert-only.
- **Justificativa:** `CreditCardPurchase` não tem `UserId`; não denormalizar evita ripple no construtor manual. Perfil single-user torna a checagem app suficiente para cross-cartão. **Limitação registrada** no ADR.

### Decisão 4: C20 (cartão removido entre preview e confirm) = rejeitar a operação inteira (ADR 0011 D4)
- **Escolhida:** qualquer `CreditCardId` referenciado inválido/ausente → rejeita tudo, persiste nada, mensagem clara (CE09).
- **Justificativa:** atomicidade mais simples (coerente com C19); reenvio barato no single-user; idempotente por `ExternalId`. C7 (conta sem destino) é resolvido na UI (linhas não enviadas), sem bloquear as demais.

### Decisão 5: Marcador "NN/NN" é só informação; default 1x (ADR 0011 D5)
- **Escolhida:** extrair "NN/NN" por regex apenas para exibição; compra default 1x com `Amount` = valor da parcela do mês; edição N>1 permitida com aviso na UI.
- **Justificativa:** sem link por id em `get_installment_plans` (DE3), agrupamento automático é não-confiável (PA1). Consequência de N>1 (calculator divide `Amount` por N) é responsabilidade do usuário, com aviso (C10).

### Decisão 6: Uma única chamada `type=expense` (não duas como a 004)
- **Escolhida:** o preview de cartão chama `GetTransactionsAsync` só com `Type=Expense`; pagamentos/estornos (negativos = income na conta CREDIT — DE2) são naturalmente excluídos; guarda defensiva `Amount > 0`.
- **Justificativa:** cartão não tem filtro receita/despesa (C1) e só importa compras (RN05). Mais simples e barato que o "Ambos = 2 chamadas" da 004.

### Decisão 7: Endpoints no `VisorController` (`/api/visor/card-import/*`); resumo reusa `ImportVisorSummaryResponse`
- **Escolhida:** os dois endpoints entram no `VisorController` (coesão com o import da 004); o resumo reaproveita `Dtos/Transactions/ImportVisorSummaryResponse` (shape idêntico).
- **Justificativa:** menor surpresa (superfície de import Visor num lugar só); reuso antes de novo. A confirmação vive em `Commands/CreditCards/*` por ser domínio de cartão.

---

## RISCOS E MITIGAÇÕES

### Risco 1: `Amount=0` (pendente de câmbio) some visualmente na fatura como R$0,00 enganoso
- **Impacto**: Médio (UX). **Probabilidade**: Média (moedas exóticas / PTAX fora do ar).
- **Mitigação**: ETAPA 10 mostra o valor original + selo "revisão de câmbio" em vez de R$0,00; resumo pós-import conta pendentes (ETAPA 8).

### Risco 2: Dupla contagem ao editar parcelas para N>1
- **Impacto**: Médio (fatura/projeção incorretas se o usuário não ajustar o valor). **Probabilidade**: Baixa/Média.
- **Mitigação**: aviso explícito na linha (C10/ETAPA 8); default 1x; prevenção automática é não-objetivo (PA1). Documentado no ADR 0011 D5.

### Risco 3: Reimport não reprocessa câmbio de compra já importada (insert-only)
- **Impacto**: Baixo/Médio (pendência fica até revisão manual). **Probabilidade**: Baixa.
- **Mitigação**: dedup por `ExternalId` pula a já existente por design (RN10); "revisão de câmbio" é feature futura. Mesma limitação da 004 (Ponto 3 do PLAN 004).

### Risco 4: Mesmo `ExternalId` importado para dois cartões diferentes
- **Impacto**: Baixo (duplicata cross-cartão). **Probabilidade**: Muito baixa (single-user).
- **Mitigação**: checagem app escopada ao usuário barra no confirm; índice de banco cobre o mesmo cartão. Se virar multiusuário concorrente, promover denormalização de `UserId` (ADR 0011 D3).

### Risco 5: Janela grande de import estoura timeout (paginação + muitas cotações)
- **Impacto**: Médio (request falha, mas atômico). **Probabilidade**: Média em períodos longos.
- **Mitigação**: cache de cotações por `(moeda, data)` no handler (molde da 004) + guardrail de 24 meses no Validator (ETAPA 4).

---

## PONTOS DE ATENÇÃO

1. **`CreditCardPurchase` não tem `UserId`** — toda checagem de escopo/ dedup passa por `p.CreditCard.UserId == userId` (join). Garantir o `Include`/navegação nas queries do preview e do confirm.
2. **Sentinela `Amount=0` é o que mantém pendentes fora dos totais** — **não** alterar `CreditCardBillingCalculator` nem os handlers de fatura/limite/projeção; o zero se propaga sozinho (`installmentAmount = 0/N = 0`).
3. **`get_transactions` `type=expense` retorna despesas de TODAS as contas** — filtrar client-side por `AccountId ∈ contas CREDIT` (inverso da 004). Sem esse filtro, entrariam despesas de conta bancária.
4. **O valor do Visor é a PARCELA do mês**, não o total da compra parcelada — por isso default 1x com `Amount` = valor da linha. Editar para N>1 muda a semântica (Decisão 5/Risco 2).
5. **Endereço dos endpoints** = `/api/visor/card-import/*` (rotas relativas `card-import/preview` e `card-import/confirm` no `VisorController`, que herda `[Route("api/[controller]")]`). O frontend chama esses paths absolutos.
6. **Helpers de conexão vivem em `transactions/api.ts`** — a `CreditCardsPage`/api de cartão os **importa** (`getVisorConnectionState`, `requestVisorConnectTicket`), não os reimplementa. Cross-feature import é aceitável e evita duplicação.
7. **`installmentMarker`** é derivado por regex e **read-only** — nunca alimenta `installmentsCount` automaticamente (ADR 0011 D5 / handoff item 8).
8. **Migração é aditiva/reversível** com backfill (`OriginalAmount=Amount`, `OriginalCurrency='BRL'`, `ExchangeReviewPending=false`). Roda em banco com dados de produção (compras manuais existentes) — testar `Up`/`Down` no `/test-e2e`.

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
- [ ] `dotnet build backend/MzFinance.slnx` sem erros
- [ ] `dotnet test backend/MzFinance.slnx` — todos verdes (cenários §7)
- [ ] `npm run build --prefix frontend` sem erros

### Padrões de Código
- [ ] CQRS respeitado (preview lê `ReadOnlyContext`; confirm escreve `MzFinanceContext`)
- [ ] Notification Pattern (sem exception p/ erro de negócio); envelope `DataActionResult`
- [ ] Portas Visor/câmbio reusadas (nenhuma infra nova); DI já registrada
- [ ] Frontend sem Tailwind (CSS Modules / DS)

### Banco de Dados / Schema
- [ ] Migração `AddVisorFieldsToCreditCardPurchase` aplica + backfill sem perda; `Down` reverte
- [ ] Índice único filtrado `(CreditCardId, ExternalId) WHERE ExternalId IS NOT NULL` presente

### Integração / Câmbio
- [ ] Só compras de contas CREDIT e valor positivo (RN04/RN05); paginação completa (RN16)
- [ ] Estrangeira convertida (PTAX da data), BRL editável; indisponível → pendente `Amount=0`, nunca aborta (RN12/C15)
- [ ] Dedup insert-only por `ExternalId` (escopo usuário); reimport não altera edições (RN10/C13)

### Autorização
- [ ] `/api/visor/card-import/*` exigem JWT; import só para `CreditCard` do próprio usuário (RN17/C22)

### PRD
- [ ] Critérios C1–C22 atendidos; RN01–RN18 refletidas
- [ ] Definição de Pronto (§11) satisfeita

---

## LEGENDA DE STATUS
- ⏳ **Pendente** · 🔄 **Em Progresso** · ✅ **Concluída** · ❌ **Bloqueada**

---

## DOCUMENTAÇÃO DE REFERÊNCIA
- **PRD**: prd/mz-finance-prd-005-tbd-import-visor-cartao.md
- **PLAN gêmeo (004, em produção)**: plan/mz-finance-plan-004-import-visor.md (Emenda pós-teste / preview→confirm)
- **ADRs**: adr/0011-import-visor-cartao-par-dedicado-dedup-e-c20.md (desta feature); adr/0005–0010 (infra Visor/PTAX/OAuth, premissas 005)
- **Contexto/Arquitetura**: MAPS/mz-finance/mz-finance-context.md
- **Código de referência (fonte de verdade)**:
  - `backend/src/MzFinance.Domain/Models/{CreditCardPurchase,CreditCard,Transaction}.cs`
  - `backend/src/MzFinance.Application/Queries/Visor/PreviewVisorImport/*` (molde do preview)
  - `backend/src/MzFinance.Application/Commands/Transactions/ConfirmVisorImport/*` (molde do confirm)
  - `backend/src/MzFinance.Application/Common/VisorImportCategory.cs`, `Dtos/Transactions/ImportVisorSummaryResponse.cs`
  - `backend/src/MzFinance.Application/Queries/CreditCards/GetCreditCardBill/*`, `Dtos/CreditCards/CreditCardBillResponse.cs`
  - `backend/src/MzFinance.Infra/Maps/{TransactionMap,CreditCardPurchaseMap}.cs`, `Builders/CreditCardBillingCalculator.cs`, `Migrations/20260707030844_AddVisorTransactionFields.cs`
  - `backend/src/MzFinance.WebApi/Controllers/{VisorController,CreditCardsController}.cs`
  - `frontend/src/features/transactions/{ImportVisorModal.tsx,api.ts}`, `frontend/src/features/credit-cards/{CreditCardsPage.tsx,api.ts}`, `shared/formatCurrency.ts`

---

## COMANDOS ÚTEIS
```bash
# Build / testes
dotnet build backend/MzFinance.slnx
dotnet test backend/MzFinance.slnx
npm run build --prefix frontend

# Migração
dotnet ef migrations add AddVisorFieldsToCreditCardPurchase -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
dotnet ef database update -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi

# Rodar local (memória mz-finance-local-run): API na 5280; Postgres do container na 5434
```

---

## NOTA DE HANDOFF PARA O DEV (`/implementar`)

1. **Comece pela ETAPA 1** (domínio) sem precisar consultar ninguém — o construtor de importação é cópia adaptada do 2º construtor de `Transaction.cs` (linhas 39–80). Mantenha o construtor manual atual **intacto na assinatura** (há call-sites em `CreateCreditCardPurchaseCommandHandler`).
2. **A infra Visor/câmbio/OAuth já existe e está em produção** (feature 004) — você **reusa as portas**, não recria nada. Não toque em `VisorMcpClient`, `PtaxExchangeRateProvider`, `VisorTokenProvider`, `VisorIntegrationConfiguration` (a não ser conferir que as portas estão registradas — estão).
3. **Preview é o inverso da 004**: a 004 exclui contas CREDIT; aqui você **mantém só** CREDIT e importa **só `type=expense` com `Amount>0`**. Use `PreviewVisorImportQueryHandler` como molde estrutural (gate de conexão, `try/catch`, `ConvertAsync`, cache de câmbio, dedup).
4. **Sentinela `Amount=0`**: não altere `CreditCardBillingCalculator` nem os handlers de fatura/limite/projeção — o zero mantém pendentes fora dos totais sozinho. Só a UI (ETAPA 10) trata a exibição.
5. **C20 = rejeitar tudo** se algum cartão de destino sumiu (ADR 0011 D4). C7 (conta sem destino) é tratado na UI (não envie essas linhas ao confirm).
6. **Escopo por usuário sempre via `CreditCard.UserId`** (a compra não tem `UserId`). Não esqueça a navegação nas queries de dedup.
7. **Commits**: NÃO commite por etapa. Commit único ao final, sem coautoria de IA (política do projeto).
8. **Testes reais (Visor/PTAX)** só no `/test-e2e`; os unit tests cobrem a lógica com portas mockadas (NSubstitute) + InMemory. Valide a migração `Up`/`Down` e o índice filtrado no `/test-e2e`.

---

**Criado em:** 2026-07-07
**Próximo passo:** `/implementar ETAPA 1`
</content>
