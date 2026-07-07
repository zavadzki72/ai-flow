# PRD: Importar Transações do Visor Finance

**Sequência**: 004
**Ticket**: TBD
**Versão**: 3
**Data**: 2026-07-07
**Status**: 🟢 IMPLEMENTADO (ajustado pós-teste — ver Emenda v3)

---

## ✏️ Emenda v3 (2026-07-07) — ajustes após teste do usuário

Depois de testar a 1ª versão localmente, o usuário pediu 3 mudanças (ver [ADR 0009](../adr/0009-import-visor-preview-editavel-exclusao-cartao.md)), já implementadas:

1. **Sem cartão de crédito.** O import passa a trazer **só transações de contas bancárias**. Compras e
   parcelas de cartão (contas `type: "CREDIT"` no `get_accounts` do Visor) são **excluídas** e viram uma
   **etapa/import separado** no futuro. O preview informa quantas foram ignoradas.
2. **Sem filtro de categoria.** A seção de categorias saiu do modal e o filtro de categoria saiu do backend
   (**supera o ADR 0008**). A categoria vira **sugestão editável por linha** no preview.
3. **Preview editável "de → para" (2 fases).** Substitui o "gravar direto" e o não-objetivo "sem preview"
   da §1.3. Agora: **buscar → revisar/editar → confirmar**. `POST /api/visor/import/preview` (não persiste)
   devolve as candidatas; o usuário edita **descrição, valor em BRL, data e categoria** e desmarca linhas;
   `POST /api/visor/import/confirm` persiste as selecionadas (insert-only, dedup por id externo).

Os critérios da §2 sobre **filtro de categoria** deixam de valer; os demais (consentimento, dedup insert-only,
câmbio, rastreabilidade) seguem íntegros, agora aplicados na fase de preview/confirm.

**Metadados:**
- **Prioridade**: Alta
- **Complexidade**: 🔴 Alta
- **Repositório(s)**: backend (`/Users/zavadzki72/Projects/Personal/mz-finance/backend`), frontend (`/Users/zavadzki72/Projects/Personal/mz-finance/frontend`)
- **Domínio(s)**: Transações (`Transaction`), Origem de Transação (`TransactionSourceType`), nova integração externa **Visor Finance** (consentimento + importação) e nova integração de **câmbio** (conversão de moeda estrangeira para BRL)

> ⚠️ **Nota de path**: o `mz-finance-map.json` ainda registra os repositórios em caminhos Windows (`C:/Projects/...`). O ambiente real é macOS (`/Users/zavadzki72/Projects/Personal/mz-finance/...`). Os caminhos acima e ao longo do PRD usam o local real. Recomenda-se corrigir o map (fora do escopo deste PRD).

---

## 1. VISÃO GERAL

### 1.1. Contexto

Hoje, todo lançamento no mz-finance é **manual** (ver `mz-finance-context.md#integracoes-e-dependencias-externas`: "Nenhuma integração externa no MVP" / "Todos os lançamentos são manuais"). O usuário já usa um serviço externo de Open Finance, o **Visor Finance**, que agrega automaticamente suas transações bancárias. Reinserir essas transações à mão no mz-finance é trabalhoso e propenso a erro, e pagar uma integração Open Finance direta (Pluggy, Belvo, etc.) não se justifica para uso pessoal.

O Visor **não** expõe REST API; ele publica os dados por um **servidor MCP remoto**, cuja operação `get_transactions` lista as transações do usuário com filtros (intervalo de datas, tipo, categoria, incluir/excluir ignoradas, busca textual) e paginação. O acesso exige um **consentimento OAuth único por conta**, renovável automaticamente depois — ou seja, há um passo "Conectar Visor" antes do primeiro import. Cada transação do Visor tem um **identificador estável (id externo)**.

**Achado técnico relevante (confirmado):** o `get_transactions` do Visor **não** retorna valor em BRL nem taxa de câmbio para transações estrangeiras — devolve apenas a **moeda e o valor originais** (ex.: a compra "Anthropic* Claude Sub" volta como `currency: "USD", amount: "105.91"`, sem nenhum campo de conversão). Como o mz-finance calcula saldo/totais somando um único número, foi decidido **converter para BRL no momento do import** — o que exige uma **fonte externa de câmbio** (nova dependência de integração).

Este PRD introduz a **primeira integração externa do projeto**, o que eleva a complexidade e os requisitos de segurança (armazenamento de credenciais/consentimento OAuth) e agora também de câmbio.

### 1.2. Objetivo

Permitir que o usuário **importe, sob demanda e manualmente, as transações do Visor Finance para dentro do mz-finance**, a partir de um botão "Importar do Visor" na tela de Transações que abre um **modal de importação com filtros estruturados**. As transações importadas:

- entram no extrato como `Transaction` normais, participando das visões já existentes (extrato, saldo, dashboard);
- são **rastreáveis** pela origem "Visor";
- **não se duplicam** em reimportações do mesmo período (deduplicação pelo id externo do Visor), e a reimportação é **insert-only** (nunca altera nem apaga o que já existe);
- quando vierem em **moeda estrangeira**, têm o valor **convertido para BRL** (pela taxa da data da transação) para os totais funcionarem, preservando **valor e moeda originais + a taxa aplicada** como rastreabilidade.

O "momento mágico" desta feature: conectar o Visor uma vez, abrir o modal, escolher o período, importar, e ver as transações do banco aparecerem no extrato — sem digitar cada uma.

### 1.3. Não-Objetivos (fora do escopo deste PRD)

- **Filtro por linguagem natural** no modal de importação — adiado para fase 2. Nesta fase os filtros são estruturados.
- **Importar contas, cartões ou categorias do Visor como entidades próprias** — só transações. O nome da categoria do Visor vira **texto** em `Transaction.Category`, não entidade.
- **Sincronização automática/agendada** — a importação é **manual, sob demanda** (acionada pelo botão). Não há job/cron.
- **Preview pré-import** — não há tela de pré-visualização do que será importado nesta fase. Há **resumo pós-import** (quantas importadas/ignoradas).
- **Reconversão/atualização de câmbio após o import** — a taxa é **fixada na importação** (a da data da transação). Mudanças posteriores de cotação **não** reconvertem transações já importadas (coerente com o insert-only).
- **Atualização/refletir correções feitas no Visor após o 1º import** — dado o insert-only, se o Visor corrigir uma transação já importada, o mz-finance **não** reflete a correção (limitação conhecida — ver DP1/DP4 e seção 15).

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Conectar Visor antes do primeiro import (consentimento)
**Dado** que o usuário nunca conectou o Visor (não há vínculo de autorização ativo)
**Quando** ele aciona "Conectar Visor"
**Então** o sistema conduz o fluxo de consentimento OAuth do Visor
**E** ao concluir com sucesso, o vínculo passa a constar como **ativo/conectado**
**E** a partir daí a importação fica habilitada sem exigir novo consentimento (renovação automática do vínculo).

