# PRD: Importar Compras de Cartão de Crédito do Visor Finance

**Sequência**: 005
**Ticket**: TBD
**Versão**: 1
**Data**: 2026-07-07
**Status**: 🟡 PRONTO PARA PLANEJAMENTO

---

## Metadados

- **Prioridade**: Alta
- **Complexidade**: 🔴 Alta
- **Repositório(s)**: monorepo `mz-finance` — backend (`/Users/zavadzki72/Projects/Personal/mz-finance/backend`) + frontend (`/Users/zavadzki72/Projects/Personal/mz-finance/frontend`), um único repositório git.
- **Branch de Trabalho (sugerida)**: `feature/import-visor-cartao`
- **Domínio(s)**: Cartão de Crédito (`CreditCard`, `CreditCardPurchase`), integração externa **Visor Finance** (já existente — OAuth + MCP) e **câmbio** (PTAX/BCB — já existente). **Reaproveita** o vínculo OAuth, o cliente MCP e a fonte de câmbio entregues na feature 004.

> ⚠️ **Nota de path**: o `mz-finance-map.json` registra os repositórios em caminhos Windows (`C:/Projects/...`). O ambiente real é macOS (`/Users/zavadzki72/Projects/Personal/mz-finance/...`). Todos os caminhos deste PRD usam o local real. Corrigir o map fica fora do escopo.

---

## 1. VISÃO GERAL

### 1.1. Contexto

A feature **004** (em produção) importa transações do **Visor Finance** para o extrato do mz-finance, mas **exclui deliberadamente as contas de cartão de crédito** (contas `type: "CREDIT"` no `get_accounts` do Visor) — o cartão foi adiado para uma etapa separada (ver [ADR 0009](../adr/0009-import-visor-preview-editavel-exclusao-cartao.md) e Emenda v3 do [PRD 004](mz-finance-prd-004-tbd-import-visor.md)). Este PRD é essa etapa: **importar as compras de cartão de crédito do Visor para dentro do módulo de Cartões do mz-finance**.

**Descompasso central entre as duas fontes (o problema de negócio a resolver com cuidado):**

- O **mz-finance modela a COMPRA**: `CreditCardPurchase` tem `Amount` (valor total da compra), `PurchaseDate`, `InstallmentsCount` (nº de parcelas), `Description` e `Category`. A **fatura e as parcelas mensais são CALCULADAS** a partir do dia de fechamento (`ClosingDay`) do `CreditCard` — não são armazenadas.
- O **Visor entrega a PARCELA já lançada**: cada conta `CREDIT` no `get_transactions` retorna **uma linha por lançamento/parcela** (o `amount` é o valor **da parcela do mês**), sem campos estruturados de parcelamento; o número da parcela vem **embutido na descrição** no padrão "NN/NN" (ex.: `"MAGALU*Magalu Mag 08/10"`, `"EC *MIDEA 04/10"`).

Ou seja, as duas pontas descrevem a mesma realidade em granularidades diferentes. Este PRD adota a granularidade que o **dado da fonte suporta sem invenção** e blinda contra dupla contagem (ver §5 e Premissas Assumidas).

### 1.2. Dossiê empírico da fonte (fatos validados ao vivo no MCP do Visor — 2026-07-07)

Estes fatos são **restrições da fonte de dados** (não decisões de produto) e fundamentam as regras abaixo:

- **DE1** — Conta `CREDIT` no `get_transactions`: **uma linha por lançamento/parcela** (`amount` = valor da parcela do mês). O nº da parcela vem **na descrição** no padrão "NN/NN"; a linha **não** tem campo estruturado de parcela. Os demais campos são os mesmos da 004 (+ `category_emoji`).
- **DE2** — **Pagamento de fatura e estorno vêm com `amount` NEGATIVO** na conta CREDIT (ex.: `"Pagamento PIX" −3558.51`, `"Pagamento recebido" −6288.93`). ⇒ regra de exclusão **objetiva**: importar **só linhas de valor positivo** (compras/despesas).
- **DE3** — Existe `get_installment_plans` (por mês, filtro `card_numbers`): plano estruturado (`installment_amount`, `original_amount`, `total_installments`, `paid_installments`, `remaining_installments`, `start_date`, `end_date`) — **sem `account_id`** e **sem link por id** para as linhas de transação (correlação só por descrição/valor). Não é confiável para agrupamento automático.
- **DE4** — Existe `get_cards` (finais `card_number` ↔ `account_id`; uma conta CREDIT tem vários finais) e `get_credit_card_bills` (fatura por conta). **Filtrar por `account_id` (via `get_accounts` type CREDIT) é mais confiável** que por `card_numbers`.
- **DE5** — Moeda estrangeira: a linha vem na **moeda original** (ex.: `"Anthropic* Claude Sub" 105.91 USD`) e o **IOF chega como linha separada em BRL** (`"IOF de compra internacional" 19.94`).
- **DE6** — No dashboard web, o detalhe da transação mostra "Parcela 1 de 12" — confirma o modelo **por-parcela** da fonte.

### 1.3. Objetivo

