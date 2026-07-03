# ADR 0003 — Gráficos por SVG próprio encapsulado (sem lib de gráficos nesta fase)

- **Status**: Proposto (revisável pelo dev)
- **Data**: 2026-07-02
- **Contexto**: PRD 003 — RF06/RNF06/RNF07 / Handoff §Nota item 1
- **Decisores**: Arquiteto de Software Sênior (humano ausente)

## Contexto

O Dashboard precisa de **dois** tipos de gráfico nesta fase: **donut** (gasto por categoria) e
**barras** (comparativo mensal — 3 barras: mês passado/atual/próximo). O gráfico de **linha** da
projeção é explicitamente Fase 2 (ver Decisão no PLAN). Restrições: bundle enxuto (RNF06), wrappers
desacoplados da lib para troca futura (RNF07), sem Tailwind, React 19.2, uso pessoal.

## Decisão

1. **Implementar os dois gráficos em SVG puro**, encapsulados em `shared/ui/charts/DonutChart.tsx` e
   `BarChart.tsx`. Donut = arcos via `stroke-dasharray` em `<circle>`; barras = `<rect>`.
2. **Zero dependência de gráfico** adicionada ao `package.json` nesta fase.
3. **Cores por token** (ver ADR 0001): segmentos do donut usam uma paleta categórica de tokens
   `--chart-cat-1..N` (neutros dessaturados + 1 accent), respeitando o DS (accent único; verde/vermelho
   reservados a direção financeira, **não** usados como categorias). Barras usam superfícies neutras
   (`--color-surface-elevated`/`--color-muted`) com a barra do **mês atual destacada** por accent
   contido (borda/rótulo), evitando preencher grande superfície de amarelo (RN05).
4. O contrato dos wrappers recebe dados + tokens; a implementação SVG fica **isolada** nesses dois
   arquivos — trocar por uma lib no futuro toca só eles (RNF07 satisfeito por construção).

## Consequências

- (+) Nenhum peso de bundle de lib; nenhum risco de peer-dependency com React 19.
- (+) Fidelidade total aos tokens do DS; controle de acessibilidade/markup.
- (+) RNF07 trivial: o "wrapper desacoplado" é a própria fronteira.
- (−) Sem tooltips/animações/escalas prontas. Aceitável: comparativo de 3 barras e donut de categorias
  são simples e estáticos no escopo pessoal.
- (−) Se a Fase 2 exigir interatividade rica (linha temporal com hover/zoom), reavaliar.

## Alternativas consideradas

- **Recharts**: ergonômico, mas ~antes tinha atritos de peer-dep com React 19 e adiciona bundle
  relevante para só 2 gráficos simples. Fica como **caminho de escalonamento** se a Fase 2 crescer.
- **Chart.js/react-chartjs-2**: canvas (menos fiel a tokens CSS, menos acessível), bundle maior.
- **visx/Nivo**: poderosos, porém pesados/verbosos para o escopo atual.