### Critério 2 — Import bloqueado enquanto o Visor não estiver conectado
**Dado** que não existe vínculo ativo com o Visor
**Quando** o usuário tenta importar (aciona "Importar do Visor")
**Então** a importação é **bloqueada**
**E** o sistema orienta explicitamente o usuário a conectar o Visor primeiro (com o caminho para fazê-lo)
**E** nenhuma chamada de importação é feita ao Visor.

### Critério 3 — Abrir o modal de importação com filtros estruturados
**Dado** que o Visor está conectado e o usuário está na tela de Transações
**Quando** ele aciona "Importar do Visor"
**Então** abre um modal com os filtros: **prazo** (intervalo de datas, obrigatório), **tipo** (despesa / receita / ambos), **categoria** (multiseleção, opcional, **populada pelas categorias do mz-finance**), **toggle "incluir transações ignoradas"** e **busca textual** (opcional)
**E** o usuário consegue confirmar a importação ou cancelar sem efeito.

### Critério 4 — Prazo (intervalo de datas) é obrigatório
**Dado** que o usuário abriu o modal de importação
**Quando** ele tenta confirmar a importação **sem** informar o intervalo de datas (data inicial e/ou final ausentes ou inválidas, ex.: data final anterior à inicial)
**Então** a importação **não** é executada
**E** o sistema exibe erro de validação indicando que o prazo é obrigatório
**E** nenhuma chamada é feita ao Visor.

### Critério 5 — Importação bem-sucedida (happy path)
**Dado** que o Visor está conectado e existem transações no período/filtro escolhidos que ainda não estão no mz-finance
**Quando** o usuário confirma a importação
**Então** o sistema busca no Visor (`get_transactions`) todas as transações que casam com os filtros, percorrendo **todas as páginas** do resultado
**E** cada transação nova é persistida como `Transaction` com **origem "Visor"**
**E** ao final o extrato passa a exibir as novas transações
**E** o usuário recebe um **resumo do resultado** (quantas importadas, quantas ignoradas por já existirem).

### Critério 6 — Idempotência: reimportar o mesmo período não duplica
**Dado** que um conjunto de transações do Visor já foi importado anteriormente
**Quando** o usuário reimporta um período que abrange essas mesmas transações
**Então** nenhuma transação já existente (mesmo id externo do Visor) é **duplicada**
**E** o resumo indica quantas foram tratadas como já existentes.

### Critério 7 — Reimportação é insert-only (nunca toca no que já existe)
**Dado** que transações de origem Visor já foram importadas
**Quando** o usuário reimporta o período correspondente — mesmo que alguma dessas transações tenha mudado no Visor desde o último import
**Então** o sistema **apenas insere** as transações novas (id externo ainda não presente)
**E** **nenhuma** transação já existente é alterada, atualizada ou apagada — sejam de origem Visor (preservando eventuais correções do Visor não refletidas) ou de qualquer outra origem (preservando 100% das edições manuais do usuário)
**E** o resumo contabiliza 0 alteradas.

### Critério 8 — Período sem transações (estado vazio, sem erro)
**Dado** que o Visor está conectado e o período/filtro escolhido não retorna nenhuma transação
**Quando** o usuário confirma a importação
**Então** **nenhum** registro é criado
**E** o sistema exibe um **estado vazio** claro ("Nenhuma transação encontrada para importar neste período")
**E** isso **não** é tratado como erro.

### Critério 9 — Moeda estrangeira é convertida para BRL (preservando o original)
**Dado** que uma transação do Visor está em moeda estrangeira (ex.: 105,91 USD) e o Visor não fornece valor em BRL nem taxa
**Quando** ela é importada
**Então** o sistema converte o valor para BRL usando a **taxa de câmbio da data da transação** (fonte de câmbio externa — ver Handoff)
**E** o valor em **BRL** convertido é o que passa a compor saldo/extrato/totais (`Amount`)
**E** ficam **preservados como rastreabilidade**: o valor original (105,91), a moeda original (USD) e a **taxa aplicada** (com a data de referência)
**E** transações já em **BRL** não sofrem conversão (valor original = valor em BRL, sem taxa aplicada).

### Critério 10 — Toggle "incluir transações ignoradas"
**Dado** que existem transações marcadas como **ignoradas** no Visor dentro do período
**Quando** o usuário mantém o toggle "incluir ignoradas" **desligado** e importa
**Então** as ignoradas **não** são importadas
**E quando** ele **liga** o toggle e importa o mesmo período
**Então** as ignoradas passam a ser importadas (como transações novas, sem duplicar as já importadas).

### Critério 11 — Tipo (receita/despesa) determinado pela fonte
**Dado** que o usuário escolhe o filtro de tipo no modal
**Quando** ele importa com tipo = **despesa**, então todas as transações importadas ficam com tipo **Despesa**; com tipo = **receita**, todas ficam **Receita**
**E quando** escolhe **ambos**, cada transação importada recebe o tipo **correto** conforme a fonte (Visor), sem inverter o sinal de nenhuma linha (ver RN04 e Nota de Handoff sobre como "ambos" é resolvido tecnicamente).

### Critério 12 — Categoria do Visor vira o texto de categoria da transação
**Dado** que uma transação do Visor tem uma categoria (ex.: "Alimentação")
**Quando** ela é importada
**Então** o nome da categoria do Visor é gravado como **texto** em `Transaction.Category` (não vira entidade própria)
**E** se a transação do Visor não tiver categoria, a `Transaction` recebe a categoria padrão **"Sem categoria"** (RN08), já que `Category` é obrigatório no domínio.

### Critério 13 — Vínculo expirado ou revogado orienta reconexão
**Dado** que o vínculo de autorização com o Visor **expirou** ou foi **revogado**
**Quando** o usuário tenta importar
**Então** o sistema detecta que o vínculo não está mais válido
**E** orienta o usuário a **reconectar** o Visor (refazer o consentimento)
**E** nenhuma transação é importada até a reconexão
**E** nenhuma transação existente é apagada ou alterada por causa da expiração.

### Critério 14 — Falha/timeout do Visor durante o import é atômica
**Dado** que uma importação está em andamento
**Quando** o Visor **falha** ou dá **timeout** no meio do processo (ex.: falha ao paginar)
**Então** **nada** é persistido de forma parcial/inconsistente — a importação é **tudo-ou-nada** (RN07)
**E** o sistema exibe uma mensagem clara de falha
**E** o extrato permanece exatamente como estava antes da tentativa
**E** o usuário pode tentar novamente sem risco de duplicação ou de estado sujo.

### Critério 15 — Rastreabilidade da origem no extrato
**Dado** que existem transações importadas do Visor e transações manuais no mesmo período
**Quando** o usuário olha o extrato
**Então** é possível distinguir a **origem "Visor"** das demais origens (Manual, recorrente, financiamento, cartão) — a origem já é um atributo exposto por transação.

### Critério 16 — Cotação de câmbio indisponível para a data da transação
**Dado** que uma transação estrangeira precisa ser convertida, mas a fonte de câmbio **não tem cotação** para a data da transação
**Quando** a importação processa esse item
**Então** o item **não** é persistido com valor em BRL inválido/zero de forma silenciosa
**E** o usuário é **claramente informado** de que houve item(ns) sem conversão possível (quantos e por quê)
**E** o comportamento específico (falhar toda a importação por atomicidade, usar a cotação mais próxima, ou marcar o item para revisão) segue a política definida com o Arquiteto (ver Handoff), sem violar a atomicidade da RN07.

