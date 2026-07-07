# Plano de Execução: Importar Transações do Visor Finance

## Informações
- **PRD Relacionado**: prd/mz-finance-prd-004-tbd-import-visor.md
- **Repositório(s)**: monorepo `mz-finance` (backend `/Users/zavadzki72/Projects/Personal/mz-finance/backend` + frontend `/Users/zavadzki72/Projects/Personal/mz-finance/frontend`) — **um único repositório git** (`.git` na raiz `mz-finance/`).
- **Domínio(s)**: Transações (`Transaction` / `TransactionSourceType`), nova integração externa **Visor Finance** (OAuth + MCP) e nova integração de **câmbio** (PTAX/BCB).
- **Branch Base**: main
- **Branch de Trabalho**: `feature/import-visor` (criada no `/implementar ETAPA 1`)
- **Complexidade**: 🔴 Alta (primeira integração externa do projeto: OAuth 2.1 rotativo, cliente MCP remoto, câmbio, atomicidade, criptografia de credenciais)
- **Criado em**: 2026-07-06
- **Última atualização**: 2026-07-07 (**Emenda pós-teste** — ver abaixo — além da implementação das 15 etapas e correções de code review)

> ### ✏️ Emenda pós-teste (2026-07-07) — [ADR 0009](../adr/0009-import-visor-preview-editavel-exclusao-cartao.md)
> Após teste do usuário, o fluxo mudou de "buscar → gravar direto" para **buscar → preview editável → confirmar**:
> - **Backend**: `PreviewVisorImportQuery` (leitura, não persiste) + `ConfirmVisorImportCommand` (persiste editado);
>   removido `ImportVisorTransactionsCommand`. `IVisorMcpClient.GetAccountsAsync` + `VisorAccountDto` + `AccountId`
>   no DTO para **excluir contas de cartão (CREDIT)**. Removido o **filtro de categoria** (supera ADR 0008) e o
>   contador `FilteredOutByCategory`. Endpoints: `POST /api/visor/import/preview` e `/import/confirm` (o antigo
>   `/import` saiu). Sem migration nova (schema inalterado). **198 testes** verdes.
> - **Frontend**: `ImportVisorModal` em 3 fases (filtros → preview "de → para" editável → resumo); removida a seção
>   de categorias; `api.ts` com `previewVisorImport`/`confirmVisorImport`. Build + lint + `tsc` verdes.

> ⚠️ **Nota de path**: o `mz-finance-map.json` registra os repositórios em caminhos Windows (`C:/Projects/...`), errado. O ambiente real é macOS; todos os paths deste PLAN usam o local real (`/Users/zavadzki72/Projects/Personal/mz-finance/...`). Corrigir o map fica fora do escopo.

> ⚠️ **Política de commits (memória do projeto)**: neste projeto o `/implementar` **NÃO commita por etapa** — commit único apenas ao final de todas as etapas (com a feature completa). Cada etapa deixa build + testes verdes, mas **não** faz `git commit`. Ignore instruções da skill `/implementar` que mandem commitar por etapa.

---

## PROGRESSO GERAL

**Status**: ✅ Concluído / Implementado
**Progresso**: 15/15 etapas concluídas (100%)

```
[🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩] 100%
```

> Este progresso será atualizado automaticamente pelo skill `/implementar`.

---

## VISÃO GERAL

Esta feature introduz a **primeira integração externa do mz-finance**: importar transações do **Visor Finance** (agregador Open Finance) para dentro do extrato, sob demanda, via um modal com filtros estruturados. O Visor **não tem REST API** — os dados vêm de um **servidor MCP remoto** (`https://mcp.visorfinance.app`, JSON-RPC/Streamable HTTP), autenticado por **OAuth 2.1 com refresh token rotativo**. Como o `get_transactions` do Visor **não** devolve valor em BRL nem taxa para moeda estrangeira, entra também uma **segunda integração externa** — uma **fonte de câmbio (PTAX/BCB)** — para converter no momento do import.

**Fonte de verdade = o código real.** A exploração das 4 camadas do backend e da feature `transactions` do frontend estabeleceu os fatos que guiam este PLAN:

1. **CQRS via MediatR + Notification Pattern.** Commands escrevem em `MzFinanceContext` (write, tracking) e chamam `_context.SaveChangesAsync` (transação atômica implícita do EF). Queries leem de `MzFinanceReadOnlyContext` (NoTracking). Erros de negócio → `INotificationService.Notify(NotificationKey.*, msg)` (sem exception); o `MzFinanceControllerBase.ProcessResponse` traduz notifications → 400/401/404/409 dentro do envelope `DataActionResult<T>`. Ver `CreateTransactionCommandHandler.cs`, `GetStatementQueryHandler.cs`, `MzFinanceControllerBase.cs`.
2. **Nomenclatura de código é inglês.** `Transaction` tem `Type/Amount/Date/Category/Description/SourceType`. O PRD usa termos PT (MoedaOriginal, ValorOriginal…); **consistência com o código vence** → os campos novos serão nomeados em inglês (`OriginalCurrency`, `OriginalAmount`, `ExchangeRate`, `ExchangeRateDate`, `ExternalId`). O enum ganha `FromVisor` (seguindo `Manual/FromRecurring/FromFinancing/FromCard`).
3. **Não há React Query no frontend** (só `react`, `react-router-dom`). Toda tela busca com `useState`/`useEffect` + `shared/api/httpClient`. O modal seguirá esse padrão real (não introduzir React Query — consistente com o PLAN 002/003). O `httpClient` injeta `Authorization: Bearer` do `localStorage`.
4. **Design System pronto** em `shared/ui` (`Modal`, `Button`, `Field`, `Select`, `ComboBox`, `CurrencyInput`, `Feedback`, `EmptyState`, `Skeleton`, `MoneyValue`, `Input`, `Badge`). `formatCurrency` está **fixo em BRL** — precisará de variante multi-moeda para exibir o original.
5. **Portas de saída seguem `Domain/Interfaces`.** `ICurrentUserService`, `ITokenService`, `IPasswordHasher`, `IUnitOfWork` moram em `Domain/Interfaces` e são implementados em `Infra`/`WebApi`. As novas portas (`IVisorMcpClient`, `IVisorTokenProvider`, `IVisorOAuthService`, `IExchangeRateProvider`) seguem essa convenção. (Nota: `Application.csproj` já referencia `Infra` — o projeto não é Clean Arch textbook; handlers usam `MzFinanceContext` direto.)
6. **DI por `WebApi/Configurations/*`** (extension methods chamados no `Program.cs`). EF registra **dois** contextos (`AddEf`). Config por `appsettings.json` + `IConfiguration`.
7. **Sem HttpClient, sem Data Protection, sem SDK MCP** hoje no backend (confirmado por grep). Serão adicionados (ver Decisões Técnicas).

**Estratégia de reconciliação dos pontos difíceis** (detalhe nas Decisões Técnicas e ADRs 0005–0008):
- **Refresh rotativo × atomicidade (RN07):** o refresh do token é rotativo (cada uso invalida o anterior). Se o import rodar dentro de uma transação e falhar, um token rotacionado no meio seria perdido. Por isso o `VisorTokenProvider` persiste o token rotacionado **numa transação/contexto próprio, commitado imediatamente**, totalmente **fora** da transação atômica do import. O import busca **todas as páginas/tipos primeiro** (fetch-all) e só então persiste os `Transaction` novos num único `SaveChanges` (insert-only).
- **Câmbio sempre importa (C16/RN10 — política revista após resposta do humano à D1):** *walk-back* para o último dia útil do PTAX (fim de semana/feriado) é comportamento normal e permanece. Quando a conversão **não for possível por qualquer motivo** (moeda sem par PTAX, sem cotação na janela, ou fonte de câmbio fora do ar), a transação é **importada mesmo assim** com valor/moeda originais e **marcada para revisão de câmbio** (`ExchangeReviewPending = true`), com `Amount` (BRL) = **0** até a revisão. **Nunca** exclui o item nem aborta o import por causa de câmbio — câmbio deixou de ser causa de rollback.
- **Descompasso de categoria (RN14):** **não** usar o `category_slug` do Visor; buscar sem filtro de categoria e filtrar **client-side no handler** pelo `category_name` do Visor contra os nomes de categoria locais selecionados (ADR 0008).
- **"Ambos" (RN04):** **duas chamadas** `get_transactions` (uma `type=expense`, uma `type=income`), cada resultado marcado com seu `TransactionType`.

**Ordem de execução (por dependência real):** Domínio → Persistência/migração → contratos das portas → impls de Infra (câmbio, storage OAuth, token provider, cliente MCP) → Application (command/query) → WebApi (endpoints) → Frontend (api → modal → botão/fluxo → rastreabilidade). Cada etapa mantém build + testes verdes.

---

## OBJETIVOS

- [ ] `Transaction` guarda origem `FromVisor`, `ExternalId`, rastreabilidade de câmbio (`OriginalCurrency`/`OriginalAmount`/`ExchangeRate`/`ExchangeRateDate`) e o flag `ExchangeReviewPending`; `Amount` (BRL) é a fonte de saldo (= 0 enquanto pendente de revisão) (RN09/RN11).
- [ ] Migração aditiva e reversível: colunas novas (incl. `ExchangeReviewPending`) + backfill (`OriginalCurrency='BRL'`, `OriginalAmount=Amount`, `ExchangeReviewPending=false`) + **índice único filtrado** `(UserId, ExternalId)` para dedup (RN05, §8).
- [ ] Fonte de câmbio PTAX/BCB (venda de fechamento) atrás de porta, com walk-back; item sem conversão é **importado marcado para revisão** (`ExchangeReviewPending`), nunca excluído nem aborta (DP3/C16/RN10).
- [ ] Vínculo OAuth do Visor persistido **cifrado** (Data Protection + PersistKeys) com refresh rotativo single-flight (RNF01, DP10).
- [ ] Cliente MCP nativo .NET (`ModelContextProtocol` 1.4.0) com paginação completa e 2 chamadas por tipo (RN16/RN04).
- [ ] Command `ImportVisorTransactions`: dedup por id externo, insert-only, conversão de moeda, atomicidade (RN05/RN06/RN07/RN09).
- [ ] Query `GetVisorConnectionState` + fluxo "Conectar/Reconectar" (RN02/C1/C2/C13).
- [ ] Frontend: botão "Importar do Visor", modal de filtros estruturados (categorias locais), estados, resumo pós-import e rastreabilidade de câmbio no extrato (RF01–RF08).
- [ ] `dotnet build`/`dotnet test` + `npm run build` verdes ao fim de cada etapa; dados sensíveis nunca logados (RNF01/RNF02).

