# Plano de Execução: Redesign do Frontend — Fundação (Design System, Biblioteca de Componentes, Nova Navegação e Dashboard)

## Informações
- **PRD Relacionado**: prd/mz-finance-prd-003-tbd-redesign-frontend-fundacao-design-system.md
- **Repositório(s)**: frontend (`C:/Projects/Personal/mz-finance/frontend`) — **frontend-only, sem backend/schema**
- **Domínio(s)**: Camada de apresentação (UI/UX transversal) + Dashboard (leitura)
- **Branch Base**: main
- **Branch de Trabalho**: `feature/redesign-frontend-fundacao`
- **Complexidade**: 🟡 Média (ampla superfície de UI; nenhuma mudança de API/schema)
- **Criado em**: 2026-07-02
- **Última atualização**: 2026-07-03 (higiene pós-code-review: checkboxes, correção de nota de handoff, decisão do PM, dívidas de Fase 2)

---

## PROGRESSO GERAL

**Status**: 🟢 Concluído
**Progresso**: 11/11 etapas concluídas (100%)

```
[🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢] 100%
```

> Este progresso será atualizado automaticamente pelo skill `/implementar`.

---

## VISÃO GERAL

Este PLAN executa a **Fase 1 (Fundação)** do redesign: aplica o Design System dark (base Binance) ao
app inteiro, cria a biblioteca de componentes compartilhados que hoje não existe, reorganiza a
navegação em 4 áreas com responsividade (sidebar desktop + bottom nav mobile) e redesenha o Dashboard
com gráficos — tudo **frontend-only**, sobre os endpoints já existentes.

**Fonte de verdade = o código real.** A exploração revelou dois fatos que guiam o PLAN:

1. **Não há React Query.** `package.json` só tem `react`, `react-dom`, `react-router-dom`. Todas as
   features buscam dados com `useState`/`useEffect` + `shared/api/httpClient`. O PRD menciona React Query
   (§3.3/§4.3), mas o código o supera — mantemos o padrão real (`useState`/`useEffect`). Introduzir
   React Query seria mudança de infra fora do escopo (ver Decisão Técnica 9; consistente com a Decisão 5
   do PLAN 002).
2. **As telas já consomem tokens CSS globais.** Varredura em todos os `*.module.css`: praticamente tudo
   usa `var(--surface)`, `var(--border)`, `var(--text)`, `var(--text-muted)`, `var(--accent)`,
   `var(--danger)`. Hardcode existe em pouquíssimos pontos: `color: white` em botões de accent (6
   arquivos) e `color: #15803d` (verde de receita, em Transactions e Recurring). Isso torna a **herança
   de tema de baixo risco**: remapear os tokens legados para valores dark no `index.css` faz todas as
   telas antigas ficarem dark automaticamente; só os poucos hardcodes precisam de ajuste pontual.

**Estratégia arquitetural (ver ADRs 0001-0004):**
- Tokens do DS como **CSS custom properties globais** (fonte única), com **aliases legados** apontando
  para os valores dark → telas herdam sem churn (ADR 0001).
- Fontes **Inter + IBM Plex self-hosted via `@fontsource`** (ADR 0002).
- Gráficos em **SVG próprio** encapsulado (donut + barras); sem lib, sem peso de bundle, wrappers
  desacoplados (ADR 0003).
- Modal/Drawer sobre **`<dialog>` nativo** (ADR 0004).
- **Sem novas rotas**: as 4 áreas são um conceito de navegação computado a partir dos paths atuais; os
  paths (`/`, `/transactions`, `/recurring`, `/credit-cards`, `/financing`, `/projection`) ficam
  intactos → deep-links e `PrivateRoute` preservados (Decisão Técnica 5).

**Ordem de execução (validada por dependência real):** tokens/tema/fontes → primitivos compartilhados
(por concern) → shell/navegação nova → Dashboard redesenhado → varredura de consistência nas telas
herdadas. Os primitivos (ETAPAS 2-8) dependem só da ETAPA 1 e entre si são independentes (o `tsc` do
projeto checa arquivos não importados, então cada primitivo compila isolado); o shell (9) e o Dashboard
(10) consomem os primitivos; a varredura (11) depende só da ETAPA 1.

---

## OBJETIVOS

- [x] Tema dark do DS aplicado ao app inteiro via tokens (CSS custom properties), placeholder claro/roxo removido (RF01/Critério 1).
- [x] Fontes Inter (texto) e IBM Plex (números tabulares) registradas e aplicadas por token (RF02/Critério 2).
- [x] Biblioteca de componentes em `shared/ui/` derivada dos tokens, consumida por shell + Dashboard (RF03/Critério 3).
- [x] Navegação em 4 áreas (Início · Lançamentos · Compromissos · Projeção), responsiva (bottom nav mobile), sem remover rotas (RF04/RF05/Critérios 4-5).
- [x] Dashboard redesenhado com StatCards, barras (comparativo), donut (categorias) e lista de parceladas, só endpoints existentes (RF06/Critério 6).
- [x] Estados vazios, skeletons e feedback de erro reutilizáveis no Dashboard (RF07/Critério 7).
- [x] Semântica de cores respeitada: verde/vermelho só direção; amarelo só ação/marca (Critério 8/RN04-05).
- [x] Login/CRUD/Projeção herdam o tema dark sem redesign de layout (RF08/Critério 9).
- [x] Rotas, `PrivateRoute`, redirect `*` e logout preservados; nenhum contrato de API alterado (RF09/Critério 10).
- [x] `npm run build --prefix frontend` e `npm run lint --prefix frontend` verdes ao fim de cada etapa (RNF03).

---

## MAPA DE COMPONENTES IDENTIFICADOS

> Estrutura da biblioteca: `frontend/src/shared/ui/<Componente>/<Componente>.tsx` + `.module.css`,
> com um barrel opcional `frontend/src/shared/ui/index.ts` (re-export). Tokens de paleta de gráfico em
> `frontend/src/shared/ui/charts/palette.ts` (lista de nomes de custom properties — ver ADR 0001).

### Fundação de tema
- `frontend/src/index.css` (alterado — tokens DS + aliases legados + fontes + base dark)
- `frontend/src/main.tsx` (possivelmente alterado — imports de `@fontsource` se não via `index.css`)
- `frontend/package.json` (alterado — deps `@fontsource-variable/inter`, `@fontsource/ibm-plex-sans`)

### Primitivos compartilhados (novos) — `frontend/src/shared/ui/`
- Ações: `Button/`, `IconButton/`, `icons/` (SVG inline), `Badge/`
- Superfícies: `Card/` (SurfaceCard/Panel), `StatCard/`, `MoneyValue/`
- Formulário: `Field/`, `Input/`, `Select/`
- Dados: `DataList/` (ListRow), `Table/` (TableRow), `Tabs/` (SubNav)
- Estados: `EmptyState/`, `Skeleton/`, `Feedback/`
- Sobreposições: `Modal/` (+ Drawer) — sobre `<dialog>` nativo
- Gráficos: `charts/DonutChart.tsx`, `charts/BarChart.tsx`, `charts/palette.ts`

### Shell / navegação
- `frontend/src/app/AppLayout.tsx` + `AppLayout.module.css` (reconstruídos — NavShell responsivo)
- `frontend/src/app/App.tsx` (inalterado nas rotas — conferir apenas; ver Decisão Técnica 5)

### Dashboard (redesign)
- `frontend/src/features/dashboard/DashboardPage.tsx` + `.module.css` (alterados)
- `frontend/src/features/dashboard/components/SpendingSummaryCards.tsx` + `.module.css` (alterados)
- `frontend/src/features/dashboard/components/CategoryBreakdown.tsx` + `.module.css` (alterados)
- `frontend/src/features/dashboard/components/InstallmentsOverview.tsx` + `.module.css` (alterados)
- `frontend/src/features/dashboard/api.ts` (inalterado — reutilizado)

### Telas que só herdam o tema (ajuste mínimo de CSS)
- `frontend/src/features/auth/LoginPage.module.css`
- `frontend/src/features/transactions/TransactionsPage.module.css`
- `frontend/src/features/recurring/RecurringPage.module.css`
- `frontend/src/features/credit-cards/CreditCardsPage.module.css`
- `frontend/src/features/financing/FinancingPage.module.css`
- `frontend/src/features/projection/ProjectionPage.module.css`

### Reutilizados sem alteração
- `frontend/src/shared/formatCurrency.ts`, `frontend/src/shared/api/httpClient.ts`
- `frontend/src/features/auth/authStorage.ts`, `frontend/src/app/PrivateRoute.tsx`
- Todos os `features/*/api.ts` (contratos idênticos)

---

## ESTRATÉGIA DE TESTES

O projeto **não tem framework de teste de frontend** e este PLAN **não introduz um** (ver Decisão
Técnica 8 — escopo/consistência com o PLAN 002). Validação de cada etapa:

- **Build**: `npm run build --prefix frontend` (executa `tsc -b && vite build`) — 0 erros.
- **Lint**: `npm run lint --prefix frontend` (oxlint) — sem novos erros/warnings.
- **Verificação manual** contra os Cenários do PRD (§12) e Critérios (§2), rodando `npm run dev` e
  navegando em larguras desktop (≥1024) e mobile (<768).

Cenários do PRD a verificar manualmente ao longo das etapas:
- [ ] Cenário 1 — tema dark global em todas as telas; sem fundo claro/roxo remanescente.
- [ ] Cenário 2 — Dashboard: StatCards + barras + donut + lista de parceladas; só `/api/dashboard/*`.
- [ ] Cenário 3 — skeletons no loading; EmptyState em período sem dados.
- [ ] Cenário 4 — erro isolado por bloco (só o bloco que falhou mostra Feedback).
- [ ] Cenário 5 — bottom nav no mobile; navegação persistente no desktop.
- [ ] Cenário 6 — verde/vermelho só em valores; amarelo só em CTAs; sem verde/vermelho de fundo.
- [ ] Cenário 7 — rotas atuais acessíveis; `PrivateRoute`/redirect `*`/logout OK; layout de CRUD preservado.
- [ ] Cenário 8 — shell e Dashboard consomem `shared/ui/`; sem cores/tamanhos hardcoded fora dos tokens.

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Fundação — tokens do DS, tema dark global e fontes

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 97a60cd

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `frontend/src/index.css` reescrito com todos os tokens semânticos do DS (cores de superfície/texto/
  marca/semântica financeira/info, tipografia — famílias `--font-sans`/`--font-number` + tokens de
  tamanho/peso/line-height por papel do DS: `--text-{role}-size/weight/line-height` para
  hero/display-lg/md/sm, title-lg/md/sm, number-display/md/sm, body-md/sm, caption, button, nav-link —,
  espaçamento `--space-xxs..section`, radius `--radius-xs..pill`, `--focus-ring`).
- Aliases legados (`--text`, `--text-muted`, `--bg`, `--surface`, `--border`, `--accent`, `--danger`,
  `--sans`) remapeados para os tokens dark — telas antigas herdam automaticamente (confirmado via
  `npm run dev`: CSS resolvido pelo Vite serve os novos tokens sem erro).
- Fontes self-hosted via `@import` no topo do `index.css`: `@fontsource-variable/inter` (family `Inter
  Variable`) e `@fontsource/ibm-plex-sans` pesos 500/600/700 (family `IBM Plex Sans`) — nomes confirmados
  via inspeção dos arquivos instalados (`npm view` + leitura dos `.css` gerados). `main.tsx` não precisou
  de alteração (import via CSS, não via TS).
- `color-scheme: dark`, `body`/`#root` com fundo/texto globais, reset de `box-sizing`/`button` mantido do
  arquivo original, `:focus-visible` usando `--focus-ring` (novo — antes não havia foco visível global).
- Reduzido em ~-3% o line-height dos 4 papéis "display" (hero, display-lg/md/sm) em relação aos valores
  do DS, conforme a nota do ADR 0002 (substituição de BinanceNova por Inter).
- Deps de fonte adicionadas ao `package.json`/`package-lock.json` (`npm install`, conforme Ponto de
  Atenção 8 do PLAN — lock estava com resíduo do PLAN 002, agora limpo pelo install desta etapa).
- Testes/critérios: `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix
  frontend` (oxlint) verdes; verificação manual via `npm run dev` — HTML/CSS servidos corretamente com
  os `@font-face` e tokens dark resolvidos (sem acesso a browser real neste ambiente para captura visual;
  recomenda-se conferência visual rápida pelo dev ao rodar `npm run dev` localmente).
- Nenhuma dúvida em aberto. Armadilha "botões de accent com `color: white` sobre amarelo" (ETAPA 11)
  segue válida e não foi tocada nesta etapa, como esperado.