---

## 3. ESCOPO TÉCNICO

> Arquitetura: Clean Architecture (Domain → Application → Infra → WebApi) + CQRS via MediatR (ver `mz-finance-context.md#arquitetura` e `BOILERPLATES/BACK/dotnet-api/README.md`). A importação e o "conectar" são **Commands** (escrita); a consulta do estado do vínculo é uma **Query** (leitura). A busca no Visor e a cotação de câmbio ocorrem na Application/Infra via portas de saída (interfaces). Todas as respostas seguem o envelope `DataActionResult<T>` e erros de negócio usam o Notification Pattern (sem exception).

### 3.1. Componentes a Alterar

**Backend**
- `MzFinance.Domain/Models/Transaction.cs` — acrescentar: **IdentificadorExterno** (id estável do Visor, nulo para origens não-Visor); **MoedaOriginal** (default BRL); **ValorOriginal** (valor na moeda original); **TaxaCambioAplicada** + **DataReferenciaCambio** (preenchidos só quando houve conversão). O campo `Amount` existente passa a ser sempre o valor **em BRL** (para saldo/totais). Aceitar esses atributos no fluxo de criação por importação.
- `MzFinance.Domain/Enums/TransactionSourceType.cs` — acrescentar um novo valor de origem representando **"Visor"** (junto de Manual/FromRecurring/FromFinancing/FromCard).
- `MzFinance.Infra/Maps/TransactionMap.cs` — mapear as colunas novas; considerar índice de deduplicação (ver 4.4/8).
- Serialização/DTO do extrato — expor **moeda original / valor original / taxa** por transação para a UI mostrar a rastreabilidade (o valor em BRL continua sendo o principal).

**Frontend**
- `frontend/src/features/transactions/TransactionsPage.tsx` — acrescentar o botão **"Importar do Visor"** (ao lado de "Nova transação") e abrir o novo modal de importação; após import bem-sucedido, recarregar o extrato.
- `frontend/src/features/transactions/api.ts` — a interface `Transaction` passa a incluir os campos de moeda original/valor original/taxa; novos endpoints de conectar/estado/importar Visor.
- Exibição opcional, no extrato, de que um lançamento veio em moeda estrangeira e foi convertido (ex.: mostrar "US$105,91 → R$…" como detalhe). `formatCurrency`/`MoneyValue` continuam formatando o principal em BRL.

### 3.2. Componentes Novos

**Backend (Domain / integração)**
- Novo conceito persistido de **Vínculo de Autorização Visor** (consentimento OAuth por usuário) com **estado** (ex.: NãoConectado / Conectado / Expirado / Revogado) e o material de credencial/consentimento necessário para renovar o acesso. **Sensível** — ver RNF.
- Porta de saída (interface) para o **cliente MCP do Visor** — listar transações (`get_transactions`, filtros + paginação) e conduzir/validar o consentimento.
- Porta de saída (interface) para a **fonte de câmbio** — obter a taxa de conversão de uma moeda para BRL numa data.

**Backend (Application)**
- Command **Conectar Visor** (iniciar consentimento) + tratamento do retorno/callback OAuth.
- Command **Importar Transações do Visor** — recebe os filtros do modal, busca no Visor (todas as páginas), **converte moeda estrangeira** para BRL, deduplica por id externo e faz **insert-only** atômico.
- Query **Estado da Conexão Visor** — informa à UI se está conectado / precisa reconectar.
- DTOs de entrada (filtros) e de saída (resumo do import: encontradas, importadas, ignoradas-por-existirem, e não-importadas-por-câmbio quando aplicável).
- Validators (FluentValidation) para os filtros de importação (ver 4.5).

**Backend (Infra)**
- Implementação do cliente MCP do Visor (auth via vínculo OAuth, `get_transactions`, paginação, mapeamento payload → modelo interno).
- Implementação da fonte de câmbio (ex.: PTAX/Banco Central — a definir; ver Handoff), com tratamento de cotação indisponível.
- Persistência/EF map do Vínculo Visor; migration com as novas colunas de `Transaction` e a nova estrutura do vínculo (ver 8).

**Backend (WebApi)**
- Endpoints (sob autenticação JWT) para: iniciar/concluir "Conectar Visor", consultar o estado da conexão e executar a importação.

**Frontend**
- Componente **Modal de Importação do Visor** na feature `transactions`: filtros estruturados (categoria populada pelas categorias do mz-finance), ação de importar, estados de carregando/vazio/erro e **resumo do resultado**.
- Fluxo/afordância de **"Conectar Visor"** e de **reconexão** quando o vínculo expira/é revogado.
- Hooks React Query para os novos endpoints; invalidação do extrato após import.

### 3.3. Componentes Reutilizados (sem alteração de comportamento)

- Entidade `Transaction` e o extrato (`GetStatement` / `/api/transactions/statement`) — as transações importadas são `Transaction` comuns e aparecem no extrato/saldo/dashboard existentes; como o `Amount` é sempre BRL, os totais continuam corretos.
- Design System do frontend (`shared/ui`: `Modal`, `Button`, `Field`, `Select`, `ComboBox`/multiseleção, `CurrencyInput`, `Feedback`, `EmptyState`, `Skeleton`).
- Fonte de categorias do mz-finance (`shared/api/categories` / `getCategories`) para popular o multiselect do filtro.
- Padrão de autenticação JWT self-issued e escopo por `UserId` (`ICurrentUserService`).

### 3.4. Fluxo de Dados

**Conectar Visor (consentimento):**
```
1. Usuário aciona "Conectar Visor".
2. Backend inicia o fluxo de consentimento OAuth do Visor.
3. Usuário autoriza no Visor; o backend recebe/valida o consentimento.
4. Backend persiste o Vínculo de Autorização (estado = Conectado + material p/ renovação).
5. UI passa a mostrar "conectado" e habilita a importação.
```

**Importação (happy path):**
```
1. Usuário abre o modal, informa o prazo (obrigatório) e demais filtros, confirma.
2. Backend valida os filtros (prazo obrigatório; tipo/categorias/toggle/busca opcionais).
3. Backend verifica o vínculo Visor (Conectado?). Se não, bloqueia e orienta (C2/C13).
4. Backend chama get_transactions no Visor com os filtros, paginando até esgotar os resultados.
5. Para cada transação do Visor:
   a. Deduplica por id externo (escopo do usuário + origem Visor):
      - já existe → IGNORA (insert-only; não altera nada);
      - não existe → segue para (b).
   b. Determina tipo (pela fonte/filtro), categoria-texto ("Sem categoria" se ausente), descrição.
   c. Moeda: se BRL, usa o valor direto; se estrangeira, converte para BRL pela taxa da
      DATA DA TRANSAÇÃO (fonte de câmbio) e guarda valor/moeda originais + taxa.
      Se a cotação da data não existir → aplica a política de câmbio-indisponível (C16).
   d. Monta a Transaction nova (Amount em BRL, origem Visor, id externo, metadados de câmbio).
6. Persiste as novas de forma ATÔMICA (tudo-ou-nada).
7. Retorna o resumo: encontradas, importadas, ignoradas-por-existirem, não-importadas-por-câmbio.
8. Frontend recarrega o extrato e mostra o resumo.
```

