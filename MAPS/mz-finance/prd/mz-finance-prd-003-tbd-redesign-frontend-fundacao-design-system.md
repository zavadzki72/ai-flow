# PRD: Redesign do Frontend — Fundação (Design System, Biblioteca de Componentes, Nova Navegação e Dashboard)

**Sequência**: 003
**Ticket**: TBD
**Versão**: 1
**Data**: 2026-07-02
**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO

**Metadados:**
- **Prioridade**: Alta
- **Complexidade**: 🟡 Média (1 repositório, ampla superfície de UI, nova lib de gráficos, sem mudança de schema/backend)
- **Repositório(s)**: frontend (`C:/Projects/Personal/mz-finance/frontend`) — **frontend-only, sem mudanças de API/backend**
- **Domínio(s)**: Camada de apresentação (UI/UX transversal) + Dashboard (leitura/relatórios). Nenhum domínio de negócio de backend é alterado.

---

## 1. VISÃO GERAL

### 1.1. Contexto

O mz-finance entregou nos PRDs 001 (MVP: CRUDs dos quatro compromissos financeiros + projeção de saldo) e 002 (Dashboard analítico + gasto por categoria + compras consolidadas + reagrupamento de navegação em "Gerenciamento") toda a **funcionalidade** de que o app precisa hoje. O problema agora é de **experiência**: o frontend usa um CSS placeholder (tema claro, accent roxo `#6d28d9`, `system-ui`), sem biblioteca de componentes (`shared/` contém apenas `formatCurrency` e `httpClient`), com telas fortemente orientadas a cadastro (formulário sempre aberto no topo + lista abaixo, com apenas criar e excluir) e uma navegação plana pouco hierárquica. Nas palavras do dev: "organização e como as coisas estão distribuídas está horroroso".