**Objetivo:** Estabelecer a fonte única de tokens e virar o app inteiro para dark, fazendo as telas
antigas herdarem o tema sem edição individual (ADR 0001/0002; RF01/RF02; Critérios 1/2; base do 9).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/package.json` (alterado — adicionar deps de fonte)
- `frontend/src/index.css` (reescrito)
- `frontend/src/main.tsx` (alterado se os imports de fonte forem via TS)

**O que implementar:**
- Adicionar dependências de fonte (self-host): `@fontsource-variable/inter` e
  `@fontsource/ibm-plex-sans` (pesos 500/600/700). Confirmar nomes/pesos no install
  (`npm view ...`) — ver nota de verificação no ADR 0002.
- Reescrever `index.css` com, em `:root`:
  - **Cores DS** (custom properties semânticas): `--color-canvas` (#0b0e11),
    `--color-surface-card` (#1e2329), `--color-surface-elevated` (#2b3139),
    `--color-hairline` (#2b3139), `--color-body` (#eaecef), `--color-muted` (#707a8a),
    `--color-muted-strong` (#929aa5), `--color-on-dark` (#ffffff), `--color-primary` (#FCD535),
    `--color-primary-active` (#f0b90b), `--color-primary-disabled` (#3a3a1f),
    `--color-on-primary` (#181a20), `--color-up` (#0ecb81), `--color-down` (#f6465d),
    `--color-info` (#3b82f6).
  - **Tipografia**: `--font-sans` (Inter Variable + fallback do DS),
    `--font-number` (IBM Plex Sans + fallback), e tokens de tamanho/peso/line-height cobrindo os
    papéis do DS (display 700, títulos 600, corpo 400, números 500-700). Títulos display com
    line-height ~-3% (nota do DS).
  - **Espaçamento** (`--space-xxs` 4 … `--space-section` 80), **radius** (`--radius-xs` 2 …
    `--radius-pill` 9999), **elevação** (foco `--focus-ring` = `0 0 0 2px` sobre `--color-info` a ~50%).
  - **Aliases legados** remapeados aos valores dark (para herança das telas antigas, ADR 0001):
    `--text: var(--color-body)`, `--text-muted: var(--color-muted)`, `--bg: var(--color-canvas)`,
    `--surface: var(--color-surface-card)`, `--border: var(--color-hairline)`,
    `--accent: var(--color-primary)`, `--danger: var(--color-down)`, `--sans: var(--font-sans)`.
  - `color-scheme: dark`; `body`/`#root` com `background: var(--color-canvas)` e
    `color: var(--color-body)`; reset de `box-sizing`, `button` (font inherit, cursor), foco visível.
- Importar os CSS de `@fontsource` (via `@import` no topo do `index.css` ou imports em `main.tsx`).

**Testes Necessários:**
- [x] `npm run build` compila com as novas deps e o CSS reescrito.
- [ ] Ao rodar `dev`, o app aparece dark em todas as telas (inclusive CRUD/Login herdando via aliases). *(validação visual em browser real — pendente, ver nota de handoff)*

**Critérios de Aceitação:**
- [x] Nenhuma tela mostra o fundo claro/accent roxo antigo (Critério 1).
- [x] Corpo em Inter; base pronta para números em IBM Plex (Critério 2).
- [x] `npm run build` e `npm run lint` verdes.

**Dependências:** Nenhuma

**Comandos Úteis:** `npm install --prefix frontend`, `npm run build --prefix frontend`, `npm run lint --prefix frontend`

> ⚠️ Entre esta etapa e a ETAPA 11, alguns botões de CRUD ficam com `color: white` sobre amarelo
> (herança do alias `--accent`) — é uma imperfeição **visual**, não quebra build. A ETAPA 11 corrige.

---

### ETAPA 2: Primitivos — Ações (Button, IconButton, ícones, Badge)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 859daa7

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `Button` (`shared/ui/Button/`): variantes `primary`/`secondary`/`text` via `Record<ButtonVariant, string>`
  mapeado às classes do CSS Module; estende `ButtonHTMLAttributes<HTMLButtonElement>` (props nativas
  encaminhadas, `type="button"` por padrão). `primary` = fundo `--color-primary` + texto
  `--color-on-primary` (preto, nunca branco — RN05); `secondary` = `--color-surface-card` + hairline;
  `text` = transparente, texto `--color-primary`. Estado `:active` (press) usa `--color-primary-active`/
  `--color-surface-elevated`; `disabled` usa `--color-primary-disabled`/`--color-muted`. Sem hover (DS só
  documenta default/active). `min-height: 40px` em todas as variantes (alvo de toque).
- `IconButton` (`shared/ui/IconButton/`): quadrado 40×40 no desktop, 44×44 em `<768px` (media query);
  **exige `aria-label`** via tipo (`Omit<ButtonHTMLAttributes<...>, 'aria-label'> & { 'aria-label': string }`)
  para acessibilidade de botão só-ícone; recebe o ícone como `children`.
- `icons/`: 8 componentes SVG inline (`HomeIcon`, `ReceiptIcon`, `CardsIcon`, `ChartIcon`,
  `ChevronLeftIcon`, `ChevronRightIcon`, `CloseIcon`, `MenuIcon`), estilo stroke-based (`fill="none"
  stroke="currentColor"`), `viewBox 0 0 24 24`, prop `size` (default 20) controla `width`/`height`,
  `aria-hidden="true"` (assumem rótulo do `IconButton`/contexto que os envolve). Tipo `IconProps`
  isolado em `icons/types.ts` (não misturado a arquivo de componente — nota 3 do PLAN/oxlint).
  `icons/index.ts` é barrel puro de re-export.
- `Badge` (`shared/ui/Badge/`): pill (`--radius-pill`), variantes `neutral` (`--color-surface-elevated`/
  `--color-muted-strong`) e `accent` (`--color-primary`/`--color-on-primary`) — **sem** verde/vermelho
  (RN04). Vai substituir o badge "Projeção" hoje hardcoded (`background: var(--accent); color: white`)
  no Dashboard, mas essa substituição fica para a ETAPA 3/10 (fora do escopo desta etapa).
- `shared/ui/index.ts`: barrel geral, re-exporta os 4 primitivos + tipos (`export type`, conforme
  `verbatimModuleSyntax`) + os 8 ícones.
- Nenhum componente ainda tem consumidor (shell/Dashboard só chegam nas ETAPAS 9/10) — `tsc -b` e oxlint
  passam mesmo sem uso, como esperado (nota de handoff do PLAN, item 2).
- Zero cor/tamanho hex hardcoded fora de token nos novos arquivos (confirmado via grep); as únicas
  medidas literais são as dimensões de componente que o próprio DS especifica em px (altura 40px do
  botão, alvo 44px mobile do IconButton) — não há token de "altura de componente" na ETAPA 1 para
  referenciar.
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint —
  "Found 0 warnings and 0 errors") verdes.
- Nenhuma dúvida em aberto.

**Objetivo:** Publicar os componentes de ação do DS, base de CTAs e navegação (Critério 3; `button-primary`).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/shared/ui/Button/Button.tsx` + `Button.module.css` (novos)
- `frontend/src/shared/ui/IconButton/IconButton.tsx` + `IconButton.module.css` (novos)
- `frontend/src/shared/ui/icons/` (novos — componentes SVG inline: Home, Receipt, Cards, Chart/Projection, ChevronLeft/Right, Close, Menu; e um tipo `IconProps`)
- `frontend/src/shared/ui/Badge/Badge.tsx` + `Badge.module.css` (novos)
- `frontend/src/shared/ui/index.ts` (novo — barrel, re-export)

**O que implementar:**
- `Button` com `variant`: `primary` (fundo `--color-primary`, texto `--color-on-primary` **preto** —
  nunca branco, RN05/DS), `secondary` (fundo `--color-surface-card`, texto `--color-on-dark`, hairline),
  `text` (sem fundo, texto). Estados `default`/`active`/`disabled`; altura ≥40px (alvo de toque);
  radius `--radius-md`; type do token `button`. Sem hover elaborado (DS documenta só default/active).
- `IconButton` (quadrado, alvo ≥44px no mobile), recebe um ícone como `children`.
- `icons/`: cada ícone é um componente que renderiza `<svg>` com `fill="currentColor"`/`stroke` e
  `width`/`height` via prop, herdando cor do contexto (tokens). Não usar `public/icons.svg` (é lixo do
  scaffold Vite: bluesky/discord/x etc.).
- `Badge` (pill, `--radius-pill`), tons neutros/accent — **não** verde/vermelho (RN04).

**Testes Necessários:**
- [x] Build/lint verdes com os novos arquivos.
- [ ] (Manual) montar temporariamente cada variante e conferir cor/contraste/alvo de toque. *(pendente — sem acesso a browser real)*

**Critérios de Aceitação:**
- [x] Variantes de Button derivadas de tokens; primário = amarelo + texto preto (Critério 8).
- [x] Nenhuma cor/tamanho hardcoded fora de token (Critério 3/Cenário 8).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 1

---

### ETAPA 3: Primitivos — Superfícies (Card/SurfaceCard/Panel, StatCard, MoneyValue)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** d3cacb0

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `Card` (`shared/ui/Card/`): prop `variant` com 3 valores, cada um mapeado a um nível de elevação
  documentado no DS — `surface` (default, `--color-surface-card`, "Card surface" tier), `elevated`
  (`--color-surface-elevated`, para cards aninhados/nested), `panel` (fundo transparente + hairline
  `1px solid var(--color-hairline)`, "Soft hairline" tier — contêiner de menor ênfase). Radius
  `--radius-xl` e padding `--space-lg` fixos em todas as variantes; **sem sombra** (elevação por
  color-block, conforme DS). Estende `HTMLAttributes<HTMLDivElement>`, children via `{...rest}` (mesmo
  padrão do `Button` da ETAPA 2).
- `MoneyValue` (`shared/ui/MoneyValue/`): formata com `shared/formatCurrency`; `font-family:
  var(--font-number)` (IBM Plex) + `font-variant-numeric: tabular-nums` em todos os tamanhos. Prop
  `size` (`display`/`md`/`sm`, default `md`) mapeia diretamente aos tokens `--text-number-{papel}-*`
  publicados na ETAPA 1. Direção financeira via duas props independentes conforme o PLAN — `direction`
  (`'up'|'down'|'neutral'`, override explícito) e `signed` (quando `true` e sem `direction` explícito,
  deriva a direção do sinal do `value` e prefixa "+" em valores positivos). Direção **sempre** aplicada
  como cor de texto (`--color-up`/`--color-down`), nunca fundo (RN04); sem direção informada, cai em
  `neutral` → `color: inherit` (herda a cor ambiente, nunca amarelo de corpo — RN05).
- `StatCard` (`shared/ui/StatCard/`): **compõe** `Card` (variant `surface` implícito) + `MoneyValue`
  (`size="display"`, neutro por padrão) em vez de duplicar a superfície — o número de destaque nunca é
  amarelo por padrão (RN05), só fica verde/vermelho se o consumidor passar `direction` explicitamente
  (decisão do caso de uso fica para a ETAPA 10). Slots opcionais: `badge` (`ReactNode` — ex.:
  `<Badge>Projeção</Badge>` da ETAPA 2) e `breakdown` (lista `{label, value}[]`, cada linha com
  `MoneyValue size="sm"` neutro; a cor `--color-muted-strong` é aplicada no `<li>` pai e herdada pelo
  `MoneyValue` via `color: inherit` — evitei sobrepor `color` diretamente na `className` do
  `MoneyValue` porque duas classes de módulos CSS diferentes definindo a mesma propriedade no mesmo
  elemento gera empate de especificidade cuja resolução depende da ordem de injeção do bundler — optei
  por deixar a cor só na ancestral, que é herdada de forma determinística).
- `shared/ui/index.ts`: barrel atualizado com os 3 novos componentes + tipos (`CardProps`/`CardVariant`,
  `StatCardProps`/`StatCardBreakdownItem`, `MoneyValueProps`/`MoneyDirection`/`MoneySize`).
- Sem consumidor ainda (shell/Dashboard só chegam nas ETAPAS 9/10) — `tsc -b`/oxlint passam mesmo sem
  uso, como nas etapas anteriores.
- Zero hex hardcoded nos novos arquivos (confirmado via grep). Nenhuma medida literal fora de token.
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0 — este projeto/versão do oxlint não imprime resumo quando não há achados, diferente da
  nota da ETAPA 2; validado via exit code) verdes.
- Nenhuma dúvida em aberto. Decisão de design não explicitada no PLAN (documentada para transparência):
  mapeamento das 3 variantes do `Card` aos 3 níveis de elevação nomeados no DS (`Flat`/`Soft hairline`/
  `Card surface`) e composição `StatCard` sobre `Card` em vez de duplicar CSS de superfície — ambas
  revisáveis pelo dev/Tech Lead.

**Objetivo:** Publicar superfícies e o valor monetário tipado (IBM Plex + verde/vermelho por sinal) —
base visual do Dashboard e dos números (Critério 3/6/8; RN03/RN04).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/shared/ui/Card/Card.tsx` + `Card.module.css` (novos — inclui SurfaceCard/Panel via prop de ênfase)
- `frontend/src/shared/ui/StatCard/StatCard.tsx` + `StatCard.module.css` (novos)
- `frontend/src/shared/ui/MoneyValue/MoneyValue.tsx` + `MoneyValue.module.css` (novos)
- `frontend/src/shared/ui/index.ts` (alterado — re-export)