Permitir que o usuário **importe, sob demanda, as compras de cartão de crédito do Visor** para o módulo de Cartões do mz-finance, por um **fluxo de preview editável em 2 fases** (buscar → revisar/editar "de → para" → confirmar), espelhando o fluxo da 004:

- as compras importadas viram `CreditCardPurchase` no **cartão de destino escolhido pelo usuário**, participando das faturas e projeções já existentes;
- são **rastreáveis** pela identidade externa do Visor (id externo por lançamento) e, quando estrangeiras, preservam moeda/valor originais + taxa aplicada;
- **não se duplicam** em reimportações (deduplicação pelo id externo do Visor), e a reimportação é **insert-only** (nunca altera nem apaga compras existentes);
- **pagamentos de fatura, estornos e créditos ficam de fora** (só compras/despesas entram).

O "momento mágico": abrir o preview, escolher o período, apontar cada conta de cartão do Visor para o cartão local correspondente, revisar/editar as compras e confirmar — sem redigitar cada uma.

### 1.4. Não-Objetivos (fora do escopo deste PRD)

- **Criar cartões automaticamente.** Conta `CREDIT` do Visor sem `CreditCard` local correspondente **não** cria cartão; o usuário é orientado a criar o cartão antes (C7).
- **Importar/refletir a fatura do Visor** (`get_credit_card_bills`): total, vencimento, mínimo, pagamento. A fatura no mz-finance **continua sendo calculada** pelo `ClosingDay` do cartão local a partir das compras (RN04). Não importamos a fatura do Visor.
- **Importar pagamentos de fatura, estornos e créditos** (valores negativos — DE2). Só compras/despesas entram (RN05).
- **Agrupar automaticamente parcelas em uma única compra parcelada** usando `get_installment_plans`. Como não há link por id entre plano e lançamento (DE3), não há agrupamento automático confiável nesta fase (RN06 / PA1).
- **Prevenir automaticamente a dupla contagem** quando o usuário edita o nº de parcelas de uma linha para N>1 (RN07 / PA1) — é responsabilidade do usuário, com aviso explícito.
- **Reconciliar `get_cards`/finais de cartão** (`card_number`) com múltiplos finais por conta. A distinção é por `account_id` (DE4); finais individuais não são modelados.
- **Sincronização automática/agendada.** A importação é **manual, sob demanda**.
- **Reconversão de câmbio após o import.** A taxa é fixada na importação; e o valor em BRL é editável no preview (coerente com insert-only).
- **Fluxo "Conectar Visor" / OAuth / cliente MCP / fonte de câmbio novos.** São **reaproveitados** da 004; este PRD não recria essa infraestrutura.

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Abrir o preview de importação de cartão (Visor conectado)
**Dado** que o Visor está conectado e o usuário está no módulo de Cartões
**Quando** ele aciona "Importar compras do Visor"
**Então** abre um fluxo com filtros estruturados: **prazo** (intervalo de datas, obrigatório), **toggle "incluir ignoradas"** e **busca textual** (opcional)
**E** **não** há filtro de "receita/despesa" (não se aplica a cartão — só compras entram)
**E** o usuário consegue acionar a busca do preview ou cancelar sem efeito.

### Critério 2 — Import bloqueado enquanto o Visor não estiver conectado
**Dado** que não existe vínculo ativo com o Visor
**Quando** o usuário aciona "Importar compras do Visor"
**Então** a importação é **bloqueada**
**E** o sistema orienta o usuário a conectar o Visor primeiro (reaproveitando o fluxo da 004)
**E** nenhuma chamada de dados é feita ao Visor.

### Critério 3 — Prazo (intervalo de datas) é obrigatório
**Dado** que o usuário abriu o fluxo de importação de cartão
**Quando** ele tenta buscar o preview **sem** informar o intervalo de datas (inicial e/ou final ausentes, ou final anterior à inicial)
**Então** a busca **não** é executada
**E** o sistema exibe erro de validação indicando que o prazo é obrigatório
**E** nenhuma chamada é feita ao Visor.

### Critério 4 — Buscar preview: só compras de contas de cartão, sem persistir
**Dado** que o Visor está conectado e há lançamentos de cartão no período
**Quando** o usuário busca o preview
**Então** o sistema identifica as contas de cartão do Visor (`get_accounts` `type = CREDIT`) e traz **apenas** os lançamentos dessas contas (percorrendo **todas as páginas**)
**E** exclui qualquer lançamento de conta que **não** seja de cartão
**E** **nada é persistido** nesta fase (é uma pré-visualização)
**E** o preview devolve as compras candidatas agrupadas por conta de cartão do Visor, com descrição, valor, data, moeda, categoria sugerida e marcação das que já foram importadas.

### Critério 5 — Pagamentos, estornos e créditos são excluídos (valor não positivo)
**Dado** que o período contém, na conta de cartão, linhas de **pagamento de fatura/estorno/crédito** (valor negativo — DE2) além das compras
**Quando** o preview é montado
**Então** **apenas** as linhas de **valor positivo** (compras/despesas) aparecem como candidatas
**E** as linhas de valor negativo **não** aparecem e **não** são importáveis
**E** transações estrangeiras e o **IOF em linha separada** (DE5), por serem lançamentos de valor positivo, aparecem como compras candidatas independentes.

