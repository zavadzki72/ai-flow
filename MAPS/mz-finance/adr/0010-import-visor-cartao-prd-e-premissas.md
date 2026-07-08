# ADR 0010: Import de compras de cartão do Visor — PRD 005, dossiê empírico e premissas do workflow

**Data:** 2026-07-07
**Status:** Aceito
**Contexto:** `/feature-workflow` (modo normal) — feature `import-visor-cartao`, branch `feature/import-visor-cartao`.

## Decisão

O PRD `prd/mz-finance-prd-005-tbd-import-visor-cartao.md` foi **validado automaticamente** pelo orquestrador (checklist: BDD falsificável ✅, não-objetivos ✅, caminhos infelizes CE01–CE10 ✅, RN01–RN18 com fonte ✅, Nota de Handoff ✅) e libera a fase `/planejar`.

## Rodada inicial (respostas do humano, 2026-07-07)

- **Destino:** escolha do `CreditCard` local por conta CREDIT **no preview**; sem cartão → orientar a criar; nada automático.
- **Câmbio:** rastreabilidade completa em `CreditCardPurchase` (moeda/valor original + taxa/data), PTAX da data do lançamento, BRL editável no preview.
- **Pacote aceito:** parcelas editáveis por linha; `PurchaseDate` = data do Visor com fatura derivada pelo `ClosingDay`; dedup insert-only por id externo; só compras/despesas; modal da 004 adaptado (sem filtro receita/despesa, com escolha de cartão).
- **Formato da fonte:** o humano delegou a descoberta empírica ("você tem acesso ao MCP do Visor... precisa descobrir").

## Dossiê empírico (MCP do Visor chamado ao vivo, 2026-07-07)

1. Conta CREDIT no `get_transactions` = **uma linha por lançamento/parcela** (valor = parcela do mês); nº da parcela só **embutido na descrição** ("NN/NN"); sem campos estruturados de parcela na linha.
2. **Pagamento de fatura/estorno = amount NEGATIVO** → exclusão objetiva por sinal.
3. `get_installment_plans` tem o plano estruturado (total/pagas/valor original/início/fim) mas **sem account_id e sem link por id** com as linhas → agrupamento automático não confiável.
4. `get_cards` (finais ↔ conta) e `get_credit_card_bills` (fatura por conta) existem; filtrar CREDIT por `account_id` via `get_accounts` é o caminho confiável.
5. Moeda estrangeira vem na moeda original (ex.: USD); **IOF em linha separada BRL**.

Dossiê completo também na memória do projeto (`mz-finance-visor-mcp-integration`).

## Premissas assumidas (PM, sem retorno ao humano — revisar antes de publicar)

- **PA1** — Granularidade por lançamento, default **1x**; edição para N>1 permitida **com aviso** de dupla contagem; prevenção automática fora de escopo.
- **PA2** — Dedup por id externo escopado a `CreditCardPurchase` (não colide com a 004).
- **PA3** — `get_installment_plans`/`get_cards`/`get_credit_card_bills` **não usados** nesta fase.
- **PA4** — PTAX da data do lançamento (não do fechamento da fatura), BRL editável.
- **PA5** — Só compras positivas; negativos excluídos.
- **PA6** — IOF como compra independente, sem vínculo à compra internacional.
- **PA7** — Confirmação tudo-ou-nada; política do C20 (cartão removido entre preview e confirm) delegada ao Arquiteto.

## Consequências

- A fase `/planejar` parte deste PRD sem gate humano; dúvidas de negócio novas viram consulta ao PM via broker; decisões técnicas viram ADR do Arquiteto.
- ⚠️ Destaques para o relatório final: **PA1** (agrupamento automático de planos parcelados ficou fora de escopo) e **PA4** (taxa da data vs. fechamento da fatura).

## Adendo (orquestrador): PLAN validado + plano de ondas (2026-07-07)

PLAN `plan/mz-finance-plan-005-import-visor-cartao.md` **validado automaticamente** (etapas completas, grafo sem ciclo, migração não-paralelizável, handoff ✅). ADR técnico: 0011.

**Ondas da FASE 3** (máx. 3 devs/onda): O1=[E1] → O2=[E2 migração] → O3=[E3 ‖ E4 ‖ E5] (arquivos disjuntos) → O4=[E6] → O5=[E7] → O6=[E8] → O7=[E9] → O8=[E10].

**Política de commits conciliada:** devs não commitam; o orquestrador faz commits mecânicos por onda (necessários para worktrees/merges) e ao final **squash em um único commit** na `feature/import-visor-cartao` (sem coautoria de IA), honrando o "commit único ao final" do projeto.

## Adendo (orquestrador): fechamento do ciclo (2026-07-07)

FASE 3: 10/10 etapas em 8 ondas (onda 3 paralela: E3‖E4‖E5, merges sem conflito). Validação integrada: 234/234 testes backend (29 novos), build + lint frontend verdes. Commit único (squash) `cff94e0` em `feature/import-visor-cartao`.

FASE 4 (tech-lead): **⚠️ Aprovado com ressalvas** — 0 🔴 / 1 🟡 / 5 🟢. Único 🟡: token `--color-down` (semântica financeira direcional) usado no aviso de dupla contagem do modal (`ImportVisorCardModal.module.css`) — trocar por token neutro ou criar `--color-warning`. 🟢: separar teste combinado do validator; fetch de despesas filtra CREDIT client-side (aceitável single-user); validator rejeita AmountBrl<0 (mais estrito que o literal do C15, defensável); chore para vuln NU1903 do Microsoft.OpenApi (pré-existente); validar migração Up/Down + índice filtrado no /test-e2e.