**Falha/timeout durante o import:**
```
1-5. Igual ao happy path.
6. Se o Visor (ou a fonte de câmbio, conforme política C16) falha/timeouta, a operação é abortada.
7. Nenhum registro é persistido (rollback) — o extrato fica intacto.
8. Retorna erro claro; usuário pode tentar de novo sem duplicar (idempotência garante isso).
```

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos

**Transaction** (alteração):
- **Amount** (existente): passa a representar sempre o valor **em BRL** (fonte de verdade para saldo/totais). Para transações BRL, é o próprio valor; para estrangeiras, é o valor **convertido**.
- **MoedaOriginal**: código de moeda (ISO 4217, 3 letras), **obrigatório**, **default "BRL"**. Transações existentes recebem "BRL" na migration.
- **ValorOriginal**: valor na moeda original. Para BRL, igual ao `Amount`; para estrangeira, o valor como veio do Visor.
- **TaxaCambioAplicada** e **DataReferenciaCambio**: **nullable**; preenchidos apenas quando houve conversão (moeda ≠ BRL). Guardam a taxa usada e a data de referência para rastreabilidade.
- **IdentificadorExterno** (id estável do Visor): texto **nullable**. Preenchido apenas em transações de origem Visor.
- O construtor/fluxo de criação por importação aceita: tipo, valor em BRL, valor/moeda originais, taxa+data (se houver), data, categoria (texto), descrição, id externo e origem = Visor. `Amount` continua como magnitude positiva; o sinal deriva do `Type`.

**TransactionSourceType** (alteração):
- Novo valor de origem representando **"Visor"** (importada do Visor Finance), somando-se a Manual / FromRecurring / FromFinancing / FromCard.

**Vínculo de Autorização Visor** (novo):
- Por usuário. Atributos: **estado** (NãoConectado / Conectado / Expirado / Revogado), referência do consentimento e material de credencial para renovação automática (**sensível**), e validade/expiração. Um vínculo ativo por usuário (usuário único).

### 4.2. Comandos / Queries / DTOs

**Commands (escrita, retornam via `DataActionResult<T>`):**
- **ConectarVisor**: inicia o consentimento OAuth; o tratamento do retorno persiste/atualiza o Vínculo.
- **ImportarTransacoesDoVisor**: entrada = filtros do modal:
  - `dataInicial` (obrigatório), `dataFinal` (obrigatório);
  - `tipo` ∈ { Despesa, Receita, Ambos };
  - `categorias` (lista de categorias do **mz-finance**, opcional);
  - `incluirIgnoradas` (bool, default `false`);
  - `busca` (texto, opcional).
  - Saída: resumo `{ encontradas, importadas, ignoradasPorJaExistirem, naoImportadasPorCambio }`.

**Query (leitura):**
- **EstadoConexaoVisor**: sem parâmetros; saída `{ estado }` (Conectado / precisa conectar / precisa reconectar).

### 4.3. Handlers / Services

- **Handler de ImportarTransacoesDoVisor**: resolve `userId`; valida os filtros; verifica o vínculo (senão notifica para conectar/reconectar — C2/C13); chama o cliente MCP (`get_transactions`) paginando tudo; para cada item **novo** (dedup por id externo, insert-only), determina tipo/categoria/descrição e **converte moeda estrangeira** para BRL pela taxa da data (via porta de câmbio), tratando cotação indisponível (C16); persiste as novas **atomicamente**; monta o resumo. Não altera nem apaga transações existentes.
- **Handler/Callback de ConectarVisor**: conduz/valida o consentimento OAuth; persiste o Vínculo.
- **Handler de EstadoConexaoVisor**: lê o Vínculo do usuário e devolve o estado.
- **Cliente MCP do Visor (Infra)**: encapsula auth pelo vínculo, `get_transactions` (filtros+paginação) e o mapeamento do payload; traduz falhas/timeout em notificações de negócio.
- **Fonte de câmbio (Infra)**: obtém a taxa moeda→BRL numa data; sinaliza cotação indisponível como notificação/estado (não exceção crua).

### 4.4. Persistência

- Novas colunas em `Transaction`: `MoedaOriginal` (obrigatória, default BRL), `ValorOriginal`, `TaxaCambioAplicada` (nullable), `DataReferenciaCambio` (nullable), `IdentificadorExterno` (nullable).
- **Deduplicação**: a identidade de import é (`UserId` + origem Visor + `IdentificadorExterno`). Antes de inserir, verifica-se a existência por essa chave; existindo, **ignora** (insert-only). Recomenda-se **índice único filtrado** sobre (`UserId`, `IdentificadorExterno`) para origem Visor — blindagem de deduplicação. O Arquiteto confirma o formato (índice filtrado vs. checagem só na aplicação), dado o baixo volume/concorrência (usuário único).
- **Atomicidade**: a importação inteira roda numa **única transação de banco** (commit único ao final); qualquer falha no meio faz rollback total (C14/RN07).
- Nova estrutura do **Vínculo de Autorização Visor** (por usuário), com o material de consentimento armazenado de forma **segura/criptografada** (ver RNF).
- Todas as operações escopadas ao `UserId` do token.

### 4.5. Validações

- **Prazo obrigatório**: `dataInicial` e `dataFinal` presentes e coerentes (`dataFinal >= dataInicial`). Falha → notificação de validação (C4).
- **Tipo**: valor válido do conjunto { Despesa, Receita, Ambos }.
- **incluirIgnoradas**: opcional, default `false`.
- **categorias / busca**: opcionais; `busca` com trim; strings vazias normalizadas para ausência de filtro.
- **Moeda importada**: se ausente na origem, assume BRL; se presente e ≠ BRL, dispara a conversão (C9/C16).
- **Categoria importada**: se ausente/vazia, aplica "Sem categoria" (`Category` é obrigatório, limite 100 — truncar/validar conforme o mapeamento atual).

### 4.6. Autorização

- Projeto de usuário único com JWT self-issued (ver `mz-finance-context.md#arquitetura`). Todos os endpoints novos (conectar, estado, importar) exigem autenticação. Não há múltiplos perfis/roles. O vínculo Visor e as transações importadas são sempre escopados ao `UserId` do token.

---

## 5. REGRAS DE NEGÓCIO