### Critério 6 — Cada lançamento vira, por padrão, uma compra à vista (1x)
**Dado** um lançamento de cartão do Visor cuja descrição indica parcela (ex.: `"MAGALU*Magalu Mag 08/10"`)
**Quando** ele aparece no preview
**Então** por **padrão** ele é proposto como uma `CreditCardPurchase` de **1 parcela (à vista)**, na **data do lançamento**, com o **valor da parcela** (o `amount` da linha)
**E** o marcador de parcela detectado na descrição ("08/10") é exibido como **informação (somente leitura)** para contexto
**E** a fatura em que essa compra cai é **derivada** pelo dia de fechamento do cartão de destino (não vem do Visor).

### Critério 7 — Conta de cartão do Visor sem cartão local correspondente
**Dado** que uma conta `CREDIT` do Visor no preview **não** tem um `CreditCard` local apontado como destino
**Quando** o usuário tenta confirmar
**Então** as compras dessa conta **não** são importadas
**E** o sistema orienta o usuário a **criar/associar** um cartão local para aquela conta antes de importá-la
**E** as compras de contas que **já** têm cartão de destino escolhido são importáveis normalmente (a ausência de destino em uma conta não bloqueia as demais).

### Critério 8 — Escolha do cartão de destino por conta de cartão do Visor
**Dado** o preview com uma ou mais contas de cartão do Visor
**Quando** o usuário revisa
**Então** para **cada conta** `CREDIT` do Visor ele escolhe o **`CreditCard` local de destino** entre os cartões **já cadastrados** (nenhum é criado automaticamente)
**E** todas as compras daquela conta herdam o cartão de destino escolhido
**E** a confirmação persiste cada compra no cartão escolhido.

### Critério 9 — Preview editável "de → para" por linha
**Dado** o preview carregado
**Quando** o usuário revisa
**Então** ele pode **editar, por linha**: descrição, **valor em BRL**, data, categoria e **número de parcelas**
**E** pode **desmarcar** linhas que não quer importar
**E** só as linhas **marcadas** são persistidas na confirmação.

### Critério 10 — Editar parcelas para N>1 avisa sobre risco de dupla contagem
**Dado** que o usuário edita o número de parcelas de uma linha para **N maior que 1**
**Quando** ele faz isso no preview
**Então** o sistema exibe um **aviso explícito** de que o mz-finance projetará N parcelas a partir desta compra
**E** de que, em importações futuras deste cartão, as parcelas seguintes do mesmo plano chegarão como **novos lançamentos** (id externo diferente) e podem **contar em dobro**
**E** o comportamento padrão continua sendo 1x; a edição para N>1 é uma escolha consciente do usuário (a prevenção automática dessa dupla contagem é não-objetivo — PA1).

### Critério 11 — Confirmar importa insert-only, sem falar com o Visor
**Dado** um preview revisado com linhas marcadas e cartões de destino escolhidos
**Quando** o usuário confirma
**Então** o sistema persiste cada linha marcada como `CreditCardPurchase` no cartão de destino
**E** a confirmação **não** faz nova chamada ao Visor (usa os dados revisados do preview)
**E** cada compra importada guarda o **id externo** do lançamento do Visor (rastreabilidade + deduplicação).

### Critério 12 — Idempotência: reimportar o mesmo período não duplica
**Dado** que um conjunto de compras de cartão do Visor já foi importado
**Quando** o usuário reimporta um período que abrange esses mesmos lançamentos
**Então** os lançamentos já importados (mesmo id externo do Visor) aparecem **marcados como já importados** no preview e, se confirmados, **não** geram compra duplicada
**E** o resumo indica quantas foram ignoradas por já existirem.

### Critério 13 — Reimportação é insert-only (nunca toca no que já existe)
**Dado** que compras importadas do Visor já existem — inclusive com **edições manuais** do usuário (valor, categoria, nº de parcelas)
**Quando** o usuário reimporta o período correspondente
**Então** o sistema **apenas insere** as compras novas (id externo ainda não presente)
**E** **nenhuma** compra existente é alterada ou apagada
**E** o resumo contabiliza 0 alteradas.

### Critério 14 — Moeda estrangeira é convertida para BRL (preservando o original e editável)
**Dado** uma compra do Visor em moeda estrangeira (ex.: 105,91 USD — DE5)
**Quando** ela aparece no preview
**Então** o sistema **sugere** o valor em BRL convertido pela **taxa PTAX da data do lançamento**
**E** ficam **preservados** o valor original (105,91), a moeda original (USD) e a **taxa aplicada** (com data de referência)
**E** o **valor em BRL é editável** no preview (para o usuário casar com a fatura real, se quiser)
**E** compras já em **BRL** não sofrem conversão (valor original = valor em BRL, sem taxa).

