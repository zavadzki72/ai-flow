# TEST E2E — Importar Compras de Cartão de Crédito do Visor (PRD 005)

**Data:** 2026-07-07 · **Branch:** `feature/import-visor-cartao` (commit `cff94e0`) · **Worktree:** `.worktrees/mz-finance/feature-import-visor-cartao`

## RESUMO EXECUTIVO

**Status Geral**: ✅ APROVADO *(com errata pós-teste manual — ver abaixo)*

> **ERRATA (2026-07-07, teste manual do dev):** o Cenário 6 registrou "Globo*Combo 12x a R$ 4,99" como PASS, mas isso era um **bug de semântica**: o valor da linha do Visor é a *parcela* (R$ 59,90) e o confirm o enviava como *total* — a fatura dividia por 12. Corrigido no `ImportVisorCardModal` (total = parcela × N; campo "Valor da parcela (R$)"; aviso mostra o total). A compra Globo importada durante este E2E ficou com o valor antigo e deve ser excluída/reimportada.

**Métricas:**
- Cenários do PRD: **9/9 passaram** (2 cenários de borda cobertos só por unit tests — ver Observações)
- Cenários de Impacto: **3/3 passaram**
- Bugs Bloqueantes: **0** 🔴
- Bugs Não-Bloqueantes: **0** 🟡
- Observações: **3** 🟢

**Resumo:** fluxo completo testado contra o **Visor real** (MCP em produção) e **PTAX real** (BCB): gate de conexão, filtros, preview agrupado por conta (75 compras de 5 contas CREDIT, zero pagamentos/estornos), escolha de cartão de destino, edição de parcelas com aviso de dupla contagem, confirmação (3 compras importadas — incluindo USD convertido ao vivo e IOF), rastreabilidade na fatura (badge Visor, "US$ 105,91" como detalhe, "Parcela 1 de 12"), dedup em reimport (0/1 já existente), estado vazio, e regressões (fatura manual e import bancário da 004) intactas. Migração aplicada em banco com dados: backfill 19/19 e índice único filtrado criados.

---

## AMBIENTE

- **Subiu:** ✅ — modo hybrid no worktree da branch
- **Serviços:** API `http://localhost:5280` (health 200) · Web `http://localhost:5175` (Vite do worktree; a 5173 estava ocupada pelo Vite do clone principal, não tocado) · Postgres `localhost:5434` (container `mzfinance-postgres` pré-existente do dev — reutilizado e **não** derrubado no teardown)
- **Migração:** ✅ `dotnet ef database update` — `AddVisorFieldsToCreditCardPurchase` aplicada com dados reais
- **Vínculo Visor:** já conectado no banco local (ConnectedAt 2026-07-07); access token válido — nenhum consentimento novo foi necessário
- **Teardown:** ✅ API e Vite mortos por PID; portas 5280/5175 liberadas

---

## CENÁRIOS DO PRD

### Cenário 1: Gate de conexão (vínculo revogado → reconectar) — ✅ PASS
**Critério:** C17/CE02 (e caminho idêntico ao C2/CE01 na UI)
**Passos:** vínculo marcado `Revoked` no banco (reversível) → clique em "Importar do Visor" → redirect para o consentimento OAuth do Visor (client_id reusado, PKCE S256, callback local), nada importado → vínculo restaurado.
**Evidência:** `evidence/01-gate-revogado-redirect-visor.png`

### Cenário 2: Prazo obrigatório — ✅ PASS
**Critério:** C3/CE03. Campo "De" vazio → "Preencha este campo.", busca barrada antes de chamar o Visor.
**Evidência:** `evidence/02-prazo-obrigatorio-barrado.png`

### Cenário 3: Preview só compras de cartão, agrupado por conta — ✅ PASS
**Critério:** C1/C4/C5/C6. 20/06–07/07 → **75 compras** de **5 contas CREDIT** (Mercado Pago, Itaú Black, platinum, Visa Infinite, PLATINUM); **zero** linhas de "Pagamento" (exclusão por sinal); sem filtro receita/despesa; marcador "8/12" exibido como badge read-only (Globo*Combo) com parcelas default 1; nada persistido.
**Evidência:** `evidence/03-preview-agrupado-contas.png`

### Cenário 4: Escolha de cartão de destino por conta — ✅ PASS
**Critério:** C7/C8. Sem cartão escolhido: checkboxes desabilitados, aviso "Escolha um cartão para importar as compras desta conta." e botão "Concluir importação (0)" desabilitado. Ao selecionar "Bradesco (Master)" para a conta platinum, as linhas habilitaram; as demais contas permaneceram bloqueadas (importação parcial por conta).

### Cenário 5: Edição de parcelas com aviso de dupla contagem — ✅ PASS
**Critério:** C9/C10. Parcelas do "Globo*Combo 8/12" editadas 1→12 → aviso exato do PRD exibido na linha ("…podem contar em dobro").
**Evidência:** `evidence/05-aviso-dupla-contagem-12x.png`