- **RN01** — A importação é **manual e sob demanda**, acionada pelo usuário via botão/modal na tela de Transações. Não há sincronização automática/agendada (ver Não-Objetivos).
- **RN02** — É obrigatório um **vínculo de autorização ativo** com o Visor antes de qualquer importação. Sem vínculo ativo, o import é bloqueado e o usuário é orientado a conectar (C2). Vínculo **expirado/revogado** exige reconexão (C13).
- **RN03** — O **prazo (intervalo de datas)** é **obrigatório** em toda importação. Os demais filtros são opcionais.
- **RN04** — O **tipo** (Receita/Despesa) de cada transação importada é determinado pela **fonte** (Visor), coerente com o filtro de tipo: "despesa" ⇒ todas Despesa; "receita" ⇒ todas Receita; "ambos" ⇒ cada linha com seu tipo correto (resolução técnica de "ambos" na Nota de Handoff). O `Amount` é magnitude positiva; o sinal deriva do `Type`.
- **RN05** — **Idempotência / deduplicação**: a chave de dedup é o **id externo** do Visor (escopado ao usuário e à origem Visor). Reimportar não duplica (C6).
- **RN06** — **Insert-only**: a reimportação **apenas insere** transações novas. Transações já existentes **nunca** são alteradas nem apagadas — de nenhuma origem (C7). Consequências assumidas: (a) preserva 100% das edições manuais do usuário; (b) correções feitas no Visor após o 1º import **não** são refletidas no mz-finance (limitação conhecida — Não-Objetivos / seção 15).
- **RN07** — **Atomicidade**: cada execução de importação é **tudo-ou-nada**. Falha/timeout do Visor (ou da fonte de câmbio, conforme política C16) no meio não deixa nada parcial; o extrato permanece intacto (C14).
- **RN08** — **Categoria como texto**: o nome da categoria do Visor é gravado como texto em `Transaction.Category`; categorias do Visor **não** viram entidades (Não-Objetivo). Sem categoria no Visor ⇒ **"Sem categoria"** (C12).
- **RN09** — **Moeda / conversão**: `Transaction` passa a guardar `MoedaOriginal` (default BRL). Transação importada com moeda ≠ BRL é **convertida para BRL** usando a taxa de câmbio da **data da transação**; o `Amount` (usado em saldo/totais) é persistido **em BRL**, e preservam-se **valor original, moeda original e taxa aplicada** (com data de referência) para rastreabilidade. Transações em BRL não sofrem conversão (C9). Não há reconversão posterior (Não-Objetivos).
- **RN10** — **Câmbio indisponível**: se não houver cotação para a data da transação, o item **não** é persistido com valor inválido silenciosamente; o usuário é informado; o comportamento exato (falhar a importação por atomicidade / usar cotação mais próxima / marcar para revisão) segue a política definida com o Arquiteto, respeitando a RN07 (C16).
- **RN11** — **Origem "Visor"**: toda transação importada é marcada com a origem "Visor", distinguível das demais no extrato (C15).
- **RN12** — **Transações ignoradas** no Visor só entram se o usuário ligar o toggle "incluir ignoradas" no import (C10). É decisão por importação (não configuração persistente).
- **RN13** — A importação **nunca apaga** transações do mz-finance. Uma transação que existia no Visor e sumiu (removida/estornada) **não** é removida do mz-finance por reimportação — importação só insere (coerente com o insert-only da RN06) (C7/C13).
- **RN14** — **Categorias do filtro** vêm das **categorias do mz-finance** (não das do Visor). O multiselect é populado localmente; a forma de casar isso com o filtro do Visor (que usa slugs próprios) é responsabilidade técnica do Arquiteto (ver Handoff) — a regra de negócio é apenas que o usuário escolhe entre as categorias que ele já usa no mz-finance.
- **RN15** — Todos os dados (vínculo Visor e transações) são sempre escopados ao usuário autenticado (`UserId`).
- **RN16** — A importação percorre **todas as páginas** de `get_transactions` para o filtro dado (C5).

---

## 6. REQUISITOS FUNCIONAIS

- **RF01** — Botão "Importar do Visor" na tela de Transações que abre o modal de importação.
- **RF02** — Fluxo "Conectar Visor" (consentimento OAuth) e detecção/afordância de reconexão quando expirar/for revogado.
- **RF03** — Modal com filtros estruturados: prazo (obrigatório), tipo (despesa/receita/ambos), categoria (multiseleção populada pelas categorias do mz-finance, opcional), toggle "incluir ignoradas", busca textual (opcional).
- **RF04** — Executar a importação buscando no Visor (`get_transactions`, todas as páginas), convertendo moeda estrangeira para BRL, deduplicando por id externo e persistindo **insert-only** e atomicamente.
- **RF05** — Persistir transações importadas como `Transaction` com origem "Visor", valor em BRL, e rastreabilidade de moeda/valor/taxa originais e id externo.
- **RF06** — Exibir resumo do resultado (encontradas, importadas, ignoradas por já existirem, não-importadas por câmbio) e estado vazio quando não houver nada a importar.
- **RF07** — Exibir no extrato a rastreabilidade de câmbio (moeda/valor originais) quando o lançamento veio de moeda estrangeira; o valor principal permanece em BRL.
- **RF08** — Bloquear a importação e orientar quando não conectado/expirado/revogado; validar prazo obrigatório.

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01** — **Segurança de credenciais**: o material do consentimento/OAuth do Visor é **sensível** — armazenado criptografado, nunca logado (estende `mz-finance-context.md#restricoes-nao-funcionais`).
- **RNF02** — **Dados financeiros sensíveis**: valores, categorias, descrições, moedas e taxas nunca são logados em texto puro.
- **RNF03** — **Resiliência das integrações**: falhas/timeout do Visor **e** da fonte de câmbio são tratadas como notificação de negócio com mensagem clara; nunca deixam estado parcial (atomicidade). Definir timeouts e (opcional) retry.
- **RNF04** — **Idempotência sob repetição**: reexecutar um import que falhou não gera duplicatas (chave de dedup + insert-only).
- **RNF05** — **CQRS/Clean Architecture**: import/conectar como Commands transacionais, estado como Query; cliente MCP e fonte de câmbio isolados atrás de portas (interfaces) na Application, implementados na Infra.
- **RNF06** — **Frontend sem Tailwind** (CSS Modules / Design System próprio).
- **RNF07** — **Performance**: uso pessoal; import de um período é pontual e pode ser síncrono, desde que pagine com segurança, faça as conversões sem estourar timeout de request para janelas grandes (o Arquiteto avalia limite de janela ou processamento assíncrono se necessário).

---

## 8. SCHEMA / MIGRATIONS

**Migration necessária?** ☑ Sim ☐ Não

**Se SIM:**
1. Adicionar em `Transaction`: `MoedaOriginal` (texto curto ISO, **obrigatória**, default **"BRL"**), `ValorOriginal` (decimal), `TaxaCambioAplicada` (decimal, **nullable**), `DataReferenciaCambio` (data, **nullable**), `IdentificadorExterno` (texto, **nullable**). O `Amount` existente permanece (agora sempre em BRL).
2. (Recomendado) **índice único filtrado** sobre (`UserId`, `IdentificadorExterno`) para transações de origem Visor.
3. Nova **estrutura do Vínculo de Autorização Visor** (por usuário) com estado e material de consentimento (armazenamento seguro/criptografado).
4. Novo valor do enum `TransactionSourceType` ("Visor") persistido como int (conversão já usada no map) — não destrutivo.