### Critério 15 — Cotação de câmbio indisponível para a data
**Dado** uma compra estrangeira cuja cotação PTAX para a data não está disponível (fim de semana fora da janela de walk-back, moeda sem par PTAX, ou fonte de câmbio fora do ar)
**Quando** o preview é montado
**Então** a linha chega com **valor sugerido em BRL = 0** e **marcada como pendente de revisão de câmbio**
**E** o usuário é claramente sinalizado a **informar o valor em BRL** antes de confirmar
**E** se confirmar com valor em BRL ≤ 0, a compra é persistida marcada como **pendente de revisão** (fora dos totais até revisada); com valor > 0, grava o valor informado
**E** câmbio indisponível **nunca** exclui a linha nem aborta a importação (coerente com a política revista da 004).

### Critério 16 — Período sem compras de cartão (estado vazio, sem erro)
**Dado** que o Visor está conectado e o período não retorna nenhuma compra de cartão
**Quando** o usuário busca o preview
**Então** o sistema exibe um **estado vazio** claro ("Nenhuma compra de cartão encontrada para importar neste período")
**E** isso **não** é tratado como erro
**E** nada é persistido.

### Critério 17 — Vínculo expirado ou revogado orienta reconexão
**Dado** que o vínculo com o Visor **expirou** ou foi **revogado**
**Quando** o usuário busca o preview
**Então** o sistema detecta que o vínculo não está válido
**E** orienta o usuário a **reconectar** o Visor (reaproveitando o fluxo da 004)
**E** nenhuma compra é importada e nenhuma compra existente é alterada.

### Critério 18 — Falha/timeout do Visor durante a busca do preview
**Dado** que a busca do preview está em andamento
**Quando** o Visor **falha** ou dá **timeout** (ex.: ao paginar ou ao chamar `get_accounts`)
**Então** o preview **não** é exibido com dados parciais
**E** o sistema exibe mensagem clara de falha
**E** **nada** é persistido (o preview não persiste de qualquer forma) e nenhuma compra existente é afetada
**E** o usuário pode tentar novamente.

### Critério 19 — Confirmação é atômica (tudo-ou-nada)
**Dado** uma confirmação de N compras
**Quando** ocorre falha na persistência no meio do processo
**Então** **nenhuma** das N compras é persistida (rollback total)
**E** o módulo de Cartões permanece exatamente como estava
**E** uma nova tentativa não gera duplicatas (dedup por id externo).

### Critério 20 — Cartão de destino inexistente/removido na confirmação
**Dado** que, entre buscar o preview e confirmar, o cartão de destino escolhido foi **removido** (ou não pertence ao usuário)
**Quando** o usuário confirma
**Então** as compras apontadas para esse cartão **não** são persistidas
**E** o sistema informa claramente o motivo, sem persistir estado inconsistente
**E** as compras de cartões de destino válidos são persistidas normalmente (ou, conforme política de atomicidade definida com o Arquiteto, a operação é rejeitada por inteiro com mensagem clara — ver Handoff).

### Critério 21 — Rastreabilidade da origem no módulo de Cartões
**Dado** compras importadas do Visor e compras lançadas manualmente no mesmo cartão
**Quando** o usuário olha a fatura/lista de compras
**Então** é possível distinguir as compras de **origem Visor** (têm id externo) das manuais
**E** quando a compra veio em moeda estrangeira, a **moeda/valor originais** ficam visíveis como detalhe, sem quebrar a exibição do valor principal em BRL.

### Critério 22 — Escopo por usuário (autorização)
**Dado** o projeto de usuário único com JWT
**Quando** qualquer operação de preview/confirmação é feita
**Então** todos os dados (contas do Visor, cartões de destino e compras) são escopados ao **usuário autenticado**
**E** só é possível importar para `CreditCard` que pertence ao próprio usuário.

---

## 3. ESCOPO TÉCNICO (o quê muda — o "como" fica no Handoff)

> Arquitetura e padrões idênticos à 004 (Clean Architecture + CQRS via MediatR + Notification Pattern + envelope `DataActionResult<T>`). O preview é uma **leitura**; a confirmação é uma **escrita**. A infraestrutura de Visor (OAuth/MCP) e câmbio (PTAX) é **reaproveitada**, não recriada.

### 3.1. Componentes a Alterar

**Backend**
- `MzFinance.Domain/Models/CreditCardPurchase.cs` — acrescentar rastreabilidade de importação, em termos de negócio: **id externo** do Visor (nulo para compras manuais); **moeda original** (default BRL); **valor original**; **taxa de câmbio aplicada** + **data de referência**; e o **indicador de pendência de revisão de câmbio**. O `Amount` existente passa a representar sempre o valor **em BRL**. Aceitar esses atributos num fluxo de criação por importação (o construtor manual atual segue intacto, nascendo já coerente com moeda BRL).
- Persistência de `CreditCardPurchase` — mapear as colunas novas e a **deduplicação por id externo** (por usuário/origem Visor).
- Serialização da fatura/lista de compras — expor a origem (id externo) e a moeda/valor originais quando houver.

**Frontend**
- Módulo de Cartões — botão **"Importar compras do Visor"** e o fluxo de preview→confirm (reaproveitando o padrão do modal da 004), incluindo a **escolha de cartão de destino por conta** do Visor e a edição por linha (descrição, valor BRL, data, categoria, nº de parcelas).

### 3.2. Componentes Novos