O dev forneceu um **Design System oficial** (base Binance, tema escuro near-black `#0b0e11` com accent amarelo `#FCD535`, tipografia Inter/IBM Plex como substitutas, verde/vermelho de "direção", tokens de espaçamento/radius/elevação — ver `docs/design/design-system.md`) e indicou o **Visor Finance** (https://visorfinance.app/) como inspiração de UX/layout para app de finanças pessoais. A demanda tem três frentes: (1) aplicar o Design System substituindo o CSS placeholder; (2) reorganizar a arquitetura de informação / navegação / distribuição das telas com foco em UX; (3) construir a biblioteca de componentes compartilhados que hoje não existe.

Para reduzir risco, o redesign foi **faseado**. Este PRD (003) cobre a **FUNDAÇÃO**; o redesign completo das telas de gerenciamento fica para um PRD posterior (ver §15, Roadmap / Fase 2).

### 1.2. Objetivo

Estabelecer a fundação visual e estrutural do novo frontend, entregando:

1. **Tema global dark** do Design System aplicado ao **app inteiro** (tokens de cor, tipografia, espaçamento, radius, elevação) — substituindo o placeholder, para que nenhuma tela fique "metade clara / metade escura".
2. **Biblioteca de componentes compartilhados** reutilizável em `frontend/src/shared/` (botões, inputs, cards, navegação, tabelas/listas, badges, tabs, modal/drawer, estados vazios, skeletons, feedback/toast, wrappers de gráfico), fiel aos tokens e componentes do Design System.
3. **Nova arquitetura de informação / navegação**, consolidando as seções em **quatro áreas** — Início · Lançamentos · Compromissos · Projeção — com navegação responsiva (sidebar/top no desktop, bottom nav no mobile), preservando 100% das funcionalidades e rotas atuais.
4. **Dashboard (Início) redesenhado** com os novos componentes e **visualização de dados** (donut de gasto por categoria, barras de comparativo mensal), estados vazios, loading skeletons e feedback — consumindo **apenas os endpoints já existentes** (`/api/dashboard/*`).

Escopo é **frontend-only**: nenhum endpoint novo, nenhuma mudança de contrato de API, nenhuma migration.

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Tema dark global aplicado ao app inteiro
**Dado** que o usuário está autenticado (ou na tela de login)
**Quando** ele acessa qualquer tela do app
**Então** a interface é renderizada sobre o canvas dark do Design System (`{colors.canvas-dark}` #0b0e11), com texto corrido em `{colors.body}` #eaecef, superfícies de card em `{colors.surface-card-dark}` #1e2329, hairlines em `{colors.hairline-on-dark}`, e accent primário amarelo `{colors.primary}` #FCD535
**E** o tema claro placeholder (fundo `#fafafa`, accent roxo `#6d28d9`) não aparece em nenhuma tela.

### Critério 2 — Tipografia do Design System
**Dado** que uma tela renderiza texto e valores numéricos
**Quando** o usuário a visualiza
**Então** o texto editorial (títulos, labels, corpo, botões, nav) usa a fonte substituta **Inter** (no lugar de BinanceNova) e os valores monetários/numéricos (saldos, totais, percentuais, valores de parcela) usam a fonte substituta tabular **IBM Plex Sans/Mono** (no lugar de BinancePlex)
**E** a hierarquia de tamanhos/pesos segue os tokens de `{typography.*}` (display 700, títulos 600, corpo 400).

### Critério 3 — Biblioteca de componentes compartilhados
**Dado** o novo shell de aplicação e o Dashboard redesenhado
**Quando** eles são construídos
**Então** eles consomem componentes reutilizáveis publicados em `frontend/src/shared/` (no mínimo: Button — primário amarelo / secundário / texto; Input/Select; Card; NavShell; NavItem; StatCard; Table/List row; Badge; Tabs; Modal/Drawer; EmptyState; Skeleton; Feedback/Toast; wrappers de gráfico), todos derivados dos tokens do Design System
**E** nenhum desses componentes hardcoda cores/tamanhos fora dos tokens (as cores vêm de CSS custom properties/tema centralizado).

### Critério 4 — Nova arquitetura de informação em quatro áreas
**Dado** que o usuário está autenticado
**Quando** ele olha a navegação principal
**Então** vê exatamente quatro áreas de alto nível: **Início** (Dashboard), **Lançamentos** (Transações + Recorrentes), **Compromissos** (Cartões + Financiamentos) e **Projeção**
**E** as áreas com dois conteúdos (Lançamentos, Compromissos) expõem sua sub-navegação (ex.: sub-abas/itens secundários) para chegar às telas existentes
**E** nenhuma funcionalidade ou rota do PRD 001/002 é removida — apenas reorganizada.

### Critério 5 — Navegação responsiva (desktop e mobile)
**Dado** que o usuário acessa o app em diferentes larguras de tela
**Quando** a largura está em desktop (≥ 1024px)
**Então** a navegação principal é apresentada em formato persistente (sidebar lateral ou top-nav), com as quatro áreas visíveis
**E quando** a largura está em mobile (< 768px)
**Então** a navegação principal colapsa para uma **bottom navigation** (barra inferior) com as quatro áreas, seguindo os breakpoints e a estratégia de colapso do Design System (§ Responsive Behavior)
**E** os alvos de toque respeitam o mínimo de 44×44px efetivos.

### Critério 6 — Dashboard redesenhado com cards e gráficos
**Dado** que existem dados no Dashboard (resumo mensal, gasto por categoria, compras parceladas)
**Quando** o usuário abre a tela Início
**Então** o resumo de gasto (mês passado / atual / próximo) é apresentado com os novos StatCards e um **gráfico de barras** de comparativo mensal
**E** o gasto por categoria é apresentado com um **gráfico de rosca (donut)** acompanhado da lista de categorias
**E** a visão consolidada de compras parceladas é apresentada como lista/tabela estilizada com os novos componentes
**E** todos os dados vêm exclusivamente dos endpoints já existentes (`/api/dashboard/summary`, `/api/dashboard/spending-by-category`, `/api/dashboard/installments`), sem nova chamada de backend.

### Critério 7 — Estados vazios, carregamento e feedback no Dashboard
**Dado** que uma seção do Dashboard está carregando, vazia ou falhou
**Quando** ela é renderizada
**Então** durante o carregamento é exibido um **skeleton** (não um texto "Carregando...")
**E** quando não há dados no período é exibido um **estado vazio** com mensagem clara (ex.: "Sem gastos neste período")
**E** em caso de erro é exibido um componente de **feedback** de erro reutilizável (não um `<p>` solto).

### Critério 8 — Semântica de cores financeira
**Dado** qualquer tela que exiba valores monetários e ações
**Quando** ela é renderizada
**Então** verde (`{colors.trading-up}`) e vermelho (`{colors.trading-down}`) são usados **exclusivamente** para direção financeira de valores (receita/positivo em verde, despesa/negativo em vermelho, variações), como cor de texto — nunca como fundo de card
**E** o amarelo (`{colors.primary}`) é usado para ações primárias (CTAs) e destaques de marca, nunca como cor de corpo ou de fundo de superfície
**E** estados de sucesso/erro de UI usam tons neutros/amarelo — verde/vermelho não são reaproveitados para "sucesso/erro" genéricos (regra do Design System, § Do's and Don'ts).

### Critério 9 — Telas de gerenciamento e Projeção herdam o tema base sem redesign
**Dado** que este PRD redesenha somente o shell + o Dashboard
**Quando** o usuário abre uma tela de Lançamentos (Transações/Recorrentes), Compromissos (Cartões/Financiamentos) ou Projeção
**Então** ela é renderizada coerentemente sobre o tema dark global (fundo, texto, inputs e botões básicos herdam os tokens), sem aparência quebrada ou remanescente do tema claro
**E** seu **layout** e suas interações permanecem os atuais (sem migração para modais/drawers, sem novos filtros) — o redesign completo dessas telas é a Fase 2 (§15).

### Critério 10 — Preservação de funcionalidades e sessão
**Dado** um usuário autenticado
**Quando** ele navega pelo app redesenhado
**Então** todas as rotas existentes (`/`, `/transactions`, `/recurring`, `/credit-cards`, `/financing`, `/projection`, `/login`) continuam acessíveis (diretamente e pela nova navegação), o `PrivateRoute`/redirect de rota inválida continuam funcionando, e o logout permanece disponível
**E** nenhuma chamada de API existente é alterada em contrato.

---

## 3. ESCOPO TÉCNICO

> Arquitetura frontend: React + TypeScript, estado de servidor via React Query, roteamento via react-router-dom, estilização por CSS Modules (restrição do projeto: **sem Tailwind**). O tema é implementado por **CSS custom properties (design tokens)** globais consumidas pelos CSS Modules dos componentes. Este PRD é 100% frontend.

### 3.1. Componentes a Alterar

**Fundação de tema**
- `frontend/src/index.css` — substituir o bloco de variáveis placeholder (tema claro/roxo) pela definição completa de **design tokens** do Design System (canvas/surface/text/hairline/trading/accent, tipografia, espaçamento, radius, elevação) como CSS custom properties globais; definir `color-scheme: dark`; importar/registrar as fontes Inter e IBM Plex.

**Shell de aplicação / navegação**
- `frontend/src/app/AppLayout.tsx` e `AppLayout.module.css` — reconstruir o shell para a nova IA de quatro áreas, com navegação responsiva (sidebar/top no desktop; bottom nav no mobile) usando os novos componentes compartilhados.
- `frontend/src/app/App.tsx` — manter as rotas existentes; ajustar apenas o agrupamento/estrutura de navegação (sub-rotas de Lançamentos/Compromissos podem ser expressas como áreas com sub-itens que apontam para as rotas atuais). Nenhuma rota é removida.

**Dashboard (Início) — redesign completo**
- `frontend/src/features/dashboard/DashboardPage.tsx` e `DashboardPage.module.css`
- `frontend/src/features/dashboard/components/SpendingSummaryCards.tsx` (+ `.module.css`)
- `frontend/src/features/dashboard/components/CategoryBreakdown.tsx` (+ `.module.css`)
- `frontend/src/features/dashboard/components/InstallmentsOverview.tsx` (+ `.module.css`)
  → reconstruídos sobre os novos componentes compartilhados e com os gráficos (donut/barras).

**Telas que apenas herdam o tema (sem redesign de layout)**
- `frontend/src/features/auth/LoginPage.*`, `transactions/TransactionsPage.*`, `recurring/RecurringPage.*`, `credit-cards/CreditCardsPage.*`, `financing/FinancingPage.*`, `projection/ProjectionPage.*` — ajuste mínimo para herdar corretamente os tokens globais (cores de fundo, texto, inputs e botões nativos coerentes com o tema dark). **Sem** reestruturação de layout, **sem** modais, **sem** novos filtros. Onde hoje há estilos que fixam cores do tema claro, remover/neutralizar para herdar o tema.

### 3.2. Componentes Novos

**Biblioteca de componentes compartilhados** — `frontend/src/shared/ui/` (nomes ilustrativos; estrutura final a critério do Arquiteto):
- **Ações**: `Button` (variantes `primary` amarelo/preto, `secondary`, `text`; estados default/active/disabled), botão de ícone.
- **Formulário**: `Input`, `Select`, `Field`/label — versão dark do Design System (`{component.text-input}` adaptado ao dark). *(usados pelo Dashboard; a migração das telas de CRUD para estes componentes é Fase 2.)*
- **Superfícies**: `Card` / `SurfaceCard`, `StatCard` (número de destaque em IBM Plex), `Panel`.
- **Navegação**: `NavShell` (layout responsivo), `NavItem`, `BottomNav`, `Tabs`/`SubNav`.
- **Dados**: `DataList` / `ListRow`, `Table`/`TableRow` (linha com divisória hairline), `Badge`, `MoneyValue` (aplica verde/vermelho conforme sinal e IBM Plex).
- **Sobreposições**: `Modal` / `Drawer` (primitivo reutilizável — disponibilizado nesta fase para uso do Dashboard e preparado para a Fase 2).
- **Estados**: `EmptyState`, `Skeleton` (variações de bloco/linha/card), `Feedback`/`Toast` (sucesso/erro/informativo em neutros/amarelo).
- **Gráficos**: wrappers `DonutChart`, `BarChart` (e, se aplicável, `LineChart`) — encapsulam a lib de gráficos escolhida pelo Arquiteto e recebem os tokens de cor como props/tema, mantendo o consumo desacoplado da lib.
- **Tema/tokens**: um módulo central de tokens (CSS custom properties + possíveis constantes TS) que sirva de fonte única para cores/tipografia/espaçamento usados pelos componentes.

### 3.3. Componentes Reutilizados (sem alteração)

- `frontend/src/shared/formatCurrency.ts` — formatação de moeda (pt-BR).
- `frontend/src/shared/api/httpClient.ts` — cliente HTTP (nenhuma mudança de contrato).
- `frontend/src/features/auth/authStorage.ts` e `frontend/src/app/PrivateRoute.tsx` — autenticação/sessão inalteradas.
- Todos os módulos `api.ts` de cada feature (`dashboard/api.ts`, etc.) — **sem alteração de assinatura**; o Dashboard consome exatamente os tipos/endpoints já existentes.

### 3.4. Fluxo de Dados

Nenhum fluxo de dados de negócio é criado ou alterado. O Dashboard redesenhado apenas **re-renderiza** dados já disponíveis:

```
1. Dashboard monta e dispara as leituras existentes (via React Query):
   - GET /api/dashboard/summary            → StatCards + gráfico de barras (comparativo mensal)
   - GET /api/dashboard/spending-by-category?year&month → donut + lista de categorias
   - GET /api/dashboard/installments?includeSettled     → lista/tabela de compras parceladas
2. Enquanto pendente: renderiza Skeletons nos respectivos blocos.
3. Em sucesso com dados: renderiza cards/gráficos/listas com os novos componentes.
4. Em sucesso sem dados (período vazio): renderiza EmptyState.
5. Em erro: renderiza componente Feedback de erro (reutilizável).
```

O seletor de mês do gasto por categoria e o toggle "incluir quitadas" das parceladas **permanecem** (mesma semântica de hoje), apenas reconstruídos com os novos componentes.

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos
Não aplicável. Nenhuma entidade de domínio é criada ou alterada (frontend-only).

### 4.2. Comandos / Queries / DTOs
Não aplicável no backend. No frontend, os tipos de resposta consumidos são os já definidos em `features/dashboard/api.ts` (`DashboardSummary`/`MonthlySpending`, `SpendingByCategory`, `InstallmentOverviewItem`) — reutilizados sem alteração.

### 4.3. Handlers / Services
Não aplicável (sem backend). No frontend, a lógica de apresentação deve manter a coleta de dados via React Query, sem introduzir estado global desnecessário.

### 4.4. Persistência
Não aplicável. Sem banco, sem migration, sem cache persistente novo além do já existente.

### 4.5. Validações (de apresentação/UX)
- **Tokens**: todo componente compartilhado consome cores/tipografia/espaçamento a partir dos tokens centrais — sem valores hex/px avulsos fora do token (exceto casos justificados).
- **Contraste/acessibilidade**: combinações texto/fundo devem atingir contraste legível sobre o canvas dark (mínimo AA para texto de corpo); foco de teclado visível (focus ring do Design System, `{colors.info}`).
- **Alvos de toque**: mínimo 44×44px efetivo em ações e itens de navegação no mobile.
- **Números**: valores monetários sempre com a fonte tabular (IBM Plex) e sinal/cor coerentes (verde receita/positivo, vermelho despesa/negativo).
- **Responsividade**: layout não pode quebrar (overflow horizontal indevido) entre os breakpoints Mobile (<768), Tablet (768–1024) e Desktop (≥1024) do Design System.

### 4.6. Autorização
Inalterada. Continua o esquema de usuário único com JWT self-issued (ver `mz-finance-context.md#arquitetura`). Todas as rotas protegidas continuam sob `PrivateRoute`. Nenhum novo perfil/role.

---

## 5. REGRAS DE NEGÓCIO / DESIGN

- **RN01** — O tema **dark** do Design System é aplicado a **todo** o app já nesta fase (canvas near-black, texto claro, accent amarelo). Não há tema claro nesta entrega (toggle light = roadmap).
- **RN02** — Fonte única de tokens: cores, tipografia, espaçamento, radius e elevação vêm dos tokens do Design System; componentes não hardcodam valores fora do token.
- **RN03** — Tipografia bipartida: texto editorial em **Inter**; valores numéricos/monetários em **IBM Plex** (tabular). Misturar (número em Inter, corpo em Plex) é violação do sistema.
- **RN04** — Verde/vermelho são **semânticos de direção financeira** (receita/despesa, saldo, variação), aplicados como cor de texto — **nunca** como fundo de card e **nunca** reaproveitados para sucesso/erro genéricos de UI.
- **RN05** — Amarelo (`{colors.primary}`) é reservado para ações primárias, destaques e marca; nunca como cor de corpo de texto nem preenchimento de grandes superfícies.
- **RN06** — A IA tem exatamente **quatro áreas**: Início · Lançamentos (Transações + Recorrentes) · Compromissos (Cartões + Financiamentos) · Projeção. Consolidação é organizacional; **nenhuma** funcionalidade é removida.
- **RN07** — Navegação **responsiva**: desktop com navegação persistente (sidebar/top), mobile com **bottom nav**, seguindo os breakpoints do Design System.
- **RN08** — O Dashboard consome **apenas** endpoints existentes; nenhuma chamada de backend nova, nenhum campo novo.
- **RN09** — Telas de CRUD e Projeção, nesta fase, **apenas herdam o tema base** — sem redesign de layout, sem modais/drawers, sem novos filtros (isso é Fase 2).
- **RN10** — Nenhuma mudança de contrato de API, nenhuma migration, nenhum novo endpoint (frontend-only, conforme decisão de escopo).

---

## 6. REQUISITOS FUNCIONAIS

- **RF01** — Aplicar o tema dark global (tokens do Design System) a todo o app, substituindo o placeholder.
- **RF02** — Registrar as fontes Inter (texto) e IBM Plex (números) e aplicá-las conforme os tokens de tipografia.
- **RF03** — Publicar a biblioteca de componentes compartilhados em `shared/` (ações, formulário, superfícies, navegação, dados, sobreposições, estados, gráficos).
- **RF04** — Reorganizar a navegação nas quatro áreas (Início, Lançamentos, Compromissos, Projeção) preservando rotas e funcionalidades.
- **RF05** — Prover navegação responsiva com bottom nav no mobile e navegação persistente no desktop.
- **RF06** — Redesenhar o Dashboard com StatCards, gráfico de barras (comparativo mensal), donut (gasto por categoria) e lista/tabela de compras parceladas.
- **RF07** — Prover, no Dashboard, estados vazios, loading skeletons e feedback de erro reutilizáveis.
- **RF08** — Garantir que Login, telas de CRUD e Projeção herdem coerentemente o tema dark sem redesign de layout.
- **RF09** — Manter todas as rotas, o `PrivateRoute`, o redirect de rota inválida e o logout funcionando.

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01** — Sem Tailwind (restrição do projeto); estilização por CSS Modules + design tokens (CSS custom properties).
- **RNF02** — Dados financeiros são sensíveis: não logar valores/categorias em texto puro (ver `mz-finance-context.md#restricoes-nao-funcionais`).
- **RNF03** — Build passando (`npm run build`) sem erros de TypeScript/lint.
- **RNF04** — Responsividade real nos três breakpoints do Design System, sem overflow horizontal indevido.
- **RNF05** — Acessibilidade básica: contraste AA para texto de corpo sobre dark, foco de teclado visível, alvos de toque ≥ 44px no mobile.
- **RNF06** — Performance adequada ao uso pessoal; a lib de gráficos escolhida não deve degradar de forma perceptível o carregamento do Dashboard (evitar bundles pesados desnecessários — decisão do Arquiteto).
- **RNF07** — Componentes compartilhados desacoplados da lib de gráficos (a lib fica encapsulada nos wrappers), para permitir troca futura.

---

## 8. SCHEMA / MIGRATIONS

**Migration necessária?** ☐ Sim ☑ Não

Frontend-only. Nenhuma alteração de banco, schema ou dados.

---

## 9. INTEGRAÇÕES

### 9.1. Sistemas Externos Afetados
Nenhum. O projeto não possui integrações externas (ver `mz-finance-context.md#integracoes-e-dependencias-externas`). A única "dependência externa" nova é uma **biblioteca de gráficos** (npm) a ser escolhida pelo Arquiteto — dependência de build do frontend, não integração de runtime.

### 9.2. Alterações em Contratos
Nenhuma. Todos os endpoints e contratos de API permanecem idênticos.

**Breaking change?** Não. Mudanças são exclusivamente de camada de apresentação. As rotas atuais permanecem válidas; a reorganização é de navegação/IA, não de contrato.

---

## 10. TRATAMENTO DE ERROS

### CE01 — Falha ao carregar uma seção do Dashboard
- **Situação**: uma das leituras (`summary`, `spending-by-category`, `installments`) falha.
- **Tratamento**: renderizar o componente de Feedback de erro (reutilizável) apenas na seção afetada, mantendo as demais funcionais; permitir nova tentativa (retry) quando aplicável.
- **Mensagem**: mensagem clara e não técnica (ex.: "Não foi possível carregar este bloco. Tente novamente.").

### CE02 — Período sem dados
- **Situação**: mês selecionado sem gastos / sem parceladas.
- **Tratamento**: renderizar EmptyState (não é erro).
- **Mensagem**: "Sem gastos neste período" / "Nenhuma compra parcelada em andamento".

### CE03 — Tela em largura não prevista
- **Situação**: viewport muito estreito/largo.
- **Tratamento**: layout responsivo deve degradar graciosamente (bottom nav no mobile; grid colapsa para 1 coluna); sem overflow horizontal.
- **Mensagem**: n/a (comportamento visual).

### CE04 — Sessão expirada durante navegação
- **Situação**: token inválido/expirado em uma chamada.
- **Tratamento**: comportamento atual preservado (redirect a `/login` via fluxo existente) — sem regressão introduzida pelo redesign.
- **Mensagem**: padrão atual.

---

## 11. CASOS DE USO

### UC01: Consultar o panorama financeiro no novo Dashboard

**Ator:** Usuário autenticado (dono do app)

**Pré-condições:** Usuário logado; há compromissos cadastrados.

**Fluxo Principal:**
1. Usuário faz login e cai na área **Início** (Dashboard) sobre o tema dark.
2. Enquanto os dados carregam, vê skeletons nos blocos.
3. Vê os StatCards de gasto (mês passado/atual/próximo) e o gráfico de barras comparativo.
4. Vê o donut de gasto por categoria com a lista ao lado; pode trocar o mês.
5. Vê a lista/tabela de compras parceladas; pode alternar "incluir quitadas".
6. Navega para outra área pela navegação (sidebar/top no desktop, bottom nav no mobile).

**Fluxos Alternativos:**
- **FA01 — Período vazio:** bloco correspondente mostra EmptyState.
- **FA02 — Erro em um bloco:** mostra Feedback de erro só naquele bloco; demais seguem funcionando.

### UC02: Navegar pela nova arquitetura de informação

**Ator:** Usuário autenticado

**Pré-condições:** Usuário logado.

**Fluxo Principal:**
1. Usuário vê as quatro áreas (Início, Lançamentos, Compromissos, Projeção).
2. Abre **Lançamentos** e escolhe entre Transações e Recorrentes (sub-navegação).
3. Abre **Compromissos** e escolhe entre Cartões e Financiamentos.
4. As telas abrem com o tema dark aplicado, layout atual preservado.

**Fluxos Alternativos:**
- **FA01 — Mobile:** navegação principal aparece como bottom nav; sub-navegação como abas dentro da área.

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: Tema dark global (Happy Path)
**Dado** um usuário autenticado
**Quando** ele percorre Início, Lançamentos, Compromissos e Projeção
**Então** todas as telas renderizam sobre o canvas dark com accent amarelo
**E** nenhuma tela exibe o fundo claro/accent roxo antigo.

### Cenário 2: Dashboard com gráficos e dados existentes
**Dado** dados de resumo, categorias e parceladas retornados pelos endpoints atuais
**Quando** o Dashboard carrega
**Então** exibe StatCards + barras (comparativo), donut + lista de categorias e a lista de parceladas
**E** não há nenhuma chamada a endpoint novo (apenas `/api/dashboard/*` existentes).

### Cenário 3: Estados de carregamento e vazio
**Dado** que as leituras do Dashboard estão pendentes
**Quando** a tela renderiza
**Então** cada bloco mostra skeleton
**E quando** um período não tem dados, o bloco mostra EmptyState.

### Cenário 4: Erro isolado por bloco
**Dado** que `spending-by-category` falha mas `summary` e `installments` funcionam
**Quando** o Dashboard renderiza
**Então** só o bloco de categorias mostra Feedback de erro; os demais funcionam normalmente.

### Cenário 5: Navegação responsiva
**Dado** o app em largura mobile (< 768px)
**Quando** o usuário navega
**Então** vê a bottom nav com as quatro áreas
**E** em desktop (≥ 1024px) vê a navegação persistente (sidebar/top).

### Cenário 6: Semântica de cores
**Dado** valores de receita e de despesa exibidos
**Quando** a tela renderiza
**Então** receita/positivo aparece em verde e despesa/negativo em vermelho (texto), enquanto CTAs usam amarelo
**E** nenhum card usa verde/vermelho como fundo, nem verde/vermelho é usado para sucesso/erro de UI.

### Cenário 7: Preservação de funcionalidades e rotas
**Dado** as rotas atuais (`/transactions`, `/recurring`, `/credit-cards`, `/financing`, `/projection`)
**Quando** acessadas direta ou pela nova navegação
**Então** abrem funcionando, com o tema dark herdado e layout atual preservado (sem redesign)
**E** login, `PrivateRoute`, redirect de rota inválida e logout continuam funcionando.

### Cenário 8: Biblioteca de componentes em uso
**Dado** o shell e o Dashboard redesenhados
**Quando** o código é revisado
**Então** eles consomem componentes de `shared/ui/` derivados dos tokens
**E** não há cores/tamanhos hardcoded fora dos tokens nesses componentes.

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Tokens do Design System definidos como fonte única (CSS custom properties globais) e aplicados a todo o app; placeholder claro/roxo removido
- [ ] Fontes Inter (texto) e IBM Plex (números) registradas e aplicadas conforme tokens de tipografia
- [ ] Biblioteca de componentes compartilhados publicada em `shared/` e consumida pelo shell + Dashboard
- [ ] Navegação reorganizada nas quatro áreas (Início, Lançamentos, Compromissos, Projeção), responsiva (bottom nav no mobile), preservando rotas
- [ ] Dashboard redesenhado com StatCards, barras, donut e lista de parceladas, consumindo apenas endpoints existentes
- [ ] Estados vazios, skeletons e feedback de erro reutilizáveis no Dashboard
- [ ] Semântica de cores respeitada (verde/vermelho só valores; amarelo só ações/marca; sem repurpose de sucesso/erro)
- [ ] Login, telas de CRUD e Projeção herdam o tema sem quebra e sem redesign de layout
- [ ] Responsividade validada nos três breakpoints; sem overflow horizontal indevido; alvos de toque ≥ 44px no mobile
- [ ] Contraste AA para texto de corpo e foco de teclado visível
- [ ] Nenhuma mudança de contrato de API / backend / schema
- [ ] Build passando (`npm run build`) sem erros
- [ ] Dados sensíveis não logados
- [ ] PRD atendido 100%

---

## 14. REFERÊNCIAS

- Design System oficial: `MAPS/mz-finance/docs/design/design-system.md`
- Inspiração de UX/layout: Visor Finance — https://visorfinance.app/
- Contexto de negócio/arquitetura: `MAPS/mz-finance/mz-finance-context.md`
- Map do projeto: `MAPS/mz-finance/mz-finance-map.json`
- PRDs anteriores: `MAPS/mz-finance/prd/mz-finance-prd-000001-mvp.md`, `MAPS/mz-finance/prd/mz-finance-prd-002-tbd-dashboard-gerenciamento-financeiro.md`
- Código-fonte de referência:
  - `frontend/src/index.css` (tokens placeholder a substituir)
  - `frontend/src/app/{App.tsx,AppLayout.tsx,AppLayout.module.css}` (shell/navegação atual)
  - `frontend/src/features/dashboard/{DashboardPage.tsx,api.ts,components/*}` (Dashboard a redesenhar)
  - `frontend/src/shared/{formatCurrency.ts,api/httpClient.ts}` (base compartilhada atual)

---

## 15. OBSERVAÇÕES

### Premissas adotadas (respostas do orquestrador; podem ser revisadas pelo dev)

O humano estava ausente; o orquestrador adotou as recomendações do Product Manager. Registradas como premissas revisáveis:

1. **Faseamento** — Redesign **faseado**. Este PRD (003) = **Fase 1 / Fundação**: tema global aplicado ao app inteiro, biblioteca de componentes compartilhados, nova navegação/IA e Dashboard redesenhado. As telas de CRUD apenas **herdam** o tema base sem redesign de layout.
2. **Tema** — **Dark-only** em todo o app. Toggle light = roadmap.
3. **Responsivo** — Desktop e mobile **igualmente prioritários**, com **bottom nav** no mobile, seguindo breakpoints do Design System.
4. **Arquitetura de informação** — Consolidar em **quatro áreas**: Início · Lançamentos (transações + recorrentes) · Compromissos (cartões + financiamentos) · Projeção. 100% das funcionalidades preservadas.
5. **Escopo UX** — Re-skin + melhorias de UX usando **apenas endpoints existentes** (estados vazios, skeletons, filtros/busca client-side, formulários em modais/drawers, feedback). **Sem** mudanças de backend. (Nesta Fase 1, essas melhorias se materializam no Dashboard e nos primitivos compartilhados; a aplicação plena às telas de CRUD é Fase 2.)
6. **Data-viz** — Introduzir gráficos: **donut** (gasto por categoria), **barras** (comparativo mensal). O **line/projeção** de saldo depende da tela de Projeção (Fase 2) — ver Handoff. Lib a critério do Arquiteto.
7. **Cores** — Verde/vermelho **exclusivamente** para valores/direção financeira; amarelo para ações primárias; sucesso/erro de UI em neutros/amarelo (regra do DS).

### O que fica de FORA deste PRD (Fase 2 — futuro)

- **Redesign completo das telas de gerenciamento** (Lançamentos: Transações/Recorrentes; Compromissos: Cartões/Financiamentos): migração dos formulários para modais/drawers, filtros/busca client-side, listas/tabelas ricas, estados vazios/skeletons por tela, feedback de sucesso/erro por ação — tudo usando os componentes compartilhados criados na Fase 1 e **apenas endpoints existentes**.
- **Redesign completo da tela de Projeção** (a "magic moment"), incluindo o **gráfico de linha** de evolução de saldo (que exige série temporal — ver Handoff).
- **Toggle de tema light** e superfícies transacionais light do Design System.
- **Novas funcionalidades** que exijam backend (ex.: editar transação/compra — hoje só há criar/excluir).

### Riscos Identificados

- ⚠️ **Amplitude do tema global** — aplicar tokens a todo o app pode expor estilos que fixam cores do tema claro nas telas de CRUD; garantir que herdem os tokens sem "vazamento" do tema antigo (Critério 9). Risco de aparência quebrada se algum CSS Module fixar cores hardcoded.
- ⚠️ **Adoção da lib de gráficos** — nova dependência de build; risco de bundle pesado e de acoplamento. Mitigação: encapsular em wrappers (`DonutChart`/`BarChart`) desacoplados (RNF07).
- ⚠️ **Fontes substitutas** — Inter/IBM Plex no lugar de BinanceNova/BinancePlex; ajustar line-height dos títulos (~-3%) conforme nota do Design System para não "afrouxar" a hierarquia.
- ⚠️ **Fidelidade a referência subjetiva** — "melhorar consideravelmente" é qualitativo; os critérios BDD e a DoD servem de âncora objetiva, mas convém validar o resultado visual com o dev antes de fechar.
- ⚠️ **Regressão de navegação/rotas** — reorganizar a IA sem quebrar `PrivateRoute`, redirect `*` e deep-links das rotas atuais (Critério 10).

### Dependências

- 🔗 PRD 001 (MVP) e PRD 002 (Dashboard) — reutiliza rotas, endpoints e tipos já entregues.
- 🔗 Design System oficial (`docs/design/design-system.md`) — fonte dos tokens/componentes.
- 🔗 Biblioteca de gráficos (npm) — a ser escolhida pelo Arquiteto (ver Handoff).

### Nota de Handoff para o Arquiteto (dúvidas técnicas em aberto — "COMO")

Decisões deliberadamente deixadas para a fase de planejamento/arquitetura (fora do escopo "O QUÊ" deste PRD):

1. **Lib de gráficos** — escolher a biblioteca (ex.: Recharts, Chart.js/react-chartjs-2, visx, Nivo, ou SVG próprio) equilibrando peso de bundle, fidelidade aos tokens do DS e ausência de dependência de Tailwind. Encapsular em wrappers desacoplados (RNF07).
2. **Fontes substitutas** — estratégia de carregamento de **Inter** e **IBM Plex** (self-host vs. CDN vs. `@fontsource`), pesos necessários, e ajuste de line-height (~-3%) conforme nota do DS. Confirmar qual variante IBM Plex para números (Plex Sans tabular vs. Plex Mono).
3. **Modelo de tokens** — formato da fonte única de design tokens (CSS custom properties globais em `index.css` e/ou constantes TS espelhadas) e convenção de nomes; como os CSS Modules e os wrappers de gráfico consomem esses tokens.
4. **Modelo de navegação desktop** — sidebar lateral persistente vs. top-nav; e como expressar a sub-navegação de Lançamentos/Compromissos (sub-itens no menu vs. abas na área) sem alterar as rotas atuais.
5. **Roteamento da nova IA** — manter os paths atuais (`/transactions`, `/recurring`, `/credit-cards`, `/financing`) e apenas reagrupar na navegação, ou introduzir rotas-área (`/lancamentos`, `/compromissos`) com redirecionamentos — sem quebrar deep-links nem `PrivateRoute`.
6. **Gráfico de linha da Projeção** — o endpoint atual de projeção retorna um único ponto (data-alvo) com breakdown, não uma série temporal. Decidir se (a) fica integralmente na Fase 2 (redesign da tela de Projeção), ou (b) um mini-sparkline entra já no Dashboard computando N pontos via múltiplas chamadas client-side ao endpoint existente. **Sem** criar endpoint novo nesta fase.
7. **Primitivo de Modal/Drawer** — definir a base (biblioteca acessível vs. implementação própria) já nesta fase, pois será a fundação da migração de formulários da Fase 2.
8. **Estratégia de teste de frontend** — o projeto ainda não decidiu framework de teste de frontend (ver `mz-finance-context.md#testes`); avaliar se este redesign é o gatilho para introduzir testes de componente/visual.

---

## 16. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-07-02 | 1 | Product Manager (IA) | Versão inicial — Fase 1 (Fundação) do redesign de frontend |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