**O que implementar:**
- `Card`: superfície `--color-surface-card`, radius `--radius-xl`, padding `--space-lg`, **sem sombra**
  (elevação por color-block, DS). Prop opcional para variante `elevated` (`--color-surface-elevated`)
  e `panel`.
- `StatCard`: título (muted, Inter) + número de destaque em `--font-number` (IBM Plex), slot opcional
  para badge (ex.: "Projeção") e breakdown. Número **nunca** em amarelo de corpo (RN05).
- `MoneyValue`: recebe `value: number` (+ opcional `signed`/`direction`), formata com
  `shared/formatCurrency`, renderiza em `--font-number` com `font-variant-numeric: tabular-nums`;
  aplica `--color-up` para positivo/receita e `--color-down` para negativo/despesa **como cor de
  texto** (RN04). Neutro quando não há direção.

**Testes Necessários:**
- [x] Build/lint verdes.
- [ ] (Manual) valor positivo em verde, negativo em vermelho, sem fundo colorido. *(pendente — sem acesso a browser real)*

**Critérios de Aceitação:**
- [x] Números em IBM Plex tabular; direção por cor de texto apenas (Critério 8/RN04).
- [x] Superfícies flat por token (Critério 3).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 1 (Badge da ETAPA 2 é opcional para o StatCard — se usado, dependa também da ETAPA 2)

---

### ETAPA 4: Primitivos — Formulário (Field, Input, Select)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 896af34

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `Input`/`Select` (`shared/ui/Input/`, `shared/ui/Select/`): componentes finos que encaminham
  `InputHTMLAttributes`/`SelectHTMLAttributes` via `...rest` (mesmo padrão do `Button`/`Card`).
  **Decisão de design não explicitada no PLAN** (documentada para transparência, revisável): o PLAN
  oferecia dois tokens de fundo (`--color-surface-card`/`--color-surface-elevated`); optei por
  `--color-surface-elevated` — dá contraste visual quando o controle está aninhado dentro de um `Card`
  (que já usa `--color-surface-card`), consistente com a semântica "elevated = nested" documentada no
  DS (`Surface Elevated Dark`: "used for nested cards..."). Hairline `--color-hairline`, radius
  `--radius-md`, `min-height: 40px`, tipografia `--text-body-md`. Foco visível herda a regra global
  `:focus-visible` do `index.css` (ETAPA 1) — nenhum CSS de foco duplicado, mesmo padrão do `Button`.
  `Select` mantém a seta nativa do browser (sem chevron custom — fora do escopo desta etapa;
  `color-scheme: dark` global já estiliza os controles nativos).
- `Field` (`shared/ui/Field/`): compõe label (`--text-caption`, `--color-muted` — mesmo token do
  `StatCard.title`) + o controle (via `children`) + mensagem opcional. Gera `id` via `useId()` quando
  não informado explicitamente, e injeta `id`/`aria-describedby` no filho via `cloneElement` — o filho é
  tipado como `ReactElement<{ id?: string; 'aria-describedby'?: string }>`, compatível estruturalmente
  com `<Input />`/`<Select />` (ambos estendem `HTMLAttributes`, que já tem esses campos). Mensagem de
  erro (`error` prop) usa `--color-primary` (amarelo) — nunca vermelho/verde, conforme RN04 (o DS não
  reserva um tom "erro" fora de neutro/amarelo).
- `shared/ui/index.ts`: barrel atualizado com os 3 novos componentes + tipos (`FieldProps`,
  `InputProps`, `SelectProps`).
- Sem consumidor ainda (Dashboard só chega na ETAPA 10) — `tsc -b`/oxlint passam mesmo sem uso, como nas
  etapas anteriores.
- Zero hex hardcoded nos novos arquivos (confirmado via grep).
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0) verdes.
- Nenhuma dúvida bloqueante em aberto. A decisão de fundo `--color-surface-elevated` (acima) é revisável
  pelo dev/Tech Lead caso o uso real no Dashboard (ETAPA 10) sugira o contrário.

**Objetivo:** Publicar os controles de formulário na versão dark do DS (Critério 3). Usados de forma
leve pelo Dashboard e preparados para a Fase 2 (não migram os CRUDs agora — RN09).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/shared/ui/Field/Field.tsx` + `Field.module.css` (novos — label + slot + mensagem)
- `frontend/src/shared/ui/Input/Input.tsx` + `Input.module.css` (novos)
- `frontend/src/shared/ui/Select/Select.tsx` + `Select.module.css` (novos)
- `frontend/src/shared/ui/index.ts` (alterado)

**O que implementar:**
- `Input`/`Select`: fundo `--color-surface-card`/`--color-surface-elevated`, texto `--color-body`,
  hairline `--color-hairline`, radius `--radius-md`, altura 40px, foco com `--focus-ring`
  (`--color-info`). Encaminhar props nativas (`type`, `value`, `onChange`, etc.).
- `Field`: encapsula label (muted, Inter) + controle + mensagem opcional (erro em neutro/amarelo — não
  verde/vermelho, RN04). `htmlFor`/`id` para acessibilidade.

**Testes Necessários:**
- [x] Build/lint verdes.
- [ ] (Manual) foco de teclado visível (focus ring). *(pendente — sem acesso a browser real; mecanismo herdado do `:focus-visible` global confirmado no código)*

**Critérios de Aceitação:**
- [x] Controles dark derivados de tokens; foco visível (Critério 3/RNF05).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 1

---

### ETAPA 5: Primitivos — Dados (DataList/ListRow, Table/TableRow, Tabs/SubNav)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** 27c1174

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `DataList`/`ListRow` (`shared/ui/DataList/`): `DataList` é um `<ul>` fino (estende
  `HTMLAttributes<HTMLUListElement>`, mesmo padrão "forward de props nativas" do `Button`/`Input`).
  `ListRow` é um `<li>` com slots `left` (obrigatório) e `right` (opcional) — inspirado no `markets-row`
  do DS: fundo transparente (elevação só via `Card` ancestral, nunca por linha), hairline
  `--color-hairline` entre linhas (`:last-child` sem borda), tipografia `--text-body-md` em
  `--color-body`. `right` herda `color: var(--color-body)` mas normalmente carrega um `MoneyValue`
  (que já define sua própria cor por direção) ou `Badge`.
- `Table`/`TableRow` (`shared/ui/Table/`): `Table` é um `<table>` fino
  (`TableHTMLAttributes<HTMLTableElement>`); cabeçalho (`thead th`, escrito nativamente pelo
  consumidor — sem subcomponente `TableHead`, fora do escopo do PLAN) em `--color-caption`/
  `--color-muted` com hairline inferior. `TableRow` é um `<tr>` (corpo) com hairline por linha
  (`:last-child` sem borda), texto `--text-body-md`/`--color-body`. **Alinhamento numérico à
  direita** (para IBM Plex/`MoneyValue`) é resolvido sem novo subcomponente: o consumidor aplica o
  atributo HTML nativo `data-align="right"` no `<th>`/`<td>` desejado — `Table.module.css` estiliza
  `[data-align='right']` com `text-align: right` dentro do escopo `.table`. Decisão de design não
  explicitada no PLAN (documentada para transparência, revisável): evita introduzir `TableCell`/
  `TableHead` (não pedidos pelo PLAN, que lista só `Table`+`TableRow`) mantendo o primitivo mínimo e
  consistente com o padrão "forward de atributos nativos" já usado em `Button`/`Input`/`Select`.
- `Tabs` (`shared/ui/Tabs/`, cobre "Tabs/SubNav" do PLAN — um único componente, não dois): recebe
  `items: TabItem[]` (mesmo padrão data-driven do `StatCard.breakdown`). Cada item renderiza como
  **`NavLink`** do `react-router-dom` quando tem `to` (sub-abas das áreas apontando a rotas reais —
  estado ativo derivado da rota via o próprio `NavLink`, `end` repassado para casamento exato) **ou**
  como **botão controlado** quando não tem `to` (usa `active`/`onClick` — caso do seletor interno do
  Dashboard, ETAPA 10). Ambos os modos usam elementos nativos (`a`/`button`), então são navegáveis por
  teclado sem esforço extra. Estado ativo: sublinhado em `--color-primary` + texto `--color-body`
  (itens inativos em `--color-muted`) — decisão de design não explicitada no PLAN ("accent contido ou
  sublinhado"; optei por sublinhado, revisável). Tipografia `--text-nav-link`. Alvo `min-height: 40px`
  desktop / `44px` em `<768px` (mesmo padrão de media query do `IconButton`, ETAPA 2). É o **primeiro
  primitivo de `shared/ui/` a importar `react-router-dom`** — decisão consciente, já que o próprio
  PLAN pede que o componente "aceite render como `NavLink`"; o projeto é uma SPA inteiramente montada
  sobre react-router, então o acoplamento é pragmático e não introduz nova dependência.
- `shared/ui/index.ts`: barrel atualizado com os 3 novos grupos de componentes + tipos (`DataListProps`/
  `ListRowProps`, `TableProps`/`TableRowProps`, `TabsProps`/`TabItem`).
- Sem consumidor ainda (shell/Dashboard só chegam nas ETAPAS 9/10) — `tsc -b`/oxlint passam mesmo sem
  uso, como nas etapas anteriores.
- Zero hex hardcoded nos novos arquivos (confirmado via grep). Nenhuma medida literal fora de token,
  exceto os `min-height`/`44px` de alvo de toque (mesma exceção documentada na ETAPA 2 — o DS não tem
  token de "altura de componente").
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0) verdes.
- Nenhuma dúvida bloqueante em aberto. Duas decisões de design não explicitadas no PLAN documentadas
  acima (alinhamento de `Table` via `data-align` nativo; `Tabs` sublinhado + API `items` data-driven) —
  ambas revisáveis pelo dev/Tech Lead.

**Objetivo:** Publicar os componentes de listagem e a sub-navegação por abas (Critério 3; base do
Dashboard e da sub-navegação das áreas — Critério 4).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/shared/ui/DataList/DataList.tsx` + `DataList.module.css` (novos — `DataList` + `ListRow`)
- `frontend/src/shared/ui/Table/Table.tsx` + `Table.module.css` (novos — `Table` + `TableRow`, divisória hairline)
- `frontend/src/shared/ui/Tabs/Tabs.tsx` + `Tabs.module.css` (novos — `Tabs`/`SubNav`)
- `frontend/src/shared/ui/index.ts` (alterado)

**O que implementar:**
- `ListRow`/`DataList`: linha com divisória `--color-hairline`, padding do token de linha; slots
  esquerda/direita; sem fundo por linha (transparente sobre a Card).
- `Table`/`TableRow`: cabeçalho em `--color-muted` (caption), linhas com hairline; alinhamento de
  números à direita (para IBM Plex/MoneyValue).
- `Tabs`/`SubNav`: itens com estado ativo (accent contido ou sublinhado), navegáveis por teclado;
  aceita render como `NavLink` (para as sub-abas das áreas apontarem às rotas existentes) **ou** como
  botões controlados (para o seletor interno do Dashboard). Alvo ≥44px no mobile.

**Testes Necessários:**
- [x] Build/lint verdes.

**Critérios de Aceitação:**
- [x] Listas/tabelas/abas derivadas de tokens; divisórias hairline (Critério 3).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 1

---

### ETAPA 6: Primitivos — Estados (EmptyState, Skeleton, Feedback)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** be744bc

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `EmptyState` (`shared/ui/EmptyState/`): ícone opcional (`ReactNode`, slot livre — não força um ícone
  específico do conjunto da ETAPA 2; o consumidor decide, ex.: `ChartIcon`) + título (obrigatório,
  `--text-title-sm-*`) + descrição opcional (`--text-body-sm-*`). Tudo em `--color-muted`/`--color-body`,
  sem cor de marca/direção — mensagem neutra (ex.: "Sem gastos neste período").
- `Skeleton` (`shared/ui/Skeleton/`): 3 variantes (`block` 40px/`--radius-md`, `line` 14px/`--radius-xs`,
  `card` 140px/`--radius-xl`), largura 100% por padrão, `width`/`height` sobrepõem via `style` inline.
  **Decisão de design não explicitada no PLAN** (documentada para transparência, revisável): o PLAN citava
  "shimmer" mas `--color-hairline` e `--color-surface-elevated` são **o mesmo valor** no token atual
  (`#2b3139`) — um gradiente de duas cores entre eles não produziria movimento visível. Troquei por um
  pulso de opacidade (`animation: skeleton-pulse` 1.4s, opacity 1↔0.5) sobre `--color-surface-elevated`
  — cumpre "animação de shimmer simples via CSS" com zero cor extra/hardcode, e evita depender de
  `color-mix()` (suporte recente) só para um efeito decorativo. `aria-hidden="true"` fixo (placeholder,
  não é conteúdo).