**Backend**
- Uma **leitura de preview** de compras de cartão do Visor (valida vínculo; identifica contas `CREDIT`; busca lançamentos paginando; exclui valores não positivos; converte estrangeiras via câmbio; sugere categoria; marca já importadas por id externo) — **sem persistir**.
- Uma **escrita de confirmação** que recebe as linhas revisadas + cartão de destino por conta e persiste as compras **insert-only**, **atomicamente**, sem falar com o Visor.
- DTOs de entrada (filtros do preview / linhas revisadas da confirmação) e de saída (candidatas agrupadas por conta; resumo pós-confirmação).
- Validators para os filtros do preview e para as linhas da confirmação.

**Frontend**
- Componente de importação de cartão em 3 fases (filtros → preview editável agrupado por conta com escolha de cartão → resumo), estados de carregando/vazio/erro, aviso de dupla contagem ao editar parcelas (C10) e sinalização de pendência de câmbio (C15).

### 3.3. Componentes Reutilizados (sem alteração de comportamento)

- **Vínculo OAuth do Visor, cliente MCP e fonte de câmbio (PTAX)** entregues na 004 — reaproveitados integralmente.
- `CreditCard` e o cálculo de fatura/parcelas por `ClosingDay` — as compras importadas são `CreditCardPurchase` comuns e entram nas faturas/projeções existentes.
- Estado da conexão Visor (query da 004) para habilitar/bloquear o import e orientar (re)conexão.
- Design System (`shared/ui`) e categorias do mz-finance para a sugestão editável de categoria.

---

## 4. REGRAS DE NEGÓCIO

- **RN01** — A importação de compras de cartão é **manual e sob demanda**, por um fluxo de **preview → confirmação**. *(Fonte: resposta do humano — pacote aceito; espelha a Emenda v3 da 004.)*
- **RN02** — Exige **vínculo ativo** com o Visor (reaproveitado da 004). Sem vínculo → bloqueia e orienta conectar (C2); expirado/revogado → orienta reconectar (C17). *(Fonte: 004 / RN02.)*
- **RN03** — O **prazo (intervalo de datas)** é **obrigatório**; demais filtros (incluir ignoradas, busca) são opcionais. **Não** há filtro de receita/despesa. *(Fonte: resposta do humano — pacote aceito.)*
- **RN04** — Importa-se **apenas as compras das contas de cartão** (`get_accounts` `type = CREDIT`, por `account_id` — DE4). Lançamentos de contas não-CREDIT são excluídos. *(Fonte: DE1/DE4 + ADR 0009.)*
- **RN05** — Importa-se **apenas lançamentos de valor positivo** (compras/despesas). **Pagamentos de fatura, estornos e créditos** (valor negativo — DE2) são **excluídos**. *(Fonte: resposta do humano + DE2.)*
- **RN06** — **Granularidade = por lançamento/parcela**: cada linha do Visor vira, por padrão, uma `CreditCardPurchase` de **1 parcela**, na data do lançamento, com o valor da parcela. O marcador "NN/NN" da descrição é exibido como **informação** (não altera o comportamento). Não há agrupamento automático de parcelas em compra parcelada (DE3 — sem link por id). *(Fonte: DE1/DE3/DE6 + decisão de produto — PA1.)*
- **RN07** — **Parcelas editáveis com aviso**: o usuário pode editar o nº de parcelas de uma linha para N>1; nesse caso o sistema **avisa** do risco de dupla contagem em imports futuros (C10). A prevenção automática dessa dupla contagem é **não-objetivo**. *(Fonte: resposta do humano — parcelas editáveis; decisão de produto sobre o risco — PA1.)*
- **RN08** — **Destino escolhido pelo usuário**: para cada conta `CREDIT` do Visor, o usuário aponta o `CreditCard` local de destino entre os **já cadastrados**. Conta sem destino → suas compras não importam e o usuário é orientado a criar o cartão; **nada é criado automaticamente** (C7/C8). *(Fonte: resposta do humano — Q2.)*
- **RN09** — **Fatura derivada localmente**: a fatura/competência de cada compra é calculada pelo `ClosingDay` do cartão de destino (regra existente), a partir da `PurchaseDate` = data do lançamento do Visor. A fatura do Visor (`get_credit_card_bills`) **não** é importada. *(Fonte: resposta do humano + modelo atual de `CreditCardPurchase`.)*
- **RN10** — **Deduplicação / insert-only**: a identidade de import é o **id externo** do lançamento do Visor (escopado ao usuário/origem Visor). Reimportar não duplica (C12) e **nunca** altera/apaga compras existentes — preservando edições manuais (C13). *(Fonte: resposta do humano + 004 / DP1-DP2.)*
- **RN11** — **Moeda / conversão**: `CreditCardPurchase` passa a guardar moeda original (default BRL), valor original, taxa e data de referência. Compra estrangeira é **sugerida** convertida para BRL pela **PTAX da data do lançamento**; o valor em BRL é **editável no preview**; `Amount` persiste em BRL. Compras em BRL não convertem. *(Fonte: resposta do humano — Q5 + 004 / RN09.)*
- **RN12** — **Câmbio indisponível**: se não há cotação para a data (janela esgotada, moeda sem par PTAX, ou fonte fora do ar), a linha chega com BRL sugerido = 0 e **pendente de revisão de câmbio**, editável; confirmar com BRL ≤ 0 grava a compra pendente (fora dos totais até revisada). Câmbio **nunca** exclui a linha nem aborta o import (C15). *(Fonte: 004 / política revista D1 + resposta do humano.)*
- **RN13** — **IOF e demais lançamentos positivos** entram como compras próprias e independentes (o IOF de compra internacional vem em linha separada em BRL — DE5). Não há vínculo entre o IOF e a compra estrangeira que o originou. *(Fonte: DE5 — PA6.)*
- **RN14** — **Categoria como texto**: a categoria sugerida vem do `category_name` do Visor (editável no preview); ausente/vazia ⇒ **"Sem categoria"**. Categorias do Visor não viram entidade. *(Fonte: 004 / ADR 0009.)*
- **RN15** — **Atomicidade da confirmação**: cada confirmação é **tudo-ou-nada** (C19). Falha na persistência ⇒ rollback total; nova tentativa não duplica (RN10). *(Fonte: 004 / RN07.)*
- **RN16** — **Paginação completa**: a busca do preview percorre **todas as páginas** dos lançamentos das contas de cartão no período (C4). *(Fonte: 004 / RN16 + DE1.)*
- **RN17** — **Escopo por usuário**: contas do Visor, cartões de destino e compras são sempre escopados ao `UserId` autenticado; só se importa para `CreditCard` do próprio usuário (C22). *(Fonte: 004 / RN15.)*
- **RN18** — **Rastreabilidade**: compra de origem Visor é distinguível da manual (id externo) e, se estrangeira, expõe moeda/valor originais (C21). *(Fonte: 004 / RN11.)*