**Impacto em dados existentes?** Não destrutivo. Transações existentes recebem `MoedaOriginal = BRL`, `ValorOriginal = Amount`, taxa/data nulas, `IdentificadorExterno = null`. Nenhuma muda de origem nem de valor.

**Reversível?** Sim — migration EF Core Code-First gera up/down.

Comando de referência (ver `mz-finance-context.md#comandos`):
`dotnet ef migrations add AddVisorImportSupport -p backend/src/MzFinance.Infra -s backend/src/MzFinance.WebApi`

---

## 9. INTEGRAÇÕES

### 9.1. Sistemas Externos Afetados

- **Visor Finance (novo)** — **primeira integração externa do projeto**. Consumido como **cliente de um servidor MCP remoto**:
  - [ ] Consentimento **OAuth** (conectar / renovar / detectar expiração-revogação).
  - [ ] Operação **`get_transactions`** com filtros (intervalo de datas, tipo, categoria via slug próprio, incluir/excluir ignoradas, busca textual) e **paginação**.
  - Observação: `get_transactions` **não** retorna BRL nem taxa para estrangeiras (só moeda+valor originais).
- **Fonte de câmbio (nova)** — para converter moeda estrangeira → BRL pela taxa da data da transação (ex.: PTAX/Banco Central — a definir pelo Arquiteto):
  - [ ] Obter taxa moeda→BRL numa data específica.
  - [ ] Tratar cotação indisponível para a data (política — ver Handoff).

### 9.2. Alterações em Contratos

- **Novos endpoints** (conectar, estado, importar) — **aditivos**.
- **Extrato**: DTO de transação passa a incluir moeda/valor originais e taxa — **aditivo** (retrocompatível).
- **Enum de origem**: novo valor "Visor" — **aditivo**.

**Breaking change?** Não. Todas as mudanças de contrato são aditivas; migration não é destrutiva.

---

## 10. TRATAMENTO DE ERROS

### CE01 — Visor não conectado
- **Situação**: usuário tenta importar sem vínculo ativo.
- **Tratamento**: bloquear; guiar "Conectar Visor" (Notification Pattern).
- **Mensagem**: "Conecte sua conta do Visor para importar transações."

### CE02 — Vínculo expirado/revogado
- **Situação**: vínculo existia mas expirou/foi revogado.
- **Tratamento**: bloquear; orientar reconexão; não alterar dados.
- **Mensagem**: "Sua conexão com o Visor expirou. Reconecte para continuar importando."

### CE03 — Prazo obrigatório ausente/inválido
- **Situação**: intervalo de datas não informado ou `dataFinal < dataInicial`.
- **Tratamento**: validação falha; nenhuma chamada ao Visor.
- **Mensagem**: "Informe um período válido (data inicial e final) para importar."

### CE04 — Período sem transações
- **Situação**: filtros não retornam nada.
- **Tratamento**: não é erro; resumo zerado.
- **Mensagem (UI)**: "Nenhuma transação encontrada para importar neste período."

### CE05 — Falha/timeout do Visor durante o import
- **Situação**: Visor indisponível/lento ou falha ao paginar.
- **Tratamento**: abortar; rollback total; nada persistido.
- **Mensagem**: "Não foi possível concluir a importação do Visor. Nenhuma transação foi alterada. Tente novamente."

### CE06 — Cotação de câmbio indisponível
- **Situação**: fonte de câmbio sem taxa para a data de um item estrangeiro.
- **Tratamento**: aplicar a política definida (falhar a importação por atomicidade / cotação mais próxima / marcar revisão), sem persistir valor inválido silenciosamente; informar o usuário.
- **Mensagem**: "Não foi possível obter a cotação de {moeda} para {data}. {N} transação(ões) não foram importadas."

### CE07 — Usuário não autenticado
- **Situação**: requisição sem/ com JWT inválido.
- **Tratamento**: 401 pelo middleware existente.
- **Mensagem**: padrão do backend.

---

## 11. CASOS DE USO

### UC01: Importar transações do Visor

**Ator:** Usuário autenticado (dono do app)

**Pré-condições:** Usuário logado; vínculo com o Visor **ativo** (senão UC02 primeiro).

**Fluxo Principal:**
1. Na tela de Transações, o usuário aciona "Importar do Visor".
2. O modal abre com os filtros estruturados (categoria a partir das categorias do mz-finance).
3. O usuário informa o prazo (obrigatório) e, se quiser, tipo/categorias/incluir-ignoradas/busca.
4. Confirma a importação.
5. O sistema busca no Visor (paginando), converte estrangeiras para BRL, deduplica por id externo, **insere só as novas** de forma atômica.
6. O extrato é atualizado e o usuário vê o resumo (importadas / ignoradas / não-importadas por câmbio).

**Fluxos Alternativos:**
- **FA01 — Não conectado/expirado:** import bloqueado; guia para conectar/reconectar — CE01/CE02.
- **FA02 — Prazo ausente:** validação impede — CE03.
- **FA03 — Período vazio:** estado vazio, sem erro — CE04.
- **FA04 — Falha/timeout do Visor:** rollback total — CE05.
- **FA05 — Reimportação:** nenhuma duplicata; nada existente é alterado (insert-only) — RN05/RN06.
- **FA06 — Câmbio indisponível:** item(ns) tratados pela política; usuário informado — CE06.

### UC02: Conectar (ou reconectar) o Visor

**Ator:** Usuário autenticado

**Pré-condições:** Nenhuma (conectar) / vínculo expirado ou revogado (reconectar).

**Fluxo Principal:**
1. O usuário aciona "Conectar Visor".
2. O sistema conduz o consentimento OAuth.
3. O usuário autoriza; o backend valida e persiste o vínculo (Conectado).
4. A importação fica habilitada.

**Fluxos Alternativos:**
- **FA01 — Consentimento cancelado/falho:** vínculo não é criado; mensagem clara.

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: Import feliz cria transações com origem Visor (Happy Path)
**Dado** o Visor conectado e 3 transações BRL no período (2 despesas, 1 receita) inexistentes no mz-finance, com filtro tipo="ambos"
**Quando** o usuário importa
**Então** são criadas 3 `Transaction` com origem "Visor", tipos corretos; resumo = 3 importadas / 0 ignoradas.

### Cenário 2: Reimportação não duplica e não altera (insert-only)
**Dado** que essas 3 transações já foram importadas
**Quando** o usuário reimporta o mesmo período
**Então** nenhuma nova `Transaction` é criada e nenhuma existente é alterada; resumo = 0 importadas / 3 ignoradas-por-existirem.

### Cenário 3: Correção no Visor não é refletida (limitação do insert-only)
**Dado** que uma transação já importada teve a categoria alterada no Visor
**Quando** o usuário reimporta o período
**Então** a `Transaction` no mz-finance permanece como estava (não é atualizada) e o resumo a conta como ignorada-por-existir.

### Cenário 4: Edição manual é preservada na reimportação
**Dado** que o usuário editou manualmente uma transação importada (ex.: mudou a categoria)
**Quando** ele reimporta o período
**Então** a edição manual é preservada (a transação não é tocada).