- `Feedback` (`shared/ui/Feedback/`): variantes `error`/`info` — **decisão de design não explicitada no
  PLAN** (documentada para transparência, revisável): sem token de "erro" no DS (Known Gap), usei
  `border-left: 3px solid var(--color-primary)` (amarelo) para `error` — neutro/amarelo, nunca vermelho
  (RN04) — e `var(--color-info)` (azul, mesmo token do focus ring) para `info`, mantendo os dois tons
  claramente distintos do par verde/vermelho de direção financeira. Corpo: título opcional
  (`--text-title-sm-*`) + mensagem (`--text-body-sm-*`, obrigatória). Ação de retry **opcional**
  (`onRetry`/`retryLabel`, default "Tentar novamente") — quando informada, o próprio `Feedback` renderiza
  um `Button variant="text"` (ETAPA 2) em vez de expor um slot genérico, para os 3 blocos do Dashboard
  (ETAPA 10) chamarem `<Feedback variant="error" message="..." onRetry={...} />` sem remontar o botão em
  cada lugar. `role="alert"` em `error` / `role="status"` em `info` (acessibilidade leve, não pedida
  explicitamente pelo PLAN mas de baixo custo).
- `shared/ui/index.ts`: barrel atualizado com os 3 novos componentes + tipos (`EmptyStateProps`,
  `SkeletonProps`/`SkeletonVariant`, `FeedbackProps`/`FeedbackVariant`).
- Sem consumidor ainda (Dashboard só chega na ETAPA 10) — `tsc -b`/oxlint passam mesmo sem uso, como nas
  etapas anteriores.
- Zero hex/rgb hardcoded nos novos arquivos (confirmado via grep). Medidas literais fora de token: alturas
  de `Skeleton` (40/14/140px) e a borda de destaque de `Feedback` (3px) — mesma exceção documentada nas
  ETAPAS 2/5 (o DS não define token de "altura de componente" nem de "espessura de borda de destaque").
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0) verdes.
- Nenhuma dúvida bloqueante em aberto. Duas decisões de design documentadas acima (pulso em vez de
  shimmer de duas cores no `Skeleton`; cores de borda de `Feedback` error/info) são revisáveis pelo
  dev/Tech Lead.

**Objetivo:** Publicar os estados vazio/carregando/erro reutilizáveis (Critério 3/7; CE01/CE02).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/shared/ui/EmptyState/EmptyState.tsx` + `EmptyState.module.css` (novos)
- `frontend/src/shared/ui/Skeleton/Skeleton.tsx` + `Skeleton.module.css` (novos)
- `frontend/src/shared/ui/Feedback/Feedback.tsx` + `Feedback.module.css` (novos)
- `frontend/src/shared/ui/index.ts` (alterado)

**O que implementar:**
- `EmptyState`: ícone/título/descrição neutros; mensagem clara (ex.: "Sem gastos neste período").
- `Skeleton`: variações `block`/`line`/`card` (retângulos com `--color-surface-elevated` e animação
  de shimmer simples via CSS). Substitui textos "Carregando..." (Critério 7).
- `Feedback`: variantes `error`/`info` (sem `success` verde — DS: sucesso/erro de UI em neutros/amarelo,
  **não** verde/vermelho, RN04/Critério 8). Slot opcional de ação "Tentar novamente" (usa `Button text`).

**Testes Necessários:**
- [x] Build/lint verdes.

**Critérios de Aceitação:**
- [x] Skeleton, EmptyState e Feedback derivados de tokens; erro **não** usa vermelho de direção (Critério 7/8).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 1 (Feedback pode usar `Button` da ETAPA 2 no retry — se usar, dependa da ETAPA 2)

---

### ETAPA 7: Primitivos — Sobreposições (Modal/Drawer)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** ef34788

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `Modal`/`Drawer` (`shared/ui/Modal/Modal.tsx`, um único arquivo — mesmo padrão "base + variante" já
  usado em `Table`/`TableRow` e `DataList`/`ListRow` das ETAPAS 5): ambos compõem um componente interno
  não exportado `OverlaySurface` sobre `<dialog>` nativo. **Decisão de caminho não explicitada
  literalmente no PLAN** (documentada para transparência, revisável): o ADR 0004 sugere
  `shared/ui/overlay/Modal.tsx`, mas o próprio PLAN (Mapa de Componentes §"Sobreposições: `Modal/`
  (+ Drawer)" e a lista de "Arquivo(s) Afetado(s)" desta etapa) pede `shared/ui/Modal/Modal.tsx` — segui
  o PLAN, que é mais específico e consistente com o padrão pasta-por-componente das ETAPAS 2-6.
- `useNativeDialog` (hook interno, não exportado): sincroniza `dialog.showModal()`/`dialog.close()` com
  a prop `open` via `useEffect`, e propaga o evento nativo `close` do `<dialog>` (disparado por `Esc`,
  por `dialog.close()` explícito, ou pelo fechamento por backdrop implementado aqui) para o `onClose` do
  consumidor — fonte única de sincronização, evita chamar `onClose` duas vezes.
- **Foco inicial no primeiro elemento e inertização do restante da página são comportamento nativo do
  `showModal()`** (conforme ADR 0004/HTML spec) — nenhum código de focus-trap foi escrito, como esperado.
- **Fechamento por clique no backdrop**: implementado via `getBoundingClientRect()` do `<dialog>`
  comparado à posição do clique (técnica documentada pela MDN) — **não** usei o atalho comum
  `event.target === dialog`, que é impreciso em alguns navegadores/casos de borda (padding do próprio
  `<dialog>`). Decisão de design não explicitada no PLAN, revisável.
- Botão de fechar: `IconButton` (ETAPA 2) + `CloseIcon` (ETAPA 2), `aria-label` customizável via prop
  `closeLabel` (default `"Fechar"`, mesmo padrão de default customizável do `retryLabel` do `Feedback`
  na ETAPA 6) — chama `dialog.close()` (não `onClose` direto), reaproveitando o mesmo caminho de
  sincronização do evento nativo `close`.
- Título: `<h2>` com `id` gerado via `useId()`, associado ao `<dialog>` via `aria-labelledby` (requisito
  explícito do PLAN).
- Estilo: superfície `--color-surface-card`/`--radius-xl`/`--space-lg` (padding zero no próprio
  `<dialog>`, todo o visual na `div.surface` interna — isso também torna o cálculo de "clique fora"
  exato, sem zona morta no padding). **Backdrop**: o DS não define token de "scrim" (Known Gap) —
  decisão de design não explicitada no PLAN (documentada, revisável): reaproveitei
  `background: var(--color-canvas)` + `opacity: 0.72` no próprio `::backdrop` (só a pseudo-elemento,
  não um valor de cor novo) em vez de criar um token/hex novo fora do escopo de arquivos desta etapa
  (só `Modal.tsx`/`Modal.module.css`/barrel, sem tocar `index.css`).
  `Drawer`: `.dialog.drawerDialog` (seletor composto, específico o bastante para vencer `.dialog` sem
  depender de ordem de declaração) ancora à direita (`position: fixed; inset: 0 0 0 auto`), largura
  `min(360px, 100vw)`, altura 100%, cantos quadrados (`border-radius: 0` na superfície).
- **Transição simples** (pedida no PLAN/ADR 0004): implementada via `@keyframes` no seletor `[open]`
  (`modal-in`/`drawer-in`) em vez de `transition` — decisão de design não explicitada no PLAN
  (documentada, revisável): `transition` não anima a troca de `display: none → block` do `<dialog>`
  sem `@starting-style` (suporte recente demais para depender nesta fase); `animation` em `[open]`
  funciona de forma robusta em todos os browsers evergreen, cumprindo a mesma função ("simples",
  conforme a consequência aceita do ADR 0004).
- `shared/ui/index.ts`: barrel atualizado com `Modal`/`Drawer` + tipos (`ModalProps`, `DrawerProps` —
  `DrawerProps` é um alias de tipo de `ModalProps`, já que a API é idêntica).
- **Não** acoplado ao Dashboard nesta fase, conforme o PLAN — sem consumidor ainda; `tsc -b`/oxlint
  passam mesmo sem uso, como nas etapas anteriores.
- Zero cor/hex hardcoded nos novos arquivos fora de token (confirmado via leitura); a única exceção
  documentada é a `opacity: 0.72` do backdrop (um número, não uma cor) e as durações/curvas de animação
  (150ms/200ms, `ease-out` — o DS não define tokens de duração/easing).
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0) verdes. Verificação manual (abrir/fechar por Esc/backdrop/botão, foco preso no dialog)
  **não realizada nesta sessão** — sem acesso a browser real neste ambiente; recomenda-se conferência
  visual rápida pelo dev montando `<Modal>`/`<Drawer>` temporariamente ao rodar `npm run dev`.
- Duas dúvidas/decisões não bloqueantes documentadas acima (caminho `Modal/` vs `overlay/` do ADR;
  técnica de backdrop-click; scrim sem token; animação via `@keyframes` em vez de `transition`) — todas
  revisáveis pelo dev/Tech Lead, nenhuma impediu a conclusão da etapa.

**Objetivo:** Publicar o primitivo de sobreposição sobre `<dialog>` nativo — groundwork da Fase 2
(Critério 3; ADR 0004). **Não** é acoplado ao Dashboard nesta fase.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `frontend/src/shared/ui/Modal/Modal.tsx` + `Modal.module.css` (novos — `Modal` + variante `Drawer`)
- `frontend/src/shared/ui/index.ts` (alterado)

**O que implementar:**
- `Modal` sobre `<dialog>`: abre com `showModal()` (via `ref` + `useEffect` no `open`), fecha em `Esc`
  e no botão de fechar (`IconButton` + ícone Close); backdrop por `::backdrop`; superfície
  `--color-surface-card`, radius `--radius-xl`, padding `--space-lg`. Encaminhar `open`/`onClose`.
- `Drawer`: mesma base com ancoragem lateral (direita) via CSS (largura fixa, `height: 100%`), transição
  simples.
- Acessibilidade: foco inicial no primeiro elemento; título via `aria-labelledby`.

**Testes Necessários:**
- [x] Build/lint verdes.
- [ ] (Manual) montar temporariamente, abrir/fechar por Esc e backdrop; foco preso no dialog. *(pendente — sem acesso a browser real)*

**Critérios de Aceitação:**
- [x] Modal/Drawer publicados, derivados de tokens, acessíveis (Esc/foco) (Critério 3).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 1, ETAPA 2 (IconButton/ícone Close)

---

### ETAPA 8: Primitivos — Gráficos (DonutChart, BarChart, paleta)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-02
**Commit:** ef8534f

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `charts/palette.ts`: `chartPalette: string[]` = 6 nomes de custom properties (`--chart-cat-1..6`,
  fonte de valor no CSS — ADR 0001) + `colorForIndex(index)` que cicla a paleta pelo índice da fatia/
  série **visível** (após filtrar valores `<= 0`) quando o consumidor não informa `color` explícito.
- Tokens `--chart-cat-1..6` adicionados ao `index.css` (seção nova, entre "Cores — info/foco" e
  "Tipografia"): `--chart-cat-1: var(--color-primary)` (accent, reservado à maior fatia/série) +
  5 neutros dessaturados em degraus de luminosidade (`#a8afb8` → `#3d444c`), derivados de
  `--color-muted-strong`/`--color-muted`/`--color-surface-elevated` com um passo extra no tom mais
  escuro para permanecer distinguível do `--color-hairline` usado no anel-base do `DonutChart` (mesmo
  valor de `--color-surface-elevated`, `#2b3139` — um `--chart-cat-6` igual a esse token confundiria
  visualmente com o anel de fundo). Nenhuma cor de direção financeira (`--color-up`/`--color-down`) nem
  segundo brand color usada — conforme ADR 0003/Ponto de Atenção 6 (Known Gap do DS, sanado
  explicitamente, marcado como revisável pelo dev).
- `DonutChart` (`shared/ui/charts/DonutChart.tsx`, arquivo único — sem subpasta própria, seguindo o
  caminho exato listado no Mapa de Componentes/"Arquivo(s) Afetado(s)" desta etapa: `charts/
  DonutChart.tsx`, não `charts/DonutChart/DonutChart.tsx`, mesmo padrão flat já usado em `icons/`):
  recebe `data: { label, value, color? }[]`; segmentos renderizados como `<circle>` com
  `stroke-dasharray`/`stroke-dashoffset` dentro de um `<g transform="rotate(-90 …)">` (início às 12h);
  anel-base (`--color-hairline`) desenhado antes dos segmentos; "buraco" central proporcional via
  `strokeWidth`/`size` (defaults 28/160, ambos props). **Decisão de design não explicitada literalmente
  no PLAN** (documentada para transparência, revisável): o componente **não** ordena `data` internamente
  — o contrato assume que o consumidor já ordena por `value` decrescente para que a maior fatia herde
  `--chart-cat-1` (accent), documentado via JSDoc na prop `data`; reordenar internamente quebraria a
  correspondência de ordem com uma legenda externa (ex.: a lista de categorias que a ETAPA 10/
  `CategoryBreakdown` vai renderizar ao lado). Valores `<= 0` são filtrados antes de desenhar (evita
  arco de comprimento zero/negativo).