---

## 5. TRATAMENTO DE ERROS (caminhos infelizes)

| Código | Situação | Tratamento | Mensagem (UI) |
|--------|----------|-----------|----------------|
| CE01 | Visor não conectado | Bloquear; guiar "Conectar Visor" (fluxo 004) | "Conecte sua conta do Visor para importar compras de cartão." |
| CE02 | Vínculo expirado/revogado | Bloquear; orientar reconexão; não alterar dados | "Sua conexão com o Visor expirou. Reconecte para continuar." |
| CE03 | Prazo ausente/inválido | Validação falha; nenhuma chamada ao Visor | "Informe um período válido (data inicial e final)." |
| CE04 | Período sem compras de cartão | Não é erro; estado vazio | "Nenhuma compra de cartão encontrada para importar neste período." |
| CE05 | Conta CREDIT do Visor sem cartão local | Não importa aquelas linhas; orienta criar/associar cartão | "Escolha (ou crie) um cartão para a conta '{conta}' antes de importá-la." |
| CE06 | Câmbio indisponível para a data | Linha vem com BRL=0 e pendente de revisão; editável; não aborta | "Não foi possível cotar {moeda} em {data}. Informe o valor em BRL desta compra." |
| CE07 | Falha/timeout do Visor no preview | Não exibe preview parcial; nada persistido | "Não foi possível buscar as compras do Visor. Tente novamente." |
| CE08 | Falha na persistência da confirmação | Rollback total; nada persistido | "Não foi possível concluir a importação. Nenhuma compra foi criada. Tente novamente." |
| CE09 | Cartão de destino removido entre preview e confirm | Não persiste para esse cartão; informa (ver C20/Handoff) | "O cartão de destino '{cartão}' não está mais disponível." |
| CE10 | Usuário não autenticado | 401 pelo middleware existente | Padrão do backend. |

---

## 6. CASOS DE USO

### UC01 — Importar compras de cartão do Visor
**Ator:** Usuário autenticado (dono do app)
**Pré-condições:** Logado; vínculo Visor ativo; ao menos um `CreditCard` cadastrado.
**Fluxo Principal:**
1. No módulo de Cartões, aciona "Importar compras do Visor".
2. Informa o prazo (obrigatório) e, se quiser, incluir-ignoradas/busca; busca o preview.
3. O sistema traz as compras das contas de cartão do Visor (só valores positivos), agrupadas por conta, com câmbio sugerido e já-importadas marcadas.
4. Para cada conta do Visor, escolhe o cartão local de destino; revisa/edita as linhas (descrição, valor BRL, data, categoria, parcelas) e desmarca o que não quer.
5. Confirma. O sistema persiste as compras marcadas, insert-only e atômico, sem novo acesso ao Visor.
6. Vê o resumo (importadas / ignoradas por já existirem / pendentes de câmbio) e as compras aparecem nas faturas.

**Fluxos Alternativos:** FA01 não conectado/expirado (CE01/CE02); FA02 prazo ausente (CE03); FA03 período vazio (CE04); FA04 conta sem cartão (CE05); FA05 câmbio indisponível (CE06); FA06 falha do Visor no preview (CE07); FA07 falha na confirmação (CE08); FA08 reimport sem duplicar (RN10).

---

## 7. CENÁRIOS DE TESTE