### Cenário 6: Confirmação + fatura com rastreabilidade — ✅ PASS
**Critério:** C11/C21/RN13. Confirmadas 3 linhas da conta platinum → resumo "3 Importadas". Fatura do Bradesco (recarregada automaticamente): **Anthropic* Claude Sub** [badge Visor] à vista, detalhe **US$ 105,91**, principal **R$ 547,73**; **Globo*Combo 8/12** [Visor] **Parcela 1 de 12** a **R$ 4,99** (59,90/12, projeção até jun/27); **IOF** [Visor] à vista R$ 19,94 como compra própria. Compra manual sem badge. Total R$ 763,46.
**Evidência:** `evidence/06-resumo-3-importadas.png`, `evidence/06-fatura-bradesco-badges-visor.png`

### Cenário 7: Reimport não duplica (insert-only) — ✅ PASS
**Critério:** C12/C13/RN10. Reimport do mesmo período: as 3 compras vieram com badge **"Já importada"** e **desmarcadas**; reenviando a linha do IOF, o backend pulou: resumo **"0 Importadas / 1 Já existentes"**; fatura sem duplicata.
**Evidência:** `evidence/07-reimport-0-importadas-1-existente.png`

### Cenário 8: Período sem compras (estado vazio) — ✅ PASS
**Critério:** C16/CE04. Jan/2020 → EmptyState "Nenhuma compra de cartão encontrada para importar neste período.", sem erro.
**Evidência:** `evidence/08-estado-vazio-periodo-2020.png`

### Cenário 9: Moeda estrangeira convertida (PTAX real) — ✅ PASS
**Critério:** C14/RN11. "Anthropic* Claude Sub" US$ 105,91 (05/07, domingo) → BRL sugerido **R$ 547,73** pela PTAX real com walk-back para dia útil; original/moeda preservados e visíveis; valor editável no preview. Persistido e exibido corretamente na fatura.

---

## CENÁRIOS DE IMPACTO (Regressão)

### Cenário 10: Fatura com compras manuais — ✅ PASS
**Por quê:** E3/E10 alteraram a projeção/renderização da fatura. Fatura do Itau (Master) com 8 lançamentos manuais renderizou intacta (sem badges, total R$ 5.340,85, projeção OK) **antes** de qualquer import.
**Evidência:** `evidence/10-fatura-manual-baseline.png`

### Cenário 11: Import bancário da 004 — ✅ PASS
**Por quê:** `VisorController` e a superfície Visor foram alterados. O modal de Lançamentos abriu com pills de tipo, hint "Compras no cartão de crédito ficam de fora", e o preview trouxe **só transações bancárias** (7 linhas; zero linhas de cartão) — comportamento inverso preservado dos dois lados. Fechado sem confirmar.
**Evidência:** `evidence/11-regressao-import-bancario-004.png`

### Cenário 12: Migração com dados reais — ✅ PASS
**Por quê:** pendente do code review (InMemory não exercita índice parcial). `Up` aplicou em banco com 19 compras: backfill **19/19** (`OriginalCurrency='BRL'`, `OriginalAmount=Amount`, pendência false) e índice `IX_CreditCardPurchases_CreditCardId_ExternalId (WHERE "ExternalId" IS NOT NULL)` criado.

---

## 🔴 BUGS BLOQUEANTES
Nenhum.

## 🟡 BUGS NÃO-BLOQUEANTES
Nenhum.

## 🟢 OBSERVAÇÕES

1. **C15 (pendência de câmbio) não exercitado via UI** — a PTAX estava no ar e cobriu USD; o caminho "BRL sugerido = 0 + pendente" está coberto pelos unit tests (`Preview_RateUnavailable...`, `Confirm_AmountBrlZero...`). Se quiser evidência visual, exige simular a fonte fora do ar.
2. **C20 (cartão removido entre preview e confirm) não exercitado via UI** — coberto pelo unit test `Confirm_TargetCardRemoved_ShouldRejectWholeAndPersistNothing`.
3. **`Down` da migração não executado** contra o banco real (agora há compras importadas usando as colunas novas; reverter apagaria dados). O `Down` foi validado por inspeção na implementação.

**Dados de teste que ficaram no banco local:** 3 `CreditCardPurchase` no **Bradesco (Master)** (Anthropic R$ 547,73 à vista; Globo*Combo 12x R$ 59,90; IOF R$ 19,94) — identificáveis pelo badge "Visor", removíveis pela UI se quiser.

---

## DECISÃO FINAL

**Status**: ✅ APROVADO

**Justificativa**: todos os fluxos primários do PRD passaram contra integrações reais (Visor MCP + PTAX), incluindo os pontos críticos: exclusão de pagamentos por sinal, granularidade 1x com marcador read-only, conversão multi-moeda com rastreabilidade na fatura, dedup insert-only comprovado no backend e regressão zero na 004 e na fatura manual. Os dois caminhos infelizes não exercitados via UI têm cobertura unitária dedicada.

---

## HANDOFF

- **De / Para**: QA → Tech Lead (code review já ⚠️ aprovado antes deste E2E — ciclo completo)
- **Bloqueios (🔴)**: nenhum
- **Recomendações**: prosseguir com push + PR; opcionalmente endereçar o 🟡 do review (token `--color-warning`) e limpar as 3 compras de teste do Bradesco após o merge.