### Cenário 5: Período sem transações (estado vazio)
**Dado** o Visor conectado e um período sem transações
**Quando** o usuário importa
**Então** nada é criado, sem erro, e a UI mostra estado vazio.

### Cenário 6: Prazo obrigatório ausente
**Dado** o modal aberto sem intervalo de datas
**Quando** o usuário tenta confirmar
**Então** ocorre erro de validação e nenhuma chamada é feita ao Visor.

### Cenário 7: Import bloqueado quando não conectado
**Dado** que não há vínculo ativo
**Quando** o usuário aciona a importação
**Então** o import é bloqueado e a UI orienta a conectar.

### Cenário 8: Vínculo expirado orienta reconexão
**Dado** que o vínculo expirou
**Quando** o usuário tenta importar
**Então** a UI orienta a reconectar; nada é importado nem alterado.

### Cenário 9: Moeda estrangeira convertida para BRL preservando o original
**Dado** uma transação do Visor de 105,91 USD e taxa USD→BRL da data disponível
**Quando** ela é importada
**Então** o `Amount` fica em BRL (105,91 × taxa), e ficam preservados valor original (105,91), moeda "USD" e a taxa aplicada com data de referência.

### Cenário 10: Transação em BRL não sofre conversão
**Dado** uma transação do Visor em BRL
**Quando** é importada
**Então** `Amount` = valor original, moeda "BRL", sem taxa aplicada.

### Cenário 11: Cotação indisponível para a data
**Dado** uma transação estrangeira cuja taxa para a data da transação não existe na fonte de câmbio
**Quando** a importação processa o item
**Então** o item não é persistido com valor inválido silenciosamente e o usuário é informado (nº de itens sem conversão), conforme a política definida, sem violar a atomicidade.

### Cenário 12: Toggle "incluir ignoradas"
**Dado** um período com 1 transação normal e 1 ignorada no Visor
**Quando** o usuário importa com o toggle desligado, é criada só a normal; **quando** importa de novo com o toggle ligado, a ignorada é criada e a normal não é duplicada.

### Cenário 13: Categoria ausente vira "Sem categoria"
**Dado** uma transação do Visor sem categoria
**Quando** é importada
**Então** a `Transaction` fica com categoria "Sem categoria".

### Cenário 14: Filtro de tipo = despesa importa só despesas
**Dado** um período com receitas e despesas e filtro tipo="despesa"
**Quando** o usuário importa
**Então** todas as criadas ficam com tipo Despesa e nenhuma receita é importada.

### Cenário 15: Falha/timeout do Visor é atômica
**Dado** um import de N transações que falha ao paginar na metade
**Quando** o erro ocorre
**Então** nenhuma das N é persistida, a UI mostra falha e uma nova tentativa não gera duplicatas.

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Código implementado seguindo Clean Architecture + CQRS (ver `mz-finance-context.md#arquitetura` e boilerplate `dotnet-api`)
- [ ] Cliente MCP do Visor e fonte de câmbio isolados atrás de portas (interfaces); falhas traduzidas em notificação de negócio
- [ ] Command de importação: dedup por id externo, **insert-only**, conversão de moeda estrangeira e **persistência atômica** (rollback em falha)
- [ ] Fluxo "Conectar Visor" (consentimento OAuth) + detecção de expiração/revogação e reconexão
- [ ] Migration `AddVisorImportSupport` criada e testada (colunas de moeda/valor/taxa/id externo, estrutura de vínculo, índice de dedup) — reversível e não destrutiva
- [ ] Novo valor de origem "Visor" no enum e refletido no extrato
- [ ] Frontend: botão + modal de filtros (categoria via categorias do mz-finance), estados (carregando/vazio/erro), resumo do resultado, e rastreabilidade de câmbio no extrato
- [ ] Testes unitários (xUnit + NSubstitute + EF InMemory): dedup/idempotência (RN05), insert-only e preservação de existentes/edições (RN06/C7/Cenários 2-4), atomicidade em falha (RN07), tipo por filtro (RN04), conversão de moeda (RN09) e câmbio indisponível (RN10), categoria ausente (RN08), bloqueio sem conexão (RN02)
- [ ] Credenciais/consentimento OAuth e chamadas de câmbio: dados sensíveis não logados; consentimento criptografado
- [ ] Autenticação exigida em todos os novos endpoints; dados escopados por usuário
- [ ] Build passando (`dotnet build` + `npm run build`)
- [ ] PRD atendido 100%

---

## 14. REFERÊNCIAS

- Contexto/arquitetura: `MAPS/mz-finance/mz-finance-context.md`
- Map do projeto: `MAPS/mz-finance/mz-finance-map.json`
- PRDs anteriores: `mz-finance-prd-000001-mvp.md`, `mz-finance-prd-002-tbd-dashboard-gerenciamento-financeiro.md`, `mz-finance-prd-003-tbd-redesign-frontend-fundacao-design-system.md`
- Código-fonte de referência:
  - `backend/src/MzFinance.Domain/Models/Transaction.cs`
  - `backend/src/MzFinance.Domain/Enums/{TransactionType,TransactionSourceType}.cs`
  - `backend/src/MzFinance.Infra/Maps/TransactionMap.cs`
  - `frontend/src/features/transactions/{TransactionsPage.tsx,api.ts}`
  - `frontend/src/shared/formatCurrency.ts`, `frontend/src/shared/ui/MoneyValue/MoneyValue.tsx`, `frontend/src/shared/api/categories`
- Boilerplate backend: `BOILERPLATES/BACK/dotnet-api/README.md`

---

## 15. OBSERVAÇÕES

**Riscos Identificados:**
- ⚠️ **Primeira integração externa do projeto** — introduz OAuth, cliente MCP remoto, timeout/resiliência e credenciais sensíveis num app até aqui 100% local/manual. Principal fator de complexidade 🔴.
- ⚠️ **Nova dependência de câmbio** — converter estrangeiras exige uma fonte externa de cotação (ex.: PTAX), com seu próprio contrato, disponibilidade e casos de cotação ausente. É uma segunda integração externa nascendo junto.
- ⚠️ **Correções do Visor não refletidas (insert-only)** — limitação conhecida e aceita: se o Visor corrigir uma transação já importada, o mz-finance não atualiza. Trade-off escolhido para preservar edições manuais e simplicidade.
- ⚠️ **Câmbio fixado no import** — a taxa é a da data da transação no momento do import; não há reconversão posterior. Cotações revistas depois não mudam o histórico.
- ⚠️ **Resolução de "ambos" (tipo)** — a listagem do Visor não traz sinal por linha; "ambos" precisa de estratégia técnica (Handoff).
- ⚠️ **Descompasso de categoria** — o filtro do Visor usa slugs próprios, mas o modal oferece categorias do mz-finance; casar os dois é decisão técnica (Handoff).
- ⚠️ **Atomicidade x janelas grandes / câmbio** — importar um período longo (muitos itens + muitas cotações) pode estourar timeout numa operação síncrona/transacional. Avaliar limite de janela ou assíncrono (RNF07). A política de câmbio-indisponível (C16) precisa ser reconciliada com o tudo-ou-nada (RN07).
- ⚠️ **Segurança OAuth** — tokens/consentimento são segredo; vazamento compromete a conta bancária agregada. Criptografia e ausência de log são bloqueadores.