1. **Happy path** — 3 compras de cartão positivas em conta CREDIT com destino escolhido ⇒ 3 `CreditCardPurchase` origem Visor (1x cada) no cartão certo; resumo 3/0.
2. **Exclusão de pagamentos/estornos** — período com 2 compras positivas + 1 "Pagamento PIX" negativo ⇒ só as 2 compras aparecem no preview.
3. **Reimport insert-only** — as 3 já importadas ⇒ preview marca 3 como já importadas; confirmar não duplica; resumo 0/3.
4. **Edição manual preservada** — compra importada teve categoria/parcelas editadas manualmente; reimport não a altera.
5. **Estrangeira convertida** — "Anthropic 105,91 USD" ⇒ BRL sugerido pela PTAX da data; original+moeda+taxa preservados; BRL editável.
6. **IOF linha separada** — "IOF de compra internacional 19,94 BRL" entra como compra própria em BRL.
7. **Câmbio indisponível** — estrangeira sem PTAX na janela ⇒ BRL sugerido 0 + pendente de revisão; editável; não aborta.
8. **Conta sem cartão local** — conta CREDIT sem destino ⇒ suas linhas não importam; orienta criar; outras contas importam.
9. **Parcelas editadas para N>1** — usuário marca linha como 12x ⇒ aviso de dupla contagem exibido; ao confirmar, gera compra 12x (projeta 12 faturas).
10. **Estado vazio** — período sem compras de cartão ⇒ estado vazio, sem erro.
11. **Prazo ausente** — sem intervalo ⇒ validação barra antes de chamar Visor.
12. **Bloqueio sem conexão / vínculo expirado** — orienta (re)conectar; nada importado.
13. **Falha do Visor no preview** — timeout ao paginar ⇒ sem preview parcial; nada persistido.
14. **Confirmação atômica** — falha na persistência ⇒ nenhuma compra criada; retry não duplica.
15. **Cartão removido entre preview e confirm** — compras daquele cartão não persistem; informa (C20).
16. **Marcador de parcela read-only** — "08/10" na descrição aparece como informação; compra proposta continua 1x por padrão.

---

## 8. SCHEMA / MIGRATIONS

**Migration necessária?** ☑ Sim

Em **`CreditCardPurchase`**, acrescentar (em termos de negócio; tipos/precisão a cargo do Arquiteto): **id externo** (nullable), **moeda original** (obrigatória, default "BRL"), **valor original**, **taxa de câmbio aplicada** (nullable), **data de referência de câmbio** (nullable) e **indicador de pendência de revisão de câmbio** (default falso). `Amount` permanece (agora sempre em BRL). Deduplicação por (usuário + origem Visor + id externo).

**Impacto em dados existentes?** Não destrutivo. Compras existentes recebem moeda "BRL", valor original = `Amount`, taxa/data/id externo nulos, pendência = falso.

**Reversível?** Sim (EF Core Code-First up/down).

**Breaking change?** Não — mudanças de contrato aditivas; novos endpoints de preview/confirm de cartão aditivos.

---

## 9. PREMISSAS ASSUMIDAS

Decisões tomadas pelo PM (não retornaram ao humano nesta rodada), na leitura mais conservadora/reversível. Se erradas, revisar antes do desenvolvimento:

- **PA1 — Granularidade por lançamento + parcelamento default 1x + edição avisada.** Como o Visor entrega parcelas já lançadas (DE1) e não há link por id com `get_installment_plans` (DE3), cada lançamento vira, por padrão, uma compra **1x** na data do lançamento — o caminho que **não** gera dupla contagem (cada parcela real é importada uma única vez, dedup por id externo). A edição para N>1 é permitida (pedido do humano) mas **avisa** do risco, e a prevenção automática da dupla contagem fica **fora de escopo**. *Racional:* honra "parcelas editáveis" sem esconder o efeito colateral. *Impacto se errado:* se o humano quiser agrupamento automático de plano parcelado, é necessário desenho adicional (correlação por descrição/valor via `get_installment_plans`) — trabalho novo.
- **PA2 — Deduplicação escopada à compra de cartão.** O id externo do Visor deduplica dentro das **compras de cartão** (`CreditCardPurchase`). Um mesmo id externo de conta CREDIT não colide com transações de conta bancária da 004 (contas/ids distintos). *Impacto se errado:* baixo; se houver sobreposição de ids entre módulos, o Arquiteto isola por origem/módulo.
- **PA3 — `get_installment_plans`, `get_cards` e `get_credit_card_bills` NÃO são usados nesta fase.** A exclusão de cartão e a identidade da conta usam `get_accounts` (type CREDIT) + `account_id`, mais confiáveis (DE4). *Impacto se errado:* se o humano quiser projetar planos futuros a partir de `get_installment_plans`, é feature adicional.
- **PA4 — Câmbio pela PTAX da data do lançamento (não do fechamento da fatura), com BRL editável no preview.** Mantém a política e a infraestrutura da 004; a edição no preview cobre o casamento com a fatura real. *Impacto se errado:* se o humano exigir a taxa do fechamento da fatura, muda a regra de conversão (não a estrutura).
- **PA5 — Só compras positivas.** Pagamentos/estornos/créditos (negativos — DE2) são excluídos objetivamente por sinal. *Impacto se errado:* se o humano quiser registrar estornos/pagamentos, é escopo novo (o modelo `CreditCardPurchase` só representa compra).
- **PA6 — IOF é compra independente.** O IOF (linha separada em BRL — DE5) entra como compra própria, sem vínculo à compra estrangeira. *Impacto se errado:* se quiserem somar IOF ao valor da compra internacional, precisa de correlação (não há id de vínculo na fonte).
- **PA7 — Atomicidade da confirmação como tudo-ou-nada por operação.** Segue a 004. O tratamento de "cartão removido entre preview e confirm" (C20) — rejeitar tudo vs. persistir só os válidos — é ponto para o Arquiteto confirmar; o PRD exige apenas que não haja estado inconsistente. *Impacto se errado:* ajuste de UX/mensagem, não de modelo.

