# ADR 0011: Import de compras de cartão do Visor — par preview/confirm dedicado, dedup em `CreditCardPurchase` e política do C20

**Data:** 2026-07-07
**Status:** Aceito
**Contexto:** Fase `/planejar` da feature `import-visor-cartao` (PRD 005), branch `feature/import-visor-cartao`. Complementa os ADRs 0005–0010 (infra Visor/PTAX/OAuth já em produção pela 004) e o ADR 0009 (preview→confirm da 004, que **exclui** contas CREDIT).

Decisões técnicas tomadas pelo Arquiteto (modo orquestrado, sem gate humano). Dúvidas de negócio novas não surgiram.

---

## Decisão 1 — Par preview/confirm **novo e dedicado**, reusando as portas da 004 (não estender o par bancário)

O `PreviewVisorImportQuery`/`ConfirmVisorImportCommand` da 004 tem comportamento **inverso** ao desta feature: excluem contas CREDIT, escrevem em `Transaction`, têm filtro receita/despesa e não têm cartão de destino. Esta feature **mantém só** contas CREDIT, escreve em `CreditCardPurchase`, importa **só despesas positivas** e agrupa por conta com escolha de cartão local.

- **Escolhida:** criar `PreviewVisorCardImportQuery` (leitura) + `ConfirmVisorCardImportCommand` (escrita), **reaproveitando integralmente** as portas `IVisorMcpClient` (`GetAccountsAsync`/`GetTransactionsAsync`), `IExchangeRateProvider`, `IVisorTokenProvider` e o helper `VisorImportCategory`. Zero infra nova.
- **Justificativa:** ramificar o par da 004 com `if cartão` dobraria a superfície de teste do handler mais crítico já existente e criaria acoplamento entre dois fluxos com regras opostas. "Uma etapa, uma razão para mudar" — dois fluxos, dois handlers. O reuso fica nas **portas** (seam estável), não na orquestração.
- **Alternativas rejeitadas:** (a) parametrizar o par da 004 com um flag `onlyCreditCards` — polui o handler bancário em produção; (b) recriar cliente MCP/câmbio — proibido (já existe, ADR 0005/0007).

## Decisão 2 — Rastreabilidade em `CreditCardPurchase` espelha `Transaction` da 004; `Amount` sempre em BRL; sentinela `Amount=0` para pendência de câmbio

- **Escolhida:** acrescentar a `CreditCardPurchase` os campos `ExternalId` (string?, nulo p/ manual), `OriginalCurrency` (string, default `"BRL"`), `OriginalAmount` (decimal), `ExchangeRate` (decimal?), `ExchangeRateDate` (DateOnly?), `ExchangeReviewPending` (bool). `Amount` continua sendo a magnitude **em BRL**. Construtor manual atual preserva a assinatura e nasce coerente (`OriginalCurrency="BRL"`, `OriginalAmount=amount`, resto nulo/false). Novo construtor de importação recebe a rastreabilidade + `externalId`.
- **Pendência de câmbio (C15/RN12):** reusa a semântica da 004 — quando o BRL não é resolvido, `ExchangeReviewPending=true` e `Amount=0` (sentinela). Como fatura (`GetCreditCardBillQueryHandler`), projeção (`GetCreditCardBillForecastQueryHandler`) e limite usado (`GetCreditCardsQueryHandler.CalculateUsedLimit`) derivam tudo de `purchase.Amount` via `CreditCardBillingCalculator` (`installmentAmount = Amount / InstallmentsCount`), `Amount=0` mantém a compra pendente **fora** de todos os totais **com zero alteração** nesses cálculos. A compra aparece na fatura com parcela R$0,00 e é sinalizada na UI.
- **Justificativa:** consistência de projeto vence (a 004 já provou o padrão); zero ripple nos cálculos de fatura/limite/projeção.

## Decisão 3 — Deduplicação: índice único filtrado `(CreditCardId, ExternalId)` + checagem app **escopada ao usuário**

`CreditCardPurchase` **não tem** coluna `UserId` (o usuário vem por `CreditCard.UserId`), então o índice `(UserId, ExternalId)` da 004 não é replicável sem denormalizar.