- `BarChart` (`shared/ui/charts/BarChart.tsx`, mesmo padrão flat): recebe `data: { label, value }[]` +
  `highlightIndex` (índice da barra a destacar, ex.: mês atual). Barras em `<rect>` num `<svg
  viewBox="0 0 100 100" preserveAspectRatio="none">` (coordenadas percentuais fixas, independentes do
  tamanho renderizado — o container controla a altura via prop `height`, largura sempre 100%); eixo
  base via `<line>` em `--color-hairline`. Barra normal preenche `--color-surface-elevated`; a
  destacada (`highlightIndex`) **mantém o mesmo preenchimento** e ganha só `stroke`
  `--color-primary` (borda) — nunca preenchimento amarelo cheio (RN05). **Decisão de design não
  explicitada no PLAN** (documentada, revisável): os rótulos (valor formatado + nome do mês) são
  renderizados como HTML (`<div>`/`<span>` num grid abaixo do `<svg>`, não como `<text>` SVG) — mais
  simples de tipar com os tokens do DS (`--font-number`/`tabular-nums` no valor, `--text-caption-*` no
  nome do mês) do que texto inline em SVG; o PLAN pede `<rect>` especificamente para as **barras**, não
  para os rótulos. O rótulo/valor da barra destacada usa a mesma cor `--color-primary` da borda
  (reforça o destaque contido sem preencher a barra). `vector-effect: non-scaling-stroke` no eixo e na
  borda de destaque evita distorção de espessura sob `preserveAspectRatio="none"`.
- Acessibilidade mínima (RNF05, instrução do orquestrador): ambos os `<svg>` recebem `role="img"` +
  `aria-label` — por padrão um resumo textual gerado a partir de `data` (`DonutChart`: `"Categoria X%,
  ..."`; `BarChart`: `"Categoria R$ valor, ..."`, via `shared/formatCurrency`), sobreponível por prop
  `ariaLabel`. Ambos aceitam texto vazio/dados vazios sem erro (`"— sem dados"`).
- `shared/ui/index.ts`: barrel atualizado com `DonutChart`/`BarChart` + tipos (`DonutChartProps`/
  `DonutChartDatum`, `BarChartProps`/`BarChartDatum`) + `chartPalette`/`colorForIndex`.
- Sem consumidor ainda (Dashboard só chega na ETAPA 10) — `tsc -b`/oxlint passam mesmo sem uso, como nas
  etapas anteriores.
- Zero hex hardcoded fora de `index.css` (confirmado via grep nos 3 arquivos novos de `charts/`); as
  únicas medidas literais fora de token são as constantes internas do `BarChart` (`VIEWBOX_SIZE=100`,
  `GAP=6`, `MAX_BAR_HEIGHT=82`, `rx=1.5`) — coordenadas percentuais do sistema de desenho, não há token
  de "layout de gráfico" no DS para referenciar (mesma exceção documentada nas ETAPAS 2/5/6 para
  medidas de componente).
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0) verdes.
- Nenhuma dúvida bloqueante em aberto. Três decisões de design não explicitadas literalmente no PLAN
  documentadas acima (`DonutChart` não reordena `data`; rótulos do `BarChart` em HTML, não `<text>`
  SVG; quinto degrau de `--chart-cat-6` ajustado para não coincidir com `--color-hairline`) — todas
  revisáveis pelo dev/Tech Lead.

**Objetivo:** Publicar os wrappers de gráfico em SVG próprio, desacoplados e token-driven (ADR 0003;
RF06/RNF06/RNF07). Sem lib, sem peso de bundle.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `frontend/src/shared/ui/charts/palette.ts` (novo — lista de nomes de custom properties de categoria)
- `frontend/src/shared/ui/charts/DonutChart.tsx` + `DonutChart.module.css` (novos)
- `frontend/src/shared/ui/charts/BarChart.tsx` + `BarChart.module.css` (novos)
- `frontend/src/index.css` (alterado — adicionar tokens `--chart-cat-1..N` de paleta categórica)
- `frontend/src/shared/ui/index.ts` (alterado)

**O que implementar:**
- Tokens `--chart-cat-1..N` (sugestão: 6) em `index.css`: neutros dessaturados em degraus de
  luminosidade (derivados de `--color-muted`/`--color-surface-elevated`) + 1 accent para a maior fatia.
  **Nunca** verde/vermelho como categorias, **nunca** segundo brand color (DS — Known Gap sanado
  explicitamente; marcar como revisável).
- `palette.ts`: exporta `chartPalette: string[]` = `['var(--chart-cat-1)', …]` (a fonte de valor fica
  no CSS — ADR 0001). Função utilitária para ciclar cores por índice.
- `DonutChart`: recebe `data: { label, value, color? }[]`; renderiza `<svg>` com arcos via `<circle>` +
  `stroke-dasharray`/`stroke-dashoffset`; buraco central proporcional; sem dependência. Cor por
  `chartPalette` quando não informada.
- `BarChart`: recebe séries com rótulo/valor + índice de destaque (mês atual); barras `<rect>` com
  `--color-surface-elevated`/`--color-muted`; barra destacada com accent **contido** (borda/rótulo),
  **não** preenchimento amarelo cheio (RN05). Eixo base simples; rótulos em `--font-number`.
- Ambos recebem cores como tokens/props → trocar por lib no futuro toca só estes arquivos (RNF07).

**Testes Necessários:**
- [x] Build/lint verdes.
- [ ] (Manual) donut soma 100% dos valores; barras proporcionais; cores respeitam o DS. *(pendente — sem acesso a browser real)*

**Critérios de Aceitação:**
- [x] Gráficos SVG token-driven, sem lib nova; wrappers desacoplados (RNF06/RNF07).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 1

---

### ETAPA 9: Shell — nova navegação em 4 áreas (sidebar desktop + bottom nav mobile)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-03
**Commit:** 56ebe5d

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `AppLayout.tsx` reescrito: as 4 áreas (`Início`/`Lançamentos`/`Compromissos`/`Projeção`) são uma
  estrutura de dados local (`NAV_AREAS`, não exportada) com `label`/`icon`/`to`/`paths`/`tabs?` —
  `paths` lista as rotas existentes que pertencem à área, usada **só** para computar a área ativa via
  `useLocation().pathname` (`NAV_AREAS.find(area => area.paths.includes(pathname))`). **Nenhuma rota
  nova/renomeada** (Decisão Técnica 5) — `App.tsx` conferido e inalterado (ver mapeamento abaixo).
- **Decisão de design não explicitada literalmente no PLAN** (documentada, revisável): como
  `Lançamentos`/`Compromissos` cobrem 2 rotas-irmãs (não aninhadas), o estado ativo do item de área **não**
  usa o `isActive` nativo do `NavLink` (que só casaria com a rota `to`, ex. `/transactions`, deixando
  `/recurring` "apagado" na sidebar) — em vez disso, `AreaNavLink` (componente local, não exportado)
  recebe `isActive` já computado pelo `AppLayout` a partir de `paths.includes(pathname)` e sobrescreve
  `className`/`aria-current` do `NavLink`. Ainda assim é `NavLink` (navegável/acessível nativamente,
  `end` aplicado) — atende "estado ativo via NavLink/useLocation" da forma que cobre corretamente as
  áreas de 2 telas.
- Sub-abas das áreas de 2 telas usam o `Tabs` (ETAPA 5) direto com `items` apontando às rotas reais
  (`to`), renderizado no topo do `<main>` antes do `<Outlet />` — mesma semântica de navegação de hoje,
  sem estado próprio no shell.
- **Desktop (≥1024px)**: `aside` com marca, `nav` vertical (ícone + rótulo, `HomeIcon`/`ReceiptIcon`/
  `CardsIcon`/`ChartIcon` — confirmado que `ChartIcon` já era "Chart/Projection" na nota da ETAPA 2) e
  botão `Sair` (`Button variant="secondary"`, `margin-top: auto` para fixar no rodapé da sidebar).
- **Mobile/tablet (<1024px)**: `header` compacto (marca + `Button variant="text"` "Sair", já que a
  sidebar com o botão de logout fica oculta) + `nav` fixa no rodapé (`position: fixed`) com os 4 itens
  (ícone sobre rótulo, `min-height: 56px` ≥ alvo de toque 44px). **Decisão de design não explicitada no
  PLAN** (documentada, revisável): o corte único em 1024px cobre tanto mobile (<768) quanto tablet
  (768–1024) com o mesmo tratamento (header + bottom nav) — o PLAN só pede "comportamento intermediário
  sem overflow" para o tablet, sem especificar um terceiro layout distinto; como nenhum dos dois blocos
  (sidebar oculta / bottom nav fixa) depende da largura exata abaixo de 1024px, o requisito de "sem
  overflow" já fica satisfeito sem uma media query adicional em 768px no shell (os primitivos internos —
  `IconButton`/`Tabs` — já têm seu próprio ajuste de alvo de toque em 767px, inalterado).
- `.content` ganha `padding-bottom` extra (`<1024px`) para a bottom nav fixa não cobrir o fim do
  conteúdo — medida de componente (64px) sem token de "altura de shell" no DS, mesma exceção já
  documentada nas ETAPAS 2/5/6/7/8 para medidas de componente.
- Sidebar (`width: 240px`) é outra medida própria do componente pela mesma razão (sem token de "largura
  de shell" no DS).
- Botão "Sair" mantém o comportamento atual: `clearToken()` + `navigate('/login', { replace: true })`.
- Nenhum ícone novo foi criado (ex.: "logout") — `Sair` continua como texto em `Button`, igual ao shell
  anterior; os 8 ícones da ETAPA 2 já cobrem as 4 áreas exatamente (`Home`/`Receipt`/`Cards`/`Chart`).
- `IconButton` (citado nas instruções como primitivo disponível) **não** foi usado nesta etapa — todos
  os itens de navegação do shell têm rótulo visível (ícone + rótulo, nunca ícone isolado), então
  `IconButton` (pensado para botão só-ícone) não se aplica; `MenuIcon`/`ChevronLeft/RightIcon`/
  `CloseIcon` também ficam sem uso aqui (não há hambúrguer/drawer nesta fase — bottom nav, não menu
  colapsável, conforme Decisão Técnica 6).
- Zero cor/medida hardcoded fora de token nos dois arquivos alterados (confirmado via grep); as únicas
  medidas literais são as exceções de layout de componente já citadas acima (240px/64px/56px), sem
  token de "shell" no DS.
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0) verdes. Verificação manual via `npm run dev`/DevTools **não realizada nesta sessão** —
  sem acesso a browser real neste ambiente; recomenda-se ao dev rodar `npm run dev` e conferir
  visualmente os Cenários 5 e 7 (sidebar/bottom nav, sub-abas, deep-link direto em cada rota, logout,
  sem overflow horizontal) nas larguras desktop/tablet/mobile antes de prosseguir.
- **Mapeamento rota → área conferido em `App.tsx` (inalterado):**
  - `/login` → fora do shell (`LoginPage`, fora de `PrivateRoute`/`AppLayout`)
  - `/` → **Início** (`DashboardPage`)
  - `/transactions` → **Lançamentos** › sub-aba "Transações" (`TransactionsPage`)
  - `/recurring` → **Lançamentos** › sub-aba "Recorrentes" (`RecurringPage`)
  - `/credit-cards` → **Compromissos** › sub-aba "Cartões" (`CreditCardsPage`)
  - `/financing` → **Compromissos** › sub-aba "Financiamentos" (`FinancingPage`)
  - `/projection` → **Projeção** (`ProjectionPage`)
  - `*` → `Navigate to="/"` (inalterado, fora do `AppLayout`)
  - `PrivateRoute` continua envolvendo o grupo de rotas privadas antes do `AppLayout`; redirect 401 do
    `httpClient` (`window.location.href = '/login'`) inalterado.
- Nenhuma dúvida bloqueante em aberto. Duas decisões de design não explicitadas literalmente no PLAN
  documentadas acima (estado ativo de área via `paths.includes` em vez do `isActive` nativo do
  `NavLink`; corte único em 1024px cobrindo mobile+tablet) — ambas revisáveis pelo dev/Tech Lead.

**Objetivo:** Reconstruir o shell com a IA de 4 áreas e navegação responsiva, preservando 100% das
rotas (RF04/RF05; Critérios 4/5/10; RN06/RN07; Decisão Técnica 4/5).

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `frontend/src/app/AppLayout.tsx` (reescrito)
- `frontend/src/app/AppLayout.module.css` (reescrito)
- `frontend/src/app/App.tsx` (conferir — rotas **inalteradas**; ver Decisão Técnica 5)
- (opcional) `frontend/src/shared/ui/NavShell/…`, `BottomNav/…` — extrair componentes se ajudar; caso
  contrário, manter no `AppLayout` reutilizando `NavItem`/ícones/`Tabs`

**O que implementar:**
- Definir as 4 áreas como estrutura de dados (rótulo + ícone + rota(s) filhas):
  - **Início** → `/`
  - **Lançamentos** → `/transactions` (Transações) + `/recurring` (Recorrentes)
  - **Compromissos** → `/credit-cards` (Cartões) + `/financing` (Financiamentos)
  - **Projeção** → `/projection`