---

## 10. NOTA DE HANDOFF PARA O ARQUITETO (`/planejar`)

O PRD define o **O QUÊ**; abaixo os **COMOs** deliberadamente não decididos e os pontos de atenção:

1. **Reuso vs. novo par preview/confirm.** Avaliar reaproveitar o `PreviewVisorImportQuery`/`ConfirmVisorImportCommand` da 004 (que hoje **excluem** contas CREDIT) vs. um par novo dedicado a cartão. O comportamento é **inverso** ao da 004: aqui se mantém **só** contas CREDIT.
2. **Identificação das contas de cartão.** Usar `get_accounts` (type CREDIT) para o conjunto de `account_id`; manter só lançamentos desses ids e de **valor positivo**. Confirmar como a chamada de listagem separa compras (despesa positiva) de pagamentos (negativo) — provavelmente por tipo/sinal na fonte.
3. **Rastreabilidade em `CreditCardPurchase`.** Modelar id externo + moeda/valor original + taxa/data + flag de pendência de revisão de câmbio; tipos e precisão (decimal, ISO da moeda), índice de dedup filtrado por origem Visor. Espelhar o que a 004 fez em `Transaction`, adaptado à compra.
4. **Escolha de cartão de destino por conta.** O preview agrupa por `account_id`/`account_name` do Visor; o cliente envia, na confirmação, o `CreditCard` de destino por conta (ou por linha). Sem mapeamento persistente nesta fase (escolha por import) — confirmar.
5. **Fatura derivada.** Reutilizar o cálculo existente por `ClosingDay`; compras importadas 1x caem na fatura pela `PurchaseDate`. Sem armazenar fatura.
6. **C20 / concorrência preview→confirm.** Definir a política quando o cartão de destino sumiu (rejeitar tudo vs. persistir válidos), mantendo atomicidade e mensagem clara; validar que o cartão pertence ao usuário na confirmação.
7. **Câmbio pendente.** Reaproveitar a semântica da 004 (`ExchangeReviewPending`, `Amount = 0` fora dos totais) na `CreditCardPurchase`; garantir que a fatura/projeção ignore compras pendentes de revisão até serem revisadas.
8. **Marcador "NN/NN".** É apenas informação read-only derivada da descrição — não parsear para lógica automática nesta fase (frágil: compras à vista não têm marcador; DE1/DE3).
9. **Exibição na UI.** Fatura/lista de compras deve distinguir origem Visor e mostrar moeda/valor originais sem quebrar a formatação BRL (reaproveitar a variante multi-moeda da 004).

---

## 11. DEFINIÇÃO DE PRONTO

- [ ] Preview (leitura) traz só compras positivas de contas CREDIT, paginado, sem persistir; confirm (escrita) persiste insert-only e atômico.
- [ ] `CreditCardPurchase` guarda id externo + moeda/valor original + taxa/data + pendência de câmbio; `Amount` sempre em BRL; migration aditiva/reversível com backfill.
- [ ] Dedup por id externo (insert-only); reimport não duplica nem altera (incl. edições manuais e parcelas editadas).
- [ ] Escolha de cartão de destino por conta; conta sem cartão orienta a criar; nada criado automaticamente.
- [ ] Conversão estrangeira (PTAX da data) com BRL editável; câmbio indisponível ⇒ pendente de revisão, editável, sem abortar.
- [ ] Pagamentos/estornos (negativos) excluídos; IOF importado como compra própria.
- [ ] Aviso de dupla contagem ao editar parcelas para N>1.
- [ ] Caminhos infelizes cobertos (CE01–CE10) + estado vazio + rastreabilidade na UI.
- [ ] Testes unitários (padrão do projeto) para os cenários da §7; dados sensíveis não logados; escopo por usuário.
- [ ] `dotnet build`/`dotnet test` + `npm run build` verdes. PRD atendido 100%.

---

## 12. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-07-07 | 1 | Product Manager (IA) | Versão inicial. Respostas do humano (destino por escolha de cartão; câmbio com rastreabilidade completa; pacote aceito) + dossiê empírico do MCP do Visor (compras de cartão por-parcela, exclusão de negativos, IOF separado). Decisão de produto sobre dupla contagem de parcelas registrada em Premissas Assumidas (PA1). |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
</content>
</invoke>