**Dependências:**
- 🔗 Servidor MCP do Visor (`get_transactions`, filtros, paginação, consentimento OAuth) — dependência externa dura.
- 🔗 Fonte de câmbio (ex.: PTAX/Banco Central) — nova dependência externa.
- 🔗 PRD_000001 (MVP) — reutiliza `Transaction`, extrato e saldo.
- 🔗 PRD_003 (Design System) — o modal reaproveita `shared/ui`.

---

## 16. DECISÕES DE PRODUTO (registradas — 2026-07-06)

**Decididas pelo usuário:**
- **DP1** — **Política de reimport: INSERT-ONLY.** Reimportar nunca toca em transações existentes (dedup por id externo). Só insere as novas. Preserva 100% das edições manuais; correções do Visor pós-import **não** são refletidas (limitação conhecida). *(→ C6/C7, RN05/RN06)*
- **DP2** — **Deduplicação** pela chave do **id externo** do Visor. *(→ C6, RN05)*
- **DP3** — **Moeda: CONVERTER para BRL no import**, pela taxa da **data da transação**. Persistir `Amount` em BRL (para totais/saldo) e **preservar valor/moeda originais + taxa aplicada** como rastreabilidade. Requer **fonte de câmbio externa** (o Visor não fornece BRL nem taxa). Sem reconversão posterior. *(→ C9/C16, RN09/RN10; Não-Objetivos)*
- **DP4** — **Importação nunca apaga**: transação que sumiu do Visor permanece no mz-finance (coerente com o insert-only). *(→ C7/C13, RN13)*
- **DP5** — **Filtro de categoria usa as categorias do mz-finance** (não as do Visor). O descompasso com os slugs do Visor é resolução técnica do Arquiteto. *(→ C3, RN14)*
- **DP6** — Importação via **modal com filtros estruturados** (prazo obrigatório, tipo, categoria multiseleção, incluir ignoradas, busca). *(→ C3, RN03)*
- **DP7** — Transações importadas marcadas com **origem "Visor"** (rastreabilidade). *(→ C15, RN11)*
- **DP8** — **Transações ignoradas** só entram por escolha do usuário no toggle, por import. *(→ C10, RN12)*
- **DP9** — **Tipo** determinado pela fonte/filtro do Visor. *(→ C11, RN04)*
- **DP10** — **"Conectar Visor"** (consentimento OAuth) obrigatório antes do 1º import; vínculo pode expirar/ser revogado e exigir reconexão. *(→ C1/C2/C13, RN02)*
- **DP11** — **Atomicidade tudo-ou-nada** por execução de import; falha/timeout ⇒ rollback total. *(→ C14, RN07)* — proposta pelo PM, aceita pelo humano.
- **DP12** — Categoria ausente no Visor ⇒ **"Sem categoria"**. *(→ C12, RN08)* — proposta pelo PM, aceita pelo humano.
- **DP13** — Sem **preview** pré-import; há **resumo pós-import**. *(→ Não-Objetivos)* — proposta pelo PM, aceita pelo humano.

**Nenhuma dúvida de negócio residual em aberto.** As 5 dúvidas da versão 1 (D1–D5) foram respondidas pelo humano em 2026-07-06 e incorporadas acima.

---

## 17. NOTA DE HANDOFF PARA O ARQUITETO (`/planejar`)

O PRD define o **O QUÊ**; abaixo os **COMOs** deliberadamente não decididos:

1. **Cliente MCP remoto do Visor** — como o mz-finance (.NET 10) atua como **cliente MCP**: transporte, biblioteca/SDK, autenticação da sessão MCP pelo vínculo OAuth, chamada de `get_transactions` com filtros + **paginação** completa. Isolar atrás de uma porta na Application.
2. **Fluxo OAuth de consentimento** — modelagem do "Conectar Visor": endpoints de início/callback, obtenção do consentimento (redirect/deep-link), **armazenamento criptografado** do material de renovação, detecção de expiração/revogação.
3. **Fonte de câmbio (NOVO)** — qual fonte usar (ex.: **PTAX/Banco Central**), **qual taxa exata** (ex.: PTAX de venda, cotação de fechamento), como consultar por data, e o **comportamento quando a cotação da data não estiver disponível** (falhar o item / falhar toda a importação por atomicidade / usar a cotação mais próxima / marcar para revisão). Reconciliar essa política com o tudo-ou-nada (RN07). Isolar atrás de uma porta.
4. **Descompasso de categoria (NOVO)** — o filtro `category_slug` do `get_transactions` espera **slugs do Visor**, mas o modal oferece **categorias do mz-finance**. Resolver a estratégia: mapa categoria-local ↔ slug-Visor; **não** usar o filtro de categoria do Visor e filtrar **client-side** após buscar; ou aplicar o filtro só sobre transações já importadas. O critério (RN14) não presume a solução — apenas que o multiselect é populado localmente.
5. **Resolução de "ambos" no tipo** — como atribuir Receita/Despesa por linha quando a listagem do Visor não traz o sinal. Estratégia provável: **duas chamadas filtradas** (uma por tipo) e marcação por origem de cada resultado. Confirmar com o contrato real de `get_transactions`.
6. **Atomicidade x volume** — import como **uma transação de banco** (rollback total, insert-only). Avaliar limite de janela de datas ou processamento assíncrono/streaming se o volume (transações + cotações) puder ser grande (RNF07). Garantir idempotência de retry.
7. **Índice de deduplicação** — índice único filtrado em (`UserId`, `IdentificadorExterno`) para origem Visor vs. checagem só na aplicação; considerar corrida (baixa, usuário único) e portabilidade no PostgreSQL.
8. **Modelo de moeda no domínio/UI** — tipo dos campos (`MoedaOriginal` string ISO vs. enum; precisão de `TaxaCambioAplicada`/`ValorOriginal`), e como o extrato exibe a rastreabilidade de câmbio sem quebrar `formatCurrency`/`MoneyValue` (principal continua BRL).
9. **Mapeamento do payload do Visor** — campos do `get_transactions` → (tipo, valor original, moeda original, data, categoria-texto, descrição, id externo); tratamento de campos ausentes (categoria/moeda) conforme RN08/RN09.

---

## 18. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-07-06 | 1 | Product Manager (IA) | Versão inicial (com 5 dúvidas de negócio em aberto) |
| 2026-07-06 | 2 | Product Manager (IA) | Incorporadas as respostas do humano (D1–D5): reimport **insert-only** (não upsert); **conversão de moeda para BRL** entra no escopo (nova fonte de câmbio); importação nunca apaga; filtro de categoria usa categorias do mz-finance. Adicionados Não-Objetivos, critério de câmbio (C16) e câmbio-indisponível; status → PRONTO. |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