- **Escolhida:** (a) índice único **filtrado** no banco `(CreditCardId, ExternalId) WHERE ExternalId IS NOT NULL` — blindagem contra double-insert no mesmo cartão; (b) checagem autoritativa **no handler**, escopada ao usuário via join `p.CreditCard.UserId == userId`, para o marcador "já importada" no preview e o dedup insert-only na confirmação (RN10). O escopo de negócio do dedup é **por usuário** (atravessa todos os cartões do usuário): reimportar um lançamento já trazido para o cartão A aparece como "já importada" mesmo apontando para o cartão B.
- **Justificativa:** não denormalizar `UserId` em `CreditCardPurchase` evita ripple no construtor manual e no resto do domínio de cartão (minimal blast radius). O projeto é usuário único / baixa concorrência (memória do projeto), então a checagem app cobre o cross-cartão e o índice de banco cobre a corrida no mesmo cartão.
- **Limitação conhecida (aceita):** o índice de banco não impede, por si só, o mesmo `ExternalId` em **dois cartões diferentes** — isso é barrado apenas pela checagem app. Dado o perfil single-user, é suficiente. Se um dia virar multiusuário concorrente, promover a denormalização de `UserId` ou índice cross-cartão.
- **Alternativa rejeitada:** denormalizar `UserId` em `CreditCardPurchase` — schema maior, mexe no caminho de compra manual sem necessidade nesta feature.

## Decisão 4 — C20 (cartão de destino removido entre preview e confirm): **rejeitar a operação inteira**

O PRD (C20) admite duas políticas: persistir só os cartões válidos **ou** rejeitar tudo com mensagem clara; delega a escolha ao Arquiteto (PA7).

- **Escolhida:** se **qualquer** `CreditCardId` referenciado na confirmação não existir ou não pertencer ao usuário → **rejeitar a confirmação inteira** (`Notify(Conflict, "O cartão de destino '…' não está mais disponível.")`), persistindo **nada**. Nenhuma compra é criada; o usuário reabre o preview e reimporta (idempotente por `ExternalId`).
- **Justificativa:** máxima simplicidade de atomicidade (coerente com C19 tudo-ou-nada), sem estado parcial/confuso; reenvio é barato no perfil single-user. Uma única guarda no handler versus particionar itens válidos/inválidos e relatar.
- **Alternativa considerada:** persistir válidos + relatar inválidos — melhor UX marginal, porém mais superfície e um "sucesso parcial" que atrita com a narrativa tudo-ou-nada do PRD. Rejeitada.
- **Nota:** C7 (conta CREDIT do Visor **sem** cartão de destino escolhido) é caso distinto e resolvido na UI — essas linhas simplesmente não são enviadas ao confirm (não têm `creditCardId`); não bloqueiam as demais.

## Decisão 5 — Granularidade por lançamento, default 1x; marcador "NN/NN" é **somente informação**

- **Escolhida:** cada linha do Visor vira `CreditCardPurchase` com `InstallmentsCount=1` por padrão, `PurchaseDate = data do lançamento`, `Amount = valor da parcela do mês` (o `amount` da linha, já em BRL após conversão). O marcador "NN/NN" é extraído da descrição por regex **apenas para exibição** (read-only); não alimenta lógica (PA1 / handoff item 8). Edição para `N>1` é permitida e persistida como enviada; o aviso de dupla contagem (C10) é **da UI**.
- **Consequência assumida (PA1):** ao editar para `N>1`, o `CreditCardBillingCalculator` dividirá `Amount` por N. Como o `Amount` importado é o valor **da parcela** (não o total), o usuário que quiser projeção correta deve também ajustar o valor em BRL — responsabilidade dele, com aviso; a prevenção automática é **não-objetivo**.

---

## Consequências

- Nenhuma infra nova; a feature é aditiva (colunas novas em `CreditCardPurchase`, endpoints novos, componente de UI novo). Migration aditiva/reversível com backfill.
- Reuso máximo das portas Visor/PTAX/OAuth da 004; o novo par de handlers é testável contra mocks (NSubstitute), sem tocar Visor/PTAX reais.
- Destaques para revisão humana: **PA1** (sem agrupamento automático de plano parcelado) e **PA4** (PTAX da data do lançamento, não do fechamento).
</content>
</invoke>
