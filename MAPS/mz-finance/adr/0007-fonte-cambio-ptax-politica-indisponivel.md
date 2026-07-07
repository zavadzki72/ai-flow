# ADR 0007 — Fonte de câmbio PTAX/BCB e política de "importar mesmo sem conversão"

- **Status**: Aceito (respostas do humano às dúvidas D1/D3 em 2026-07-06)
- **Data**: 2026-07-06 (revisado no mesmo dia após a resposta do humano à D1)
- **Contexto**: PRD 004 — Handoff §17 item 3; C9/C16; RN09/RN10; DP3
- **Decisores**: Arquiteto de Software Sênior + humano (via broker)

## Contexto

O `get_transactions` do Visor devolve moeda estrangeira apenas no **valor/moeda originais** (ex.: `currency:"USD", amount:"105.91"`), **sem** valor em BRL nem taxa. Como o mz-finance soma um único número (`Amount`) para saldo/totais, o produto decidiu **converter para BRL no import** pela taxa da **data da transação**, preservando original+taxa como rastreabilidade (DP3/RN09). Isso cria uma **nova integração externa de câmbio**, com contrato, disponibilidade e casos de cotação ausente próprios.

A proposta inicial do Arquiteto (excluir o item inconversível + abortar o import se a fonte caísse) foi **rejeitada pelo humano** na dúvida D1. A regra passa a priorizar **nunca perder uma transação**: câmbio deixa de ser causa de exclusão ou de rollback.

## Decisão

1. **Fonte**: **PTAX do Banco Central** via API pública **Olinda/OData** (`CotacaoMoedaDia`), gratuita e sem autenticação (confirmado na D3). Porta `IExchangeRateProvider`, impl `PtaxExchangeRateProvider` (Infra).
2. **Taxa exata**: **cotação de venda (`cotacaoVenda`) do boletim de fechamento** PTAX, pela **data da transação** (confirmado na D3).
3. **BRL**: curto-circuito — sem chamada externa (a transação já é BRL; `Amount = OriginalAmount`, sem taxa).
4. **Walk-back (comportamento normal)**: se a data cai em fim de semana/feriado (PTAX sem boletim), retroceder dia a dia até a última cotação útil, limitado a `Exchange:WalkBackBusinessDays` (default 5). `ExchangeRateDate` registra a data efetivamente usada. Isso **não** é indisponibilidade — é o funcionamento esperado do PTAX.
5. **Impossibilidade de conversão → importar mesmo assim, marcado para revisão** (política revista D1): quando **não** for possível converter por **qualquer** motivo — moeda sem par PTAX, sem cotação dentro da janela de walk-back, **ou fonte de câmbio fora do ar (timeout/5xx/DNS)** — o `IExchangeRateProvider` retorna **`null`** (falhas de infra são **capturadas internamente** e logadas sem dados sensíveis, virando `null`; o provider **não lança** exceção de abort por câmbio). O handler então **persiste a transação assim mesmo**, com:
   - `Amount = 0` (sentinela — não corrompe saldo/totais em BRL);
   - `OriginalAmount`/`OriginalCurrency` preservados (o valor real);
   - `ExchangeRate`/`ExchangeRateDate` nulos;
   - **`ExchangeReviewPending = true`** (flag de domínio na `Transaction`).
   O resumo do import conta essas em `importadasComRevisaoDeCambio`; o extrato as exibe marcadas ("revisão de câmbio"), fora do saldo.
6. **Atomicidade (RN07) — simplificada**: como câmbio **nunca** bloqueia, a **única** causa de abortar/rollback do import passa a ser **falha de infra do próprio Visor** (fetch/paginação) ou da persistência. Câmbio saiu da equação de atomicidade.
7. **Fixação no import**: a taxa é gravada na importação e **não** há reconversão posterior (Não-Objetivos do PRD). Resolver uma pendência de câmbio (converter de fato depois) é **fora do escopo** desta v1 — futura "revisão de câmbio".
8. **Performance**: cache por `(moeda, data)` dentro do request para não repetir lookups (RNF07).

## Consequências

- (+) Nenhuma transação é perdida por causa de câmbio; a importação é resiliente a PTAX fora do ar (só marca mais itens para revisão).
- (+) Atomicidade mais simples (só Visor/persistência abortam).
- (+) Rastreabilidade fiel (original preservado; taxa+data quando houve conversão).
- (+) `Amount = 0` mantém saldo/dashboard/projeção corretos **sem** alterar essas agregações (sentinela).
- (−) Transações pendentes ficam com `Amount = 0` até uma revisão manual/futura; ficam fora do saldo enquanto isso.
- (−) **Insert-only (RN06)** impede que uma reimportação reprocesse o câmbio de um item já importado (o dedup por `ExternalId` o pula) — a pendência precisa de resolução manual/futura.
- (−) Se o PTAX estiver fora do ar num import grande, muitos itens entram pendentes de uma vez.

## Alternativas consideradas

- **Excluir o item inconversível + reportar + abortar se a fonte cair** (proposta original do Arquiteto): **rejeitada pelo humano** (D1) — perde transações e deixa o import refém do PTAX.
- **Falhar toda a importação a cada item sem cotação**: péssima UX (fim de semana quebraria quase tudo) — rejeitada.
- **Persistir sem BRL, com `Amount` = valor estrangeiro**: corromperia saldo/totais (somaria número em moeda errada) — rejeitada; por isso o sentinela `Amount = 0` + flag.
- **`Amount` nullable**: rippla o app inteiro (dashboard/projeção/frontend tratam `amount` como número não-nulo) — rejeitada em favor do sentinela `0` + `ExchangeReviewPending`.
- **Provedor de câmbio pago**: desnecessário para uso pessoal — rejeitada.