- **Desktop (≥1024px)**: sidebar lateral persistente com as 4 áreas (ícone + rótulo) + logout; a área
  ativa é derivada do path atual (`useLocation`); as áreas com 2 telas expõem **sub-abas** (`Tabs`/SubNav)
  no topo do conteúdo apontando às rotas existentes.
- **Mobile (<768px)**: sidebar colapsa em **bottom navigation** (4 itens, alvo ≥44×44px); as sub-abas
  aparecem como abas dentro da área. Tablet (768–1024): comportamento intermediário sem overflow.
- Estado ativo de nav via `NavLink`/`useLocation`; `end` no item Início. **Não** criar rotas novas nem
  redirects — a "área" é só agrupamento de navegação (Decisão Técnica 5). Manter o `Outlet`.
- Logout continua chamando `clearToken()` + `navigate('/login')` (comportamento atual).

**Testes Necessários:**
- [x] Build/lint verdes.
- [ ] (Manual) Cenário 5 — desktop mostra sidebar; mobile mostra bottom nav; sub-abas navegam. *(pendente — sem acesso a browser real)*
- [ ] (Manual) Cenário 7 — deep-link direto em cada rota abre correto; logout funciona; sem overflow horizontal. *(pendente — sem acesso a browser real)*

**Critérios de Aceitação:**
- [x] Exatamente 4 áreas; áreas de 2 telas expõem sub-navegação (Critério 4).
- [x] Navegação persistente no desktop e bottom nav no mobile; alvos ≥44px (Critério 5/RNF05).
- [x] Todas as rotas atuais preservadas; `PrivateRoute`/redirect `*`/logout intactos (Critério 10).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 2 (Button/IconButton/ícones), ETAPA 5 (Tabs/SubNav)

---

### ETAPA 10: Dashboard redesenhado (StatCards, barras, donut, lista de parceladas, estados)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-03
**Commit:** 8e518f6

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- `DashboardPage.tsx`: os três `useEffect` viraram `useCallback` (`loadSummary`/`loadCategory`/
  `loadInstallments`, cada um com o array de dependência correto — vazio, `[categoryYear,
  categoryMonth]`, `[includeSettled]`) + `useEffect(() => { loadX() }, [loadX])`. Cada bloco agora tem
  seu **próprio** par `loading`/`error` (`errorSummary`/`errorCategory`/`errorInstallments`, antes um
  único `error` compartilhado — Ponto de Atenção 4 do PLAN) e a função de load correspondente é passada
  como `onRetry` para o filho, permitindo "Tentar novamente" por bloco sem duplicar lógica de fetch
  (Cenário 4/CE01). `DashboardPage.module.css` ficou só com o `.container` (o antigo `.error` global
  saiu — cada bloco renderiza seu próprio `Feedback`).
- `SpendingSummaryCards`: recebe `summary: DashboardSummary | null` (em vez de 3 props soltas) +
  `loading`/`error`/`onRetry`, e decide internamente o que renderizar (Feedback em erro; 3× `Skeleton
  variant="card"` + 1 skeleton do gráfico em loading; conteúdo real senão) — mesmo padrão "componente
  decide o estado" que `CategoryBreakdown`/`InstallmentsOverview` já usavam antes desta etapa. 3
  `StatCard` (mês passado/atual/próximo), `title` combina rótulo + mês/ano formatado (`"Mês atual ·
  Julho de 2026"`, decisão de design não explicitada no PLAN — `StatCard` só tem um slot de `title:
  string`, sem sub-título dedicado; revisável). Badge "Projeção" via `<Badge variant="accent">` (ETAPA
  2) — **substitui** o hardcode `background: var(--accent); color: white` apontado como pendência desde
  a ETAPA 2/Ponto de Atenção 1. `breakdown` do `StatCard` recebe os 4 itens por fonte (Transações/Cartão/
  Recorrentes/Financiamentos) direto como `{label, value}[]`. `BarChart` (mês atual = `highlightIndex:
  1`) embrulhado num `Card` próprio com um título pequeno "Comparativo mensal" — decisão de design não
  explicitada no PLAN (documentada, revisável): o `BarChart` sozinho não tem superfície própria, então
  embrulhei num `Card` para manter consistência visual com os outros dois blocos do Dashboard (que já são
  cards).
- `CategoryBreakdown`: agora é um `<Card>` (em vez de `<section>` com CSS duplicado de superfície) —
  reaproveita o primitivo publicado na ETAPA 3 em vez de redeclarar `background`/`radius`/`padding`.
  Filtra e ordena `data.list` por `value` decrescente **antes** de repassar tanto ao `DonutChart` quanto
  à `DataList` (o `DonutChart` não reordena internamente — contrato da ETAPA 8 — e a correspondência de
  cor com a legenda depende de ambos usarem a mesma ordem/índice). Cada `ListRow` ganha um `dot` de
  legenda (`colorForIndex(index)`, mesmo índice usado internamente pelo `DonutChart`) via `style=
  {{backgroundColor: ...}}` referenciando o token CSS (não é hex hardcoded — é a string `'var(--chart-
  cat-N)'` que `colorForIndex` já retorna) — decisão de design não explicitada no PLAN (documentada,
  revisável): conecta visualmente cada fatia do donut à sua linha na lista, aproveitando a nota de
  handoff da própria ETAPA 8 ("a lista de categorias que a ETAPA 10 vai renderizar ao lado"). Seletor de
  mês reconstruído com `IconButton` + `ChevronLeftIcon`/`ChevronRightIcon` (ETAPA 2), mesma semântica
  `onChangeMonth(offset)` de antes. `EmptyState` (ícone `ChartIcon`) quando a lista filtrada fica vazia;
  `Skeleton` (`block` 160×160 simulando o donut + 3× `line` simulando a lista) no loading; `Feedback`
  error com retry.
- `InstallmentsOverview`: agora é um `<Card>` + `Table`/`TableRow` (ETAPA 5) com 3 colunas (Descrição,
  Parcela, Total) — `data-align="right"` (contrato nativo do `Table` da ETAPA 5) nas colunas numéricas;
  `MoneyValue` (`size="sm"` na parcela, `size="md"` no total). Tabela embrulhada em `div` com
  `overflow-x: auto` (RNF04 — evita overflow horizontal da página em telas estreitas com descrições
  longas). Toggle "incluir quitadas" continua um `<input type="checkbox">` nativo (não usei o `Input` da
  ETAPA 4 — é um controle de texto, não estilizado para checkbox), só com `accent-color: var(--color-
  primary)` (token do DS) para tingir o check nativo — decisão de design não explicitada no PLAN
  (documentada, revisável): não há um primitivo `Checkbox` publicado nas ETAPAS 2-8, e criar um novo
  componente estava fora do escopo desta etapa (só reconstrução do Dashboard). `EmptyState` (ícone
  `ReceiptIcon`) com a mensagem exata do CE02 ("Nenhuma compra parcelada em andamento"); `Skeleton`
  (3× `line`) no loading; `Feedback` error com retry.
- **Decisão de design não explicitada no PLAN, a mais importante desta etapa** (documentada para
  transparência, revisável pelo Tech Lead): **nenhum `MoneyValue` do Dashboard recebe `direction`/
  `signed`** — todos os valores ficam neutros (cor de texto herdada), não verde nem vermelho. Motivo: (1)
  por regra de negócio do PRD 002 (RN01/RN02, confirmado em `prd-002`), os três endpoints de dashboard
  (`summary`/`spending-by-category`/`installments`) só somam **despesa** — receita (`TransactionType.
  Income`) nunca entra nesses cálculos, então não há nenhum contraste "receita vs despesa" para o par
  verde/vermelho sinalizar nesta tela; (2) **[correção pós-code-review, 2026-07-03 — a formulação
  original desta nota estava factualmente incorreta e foi reescrita]** no código legado
  (`TransactionsPage.module.css`/`RecurringPage.module.css`), `.income` é verde (`var(--color-up)`) e
  `.expense` é **vermelho** (`var(--danger)`), não neutro — ambas as direções são coloridas porque essas
  listas exibem receita e despesa lado a lado, com contraste real entre as duas; esse precedente não se
  aplica ao Dashboard desta etapa, que é 100% despesa (sem contraste receita×despesa a sinalizar).
  Aplicar vermelho a **todo** número do Dashboard (por ele "ser despesa") tornaria a cor onipresente e sem
  contraste, esvaziando o propósito de "direção" do RN04. Este ponto **não bloqueou** a conclusão da
  etapa, mas ficou registrado para revisão do dev/Tech Lead à luz do Critério 8, caso a leitura pretendida
  fosse diferente.
- **Decisão do PM (consulta via broker, 2026-07-03), registrada em resposta ao code-review**: os valores
  do Dashboard permanecem **neutros**, conforme implementado nesta etapa. Em um contexto 100% despesa não
  há direção a sinalizar; verde/vermelho ficam reservados para variação/direção real (ex.: um futuro
  comparativo mês a mês) e para telas que exibem receita × despesa lado a lado (o caso do código legado
  citado acima). A implementação atual está correta — **nenhuma ação de código necessária**.
- Nenhuma chamada nova a `api.ts` — os 3 endpoints (`/api/dashboard/summary`,
  `/api/dashboard/spending-by-category`, `/api/dashboard/installments`) continuam os únicos consumidos;
  tipos/funções de `api.ts` reutilizados sem alteração de assinatura (RN08/Critério 6).
- Zero cor/hex hardcoded fora de token nos 8 arquivos alterados (confirmado via grep); nenhum `enum`;
  `import type` usado para todos os tipos; nenhum arquivo de componente exporta algo além do componente
  (helpers como `formatMonthLabel`/`buildBreakdown`/`SOURCE_LABELS` não são exportados).
  `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0) verdes.
- Verificação manual dos Cenários 2/3/4 do PRD (StatCards+barras+donut+lista; skeleton/EmptyState;
  DevTools Network só `/api/dashboard/*`; erro isolado por bloco) **não realizada nesta sessão** — sem
  acesso a browser real neste ambiente; recomenda-se ao dev rodar `npm run dev`, abrir o Dashboard e (a)
  conferir visualmente os 3 StatCards + gráfico de barras + donut + lista de parceladas, (b) checar a
  aba Network do DevTools mostrando só as 3 chamadas `/api/dashboard/*`, (c) simular falha (ex.: desligar
  o backend brevemente) para ver o `Feedback` aparecer isolado no bloco de categoria enquanto os outros
  dois blocos continuam furando normalmente.
- Duas dúvidas/decisões não bloqueantes documentadas acima (neutralidade de cor no Dashboard; ausência de
  um `Checkbox` primitivo dedicado) — ambas revisáveis pelo dev/Tech Lead; nenhuma impediu a conclusão da
  etapa.

**Objetivo:** Reconstruir o Dashboard sobre os primitivos + gráficos, com skeletons/EmptyState/Feedback,
consumindo só os endpoints existentes (RF06/RF07; Critérios 6/7; CE01/CE02; mantendo `useState`/`useEffect`).

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `frontend/src/features/dashboard/DashboardPage.tsx` (reescrito — layout + wiring dos estados)
- `frontend/src/features/dashboard/DashboardPage.module.css` (reescrito)
- `frontend/src/features/dashboard/components/SpendingSummaryCards.tsx` + `.module.css` (reescritos)
- `frontend/src/features/dashboard/components/CategoryBreakdown.tsx` + `.module.css` (reescritos)
- `frontend/src/features/dashboard/components/InstallmentsOverview.tsx` + `.module.css` (reescritos)
- `frontend/src/features/dashboard/api.ts` (inalterado — reutilizar tipos/funções)

**O que implementar:**
- Manter o padrão de dados atual (**sem React Query**): os três `useEffect` independentes
  (`summary` uma vez; `spending-by-category` por mês; `installments` por `includeSettled`), **cada bloco
  com seu próprio `loading`/`error`** para permitir **erro isolado por bloco** (Cenário 4 / CE01 —
  hoje o `error` é único e compartilhado; separar em três estados de erro).
- `SpendingSummaryCards` → 3 `StatCard` (mês passado/atual/próximo) com badge "Projeção" quando
  `isProjected`, número em IBM Plex, breakdown por fonte em `ListRow`/`MoneyValue`; **+ `BarChart`** de
  comparativo (as 3 barras `totalExpense`, mês atual destacado).
- `CategoryBreakdown` → **`DonutChart`** do `list` (categoria×total) ao lado da lista de categorias
  (`DataList`/`ListRow` + `MoneyValue` + total); seletor de mês reconstruído com `IconButton`
  (chevron) ou `Tabs`, **mesma semântica** de hoje (`onChangeMonth`); `EmptyState` "Sem gastos neste
  período" quando `list` vazia; `Skeleton` no loading.
- `InstallmentsOverview` → `Table`/`TableRow` estilizada com `MoneyValue`; toggle "incluir quitadas"
  mantido (reconstruído com controle do DS); `EmptyState` quando vazio; `Skeleton` no loading.
- Feedback de erro reutilizável (`Feedback error`) **por bloco** com retry quando aplicável.
- Não alterar assinaturas de `api.ts` nem adicionar chamadas novas (RN08/Critério 6).

**Testes Necessários:**
- [x] Build/lint verdes.
- [ ] (Manual) Cenário 2 — StatCards + barras + donut + lista aparecem; DevTools Network mostra só `/api/dashboard/*`. *(pendente — sem acesso a browser real)*
- [ ] (Manual) Cenário 3 — skeleton no loading; EmptyState em mês vazio. *(pendente — sem acesso a browser real)*
- [ ] (Manual) Cenário 4 — forçar falha em `spending-by-category` (ex.: offline pontual) e ver só aquele bloco em erro. *(pendente — sem acesso a browser real)*

**Critérios de Aceitação:**
- [x] StatCards, barras, donut e lista de parceladas presentes; só endpoints existentes (Critério 6).
- [x] Skeleton/EmptyState/Feedback por bloco (Critério 7).
- [x] Semântica de cores: números verde/vermelho, CTAs amarelo, sem fundo verde/vermelho (Critério 8) — no Dashboard os valores ficam neutros por decisão do PM (ver nota de handoff acima); nenhum fundo verde/vermelho, CTAs seguem amarelo.
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 3 (StatCard/MoneyValue/Card), ETAPA 5 (DataList/Table/Tabs), ETAPA 6 (estados), ETAPA 8 (gráficos); ETAPA 2 (Button/IconButton)

---

### ETAPA 11: Varredura de consistência — telas herdadas (Login, CRUD, Projeção)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-07-03
**Commit:** 83ee90e

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- Grep completo em `frontend/src/**/*.module.css` (padrão `color:\s*white|color:\s*#|background:\s*white|
  #[0-9a-fA-F]{3,6}|rgba?\(|color:\s*black`) confirmou que os únicos hardcodes remanescentes eram
  **exatamente** os já mapeados pelo PLAN — nada além disso apareceu:
  - `color: white` em `.form button` (fundo `--accent`/amarelo) de **6 arquivos**: `LoginPage`,
    `TransactionsPage`, `RecurringPage`, `CreditCardsPage`, `FinancingPage`, `ProjectionPage` →
    trocado por `color: var(--color-on-primary)` (preto sobre amarelo, RN05). `CreditCardsPage` tinha
    uma **segunda** ocorrência não citada explicitamente no PLAN (`.cardTabActive`, mesma classe de
    fundo `--accent`) — corrigida pela mesma razão/token, dentro do espírito da etapa (mesmo padrão de
    hardcode, mesmo arquivo já listado no PLAN).
  - `color: #15803d` (verde de receita) em `TransactionsPage.module.css` e `RecurringPage.module.css`
    (classe `.income`) → trocado por `var(--color-up)` (RN04 — direção financeira por token).
  - Zero cor/hex hardcoded restante confirmado por grep pós-edição (mesmo padrão, 0 resultados).
