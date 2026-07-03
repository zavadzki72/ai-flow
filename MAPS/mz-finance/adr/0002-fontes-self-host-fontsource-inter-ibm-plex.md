# ADR 0002 — Fontes Inter + IBM Plex self-hosted via @fontsource

- **Status**: Proposto (revisável pelo dev)
- **Data**: 2026-07-02
- **Contexto**: PRD 003 — RF02 / Critério 2 / Handoff §Nota item 2
- **Decisores**: Arquiteto de Software Sênior (humano ausente)

## Contexto

O DS especifica tipografia bipartida: **Inter** (substituta de BinanceNova, texto editorial) e
**IBM Plex** (substituta de BinancePlex, números/valores). Nenhuma fonte está instalada hoje
(`package.json` só tem react/react-dom/react-router-dom). O app roda numa VPS pessoal, **sem
integrações externas** (context.md#integracoes). O DS pede ajuste de line-height ~-3% nos títulos display.

## Decisão

1. **Self-host via `@fontsource`** (npm, woff2 subsetado, versionado, tree-shakeable), não CDN.
   - Editorial: `@fontsource-variable/inter` (fonte variável — cobre pesos 400/500/600/700 num arquivo).
   - Números: `@fontsource/ibm-plex-sans` nos pesos **500/600/700** (os pesos usados por tokens numéricos).
2. **Variante para números = IBM Plex Sans com `font-variant-numeric: tabular-nums`** (não Plex Mono).
   Racional: BinancePlex é um sans proporcional com números tabulares; Plex Sans + tabular-nums reproduz
   esse caráter (alinhamento em colunas) sem o aspecto "código/monoespaçado" do Plex Mono.
3. **Aplicação por token**: `--font-sans` (Inter) para corpo/títulos/labels/nav/botões;
   `--font-number` (IBM Plex Sans, tabular) para valores monetários/percentuais/contadores — via o
   primitivo `MoneyValue` e o token `--font-number` nos StatCards/tabelas.
4. **Line-height**: tokens de display aplicam a redução ~-3% recomendada pelo DS.
5. Imports de fonte concentrados em `frontend/src/index.css` (ou `main.tsx`), carregados uma vez.

> **Nota de verificação para o Dev**: confirmar no install os nomes/pesos exatos disponíveis
> (`npm view @fontsource-variable/inter`, `npm view @fontsource/ibm-plex-sans`). Se um pacote variável
> de IBM Plex Sans estiver disponível e estável, pode substituir os pesos estáticos.

## Consequências

- (+) Sem dependência de rede em runtime; privacidade; funciona offline na VPS.
- (+) Versionado no repositório; build reprodutível.
- (−) Acréscimo de bytes de fonte ao bundle/asset (cacheável). Mitigação: variável para Inter, apenas
  os pesos necessários para Plex, `font-display: swap`.

## Alternativas consideradas

- **Google Fonts CDN**: introduz dependência externa de runtime e questão de privacidade num app que
  hoje não tem nenhuma integração externa — rejeitado.
- **woff2 manual em `public/` + @font-face**: funciona, mas perde versionamento/subsetting gerenciado.
- **JetBrains Mono para números**: mais fiel à "monospace tabular", porém mais frio; Plex Sans tabular é
  mais próximo do caráter humanista do BinancePlex.
