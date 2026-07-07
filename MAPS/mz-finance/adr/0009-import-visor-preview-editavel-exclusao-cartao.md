# ADR 0009 — Import do Visor: preview editável (2 fases) + exclusão de cartão + fim do filtro de categoria

- **Status**: Aceito (feedback do usuário após teste local)
- **Data**: 2026-07-07
- **Contexto**: PRD 004 — ajustes pós-teste; supera partes de [ADR 0008](0008-descompasso-categoria-filtro-client-side.md)
- **Decisores**: usuário (dono do produto) + Arquiteto/Dev

## Contexto

Ao testar a 1ª versão do import (busca → grava direto), o usuário pediu três mudanças que alteram o fluxo:

1. **Só transações "puras", sem cartão.** Compras/parcelas de cartão de crédito não devem entrar neste
   import — o cartão será uma etapa/import **separado** depois. Confirmado que o `get_accounts` do Visor
   distingue conta bancária (`type: "BANK"`) de cartão (`type: "CREDIT"`), e que cada transação traz
   `account_id` — então dá para excluir cartão pelo **tipo da conta**, sem heurística de texto.
2. **Remover a seção de categorias** do modal (e o filtro de categoria do backend — ADR 0008).
3. **Tela "de → para" editável** antes de concluir: o usuário revisa e edita as transações (descrição,
   valor em BRL, data, categoria) e desmarca o que não quer, e só então confirma.

## Decisão

1. **Import em 2 fases (preview → confirm), sem persistir no preview.**
   - `POST /api/visor/import/preview` → `PreviewVisorImportQuery` (**leitura**, `MzFinanceReadOnlyContext`):
     valida o vínculo, busca `get_accounts` + `get_transactions`, exclui cartão, converte estrangeiras
     (sugestão em BRL), sugere categoria e marca as já importadas (dedup). Devolve as candidatas — **nada é gravado**.
   - `POST /api/visor/import/confirm` → `ConfirmVisorImportCommand` (**escrita**): recebe as linhas
     revisadas/editadas e persiste. **Não fala com o Visor** (os dados vêm do preview + edições).
2. **Exclusão de cartão por tipo de conta.** O preview monta o conjunto de `account_id` cujo tipo é
   `CREDIT` (via `get_accounts`) e descarta as transações desses ids. Conta o total excluído
   (`ExcludedCardCount`) para informar o usuário. Transações sem `account_id` conhecido são mantidas.
3. **Fim do filtro de categoria.** As chamadas `get_transactions` levam só prazo, tipo, `exclude_ignored`
   e busca. A categoria vira **sugestão editável por linha** (nome da categoria do Visor, ou "Sem categoria").
4. **Confirmação insert-only com dedup por `ExternalId`** (inalterado): linha já existente é pulada
   (`SkippedExisting`), nunca atualizada/apagada — preserva edições manuais. Vale também para o mesmo
   `ExternalId` repetido no próprio payload.
5. **Câmbio no preview, valor editável.** Estrangeira sem cotação PTAX chega com `SuggestedAmountBrl = 0`
   e `ExchangeReviewPending = true` (o front destaca e pede o valor). Na confirmação, `AmountBrl <= 0`
   marca a linha como **pendente de revisão** (Amount = 0, fora do saldo); `AmountBrl > 0` grava o valor
   informado. Os metadados (moeda/valor original, taxa/data) são persistidos para rastreabilidade.

## Consequências

- (+) O usuário vê e corrige tudo antes de gravar — resolve conversões faltantes e categorias na hora.
- (+) Cartão fica isolado por um critério estrutural (tipo de conta), não por texto frágil de parcela X/Y.
- (+) O preview não tem efeito colateral de escrita (a não ser o refresh de token, inevitável).
- (−) O confirm confia nos dados enviados pelo cliente (ferramenta pessoal, single-user) — o dedup por
  `ExternalId` continua sendo a defesa contra duplicatas; a validação cobre formato/limites.
- (−) Mais um round-trip (preview + confirm) e um payload maior no confirm — irrelevante no volume pessoal.
- Substitui o "resumo pós-import sem preview" que era não-objetivo no PRD 004 (§1.3) — agora há preview.

## Alternativas consideradas

- **Excluir cartão por notação de parcela (X/Y) na descrição**: frágil (compras à vista no cartão não têm
  X/Y; empréstimos em conta podem ter) — rejeitada em favor do tipo de conta.
- **Manter o gravar-direto e permitir editar depois no extrato**: perde o momento de revisão em lote e
  não atende ao pedido explícito de "editar antes de concluir" — rejeitada.
- **Preview persistindo em staging (tabela temporária)**: complexidade de limpeza/expiração sem ganho para
  uso pessoal — rejeitada; o estado do preview vive no cliente entre as duas chamadas.