- **Foco visível**: nenhum dos 6 arquivos sobrescreve `outline`/`:focus` — todos herdam a regra global
  `:focus-visible { outline: none; box-shadow: var(--focus-ring); }` do `index.css` (ETAPA 1) sem
  necessidade de ajuste.
- **Herança de aliases**: conferido que os 6 arquivos já usam só `var(--surface)`, `var(--border)`,
  `var(--text)`, `var(--text-muted)`, `var(--danger)`, `var(--accent)` — todos remapeados aos tokens
  dark pela ETAPA 1; nenhum fundo/borda/texto hardcoded fora desses aliases.
- **Contraste** (observação não bloqueante, revisável pelo dev/Tech Lead): as classes `.muted`/`.field`
  usam `--text-muted` (`--color-muted`, #707a8a) sobre `--surface` (#1e2329) a 13-14px — contraste
  calculado ≈3.65:1, abaixo do AA de texto normal (4.5:1), embora acima do AA de componente/texto
  grande (3:1). **Não foi alterado**: é o mesmo token `--color-muted` usado identicamente em
  `StatCard`/captions do Dashboard (ETAPA 3, já aceito) — é uma escolha do próprio Design System (valor
  extraído da Binance), não um hardcode de tela legada; mudar o token afetaria o app inteiro e está fora
  do escopo desta etapa (que é eliminar hardcodes pontuais, não reabrir a paleta do DS). Sinalizado para
  o dev decidir se quer endurecer `--color-muted` globalmente em uma etapa futura.
- **Layout preservado**: nenhuma reestruturação de componente, nenhum modal/drawer introduzido, nenhum
  filtro adicionado (RN09) — só troca de valor de `color` em declarações já existentes, confirmado via
  `git diff` (9 inserções/9 remoções, todas linhas `color:`).
- `npm run build --prefix frontend` (tsc -b && vite build) e `npm run lint --prefix frontend` (oxlint,
  exit code 0) verdes.
- Verificação manual dos Cenários 1/7 (tela dark, legível, sem branco-sobre-amarelo, layout preservado)
  **não realizada nesta sessão** — sem acesso a browser real neste ambiente; recomenda-se ao dev rodar
  `npm run dev` e conferir visualmente os 6 botões de accent (agora preto sobre amarelo) e os valores de
  receita (verde `--color-up`) em Transações/Recorrentes.
- Nenhuma dúvida bloqueante em aberto. Uma decisão de escopo documentada acima (corrigir também
  `.cardTabActive` em `CreditCardsPage`, hardcode do mesmo tipo não citado explicitamente no PLAN) e uma
  observação de contraste não bloqueante (`--color-muted`) — ambas revisáveis pelo dev/Tech Lead.
  **Esta é a última etapa do PLAN — progresso 11/11 (100%).**

**Objetivo:** Garantir que Login, telas de CRUD e Projeção herdem o tema dark **sem redesign de layout**,
eliminando os poucos hardcodes remanescentes (RF08; Critérios 8/9; RN09).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `frontend/src/features/auth/LoginPage.module.css` (alterado)
- `frontend/src/features/transactions/TransactionsPage.module.css` (alterado)
- `frontend/src/features/recurring/RecurringPage.module.css` (alterado)
- `frontend/src/features/credit-cards/CreditCardsPage.module.css` (alterado)
- `frontend/src/features/financing/FinancingPage.module.css` (alterado)
- `frontend/src/features/projection/ProjectionPage.module.css` (alterado)

**O que implementar:**
- Substituir `color: white` (botões de accent — 6 arquivos) por `color: var(--color-on-primary)`
  (preto sobre amarelo, DS/RN05) — corrige a imperfeição herdada da ETAPA 1.
- Substituir `color: #15803d` (verde de receita, em `TransactionsPage.module.css` e
  `RecurringPage.module.css`) por `var(--color-up)` — direção financeira por token (RN04).
- Conferir que inputs/borders/fundos herdam via aliases (`--surface`/`--border`/`--text`); onde houver
  contraste ruim sobre dark, ajustar **apenas** o token consumido (sem mexer em layout).
- **Não** reestruturar layout, **não** introduzir modais/drawers, **não** adicionar filtros (RN09) —
  isso é Fase 2.

**Testes Necessários:**
- [x] Build/lint verdes.
- [ ] (Manual) Cenário 1/7 — cada tela dark, legível, layout atual preservado; nenhum branco-sobre-amarelo. *(pendente — sem acesso a browser real)*

**Critérios de Aceitação:**
- [x] Nenhum hardcode de cor fora de token nessas telas; verde só via `--color-up` (Critério 8).
- [x] Layout/interações das telas preservados (Critério 9/RN09).
- [x] `npm run build`/`lint` OK.

**Dependências:** ETAPA 1 (pode ser executada logo após a ETAPA 1; posicionada ao fim por higiene)

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Lint
- [ ] `npm run build --prefix frontend` sem erros (tsc + vite)
- [ ] `npm run lint --prefix frontend` sem novos erros/warnings

### Padrões de Código (frontend)
- [ ] Componentes de `shared/ui/` consomem **apenas** tokens (sem hex/px avulsos) — Cenário 8
- [ ] `import type` para imports type-only (`verbatimModuleSyntax`); sem `enum` (`erasableSyntaxOnly`) — usar union de string literais / `as const`
- [ ] Sem variáveis/parâmetros não usados (`noUnusedLocals`/`noUnusedParameters`)
- [ ] Arquivos de componente exportam só componentes (+ const) — regra oxlint `react/only-export-components`
- [ ] Dados via `useState`/`useEffect` + `shared/api/httpClient` (sem React Query — Decisão Técnica 9)

### Design System
- [ ] Verde/vermelho só em valores/direção (texto), nunca fundo de card; nunca sucesso/erro genérico (RN04)
- [ ] Amarelo só em CTAs/marca; texto preto sobre botão amarelo (RN05)
- [ ] Números em IBM Plex tabular; corpo em Inter (RN03)
- [ ] Responsividade nos 3 breakpoints; bottom nav mobile; sem overflow horizontal (RNF04)
- [ ] Contraste AA no corpo; foco de teclado visível; alvos ≥44px no mobile (RNF05)

### Backend / Contratos
- [ ] Nenhuma mudança de API/contrato/schema; nenhuma chamada nova (RN08/RN10/Critério 10)

### Rotas / Sessão
- [ ] Todas as rotas atuais acessíveis (direto e pela nova nav); `PrivateRoute`/redirect `*`/logout OK (Critério 10)

### PRD
- [ ] RF01-RF09 atendidos; Critérios 1-10 atendidos; Cenários 1-8 verificados

---

## LEGENDA DE STATUS
- ⏳ **Pendente** · 🔄 **Em Progresso** · ✅ **Concluída** · ❌ **Bloqueada**

---

## PONTOS DE ATENÇÃO

1. **Herança via aliases (ETAPA 1 → 11):** remapear `--accent` para amarelo faz botões de CRUD com
   `color: white` ficarem branco-sobre-amarelo até a ETAPA 11. É imperfeição visual, não quebra build.
   Não pular a ETAPA 11.
2. **`tsconfig` estrito:** `verbatimModuleSyntax` + `erasableSyntaxOnly` + `noUnusedLocals/Parameters`.
   Usar `import type`, evitar `enum` (usar `as const`/union), não deixar props/vars sem uso. Primitivos
   não importados **compilam** (o `tsc -b` checa por `include: ["src"]`, mas arquivo sem consumidor não
   dispara `noUnusedLocals`).
3. **oxlint `react/only-export-components`:** manter constantes/tokens em `.ts` puro (ex.: `palette.ts`,
   `icons/` só componentes), não misturar helpers exportados em arquivos de componente.
4. **Erro isolado por bloco no Dashboard:** hoje o `error` é um único estado compartilhado. A ETAPA 10
   deve separar em três (`errorSummary`/`errorCategory`/`errorInstallments`) para atender o Cenário 4/CE01.
5. **Sem novas rotas (Decisão 5):** não prefixar paths com `/lancamentos`/`/compromissos`; a área é
   navegação. Isso protege deep-links, `PrivateRoute`, redirect `*` e o redirect 401 do `httpClient`.
6. **Paleta de gráfico é extensão do DS:** o DS não define paleta categórica (Known Gap). Os tokens
   `--chart-cat-*` são neutros + accent, sem verde/vermelho e sem segundo brand color — marcados como
   revisáveis pelo dev.
7. **`public/icons.svg` é lixo do scaffold** (bluesky/discord/x). Não reutilizar; ícones de nav são
   componentes SVG próprios em `shared/ui/icons/`.
8. **`package-lock.json`** já aparece modificado no working tree (resíduo do PLAN 002). `npm install`
   das fontes (ETAPA 1) vai atualizá-lo — commitar o lock junto das deps de fonte é o esperado.

---

## DECISÕES TÉCNICAS

> Todas revisáveis pelo dev. Decisões 1-4 têm ADR dedicado em `adr/`.

### Decisão 1: Tokens como CSS custom properties globais + aliases legados (ADR 0001)
- **Escolha**: fonte única em `index.css` com nomes semânticos do DS + aliases legados (`--surface`,
  `--border`, `--text`, `--accent`…) remapeados aos valores dark.
- **Justificativa**: todas as telas já consomem esses aliases; remapear = herança dark sem editar cada
  CSS Module (baixo risco, Critério 9). Sem Tailwind (RNF01).
- **Alternativas**: renomear tokens em todos os módulos agora (churn/risco); CSS-in-JS (contraria restrição).

### Decisão 2: Fontes self-host via `@fontsource` — Inter Variable + IBM Plex Sans tabular (ADR 0002)
- **Escolha**: `@fontsource-variable/inter` (texto) + `@fontsource/ibm-plex-sans` 500/600/700 com
  `tabular-nums` (números).
- **Justificativa**: sem dependência de rede em runtime (VPS pessoal, zero integrações externas);
  versionado; Plex Sans tabular reproduz o caráter do BinancePlex melhor que Plex Mono.
- **Alternativas**: Google Fonts CDN (dependência externa/privacidade); woff2 manual (perde subsetting);
  JetBrains Mono (mais frio).

### Decisão 3: Gráficos em SVG próprio, sem lib (ADR 0003)
- **Escolha**: `DonutChart`/`BarChart` em SVG puro, encapsulados; zero dependência de gráfico.
- **Justificativa**: só 2 gráficos simples e estáticos nesta fase; bundle enxuto (RNF06); fidelidade
  total a tokens; RNF07 trivial; sem risco de peer-dep com React 19.
- **Alternativas**: Recharts (bundle/atritos React 19 — fica como escalonamento p/ Fase 2);
  Chart.js/visx/Nivo (peso/complexidade desnecessária).

### Decisão 4: Modal/Drawer sobre `<dialog>` nativo (ADR 0004)
- **Escolha**: primitivo próprio sobre `<dialog>` (`showModal()`), foco/Esc/backdrop nativos.
- **Justificativa**: acessibilidade de graça, zero dependência; groundwork suficiente para a Fase 2.
- **Alternativas**: Radix Dialog/react-aria (escalonamento se a Fase 2 exigir composição rica).

### Decisão 5: Sem novas rotas — áreas são agrupamento de navegação
- **Escolha**: manter os paths atuais (`/`, `/transactions`, `/recurring`, `/credit-cards`,
  `/financing`, `/projection`); a "área" (Lançamentos/Compromissos) é computada do path via
  `useLocation`; sub-abas apontam às rotas existentes.
- **Justificativa**: menor risco (Critério 10) — preserva deep-links, `PrivateRoute`, redirect `*` e o
  redirect 401 do `httpClient`, que dependem dos paths atuais. O PRD (Handoff 5) admite ambas; a
  reagrupação por navegação atende os Critérios 4/5 sem superfície de bug de redirect.
- **Alternativas**: rotas-área com redirects (`/lancamentos` → `/transactions`) — mais mudança, mais risco.

### Decisão 6: Modelo de navegação desktop — sidebar persistente + sub-abas
- **Escolha**: sidebar lateral no desktop (4 áreas), sub-navegação como abas (`Tabs`/SubNav) no topo do
  conteúdo das áreas de 2 telas; bottom nav no mobile.
- **Justificativa**: alinha com a inspiração (Visor Finance) e com apps de dashboard; sidebar escala
  para ícone+rótulo e destaca a área ativa; abas mantêm as rotas intactas (Decisão 5).
- **Alternativas**: top-nav horizontal (menos espaço para 4 áreas + sub-itens; menos "app de finanças").

### Decisão 7: Sem gráfico de linha / sparkline de projeção nesta fase
- **Escolha**: **não** incluir line chart nem mini-sparkline de projeção no Dashboard (Handoff 6, opção a).
- **Justificativa**: o endpoint de projeção retorna **um ponto** (data-alvo), não série temporal;
  montar série exigiria N chamadas client-side — custo/latência/complexidade sem valor no escopo
  pessoal. O PRD posiciona o line chart na Fase 2 (redesign da Projeção). `LineChart` fica fora.
- **Alternativas**: sparkline via múltiplas chamadas (opção b) — rejeitado por custo/escopo.

### Decisão 8: Sem framework de teste de frontend nesta fase
- **Escolha**: validar por `npm run build` (tsc) + `npm run lint` (oxlint) + verificação manual dos
  Cenários (como no PLAN 002). Não introduzir Vitest/Testing Library agora.
- **Justificativa**: não há teste de front existente para imitar; introduzir framework é adição de infra
  fora do escopo do PRD; os Critérios/Cenários BDD e a DoD servem de âncora.
- **Recomendação (Fase 2)**: se/quando testes entrarem, **Vitest + React Testing Library** (nativo ao Vite).
- **Alternativas**: introduzir Vitest agora — rejeitado (escopo/consistência).

### Decisão 9: Frontend sem React Query
- **Escolha**: manter `useState`/`useEffect` + `shared/api/httpClient` (padrão real do código).
- **Justificativa**: React Query **não** está instalado e nenhuma feature o usa; o PRD/context o
  mencionam, mas o código é a fonte de verdade. Introduzi-lo é mudança de infra fora do escopo
  (consistente com a Decisão 5 do PLAN 002).
- **Alternativas**: instalar React Query — rejeitado.

---

## RISCOS E MITIGAÇÕES

### Risco 1: Vazamento do tema claro em telas herdadas (Critério 9)
- **Impacto**: Médio · **Probabilidade**: Baixa
- **Mitigação**: aliases legados remapeados aos valores dark (ETAPA 1) fazem a herança automática; a
  varredura (ETAPA 11) elimina os poucos hardcodes (`color: white`, `#15803d`) — já mapeados na análise.

### Risco 2: Regressão de navegação/rotas ao reconstruir o shell (Critério 10)
- **Impacto**: Alto · **Probabilidade**: Baixa
- **Mitigação**: **não** alterar rotas (Decisão 5); conferir `PrivateRoute`, redirect `*` e redirect 401
  do `httpClient`; teste manual de deep-link em cada path + logout.

### Risco 3: Gráfico SVG próprio com esforço/arestas (donut/barras)
- **Impacto**: Médio · **Probabilidade**: Média
- **Mitigação**: escopo mínimo (donut de categorias + 3 barras); wrappers isolados (RNF07) permitem
  trocar por Recharts na Fase 2 sem tocar consumidores. Line chart fica fora (Decisão 7).

### Risco 4: Fontes substitutas afrouxando a hierarquia (line-height)
- **Impacto**: Baixo · **Probabilidade**: Média
- **Mitigação**: aplicar redução ~-3% no line-height dos tokens de display (nota do DS); IBM Plex com
  `tabular-nums` para alinhamento de colunas.

### Risco 5: Paleta categórica de gráfico destoando do DS
- **Impacto**: Baixo · **Probabilidade**: Média
- **Mitigação**: `--chart-cat-*` neutros + 1 accent, sem verde/vermelho e sem segundo brand color;
  marcado como extensão revisável (ADR 0003).

### Risco 6: Fidelidade visual subjetiva ("melhorar consideravelmente")
- **Impacto**: Médio · **Probabilidade**: Média
- **Mitigação**: Critérios/Cenários BDD como âncora objetiva; validar o resultado visual do shell +
  Dashboard com o dev antes de fechar (Nota de Handoff).

---

## DOCUMENTAÇÃO DE REFERÊNCIA
- **PRD**: prd/mz-finance-prd-003-tbd-redesign-frontend-fundacao-design-system.md
- **Design System**: docs/design/design-system.md
- **Contexto**: mz-finance-context.md · **Map**: mz-finance-map.json
- **ADRs**: adr/0001-design-tokens-css-custom-properties.md · adr/0002-fontes-self-host-fontsource-inter-ibm-plex.md · adr/0003-graficos-svg-proprio-sem-lib.md · adr/0004-modal-drawer-native-dialog.md
- **Código de referência**:
  - `frontend/src/index.css` (tokens placeholder a substituir)
  - `frontend/src/app/{App.tsx,AppLayout.tsx,AppLayout.module.css}` (shell atual)
  - `frontend/src/features/dashboard/{DashboardPage.tsx,api.ts,components/*}` (Dashboard a redesenhar)
  - `frontend/src/features/*/**.module.css` (telas que herdam o tema)
  - `frontend/src/shared/{formatCurrency.ts,api/httpClient.ts}` (base compartilhada)
  - `frontend/{package.json,tsconfig.app.json,.oxlintrc.json,vite.config.ts}` (build/lint/estrito)

---

## COMANDOS ÚTEIS

```bash
# Instalar deps de fonte (ETAPA 1)
npm install --prefix frontend @fontsource-variable/inter @fontsource/ibm-plex-sans

# Build (tsc -b && vite build) — verde ao fim de cada etapa
npm run build --prefix frontend

# Lint (oxlint)
npm run lint --prefix frontend

# Dev server (verificação manual dos cenários)
npm run dev --prefix frontend
```

---

## INSTRUÇÕES DE ATUALIZAÇÃO

Atualizado automaticamente pelo `/implementar` após cada etapa: status + data, barra de progresso, checklists.

---

## OBSERVAÇÕES
1. Implementar uma etapa por vez; `build` + `lint` verdes antes de avançar.
2. Seguir os padrões reais do código (CSS Modules + tokens; `useState`/`useEffect`; sem Tailwind; sem React Query).
3. `/code-review` após cada etapa.

---

## NOTA DE HANDOFF PARA O DEV

**Ordem e dependências**
- Começe pela **ETAPA 1** (tokens/tema/fontes): é a fundação; sozinha já vira o app dark e faz as telas
  antigas herdarem via aliases legados.
- **ETAPAS 2-8 (primitivos)** dependem só da ETAPA 1 e são independentes entre si — pode paralelizar,
  mas siga a numeração para o shell/Dashboard encontrarem tudo pronto. **ETAPA 9 (shell)** precisa de
  2 e 5; **ETAPA 10 (Dashboard)** precisa de 3, 5, 6, 8 (e 2). **ETAPA 11 (varredura)** só precisa da 1.
- A **branch** é `feature/redesign-frontend-fundacao` (padrão do projeto). O repo está em `main`, sem
  remote configurado (não há `git fetch/pull` a fazer); há `package-lock.json` modificado no working
  tree (resíduo do PLAN 002) — o `npm install` da ETAPA 1 vai atualizá-lo; commite o lock junto.

**Armadilhas (leia antes de codar)**
- `tsconfig` estrito: `import type` para tipos; **nada de `enum`** (`erasableSyntaxOnly` — use
  `as const`/union de string literais); nada de var/param sem uso.
- oxlint: arquivo de componente exporta só componente(s) (+ const). Ícones/paleta em arquivos próprios.
- **Não** reutilize `public/icons.svg` (lixo do scaffold). Ícones de nav = componentes SVG próprios.
- **Não** instale React Query nem lib de gráfico (Decisões 9 e 3).
- **Não** crie rotas novas nem redirects de área (Decisão 5) — protege deep-links e o redirect 401.
- No Dashboard, **separe o estado de erro por bloco** (hoje é um só) para o Cenário 4/CE01.
- Botão amarelo = **texto preto** (`--color-on-primary`), nunca branco (RN05).

**O que NÃO fazer nesta fase (é Fase 2)**
- **Não** redesenhar layout das telas de CRUD nem migrar formulários para modal/drawer (RN09).
- **Não** adicionar filtros/busca client-side nas telas de CRUD.
- **Não** implementar o gráfico de linha da Projeção nem sparkline (Decisão 7).
- **Não** introduzir toggle de tema light nem framework de teste (Decisão 8).

**Validação por etapa**: `npm run build --prefix frontend` + `npm run lint --prefix frontend` verdes +
checagem manual dos Cenários relacionados (rodando `npm run dev`, testando desktop ≥1024 e mobile <768).

**Dúvidas técnicas em aberto**: nenhuma bloqueante. As 8 dúvidas do Handoff do PRD foram decididas
(Decisões Técnicas 1-9 + ADRs 0001-0004) com base nas restrições do projeto (sem Tailwind, CSS Modules,
React 19 + Vite, bundle enxuto, uso pessoal). Todas marcadas como **revisáveis pelo dev**.

---

## DÍVIDAS PARA FASE 2

> Registradas no code-review pós-ETAPA 11 (2026-07-03). Nenhuma bloqueia o fechamento deste PLAN; nenhuma
> exige mudança de código nesta Fase 1 — ficam como backlog para a Fase 2 do redesign.

1. **Contraste AA de `--color-muted` em captions** (~3.64:1, abaixo do AA de texto normal 4.5:1 — observação
   já registrada na ETAPA 11): revisar se o token deve ser endurecido globalmente, dado o impacto em todo o
   app (captions do `StatCard`, `.muted`/`.field` das telas legadas, etc.).
2. **`aria-label` nas sub-abas (`Tabs`)**: o primitivo `Tabs`/SubNav (ETAPA 5) não define `aria-label` no
   `<nav>`/grupo de abas — adicionar rótulo acessível ao contêiner de navegação.
3. **`prefers-reduced-motion` em `Skeleton`/`Modal`**: o pulso de opacidade do `Skeleton` (ETAPA 6) e as
   animações de entrada do `Modal`/`Drawer` (ETAPA 7) não respeitam a preferência de movimento reduzido do
   usuário.
4. **`aria-invalid` no `Field`**: o primitivo `Field` (ETAPA 4) expõe mensagem de erro mas não propaga
   `aria-invalid`/`aria-describedby` de erro ao controle filho de forma completa para leitores de tela.
5. **Formatação pt-BR de `endDate` nas parceladas**: a listagem de parceladas (`InstallmentsOverview`,
   ETAPA 10) não formata a data final no padrão pt-BR.
6. **Unificação do tratamento de item ativo sidebar × bottom nav**: a ETAPA 9 resolveu o estado ativo de
   área via `paths.includes(pathname)` computado no `AppLayout` (em vez do `isActive` nativo do `NavLink`)
   para cobrir as áreas de 2 telas — revisar se sidebar (desktop) e bottom nav (mobile) podem compartilhar a
   mesma lógica/componente de item ativo em vez de duplicar a derivação.

---

**Criado em:** 2026-07-02
**Próximo passo:** `/implementar ETAPA 1`