---

## MAPA DE COMPONENTES IDENTIFICADOS

### Domínio (`backend/src/MzFinance.Domain`)
- `Models/Transaction.cs` (alterado) — campos novos + construtor de importação.
- `Enums/TransactionSourceType.cs` (alterado) — `FromVisor = 5`.
- `Enums/VisorConnectionStatus.cs` (novo) — `Connected/Expired/Revoked`.
- `Models/VisorOAuthTokenSet.cs` (novo) — vínculo OAuth por usuário (tokens cifrados).
- `Models/VisorOAuthAuthorizationRequest.cs` (novo) — PKCE/state pendente entre login e callback.
- `Interfaces/IVisorMcpClient.cs`, `Interfaces/IVisorTokenProvider.cs`, `Interfaces/IVisorOAuthService.cs`, `Interfaces/IExchangeRateProvider.cs` (novos — portas).
- `Integrations/Visor/VisorTransactionDto.cs`, `Integrations/Visor/VisorTransactionQuery.cs`, `Integrations/Exchange/ExchangeRateResult.cs` (novos — DTOs de porta).
- `Integrations/Visor/VisorIntegrationException.cs` (novo — falha de infra do Visor, tipada; câmbio **não** tem exceção de abort — ver ADR 0007).

### Persistência (`backend/src/MzFinance.Infra`)
- `Maps/TransactionMap.cs` (alterado) — colunas novas + índice único filtrado.
- `Maps/VisorOAuthTokenSetMap.cs`, `Maps/VisorOAuthAuthorizationRequestMap.cs` (novos).
- `Contexts/MzFinanceContext.cs` e `Contexts/MzFinanceReadOnlyContext.cs` (alterados) — DbSets novos + `DataProtectionKeys`.
- `Migrations/*_AddVisorTransactionFields.cs` (novo — migração #1).
- `Migrations/*_AddVisorOAuthStore.cs` (novo — migração #2, inclui tabela do Data Protection).
- `Integrations/Exchange/PtaxExchangeRateProvider.cs` (novo).
- `Integrations/Visor/VisorMcpClient.cs`, `Integrations/Visor/VisorTokenProvider.cs`, `Integrations/Visor/VisorOAuthService.cs` (novos).
- `Security/TokenProtector.cs` (novo — wrapper de `IDataProtector` p/ cifrar colunas).
- `MzFinance.Infra.csproj` (alterado) — pacotes `ModelContextProtocol` 1.4.0, `Microsoft.Extensions.Http`, `Microsoft.AspNetCore.DataProtection.EntityFrameworkCore`.

### Aplicação (`backend/src/MzFinance.Application`)
- `Commands/Transactions/ImportVisorTransactions/` (novo) — `ImportVisorTransactionsCommand.cs`, `...Handler.cs`, `...Validator.cs`.
- `Dtos/Transactions/ImportVisorSummaryResponse.cs` (novo — resumo).
- `Dtos/Transactions/TransactionResponse.cs` (alterado) — expõe câmbio.
- `Queries/Visor/GetVisorConnectionState/` (novo) — `Query.cs`, `Handler.cs`.
- `Dtos/Visor/VisorConnectionStateResponse.cs` (novo).
- `Queries/Transactions/GetStatement/GetStatementQueryHandler.cs` (alterado) — projeção dos campos de câmbio.

### WebApi (`backend/src/MzFinance.WebApi`)
- `Controllers/VisorController.cs` (novo) — `GET /oauth/visor/login`, `GET /oauth/visor/callback`, `GET /api/visor/connection`, `POST /api/visor/import`.
- `Configurations/VisorIntegrationConfiguration.cs` (novo — DI + HttpClients + Data Protection).
- `Configurations/EntityFrameworkConfiguration.cs` / `Program.cs` (alterados) — registrar Data Protection e a nova config.
- `appsettings.json` / `appsettings.Development.json` (alterados) — seção `Visor` + `Exchange`.

### Frontend (`frontend/src`)
- `features/transactions/api.ts` (alterado) — campos de câmbio em `Transaction`; endpoints/tipos de Visor.
- `features/transactions/ImportVisorModal.tsx` + `.module.css` (novos).
- `features/transactions/TransactionsPage.tsx` (alterado) — botão + fluxo conectar/reconectar + reload.
- `shared/formatCurrency.ts` (alterado) — variante multi-moeda.
- `shared/ui/MoneyValue/MoneyValue.tsx` (alterado, opcional) — suporte a exibir moeda original.

### Testes (`backend/src/MzFinance.UnitTests`)
- `Domain/TransactionVisorTests.cs` (novo).
- `Integrations/PtaxExchangeRateProviderTests.cs` (novo).
- `Integrations/VisorTokenProviderTests.cs` (novo).
- `Commands/ImportVisorTransactionsHandlerTests.cs` (novo — maior superfície).
- `Queries/GetVisorConnectionStateHandlerTests.cs` (novo).

---

## ESTRATÉGIA DE TESTES

- **Framework**: xUnit + NSubstitute + EF Core InMemory (padrão do projeto). Convenção `[Method]_[Scenario]_Should[Expected]`, AAA com comentários (ver `mz-finance-context.md#testes`).
- **Portas mockadas com NSubstitute**: o handler de import é testado com `IVisorMcpClient`, `IExchangeRateProvider` e `IVisorTokenProvider` **substituídos** — os testes **não** tocam Visor/PTAX reais. Persistência via InMemory.
- **Providers de Infra** (PTAX, TokenProvider) testados com um `HttpMessageHandler` fake injetado no `HttpClient`.

Cenários-chave a cobrir (mapeados ao PRD §12):
- [ ] Import feliz cria N `Transaction` origem `FromVisor`, tipos corretos, resumo N/0 (Cenário 1, C5).
- [ ] Reimport não duplica nem altera; resumo 0/N ignoradas (Cenários 2–4, C6/C7/RN05/RN06).
- [ ] "Ambos" = duas chamadas por tipo; sinais corretos (Cenário 1/14, RN04).
- [ ] Moeda estrangeira convertida; original+taxa+data preservados; BRL não converte (Cenários 9/10, RN09).
- [ ] Câmbio impossível (data sem cotação / moeda sem PTAX / fonte fora do ar): item **importado** com `ExchangeReviewPending=true` e `Amount=0`, contado em `importadasComRevisaoDeCambio`; nunca excluído nem aborta (Cenário 11, C16/RN10).
- [ ] **Visor** indisponível (infra) durante o fetch/paginação → rollback total, nada persistido; câmbio **não** aborta (Cenário 15, C14/RN07).
- [ ] Categoria ausente → "Sem categoria"; filtro por categoria local client-side (Cenário 13, RN08/RN14).
- [ ] Toggle "incluir ignoradas" (Cenário 12, C10/RN12).
- [ ] Bloqueio sem conexão / vínculo expirado orienta (re)conectar (Cenários 7/8, C2/C13/RN02).
- [ ] Prazo obrigatório/inválido barra antes de chamar Visor (Cenário 6, C4).
- [ ] Refresh rotativo persiste token novo e é single-flight (VisorTokenProvider).
- [ ] PTAX walk-back usa cotação de dia útil anterior (PtaxExchangeRateProvider).

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Domínio — campos de câmbio/rastreabilidade em `Transaction` + origem `FromVisor`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Preparar o modelo de domínio para receber transações do Visor com rastreabilidade de moeda/câmbio e identidade externa, mantendo `Amount` sempre em BRL. É a base de tudo; sem estado externo, puramente domínio.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Domain/Enums/TransactionSourceType.cs` (alterado)
- `backend/src/MzFinance.Domain/Models/Transaction.cs` (alterado)
- `backend/src/MzFinance.UnitTests/Domain/TransactionVisorTests.cs` (novo)

**O que implementar:**
- Adicionar `FromVisor = 5` ao enum (com `[Display]/[Description]` no padrão dos demais valores).
- Em `Transaction`, adicionar propriedades: `OriginalCurrency` (string, get privado), `OriginalAmount` (decimal), `ExchangeRate` (decimal?), `ExchangeRateDate` (DateOnly?), `ExternalId` (string?), **`ExchangeReviewPending` (bool)**. Manter `Amount` como magnitude BRL (sinal deriva de `Type`) e **não-nullable** — não mexer no tipo da coluna existente para não gerar ripple no app inteiro (dashboard/projeção/balance).
- **Construtor existente (manual)**: preencher defaults consistentes → `OriginalCurrency = "BRL"`, `OriginalAmount = amount`, taxa/data/externalId nulos, `ExchangeReviewPending = false`. Assim toda transação manual nova já nasce coerente.
- **Novo construtor de importação**: parâmetros `(User user, TransactionType type, decimal amountBrl, decimal originalAmount, string originalCurrency, decimal? exchangeRate, DateOnly? exchangeRateDate, DateOnly date, string category, string? description, string externalId, bool exchangeReviewPending)` com `SourceType = FromVisor`, `Amount = amountBrl`. **Sentinela de pendência:** quando `exchangeReviewPending = true`, o handler passa `amountBrl = 0` e `exchangeRate/exchangeRateDate` nulos — o valor real vive em `OriginalAmount`/`OriginalCurrency`. Defensivamente, o ctor pode forçar `Amount = 0` se `exchangeReviewPending`. Validar no domínio o mínimo (ex.: `externalId` não vazio) — regras de entrada ficam no Validator (ETAPA 8).
- **Não** alterar o método `Update()` (edição manual não mexe em campos de câmbio → preserva rastreabilidade; import é insert-only). Resolver o `ExchangeReviewPending` (converter de fato) é **fora do escopo desta feature** — futura "revisão de câmbio"; aqui só marcamos e expomos o estado.

**Testes Necessários:**
- [ ] `Ctor_ManualTransaction_ShouldDefaultToBrlOriginalCurrencyAndNotPendingReview`
- [ ] `Ctor_ImportTransaction_ShouldSetVisorSourceAndTraceabilityFields`
- [ ] `Ctor_ImportForeignCurrency_ShouldKeepAmountInBrlAndPreserveOriginal`
- [ ] `Ctor_ImportUnconvertible_ShouldFlagExchangeReviewAndZeroBrlAmount`

**Critérios de Aceitação:**
- [ ] Enum tem `FromVisor = 5` sem alterar os valores 1–4.
- [ ] Ambos os construtores compilam e preenchem os campos conforme acima.
- [ ] Build sem erros (`dotnet build backend/MzFinance.slnx`).
- [ ] Testes passando (`dotnet test backend/MzFinance.slnx`).

**Dependências:** Nenhuma

---

### ETAPA 2: Persistência — `TransactionMap` + migração #1 (colunas, backfill, índice único filtrado)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Materializar os campos novos no schema, com backfill não destrutivo dos dados existentes e a blindagem de deduplicação por índice único filtrado.

**Complexidade:** 🟡 Média (migração com backfill + índice parcial no PostgreSQL)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/Maps/TransactionMap.cs` (alterado)
- `backend/src/MzFinance.Infra/Migrations/*_AddVisorTransactionFields.cs` (novo)
- `backend/src/MzFinance.Infra/Migrations/MzFinanceContextModelSnapshot.cs` (regenerado pelo EF)

**O que implementar:**
- No `TransactionMap`: `OriginalCurrency` `IsRequired().HasMaxLength(3)`; `OriginalAmount` `IsRequired().HasColumnType("decimal(18,2)")`; `ExchangeRate` `HasColumnType("decimal(18,6)")` (nullable); `ExchangeRateDate` nullable; `ExternalId` `HasMaxLength(64)` (nullable — UUID do Visor tem 36); **`ExchangeReviewPending`** `IsRequired()` (bool, default `false`).
- **Índice único filtrado**: `builder.HasIndex(x => new { x.UserId, x.ExternalId }).IsUnique().HasFilter("\"ExternalId\" IS NOT NULL")` — garante dedup só para origem Visor sem colidir com as manuais (todas `ExternalId` nulo). Confirmar o nome de coluna exato no `HasFilter` conforme o mapeamento gerado.
- Gerar migração: `dotnet ef migrations add AddVisorTransactionFields -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi`.
- **Editar o `Up`** para: defaults na criação das colunas (`OriginalCurrency` default `'BRL'`, `OriginalAmount` default `0`, `ExchangeReviewPending` default `false`) e **backfill** via `migrationBuilder.Sql("UPDATE \"Transactions\" SET \"OriginalAmount\" = \"Amount\";")` (padrão já usado em `AddSortOrderToCreditCard`). Linhas existentes ficam com `ExchangeReviewPending = false` (via default). `Down` remove índice e colunas.
- Verificar que o `Down` é limpo e reversível (drop index + drop columns).

**Testes Necessários:**
- [ ] `SaveVisorTransaction_ShouldPersistTraceabilityFields` (InMemory — valida mapeamento round-trip; o índice parcial não é exercido pelo InMemory, então validar o índice manualmente aplicando a migração).

**Critérios de Aceitação:**
- [ ] Migração aplica em banco com dados: `dotnet ef database update` sobe as colunas e faz backfill sem perda.
- [ ] Transações existentes ficam com `OriginalCurrency='BRL'`, `OriginalAmount=Amount`, taxa/data/externalId nulos, `ExchangeReviewPending=false`.
- [ ] `Down` reverte sem erro.
- [ ] Build + testes verdes.

**Dependências:** ETAPA 1

---

### ETAPA 3: Contratos de integração — portas + DTOs + enum de conexão

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Fixar as costuras (seams) para que Application e Infra evoluam desacoplados: o handler de import é escrito e testado contra estas interfaces (mock NSubstitute) sem depender das impls reais de Visor/PTAX.

**Complexidade:** 🟢 Baixa (apenas contratos; compila, sem comportamento)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Domain/Enums/VisorConnectionStatus.cs` (novo)
- `backend/src/MzFinance.Domain/Integrations/Visor/VisorTransactionDto.cs` (novo)
- `backend/src/MzFinance.Domain/Integrations/Visor/VisorTransactionQuery.cs` (novo)
- `backend/src/MzFinance.Domain/Integrations/Visor/VisorIntegrationException.cs` (novo)
- `backend/src/MzFinance.Domain/Integrations/Exchange/ExchangeRateResult.cs` (novo)
- `backend/src/MzFinance.Domain/Interfaces/IVisorMcpClient.cs` (novo)
- `backend/src/MzFinance.Domain/Interfaces/IVisorTokenProvider.cs` (novo)
- `backend/src/MzFinance.Domain/Interfaces/IVisorOAuthService.cs` (novo)
- `backend/src/MzFinance.Domain/Interfaces/IExchangeRateProvider.cs` (novo)

**O que implementar:**
- `VisorConnectionStatus`: `Connected = 1, Expired = 2, Revoked = 3` (a ausência de vínculo = "NotConnected", tratada na query).
- `VisorTransactionDto`: `ExternalId` (string), `Date` (DateOnly), `Description` (string), `Amount` (decimal, sempre positivo), `Currency` (string ISO), `CategoryName` (string?), `AccountName` (string?), `Ignored` (bool), `Notes` (string?).
- `VisorTransactionQuery`: `StartDate`, `EndDate` (DateOnly), `Type` (`TransactionType`), `IncludeIgnored` (bool), `Search` (string?). **Sem categoria** (filtro de categoria é client-side — ADR 0008).
- `ExchangeRateResult`: `Rate` (decimal), `RateDate` (DateOnly). Retorno **nulo** significa "não foi possível converter" — por **qualquer** motivo (sem cotação na janela, moeda sem par PTAX, **ou** fonte fora do ar). O provider **não lança** exceção de abort por câmbio; falhas de infra são engolidas e viram `null` (ADR 0007). O handler trata `null` marcando a transação para revisão.
- `IVisorMcpClient.GetTransactionsAsync(Guid userId, VisorTransactionQuery query, CancellationToken ct)` → `Task<IReadOnlyList<VisorTransactionDto>>` (pagina tudo internamente para **um** tipo). Lança `VisorIntegrationException` em falha/timeout de infra.
- `IExchangeRateProvider.GetRateToBrlAsync(string currency, DateOnly date, CancellationToken ct)` → `Task<ExchangeRateResult?>` (null = não converteu, por qualquer motivo; **nunca** lança por câmbio — câmbio não aborta import).
- `IVisorTokenProvider.GetValidAccessTokenAsync(Guid userId, CancellationToken ct)` → `Task<string>` (bearer válido, faz refresh se preciso). Lança `VisorNotConnectedException`/`VisorReauthRequiredException` (definir em `VisorIntegrationException` ou subtipos) quando não conectado/expirado-revogado.
- `IVisorOAuthService.BuildAuthorizationUrlAsync(Guid userId, CancellationToken ct)` → `Task<string>` (gera PKCE+state, persiste pendência, devolve URL de authorize); `CompleteAuthorizationAsync(string code, string state, CancellationToken ct)` → `Task` (troca code por tokens, persiste vínculo).

**Testes Necessários:** nenhum (contratos). Critério = compila.

**Critérios de Aceitação:**
- [ ] Build sem erros; nenhuma dependência externa nova ainda (sem pacote).
- [ ] Interfaces e DTOs no lugar, coerentes com o payload real do `get_transactions` (dossiê da memória).

**Dependências:** ETAPA 1

---

### ETAPA 4: Fonte de câmbio — `PtaxExchangeRateProvider` (BCB/Olinda) + política de indisponível

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Implementar a conversão moeda→BRL pela taxa da data da transação, com walk-back para dias sem pregão. **Qualquer** impossibilidade de conversão (sem cotação, moeda sem par, ou fonte fora do ar) resulta em `null` — o provider **não lança** por câmbio; quem marca a transação para revisão é o handler (ETAPA 8).

**Complexidade:** 🔴 Alta (contrato externo, datas úteis, walk-back)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/MzFinance.Infra.csproj` (alterado — `Microsoft.Extensions.Http`)
- `backend/src/MzFinance.Infra/Integrations/Exchange/PtaxExchangeRateProvider.cs` (novo)
- `backend/src/MzFinance.WebApi/Configurations/VisorIntegrationConfiguration.cs` (novo — registra `HttpClient` nomeado + `IExchangeRateProvider`)
- `backend/src/MzFinance.WebApi/Program.cs` (alterado — chamar a config)
- `backend/src/MzFinance.WebApi/appsettings*.json` (alterado — seção `Exchange`)
- `backend/src/MzFinance.UnitTests/Integrations/PtaxExchangeRateProviderTests.cs` (novo)

**O que implementar:**
- Consumir a **API PTAX do Banco Central (Olinda/OData)**, endpoint `CotacaoMoedaDia(moeda=@,dataCotacao=@)` — REST, público, sem auth. Config `Exchange:PtaxBaseUrl` e `Exchange:WalkBackBusinessDays` (default 5). Ver ADR 0007.
- **Taxa exata**: `cotacaoVenda` do boletim de fechamento (PTAX de fechamento). Justificar no ADR.
- **BRL**: curto-circuito — se `currency == "BRL"`, retornar imediatamente rate=1 sem chamar PTAX (na prática o handler nem chama para BRL, mas defender o provider).
- **Walk-back**: se a data cai em fim de semana/feriado (PTAX retorna vazio), retroceder dia a dia até achar cotação, limitado a `WalkBackBusinessDays`. `RateDate` = a data efetiva da cotação usada. Se estourar a janela sem cotação → retornar **null** (item inconversível de dado).
- **Moeda sem PTAX** (símbolo não suportado): retornar **null** (inconversível de dado).
- **Falha de infra** (timeout, 5xx, DNS): **capturar internamente**, logar um warning **sem** dados sensíveis (só moeda/data, nunca valor) e retornar **`null`** — câmbio **não** aborta o import (política revista D1). Timeout configurável no `HttpClient`.
- Registrar via `IHttpClientFactory` (`AddHttpClient<...>`); nunca logar valores em texto (RNF02).

**Testes Necessários:** (com `HttpMessageHandler` fake)
- [ ] `GetRate_BusinessDayWithQuote_ShouldReturnClosingSellRate`
- [ ] `GetRate_WeekendDate_ShouldWalkBackToPreviousBusinessDay`
- [ ] `GetRate_NoQuoteWithinWindow_ShouldReturnNull`
- [ ] `GetRate_UnsupportedCurrency_ShouldReturnNull`
- [ ] `GetRate_SourceTimeoutOr5xx_ShouldReturnNull` (infra engolida, não lança)

**Critérios de Aceitação:**
- [ ] Provider retorna `null` para **qualquer** impossibilidade de conversão (dado **ou** infra); nunca lança por câmbio.
- [ ] `RateDate` reflete a cotação efetivamente usada (walk-back visível na rastreabilidade).
- [ ] Build + testes verdes.

**Dependências:** ETAPA 3

---

### ETAPA 5: Storage OAuth — entidades + maps + Data Protection + migração #2

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Persistir o vínculo OAuth do Visor de forma **cifrada** e criar o storage mutável exigido pelo refresh rotativo, com a chave do Data Protection persistida no banco (armadilha Coolify).

**Complexidade:** 🔴 Alta (criptografia, key ring persistente, migração de tabelas novas)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Domain/Models/VisorOAuthTokenSet.cs` (novo)
- `backend/src/MzFinance.Domain/Models/VisorOAuthAuthorizationRequest.cs` (novo)
- `backend/src/MzFinance.Infra/Maps/VisorOAuthTokenSetMap.cs` (novo)
- `backend/src/MzFinance.Infra/Maps/VisorOAuthAuthorizationRequestMap.cs` (novo)
- `backend/src/MzFinance.Infra/Contexts/MzFinanceContext.cs` + `MzFinanceReadOnlyContext.cs` (alterados — DbSets + `DataProtectionKeys`)
- `backend/src/MzFinance.Infra/Security/TokenProtector.cs` (novo)
- `backend/src/MzFinance.Infra/MzFinance.Infra.csproj` (alterado — `Microsoft.AspNetCore.DataProtection.EntityFrameworkCore`)
- `backend/src/MzFinance.WebApi/Configurations/VisorIntegrationConfiguration.cs` (alterado — `AddDataProtection().SetApplicationName("mz-finance").PersistKeysToDbContext<MzFinanceContext>()`)
- `backend/src/MzFinance.Infra/Migrations/*_AddVisorOAuthStore.cs` (novo — inclui `DataProtectionKeys`)

**O que implementar:**
- `VisorOAuthTokenSet` (por usuário, um ativo): `UserId`, `Status` (`VisorConnectionStatus`), `AccessTokenCipher` (string), `RefreshTokenCipher` (string), `AccessTokenExpiresAt` (DateTime), `ClientId` (string — do Dynamic Client Registration), `ConnectedAt`, `RevokedAt` (DateTime?). Métodos de domínio: `MarkConnected(...)`, `UpdateTokens(...)`, `MarkExpired()`, `MarkRevoked()`.
- `VisorOAuthAuthorizationRequest` (pendência PKCE): `State` (string, único), `CodeVerifierCipher` (string), `UserId` (Guid), `CreatedAt`, `ExpiresAt` (DateTime — TTL curto, ex.: 10 min).
- Maps: colunas + tamanhos; **índice único** em `VisorOAuthTokenSet.UserId` e em `VisorOAuthAuthorizationRequest.State`. Colunas de cifra como `text`.
- `TokenProtector`: wrapper fino sobre `IDataProtector` (`CreateProtector("visor-oauth")`) com `Protect`/`Unprotect` — usado pelo TokenProvider/OAuthService para cifrar/decifrar antes de gravar/ler. **Nunca** logar valores.
- **Data Protection**: `PersistKeysToDbContext<MzFinanceContext>()` exige `DbSet<DataProtectionKeyEntity>` no contexto + a tabela na migração. `SetApplicationName` fixo (senão redeploy Coolify torna os cifrados ilegíveis).
- Gerar migração `AddVisorOAuthStore` (tabelas dos vínculos + `DataProtectionKeys`). `Down` dropa as três tabelas.

**Testes Necessários:**
- [ ] `TokenProtector_ProtectThenUnprotect_ShouldRoundTrip` (com Data Protection efêmero em teste).
- [ ] `SaveTokenSet_ShouldPersistCipherColumnsOnly` (InMemory — garante que texto puro não vaza pra coluna).

**Critérios de Aceitação:**
- [ ] Migração cria as tabelas + `DataProtectionKeys`; `Down` reversível.
- [ ] Tokens gravados como ciphertext (nunca texto puro); nada logado.
- [ ] Build + testes verdes.

**Dependências:** ETAPA 2 (ordem linear das migrações), ETAPA 3 (enum `VisorConnectionStatus`)

---

### ETAPA 6: `VisorTokenProvider` + `VisorOAuthService` — PKCE, troca de code e refresh rotativo single-flight

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Implementar o coração da autenticação: bootstrap do consentimento (PKCE/DCR), troca do code por tokens e o refresh **rotativo** com proteção contra corrida — persistindo o token novo **fora** de qualquer transação de import (reconciliação com RN07).

**Complexidade:** 🔴 Alta (OAuth 2.1 público, rotação, single-flight, isolamento transacional)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/Integrations/Visor/VisorTokenProvider.cs` (novo)
- `backend/src/MzFinance.Infra/Integrations/Visor/VisorOAuthService.cs` (novo)
- `backend/src/MzFinance.WebApi/Configurations/VisorIntegrationConfiguration.cs` (alterado — HttpClient p/ token endpoint + DI + `IDbContextFactory<MzFinanceContext>` OU `IServiceScopeFactory`)
- `backend/src/MzFinance.WebApi/appsettings*.json` (alterado — seção `Visor:OAuth`)
- `backend/src/MzFinance.UnitTests/Integrations/VisorTokenProviderTests.cs` (novo)

**O que implementar:**
- **DCR (Dynamic Client Registration)**: no primeiro consentimento, `POST /oauth/register` (cliente público, `token_endpoint_auth_method: none`), persistir `ClientId` no vínculo. Reusar em conexões futuras.
- **`VisorOAuthService.BuildAuthorizationUrlAsync`**: gerar `code_verifier` + `code_challenge` (S256) + `state`; persistir `VisorOAuthAuthorizationRequest` (verifier cifrado) com TTL; montar URL do `authorization_endpoint` (`/oauth/authorize`) com `client_id`, `redirect_uri` (config `Visor:OAuth:RedirectUri`), `scope`, `code_challenge`, `state`.
- **`CompleteAuthorizationAsync`**: validar `state` (existe + não expirado), recuperar verifier, `POST /oauth/token` (`grant_type=authorization_code` + `code_verifier`), receber `access_token`+`refresh_token`+`expires_in`; cifrar e persistir `VisorOAuthTokenSet` (`Status=Connected`); apagar a pendência.
- **`VisorTokenProvider.GetValidAccessTokenAsync`**: ler o vínculo do usuário; se ausente → `VisorNotConnectedException`; se `Status` in (Expired,Revoked) → `VisorReauthRequiredException`; se access token válido (com folga de ~60s) → devolver; se expirado → **refresh**.
- **Refresh rotativo single-flight**: `SemaphoreSlim(1,1)` por processo + **`SELECT ... FOR UPDATE`** na linha do vínculo dentro de uma **transação/contexto próprio** (`IDbContextFactory<MzFinanceContext>` — instância dedicada, NÃO o `MzFinanceContext` scoped do request). `POST /oauth/token` (`grant_type=refresh_token`); receber **novo** access+refresh; cifrar e **commitar imediatamente** o vínculo atualizado; liberar o lock. Se o refresh falhar com invalid_grant → `MarkRevoked` + `VisorReauthRequiredException`.
- **Isolamento (RN07)**: como o provider usa contexto/transação próprios e commita na hora, um rollback posterior do import **não** perde o token rotacionado.
- **Segurança**: tokens/verifier nunca em log (RNF01/RNF02).

**Testes Necessários:** (HttpMessageHandler fake + InMemory/context factory)
- [ ] `GetToken_ValidAccessToken_ShouldReturnWithoutRefresh`
- [ ] `GetToken_ExpiredAccessToken_ShouldRefreshAndPersistRotatedTokens`
- [ ] `GetToken_ConcurrentCallers_ShouldRefreshOnce` (single-flight via semáforo)
- [ ] `GetToken_NoLink_ShouldThrowNotConnected`
- [ ] `GetToken_RefreshInvalidGrant_ShouldMarkRevokedAndThrowReauth`
- [ ] `CompleteAuthorization_InvalidOrExpiredState_ShouldReject`

**Critérios de Aceitação:**
- [ ] Refresh persiste o token rotacionado independentemente do request (contexto próprio) e não é perdido em rollback do import.
- [ ] Single-flight comprovado por teste (uma única chamada ao token endpoint sob concorrência).
- [ ] Build + testes verdes.

**Dependências:** ETAPA 5 (entidades/protector), ETAPA 3 (portas)

---

### ETAPA 7: `VisorMcpClient` — SDK MCP 1.4.0, paginação completa, mapeamento payload→DTO

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Implementar o cliente MCP nativo .NET que lista transações do Visor com paginação total e traduz o payload no `VisorTransactionDto`, autenticando via `IVisorTokenProvider`.

**Complexidade:** 🔴 Alta (SDK novo, transporte HTTP, paginação, mapeamento resiliente)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Infra/MzFinance.Infra.csproj` (alterado — `ModelContextProtocol` 1.4.0)
- `backend/src/MzFinance.Infra/Integrations/Visor/VisorMcpClient.cs` (novo)
- `backend/src/MzFinance.WebApi/Configurations/VisorIntegrationConfiguration.cs` (alterado — registrar `IVisorMcpClient`)
- `backend/src/MzFinance.WebApi/appsettings*.json` (alterado — `Visor:McpEndpoint`)
- `backend/src/MzFinance.UnitTests/Integrations/VisorMcpClientMappingTests.cs` (novo — foco no mapeamento, ver observação)

**O que implementar:**
- Usar `ModelContextProtocol` **1.4.0** (estável, net10.0): `HttpClientTransport` com `HttpClientTransportOptions { Endpoint = Visor:McpEndpoint, AdditionalHeaders["Authorization"] = "Bearer " + token }`; `McpClient.CreateAsync(transport)`; `CallToolAsync("get_transactions", argsDict, ct)`. **Não** usar `SseClientTransport`/`McpClientFactory`/`ClientOAuthOptions` (APIs antigas/interativas — o token vem do provider headless). Ver dossiê e ADR 0005.
- Obter o bearer via `IVisorTokenProvider.GetValidAccessTokenAsync(userId)` a cada chamada (o provider cuida do refresh).
- Montar args a partir de `VisorTransactionQuery`: `start_date`/`end_date` (YYYY-MM-DD), `type` (`expense` p/ Expense, `income` p/ Income), `exclude_ignored` (= `!IncludeIgnored`), `search` (se houver), `page`/`page_size`. **Sem** `category_slug` (filtro client-side — ADR 0008).
- **Paginação completa (RN16)**: iterar `page` de 1..N usando `total_count`/`page_size` do retorno até esgotar; acumular todos os itens antes de retornar.
- **Mapeamento** (dossiê do payload): `id`→`ExternalId`, `date`→`Date`, `description`→`Description`, `amount`(string positiva)→`Amount` (parse invariável), `currency`→`Currency`, `category_name`→`CategoryName` (pode faltar), `account_name`→`AccountName`, `ignored`→`Ignored`, `notes`→`Notes`. Campos ausentes tolerados (categoria/moeda faltando tratadas no handler: RN08/RN09).
- **Falhas/timeout** de transporte/JSON-RPC → `VisorIntegrationException` (o handler converte em notificação + rollback, CE05).
- **Observação de teste**: um teste de integração real exige token/servidor Visor — fora do unit test. Extrair o **mapeamento** para um método/estático puro (`MapToDto(jsonElement)`) e testá-lo com payloads JSON fixos; a orquestração de paginação pode ser testada com um wrapper mockável do "call tool" se o custo for baixo (senão, cobrir só o mapeamento e validar paginação no `/test-e2e`).

**Testes Necessários:**
- [ ] `MapToDto_FullPayload_ShouldMapAllFields`
- [ ] `MapToDto_MissingCategoryAndNotes_ShouldMapNulls`
- [ ] `MapToDto_PositiveAmountString_ShouldParseInvariant`

**Critérios de Aceitação:**
- [ ] Pacote `ModelContextProtocol` 1.4.0 adicionado; build restaura sem conflito de TFM (net10.0).
- [ ] Mapeamento coберto por teste; paginação percorre todas as páginas.
- [ ] Falha de transporte vira `VisorIntegrationException`.
- [ ] Build + testes verdes.

**Dependências:** ETAPA 3 (porta), ETAPA 6 (token provider em runtime; build depende só da ETAPA 3)

---

### ETAPA 8: Application — `ImportVisorTransactionsCommand` + Handler + Validator + resumo

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** A orquestração central — o cérebro do import: valida filtros, verifica conexão, busca (2 chamadas/tipo, paginação), filtra categoria client-side, deduplica, converte moeda com política de indisponível, e persiste insert-only atômico, devolvendo o resumo. Testado exaustivamente com portas mockadas.

**Complexidade:** 🔴 Alta (regra de negócio densa; maior superfície de teste)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Commands/Transactions/ImportVisorTransactions/ImportVisorTransactionsCommand.cs` (novo)
- `.../ImportVisorTransactionsCommandHandler.cs` (novo)
- `.../ImportVisorTransactionsCommandValidator.cs` (novo)
- `backend/src/MzFinance.Application/Dtos/Transactions/ImportVisorSummaryResponse.cs` (novo)
- `backend/src/MzFinance.UnitTests/Commands/ImportVisorTransactionsHandlerTests.cs` (novo)

**O que implementar:**
- **Command** (`RequestBase<ImportVisorSummaryResponse>` — seguir o padrão `IsValid()` → chama o Validator): `StartDate` (DateOnly?), `EndDate` (DateOnly?), `Type` (enum `{ Expense, Income, Both }` — criar `VisorImportType` ou reutilizar filtro), `Categories` (List<string>? — nomes locais), `IncludeIgnored` (bool, default false), `Search` (string?).
- **Validator** (FluentValidation, padrão `CreateTransactionCommandValidator`): `StartDate`/`EndDate` `NotNull`; `EndDate >= StartDate` (C4/RN03); **janela ≤ 24 meses** (guardrail confirmado na D4 — mensagem clara se exceder, RNF07); `Type` `IsInEnum`; `Search` trim → normalizar vazio p/ null. Categorias vazias/`""` normalizadas para "sem filtro".
- **Handler** (`MzFinanceContext` write + `ICurrentUserService` + `INotificationService` + `IVisorMcpClient` + `IExchangeRateProvider` + `IVisorTokenProvider` + `ILogger`):
  1. Resolver `userId`; carregar `User`.
  2. **Verificar conexão**: chamar `IVisorTokenProvider.GetValidAccessTokenAsync` (ou um método `EnsureConnected`); capturar `VisorNotConnectedException` → `Notify(...,"Conecte sua conta do Visor…")` (C2/CE01) e retornar; `VisorReauthRequiredException` → `Notify(...,"Sua conexão com o Visor expirou…")` (C13/CE02) e retornar. **Nenhuma** chamada de dados é feita.
  3. **Buscar (fetch-all primeiro)**: montar `VisorTransactionQuery`(s). `Type==Both` → **duas** chamadas (`Expense` e `Income`); senão uma. Cada `VisorTransactionDto` carrega o `TransactionType` da chamada que o produziu (RN04). `try/catch VisorIntegrationException` → `Notify` (CE05) e retornar sem persistir (extrato intacto).
  4. **Filtro de categoria client-side** (ADR 0008): se `Categories` não vazio, manter só itens cujo `CategoryName` casa (case-insensitive) com algum nome selecionado.
  5. **Dedup (insert-only)**: coletar os `ExternalId` do lote; `SELECT` os já existentes desse usuário com origem Visor (`_context.Transactions.Where(UserId && SourceType==FromVisor && ExternalId in lote)`); os presentes contam como `ignoradasPorJaExistirem` e são pulados.
  6. **Conversão** por item novo (política revista D1 — **sempre importa**): se `Currency=="BRL"` → `Amount=OriginalAmount`, sem taxa, `ExchangeReviewPending=false`. Senão `IExchangeRateProvider.GetRateToBrlAsync(currency, date)` (cache por `(currency, date)` num dicionário local):
     - resultado ≠ `null` → `Amount = round(OriginalAmount * Rate, 2)`, gravar `ExchangeRate`/`ExchangeRateDate=result.RateDate`, `ExchangeReviewPending=false`.
     - `null` (qualquer motivo: sem cotação na janela, moeda sem par PTAX, **ou** fonte fora do ar) → **importa mesmo assim** com `Amount=0`, `ExchangeRate`/`ExchangeRateDate` nulos, `OriginalAmount`/`OriginalCurrency` preservados e **`ExchangeReviewPending=true`**; incrementa `importadasComRevisaoDeCambio`. **Nunca** pula o item nem aborta o import por causa de câmbio.
  7. **Categoria-texto**: `CategoryName` ou "Sem categoria" se ausente/vazio (RN08); truncar a 100 (limite da coluna).
  8. **Montar** os `Transaction` novos (construtor de importação da ETAPA 1, incl. o flag) e `Add`; **um único** `SaveChangesAsync` (atômico, insert-only — RN06/RN07). Itens pendentes de câmbio entram no **mesmo** commit (marcados). A **única** causa de abortar/rollback é falha de infra do **Visor** (fetch/paginação) ou da persistência — câmbio não aborta. Como só há inserts, o `SaveChanges` único basta; não é preciso `IUnitOfWork` explícito.
  9. Retornar `ImportVisorSummaryResponse { Found, Imported, SkippedExisting, ImportedPendingExchangeReview }` (`Imported` inclui os pendentes).
- **Resumo DTO**: `Found`, `Imported` (inclui pendentes), `SkippedExisting`, `ImportedPendingExchangeReview` (subconjunto marcado). Substitui o `naoImportadasPorCambio` do PRD §4.2 (superado pela política revista D1: não há mais exclusão).
- **Registrar o assembly no MediatR** já é automático (scan). Validators idem (padrão atual).

**Testes Necessários:** (NSubstitute nas 3 portas + InMemory)
- [ ] `Import_HappyPathBoth_ShouldCreateVisorTransactionsWithCorrectTypes` (Cenário 1)
- [ ] `Import_Reimport_ShouldNotDuplicateOrAlterExisting` (Cenários 2–4/RN06)
- [ ] `Import_ForeignCurrency_ShouldConvertAndPreserveOriginal` (Cenário 9)
- [ ] `Import_BrlTransaction_ShouldNotConvert` (Cenário 10)
- [ ] `Import_RateUnavailableForDate_ShouldImportFlaggedForReviewWithZeroBrl` (Cenário 11/C16/D1)
- [ ] `Import_ExchangeSourceDown_ShouldImportForeignItemsFlaggedForReview_NotAbort` (D1)
- [ ] `Import_VisorFailureMidPaging_ShouldPersistNothing` (Cenário 15/CE05/RN07)
- [ ] `Import_MissingCategory_ShouldUseSemCategoria` (Cenário 13/RN08)
- [ ] `Import_CategoryFilter_ShouldFilterClientSideByName` (RN14)
- [ ] `Import_IncludeIgnoredToggle_ShouldRespectFlag` (Cenário 12/RN12)
- [ ] `Import_NotConnected_ShouldNotifyAndNotCallVisor` (Cenário 7/C2)
- [ ] `Import_LinkExpired_ShouldNotifyReconnect` (Cenário 8/C13)
- [ ] `Import_MissingDateRange_ShouldFailValidation` (Cenário 6/C4)
- [ ] `Import_EmptyResult_ShouldReturnZeroSummaryNoError` (Cenário 5/C8)

**Critérios de Aceitação:**
- [ ] Todos os cenários acima verdes.
- [ ] Nenhuma transação existente é alterada/apagada em reimport (insert-only).
- [ ] Falha de infra do **Visor** (fetch/paginação) não deixa estado parcial; **câmbio nunca aborta** (itens sem conversão entram marcados para revisão).
- [ ] Build + testes verdes.

**Dependências:** ETAPA 2 (persistência), ETAPA 3 (portas). Runtime: ETAPAs 4/6/7.

---

### ETAPA 9: Application — Query `GetVisorConnectionState`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Informar à UI se o Visor está conectado, precisa conectar ou reconectar — para habilitar/bloquear o botão de import e disparar o fluxo de consentimento.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Queries/Visor/GetVisorConnectionState/GetVisorConnectionStateQuery.cs` (novo)
- `.../GetVisorConnectionStateQueryHandler.cs` (novo)
- `backend/src/MzFinance.Application/Dtos/Visor/VisorConnectionStateResponse.cs` (novo)
- `backend/src/MzFinance.UnitTests/Queries/GetVisorConnectionStateHandlerTests.cs` (novo)

**O que implementar:**
- Query sem parâmetros (padrão `GetCategoriesQuery`), lê `MzFinanceReadOnlyContext` escopado ao `userId`.
- Resposta `VisorConnectionStateResponse { VisorConnectionStatus Status }` onde ausência de vínculo → `NotConnected` (adicionar `NotConnected = 0` ao enum apenas para a resposta, OU mapear ausência para um estado explícito no DTO — decidir mantendo o enum de domínio limpo; sugerido: DTO com um estado string/enum próprio de apresentação `{ NotConnected, Connected, Expired, Revoked }`).
- Não expõe nenhum material de token (RNF01).

**Testes Necessários:**
- [ ] `GetState_NoLink_ShouldReturnNotConnected`
- [ ] `GetState_ConnectedLink_ShouldReturnConnected`
- [ ] `GetState_ExpiredLink_ShouldReturnExpired`

**Critérios de Aceitação:**
- [ ] Estado correto para os 4 casos; nenhum dado sensível na resposta.
- [ ] Build + testes verdes.

**Dependências:** ETAPA 5 (entidade)

---

### ETAPA 10: WebApi — `VisorController` (conectar/callback, estado, importar)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Expor a superfície HTTP do Visor: iniciar/concluir o consentimento OAuth (redirects de browser) e os endpoints autenticados de estado e importação.

**Complexidade:** 🔴 Alta (mistura de rotas anônimas com redirect e endpoints JWT; correlação login↔usuário)

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.WebApi/Controllers/VisorController.cs` (novo)
- `backend/src/MzFinance.WebApi/Configurations/VisorIntegrationConfiguration.cs` (alterado — finalizar DI: `IVisorOAuthService`, `IVisorMcpClient`, `IVisorTokenProvider`, `IExchangeRateProvider`, HttpClients)
- `backend/src/MzFinance.WebApi/appsettings*.json` (alterado — `Visor:FrontendReturnUrl`, `Visor:OAuth:RedirectUri`)

**O que implementar:**
- **`GET /api/visor/connection`** (JWT) → `_mediator.Send(GetVisorConnectionStateQuery)` → `ProcessResponse` (C2/C13).
- **`POST /api/visor/import`** (JWT) → `[FromBody] ImportVisorTransactionsCommand` → `ProcessResponse(result)` (resumo). Padrão idêntico ao `TransactionsController.Create`.
- **`GET /oauth/visor/login`** (JWT — chamado por navegação autenticada; ver correlação abaixo): `IVisorOAuthService.BuildAuthorizationUrlAsync(userId)` → `Redirect(url)` para o `authorization_endpoint` do Visor.
- **`GET /oauth/visor/callback`** (`[AllowAnonymous]` — o Visor redireciona o browser sem o JWT): recebe `code`+`state`, `IVisorOAuthService.CompleteAuthorizationAsync(code, state)` (o `state` correlaciona ao `userId` via a pendência persistida), depois `Redirect(Visor:FrontendReturnUrl?visor=connected|error)`.
- **Correlação login↔usuário** (ver Ponto de Atenção 5 e Decisão Técnica 6): como o callback não traz o bearer, o `userId` é resolvido pela pendência `VisorOAuthAuthorizationRequest` (gravada no `/login` com o `userId` do token). O `/login` precisa do `userId` — se a navegação top-level não enviar o bearer, adotar **connect-ticket** de curta duração (endpoint autenticado emite ticket; o `/login` aceita `?ticket=`). **DÚVIDA D2** (UX do conectar) pode simplificar isto.
- Rotas OAuth ficam **fora** de `/api/[controller]` (usar `[Route]`/`[HttpGet("/oauth/visor/login")]` absolutos), já que o callback é uma URL registrada no cliente OAuth.

**Testes Necessários:** endpoints finos — cobertura via handlers (ETAPAs 8/9) + `/test-e2e`. Sem novo unit test obrigatório (seguindo o padrão dos controllers atuais, que não têm teste unitário).

**Critérios de Aceitação:**
- [ ] `/api/visor/connection` e `/api/visor/import` exigem JWT; `/oauth/visor/callback` é anônimo.
- [ ] Fluxo conectar redireciona ao Visor e volta ao frontend com status.
- [ ] `POST /api/visor/import` devolve o resumo dentro do envelope `DataActionResult`.
- [ ] Build verde; smoke manual do redirect no `/test-e2e`.

**Dependências:** ETAPA 6 (OAuth service/token provider), ETAPA 8 (command), ETAPA 9 (query)

---

### ETAPA 11: Extrato expõe rastreabilidade de câmbio (`TransactionResponse` + `GetStatement`)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Levar os campos de câmbio ao contrato do extrato (aditivo/retrocompatível) para a UI mostrar "US$105,91 → R$…" mantendo o principal em BRL.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/src/MzFinance.Application/Dtos/Transactions/TransactionResponse.cs` (alterado)
- `backend/src/MzFinance.Application/Queries/Transactions/GetStatement/GetStatementQueryHandler.cs` (alterado — projeção)
- `backend/src/MzFinance.UnitTests/Queries/GetStatementCurrencyProjectionTests.cs` (novo)

**O que implementar:**
- Em `TransactionResponse`, adicionar `OriginalCurrency`, `OriginalAmount`, `ExchangeRate` (decimal?), `ExchangeRateDate` (DateOnly?), **`ExchangeReviewPending` (bool)**. `OriginalCurrency`/`OriginalAmount` sempre presentes pós-migração; taxa/data opcionais.
- Na projeção do `GetStatementQueryHandler` (`.Select(...)`), incluir os novos campos.
- **Totais/saldo:** os itens pendentes têm `Amount = 0` (sentinela da ETAPA 8), então **não corrompem** nenhuma soma em BRL — o `Balance` do extrato **e** as agregações existentes (dashboard/projeção em `Infra/Builders`, que somam `Amount`) permanecem corretos **sem** precisar alterá-las (vantagem do sentinela: zero ripple). Por clareza, adicionar filtro explícito `!x.ExchangeReviewPending` na soma do `Balance` do statement (defensivo, redundante com o sentinela). Os itens pendentes **aparecem** na lista do extrato (marcados na UI — ETAPA 15), mas **não** entram no saldo.

**Testes Necessários:**
- [ ] `GetStatement_ForeignTransaction_ShouldProjectOriginalAndRate`
- [ ] `GetStatement_BrlTransaction_ShouldProjectBrlWithoutRate`
- [ ] `GetStatement_PendingReviewTransaction_ShouldProjectFlagAndBeExcludedFromBalance`

**Critérios de Aceitação:**
- [ ] Contrato aditivo (nada removido/renomeado).
- [ ] `Balance` e agregações existentes corretos (sentinela `Amount=0`); transações pendentes fora do saldo, mas visíveis na lista.
- [ ] Build + testes verdes.

**Dependências:** ETAPA 2 (campos existem)

---

### ETAPA 12: Frontend — `api.ts` (câmbio em `Transaction` + endpoints/tipos de Visor)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Estender a camada de acesso a dados do frontend com os campos de câmbio e os novos endpoints Visor, sem tocar UI ainda.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/transactions/api.ts` (alterado)

**O que implementar:**
- `Transaction`: adicionar `originalCurrency: string`, `originalAmount: number`, `exchangeRate: number | null`, `exchangeRateDate: string | null`, **`exchangeReviewPending: boolean`**.
- Tipos: `VisorConnectionStatus = 'NotConnected' | 'Connected' | 'Expired' | 'Revoked'`; `ImportVisorInput { startDate; endDate; type: 'Expense'|'Income'|'Both'; categories?: string[]; includeIgnored: boolean; search?: string }`; `ImportVisorSummary { found; imported; skippedExisting; filteredOutByCategory: number; importedPendingExchangeReview }`.
- Funções: `getVisorConnection(): Promise<{status: VisorConnectionStatus}>` (`GET /api/visor/connection`); `importVisorTransactions(input): Promise<ImportVisorSummary>` (`POST /api/visor/import`); `visorLoginUrl(): string` (monta a URL de `/oauth/visor/login` do backend — usada em navegação top-level/popup, não `fetch`).
- Seguir o padrão do `httpClient` (envelope, bearer automático).

**Testes Necessários:** sem framework de teste no frontend (contexto). Critério = `npm run build` (tsc) verde.

**Critérios de Aceitação:**
- [ ] Tipos e funções compilam; `Transaction` cobre os campos de câmbio.
- [ ] `npm run build --prefix frontend` verde.

**Dependências:** nenhuma (idealmente após ETAPAs 10/11 existirem no backend p/ integração real)

---

### ETAPA 13: Frontend — Modal de Importação do Visor

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Construir o modal com filtros estruturados, estados (carregando/vazio/erro) e resumo pós-import, reusando o Design System.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/features/transactions/ImportVisorModal.tsx` (novo)
- `frontend/src/features/transactions/ImportVisorModal.module.css` (novo)

**O que implementar:**
- `Modal` (`shared/ui`) com filtros: **prazo** (dois `Input type="date"`, obrigatórios), **tipo** (pills Despesa/Receita/Ambos — reusar o padrão de `typePills` da `TransactionsPage`), **categoria** (multiseleção populada por `getCategories()` — usar `ComboBox`/checkbox list; ver DS), **toggle "incluir ignoradas"**, **busca** (opcional).
- Validação client-side do prazo (data final ≥ inicial) espelhando o backend (C4) — mas o backend é a autoridade.
- Ao confirmar: `importVisorTransactions(...)`; enquanto processa, botão em loading (assíncrono, C5); erros do backend → `Feedback` (CE01/CE02/CE05 conforme a mensagem — câmbio não gera mais erro/exclusão); sucesso → **resumo** (`{imported} importadas · {skippedExisting} já existentes · {importedPendingExchangeReview} aguardando revisão de câmbio`); resultado vazio → `EmptyState` "Nenhuma transação encontrada para importar neste período" (C8). Se `importedPendingExchangeReview > 0`, exibir aviso amigável de que essas transações entraram e precisam de revisão de câmbio (C16).
- Props: `open`, `onClose`, `onImported` (callback p/ a página recarregar o extrato).

**Testes Necessários:** `npm run build` (tsc) verde.

**Critérios de Aceitação:**
- [ ] Modal com todos os filtros do RF03; prazo obrigatório barrado client-side.
- [ ] Estados carregando/vazio/erro + resumo pós-import.
- [ ] Sem Tailwind (CSS Modules); `npm run build` verde.

**Dependências:** ETAPA 12

---

### ETAPA 14: Frontend — botão "Importar do Visor" + fluxo Conectar/Reconectar na `TransactionsPage`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Integrar o modal à tela: botão ao lado de "Nova transação", gate de conexão (conectar/reconectar) e reload do extrato após import.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/features/transactions/TransactionsPage.tsx` (alterado)
- `frontend/src/features/transactions/TransactionsPage.module.css` (alterado, se preciso)

**O que implementar:**
- No header, botão **"Importar do Visor"** (`Button variant="secondary"`) ao lado de "Nova transação".
- Ao clicar: consultar `getVisorConnection()`.
  - `Connected` → abrir `ImportVisorModal`.
  - `NotConnected`/`Expired`/`Revoked` → afordância de **Conectar/Reconectar**: navegar (top-level ou popup) para `visorLoginUrl()` (ver DÚVIDA D2 quanto a popup×redirect). Ao voltar do callback com `?visor=connected`, reconsultar o estado e abrir o modal; `?visor=error` → `Feedback`.
- Após `onImported`, chamar `loadStatement()` (reload) — o resumo já foi mostrado no modal.
- Detectar o retorno do OAuth: ler `?visor=` da URL (query param) no mount e reagir.

**Testes Necessários:** `npm run build` verde + verificação manual no `/test-e2e`.

**Critérios de Aceitação:**
- [ ] Botão presente; import bloqueado e orientado quando não conectado (C2/C13).
- [ ] Extrato recarrega após import.
- [ ] `npm run build` verde.

**Dependências:** ETAPA 12, ETAPA 13

---

### ETAPA 15: Frontend — rastreabilidade de câmbio no extrato

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-07

**Objetivo:** Mostrar, nas linhas vindas de moeda estrangeira, o valor/moeda originais como detalhe, mantendo o principal em BRL (RF07).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/shared/formatCurrency.ts` (alterado — variante multi-moeda)
- `frontend/src/features/transactions/TransactionsPage.tsx` (alterado — exibir original quando `originalCurrency !== 'BRL'`)
- `frontend/src/shared/ui/MoneyValue/MoneyValue.tsx` (opcional — só se precisar de suporte a moeda ≠ BRL; senão o detalhe fica na linha)

**O que implementar:**
- Adicionar `formatCurrencyIn(value, currency)` (mantendo `formatCurrency` BRL intacto para não regредir o resto do app).
- Na `renderTransactionRow`:
  - `t.originalCurrency !== 'BRL'` **e** convertida (`!t.exchangeReviewPending`): detalhe discreto (ex.: `US$105,91 → ` antes do `MoneyValue` BRL, ou como `itemMeta`). O principal continua `MoneyValue` em BRL (RN09).
  - **`t.exchangeReviewPending === true`**: **não** mostrar `R$0,00` como principal (seria enganoso). Exibir o **valor original** (`formatCurrencyIn(t.originalAmount, t.originalCurrency)`) como principal + um `Badge`/`Feedback` discreto "revisão de câmbio" indicando conversão pendente (C16). Deixar claro que não entra no saldo.
- Opcional: badge/ícone de origem "Visor" (C15 — a origem já vem em `sourceType`; exibir um `Badge` quando `sourceType === 'FromVisor'`).

**Testes Necessários:** `npm run build` verde + inspeção visual no `/test-e2e`.

**Critérios de Aceitação:**
- [ ] Linha estrangeira convertida mostra original + BRL; linha BRL inalterada.
- [ ] Linha **pendente de câmbio** mostra o original + selo de "revisão de câmbio" (nunca `R$0,00` enganoso).
- [ ] `formatCurrency` (BRL) do resto do app não muda.
- [ ] Origem "Visor" distinguível no extrato (C15).
- [ ] `npm run build` verde.

**Dependências:** ETAPA 12

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
- [ ] `dotnet build backend/MzFinance.slnx` sem erros
- [ ] `dotnet test backend/MzFinance.slnx` — todos verdes (incl. cenários RN05/RN06/RN07/RN09/RN10)
- [ ] `npm run build --prefix frontend` sem erros

### Padrões de Código
- [ ] CQRS respeitado (Command escreve/`MzFinanceContext`; Query lê/`ReadOnlyContext`)
- [ ] Notification Pattern (sem exception para erro de negócio); envelope `DataActionResult`
- [ ] Portas em `Domain/Interfaces`, impls em `Infra`; DI via `WebApi/Configurations`
- [ ] Frontend sem Tailwind (CSS Modules / DS)

### Banco de Dados / Schema
- [ ] Migração #1 (`AddVisorTransactionFields`) aplica + backfill sem perda; `Down` reverte
- [ ] Migração #2 (`AddVisorOAuthStore` + `DataProtectionKeys`) aplica; `Down` reverte
- [ ] Índice único filtrado `(UserId, ExternalId)` presente e testado (dedup)

### Segurança / Integrações
- [ ] Tokens/consentimento OAuth cifrados (Data Protection + PersistKeys + ApplicationName fixo)
- [ ] Refresh rotativo single-flight persistido fora da transação do import
- [ ] Valores/moedas/taxas/descrições nunca logados em texto puro (RNF01/RNF02)
- [ ] **Visor**: falha de infra no fetch/paginação → rollback total; **câmbio nunca aborta** (itens sem conversão importados marcados para revisão, `Amount=0`, fora do saldo)

### Autorização
- [ ] `/api/visor/*` e `/api/transactions/*` exigem JWT; só `/oauth/visor/callback` é anônimo
- [ ] Vínculo e transações escopados por `UserId` (RN15)

### PRD
- [ ] Critérios C1–C16 atendidos; RN01–RN16 refletidas
- [ ] Definição de Pronto (§13) satisfeita

---

## LEGENDA DE STATUS

- ⏳ **Pendente** · 🔄 **Em Progresso** · ✅ **Concluída** · ❌ **Bloqueada**

---

## PONTOS DE ATENÇÃO

1. **Refresh rotativo × atomicidade (crítico):** o refresh token é rotativo — persistir o token novo **dentro** da transação atômica do import e depois dar rollback **queima** a credencial (o antigo já foi invalidado no Visor). Mitigação obrigatória: `VisorTokenProvider` usa **contexto/transação próprios** (`IDbContextFactory`), `SELECT ... FOR UPDATE` + `SemaphoreSlim`, e **commita o token na hora**, independente do import (ETAPA 6). O import busca tudo antes de persistir qualquer `Transaction`.
2. **Data Protection efêmero no Coolify:** sem `SetApplicationName(fixo)` + `PersistKeysToDbContext`, um redeploy gera novo key ring e os tokens cifrados no banco viram ilegíveis (usuário "desconecta" sozinho). Bloqueador de produção (ETAPA 5).
3. **Câmbio nunca bloqueia o import (política revista — resposta do humano à D1):** walk-back cobre fim de semana/feriado; quando ainda assim não converte (moeda sem par PTAX, sem cotação na janela, ou PTAX fora do ar), a transação é **importada marcada** (`ExchangeReviewPending=true`, `Amount=0`) — nunca excluída nem abortada. **Limitação conhecida:** por ser insert-only (RN06), uma reimportação **não** reprocessa o câmbio de um item já importado (o dedup por `ExternalId` o pula); resolver a pendência é manual/futuro ("revisão de câmbio"), fora do escopo desta v1. Ver ADR 0007.
4. **Janelas grandes (RNF07):** import síncrono de período longo (muitos itens + muitas cotações) pode estourar timeout. Mitigações no PLAN: cache de cotações por `(moeda, data)` no request; **guardrail de janela de 24 meses** por importação (confirmado na D4 — **sem** modo assíncrono nesta v1).
5. **Correlação login OAuth ↔ usuário (D2 confirmada — redirect full-page + connect-ticket, sem popup):** o `/oauth/visor/callback` chega como redirect de browser **sem** o JWT (bearer do `localStorage` não vai em navegação top-level). Fluxo: um endpoint autenticado emite um **connect-ticket** de curta duração; o front navega (full-page) para `/oauth/visor/login?ticket=…`; o `/login` valida o ticket, resolve o `userId`, gera PKCE+`state` e grava a pendência `VisorOAuthAuthorizationRequest`; o `/callback` correlaciona pelo `state` e redireciona ao `Visor:FrontendReturnUrl`.
6. **`amount` do Visor é string sempre positiva e sem sinal por linha:** o tipo vem do **filtro** (`type=expense|income`), por isso "ambos" = 2 chamadas. Parsear `amount` com cultura invariável.
7. **Categoria local × slug do Visor:** decisão de filtrar client-side por `category_name` (ADR 0008) assume que os nomes locais batem com os do Visor; divergências (categoria renomeada localmente) podem não casar — limitação conhecida, aceitável por RN14.
8. **`Application.csproj` referencia `Infra`:** o projeto não é Clean Arch textbook (handlers usam `MzFinanceContext` direto). O PLAN segue o padrão vivo, não o ideal — não "consertar" isso aqui (fora de escopo).

---

## DECISÕES TÉCNICAS

### Decisão 1: Nomenclatura de campos em inglês (não PT do PRD)
- **Escolhida:** `OriginalCurrency/OriginalAmount/ExchangeRate/ExchangeRateDate/ExternalId` e `FromVisor`.
- **Justificativa:** consistência com o código real (todos os membros de `Transaction`/enums são inglês). "Consistência com o projeto vence preferência/So do PRD."
- **Alternativas:** usar os nomes PT do PRD — rejeitado por quebrar a convenção do domínio.

### Decisão 2: Cliente MCP nativo .NET com `ModelContextProtocol` 1.4.0 (ADR 0005)
- **Escolhida:** SDK oficial 1.4.0 (estável, net10.0), `HttpClientTransport` + `AdditionalHeaders` Bearer, `McpClient.CreateAsync`/`CallToolAsync`.
- **Justificativa:** validado no dossiê; evita ponte Node; alvo produção Coolify. Não usar 2.0.0-preview nem APIs 0.x (`SseClientTransport`, `McpClientFactory`, `ClientOAuthOptions`).
- **Alternativas:** ponte Node/proxy MCP — rejeitada (mais uma runtime em produção).

### Decisão 3: Storage OAuth cifrado + refresh single-flight (ADR 0006)
- **Escolhida:** tabela `VisorOAuthTokenSet` (cifrada via Data Protection), refresh rotativo com `SemaphoreSlim` + `SELECT FOR UPDATE`, persistência fora da transação do import.
- **Justificativa:** refresh rotativo exige storage mutável e single-flight; atomicidade do import não pode queimar token (Ponto 1).
- **Alternativas:** refresh em env var (impossível — rotativo); cache em memória (perde no redeploy).

### Decisão 4: Fonte de câmbio PTAX/BCB (venda de fechamento) + import-com-flag-de-revisão (ADR 0007; D1/D3 do humano)
- **Escolhida:** PTAX (Olinda/OData, `cotacaoVenda` de fechamento, pela data da transação), walk-back até `WalkBackBusinessDays` para dias sem pregão. Quando **não** converte por qualquer motivo (moeda sem par, sem cotação na janela, **ou** fonte fora do ar) → a transação é **importada mesmo assim** com `ExchangeReviewPending=true` e `Amount=0`; **nunca** exclui nem aborta.
- **Justificativa:** decisão do humano (D1) — priorizar não perder transações; câmbio deixa de ser causa de rollback. Fonte oficial/gratuita/sem auth (D3). Pendentes ficam fora do saldo (sentinela `Amount=0`) e são resolvidas depois.
- **Alternativas:** excluir item inconversível + abortar se a fonte cair (proposta original, **rejeitada** pelo humano na D1); falhar todo o import a cada item sem cotação (péssima UX); provedor pago — desnecessário.

### Decisão 5: Descompasso de categoria — filtro client-side por nome (ADR 0008)
- **Escolhida:** não usar `category_slug` do Visor; buscar sem filtro de categoria e filtrar no handler por `category_name` vs nomes locais.
- **Justificativa:** RN14 (multiselect populado localmente) + o payload traz `category_name` legível; evita manter mapa slug↔categoria frágil.
- **Alternativas:** mapa de slugs (frágil, manutenção); filtrar sobre já-importadas (semântica confusa).

### Decisão 6: "Ambos" = duas chamadas `get_transactions`
- **Escolhida:** uma chamada `type=expense`, outra `type=income`; cada resultado carimbado com seu `TransactionType`.
- **Justificativa:** confirmado no dossiê — o Visor não traz sinal por linha; `type` é filtro. Despesa/Receita = 1 chamada; Ambos = 2.
- **Alternativas:** inferir sinal por heurística — inseguro e proibido por RN04.

### Decisão 7: Dedup por índice único filtrado + checagem na aplicação
- **Escolhida:** índice único parcial `(UserId, ExternalId) WHERE ExternalId IS NOT NULL` **e** checagem prévia no handler (para contabilizar "ignoradas" e evitar violar o índice).
- **Justificativa:** blindagem de idempotência (RN05/RNF04) mesmo em retry; a checagem app dá o contador do resumo. Baixo volume/concorrência (usuário único), mas o índice é barato.
- **Alternativas:** só checagem na app — sem blindagem contra corrida/bug.

### Decisão 8: Atomicidade por `SaveChanges` único (sem `IUnitOfWork` explícito)
- **Escolhida:** como o import é **insert-only** (nenhum update de existentes), adicionar todos os `Transaction` novos e um único `SaveChangesAsync` já é atômico.
- **Justificativa:** o EF envolve um `SaveChanges` numa transação; não há operação multi-passo que exija `IUnitOfWork`. Simplicidade e coerência com os handlers atuais.
- **Alternativas:** `IUnitOfWork` explícito — desnecessário aqui (nenhum bulk-merge multi-comando).

---

## RISCOS E MITIGAÇÕES

### Risco 1: Token rotativo perdido por rollback do import
- **Impacto**: Alto — desconecta o Visor, exige reconsentimento manual.
- **Probabilidade**: Média (falhas de câmbio/Visor acontecem).
- **Mitigação**: refresh em contexto/transação próprios, commit imediato, fora do import (ETAPA 6, Ponto 1).

### Risco 2: Redeploy Coolify invalida tokens cifrados
- **Impacto**: Alto — todos os vínculos ficam ilegíveis.
- **Probabilidade**: Alta sem mitigação (todo redeploy).
- **Mitigação**: `SetApplicationName` fixo + `PersistKeysToDbContext` (ETAPA 5).

### Risco 3: SDK MCP 1.4.0 com API diferente do esperado
- **Impacto**: Médio — retrabalho no cliente.
- **Probabilidade**: Baixa (dossiê validou a API; cutoff jan/2026).
- **Mitigação**: isolar tudo atrás de `IVisorMcpClient`; mapeamento testado com payloads fixos; validação real no `/test-e2e`.

### Risco 4: Import síncrono estoura timeout em janelas grandes
- **Impacto**: Médio — request falha (mas atômico, sem sujeira).
- **Probabilidade**: Média para períodos longos.
- **Mitigação**: cache de cotações por request + **guardrail de 24 meses** (D4 confirmada); sem assíncrono na v1.

### Risco 7: Pendências de câmbio acumulam sem resolução automática
- **Impacto**: Médio — transações importadas com `Amount=0` ficam fora do saldo até revisão manual.
- **Probabilidade**: Baixa/Média (só moedas exóticas ou PTAX fora do ar).
- **Mitigação**: resumo pós-import + selo no extrato tornam as pendências visíveis (ETAPAs 13/15); "revisão de câmbio" como feature futura. Insert-only impede auto-correção por reimport (Ponto 3).

### Risco 5: Nomes de categoria local não casam com `category_name` do Visor
- **Impacto**: Baixo — filtro de categoria pode não trazer o esperado.
- **Probabilidade**: Média.
- **Mitigação**: match case-insensitive; documentar limitação (RN14 só exige multiselect local). Sem filtro = importa tudo.

### Risco 6: Vazamento de dados sensíveis em log
- **Impacto**: Alto — compromete conta bancária agregada.
- **Probabilidade**: Baixa com disciplina.
- **Mitigação**: `TokenProtector`; nunca logar token/verifier/valores; revisar logs no `/code-review` (RNF01/RNF02).

---

## DÚVIDAS — RESOLVIDAS PELO HUMANO (2026-07-06)

Todas as 4 dúvidas de handoff técnico foram respondidas pelo humano (via broker) e já estão incorporadas ao PLAN e aos ADRs:

- **D1 — Política de câmbio → MUDOU (proposta original rejeitada).** Não há mais "excluir + abortar". Regra final: **sempre tentar converter** (PTAX venda de fechamento pela data; walk-back para dia útil é normal). Quando a conversão **não** for possível por qualquer motivo (moeda sem par PTAX, sem cotação, **ou** fonte fora do ar), a transação é **importada mesmo assim, marcada para revisão de câmbio** (`ExchangeReviewPending`, `Amount=0`); **nunca** exclui nem aborta. → Refletido nas ETAPAs 1, 2, 3, 4, 8, 11, 12, 13, 15; ADR 0007 reescrito.
- **D2 — UX "Conectar Visor" → CONFIRMADA: redirect full-page + connect-ticket** de curta duração (sem popup). ETAPAs 10/14 mantidas como desenhadas (ver Ponto de Atenção 5).
- **D3 — Câmbio → CONFIRMADO: PTAX/BCB, cotação de VENDA de fechamento, pela data da transação.** ADR 0007 mantém a fonte.
- **D4 — Import síncrono → CONFIRMADO: teto de ~24 meses por importação**, sem modo assíncrono nesta v1. Guardrail no Validator (ETAPA 8) e Ponto de Atenção 4.

**Nenhuma dúvida em aberto.** O PRD (§16) já fechara D1–D5 de produto; estes eram pontos de handoff técnico (§17) e estão todos decididos.

---

## DOCUMENTAÇÃO DE REFERÊNCIA

- **PRD**: prd/mz-finance-prd-004-tbd-import-visor.md (§17 Handoff, §16 Decisões de Produto)
- **Contexto/Arquitetura**: MAPS/mz-finance/mz-finance-context.md
- **ADRs desta feature**: adr/0005-cliente-mcp-nativo-dotnet.md, adr/0006-oauth-visor-storage-cifrado-refresh-rotativo.md, adr/0007-fonte-cambio-ptax-politica-indisponivel.md, adr/0008-descompasso-categoria-filtro-client-side.md
- **Memória do projeto**: mz-finance-visor-mcp-integration.md (dossiê MCP/OAuth validado)
- **Código de referência**:
  - `backend/src/MzFinance.Domain/Models/Transaction.cs`, `Enums/TransactionSourceType.cs`
  - `backend/src/MzFinance.Application/Commands/Transactions/CreateTransaction/*` (padrão Command/Handler/Validator)
  - `backend/src/MzFinance.Application/Queries/Transactions/GetStatement/*`, `Queries/Categories/GetCategories/*`
  - `backend/src/MzFinance.Infra/Maps/TransactionMap.cs`, `Migrations/20260706012842_AddSortOrderToCreditCard.cs` (padrão migração + backfill)
  - `backend/src/MzFinance.WebApi/Controllers/{TransactionsController,MzFinanceControllerBase,AuthController}.cs`, `Configurations/*`
  - `frontend/src/features/transactions/{TransactionsPage.tsx,api.ts}`, `shared/{formatCurrency.ts,ui/*}`

---

## COMANDOS ÚTEIS

```bash
# Build / testes (ver mz-finance-context.md#comandos)
dotnet build backend/MzFinance.slnx
dotnet test backend/MzFinance.slnx
npm run build --prefix frontend

# Migrações
dotnet ef migrations add AddVisorTransactionFields -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
dotnet ef migrations add AddVisorOAuthStore        -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi
dotnet ef database update -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi

# Rodar local (ver memória mz-finance-local-run): API na 5280; Postgres do container na 5434
```

---

## INSTRUÇÕES DE ATUALIZAÇÃO

Atualizado automaticamente pelo `/implementar`. Após cada etapa: status → ✅ + data; barra/percentual; checkboxes marcadas. **Não commitar por etapa** (política do projeto — commit único ao final).

---

## OBSERVAÇÕES

1. **Uma etapa por vez**, com build + testes verdes antes de avançar.
2. **Seguir os padrões vivos** (ver arquivos de referência).
3. **`/code-review` após cada etapa**; atenção redobrada em segurança (ETAPAs 5–7) e atomicidade (ETAPA 8).
4. **Runtime real (Visor/PTAX)** só é exercitável no `/test-e2e` — os unit tests cobrem lógica com portas mockadas.

---

**Criado em:** 2026-07-06
**Próximo passo:** `/implementar ETAPA 1`
