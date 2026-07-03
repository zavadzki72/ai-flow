# ADR 0001 — Design tokens como CSS custom properties globais (fonte única)

- **Status**: Proposto (revisável pelo dev)
- **Data**: 2026-07-02
- **Contexto**: PRD 003 — Fundação do redesign de frontend
- **Decisores**: Arquiteto de Software Sênior (humano ausente; decisão delegada — Handoff §Nota, item 3)

## Contexto

O frontend usa CSS Modules (restrição do projeto: **sem Tailwind**). Hoje `frontend/src/index.css`
define 7 variáveis placeholder de tema claro (`--text`, `--text-muted`, `--bg`, `--surface`,
`--border`, `--accent`, `--danger`, `--sans`) e **todos** os CSS Modules das telas já consomem essas
variáveis via `var(--token)` (confirmado por varredura: quase nenhum hex hardcoded). O Design System
oficial (`docs/design/design-system.md`, base Binance dark) precisa virar a fonte única de
cores/tipografia/espaçamento/radius/elevação.

Os wrappers de gráfico (SVG próprio — ver ADR 0003) precisam das cores em contexto SVG (`fill`/`stroke`).

## Decisão

1. **Fonte única = CSS custom properties globais** declaradas em `:root` no `frontend/src/index.css`,
   com nomes **semânticos do DS**: `--color-canvas`, `--color-surface-card`,
   `--color-surface-elevated`, `--color-hairline`, `--color-body`, `--color-muted`,
   `--color-muted-strong`, `--color-on-dark`, `--color-primary`, `--color-primary-active`,
   `--color-primary-disabled`, `--color-on-primary`, `--color-up`, `--color-down`, `--color-info`;
   tipografia (`--font-sans`, `--font-number`, e tokens de tamanho/peso/line-height);
   espaçamento (`--space-xxs`…`--space-section`); radius (`--radius-xs`…`--radius-pill`).
2. **Aliases de compatibilidade**: manter os nomes legados (`--text`, `--text-muted`, `--bg`,
   `--surface`, `--border`, `--accent`, `--danger`, `--sans`) **remapeados para os valores dark do DS**.
   Isso faz **todas as telas antigas herdarem o tema dark automaticamente**, sem editar cada CSS Module.
3. **SVG consome os mesmos tokens** via `var(--token)` em atributos/CSS. Onde JS precisa enumerar cores
   (paleta categórica do donut), um módulo TS fino (`shared/ui/charts/palette.ts`) apenas **lista os
   nomes das custom properties** (`'var(--chart-cat-1)'`, …) — a definição de valor continua no CSS.
4. **Sem espelho TS de tokens de cor** além da lista de paleta: evita duas fontes de verdade.

## Consequências

- (+) Troca de tema/valor num único arquivo; telas legadas herdam sem churn (baixo risco — Critério 9).
- (+) Sem dependência nova; compatível com CSS Modules e SVG.
- (−) Dois conjuntos de nomes convivem temporariamente (semânticos + aliases legados). Mitigação: a Fase 2
  migra os CSS Modules de CRUD para os nomes semânticos e remove os aliases.
- (−) O DS não define paleta categórica de gráfico (Known Gap do DS). Sanamos com tokens `--chart-cat-*`
  neutros + 1 accent (ver ADR 0003), marcados como extensão explícita e revisável.

## Alternativas consideradas

- **Renomear tokens em todos os CSS Modules agora**: maior churn e risco de regressão, sem ganho nesta fase.
- **Espelho TS completo dos tokens (constantes)**: duplica a fonte de verdade; desnecessário porque SVG lê `var()`.
- **CSS-in-JS / styled-components**: contraria a restrição de CSS Modules do projeto.
