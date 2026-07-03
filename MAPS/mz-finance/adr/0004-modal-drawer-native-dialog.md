# ADR 0004 — Primitivo Modal/Drawer sobre o elemento nativo `<dialog>`

- **Status**: Proposto (revisável pelo dev)
- **Data**: 2026-07-02
- **Contexto**: PRD 003 — Critério 3 / Handoff §Nota item 7
- **Decisores**: Arquiteto de Software Sênior (humano ausente)

## Contexto

O DS pede um primitivo de sobreposição (`Modal`/`Drawer`) publicado já na Fase 1 como **fundação** da
migração de formulários da Fase 2 (os formulários de CRUD virarão modais/drawers). Nesta fase o
Dashboard **não** exige um modal (seus controles são inline), então o primitivo é groundwork: precisa
existir, ser derivado de tokens e ser acessível. React 19.2, sem Tailwind, bundle enxuto.

## Decisão

1. **Implementação própria sobre o `<dialog>` nativo** (`showModal()`), em
   `shared/ui/overlay/Modal.tsx` + variante `Drawer` (mesma base, ancoragem lateral via CSS).
2. Aproveitar do `<dialog>`: **focus-trap, `Esc` para fechar, backdrop (`::backdrop`) e inertização do
   fundo** nativos — acessibilidade sem dependência.
3. Estilo 100% por tokens do DS (superfície `--color-surface-card`, radius, hairline, elevação).
4. **Não** acoplar ao Dashboard nesta fase; entregar como componente publicado e testável isoladamente.

## Consequências

- (+) Zero dependência; acessibilidade básica (foco/Esc/backdrop) de graça.
- (+) Base pronta para a Fase 2 (formulários em modal/drawer).
- (−) `<dialog>`/`::backdrop` exigem browser moderno — adequado ao uso pessoal do dono do app.
- (−) Animações de entrada/saída são manuais (transições CSS simples). Aceitável nesta fase.

## Alternativas consideradas

- **Radix Dialog / react-aria**: headless e compatível com CSS Modules, boa acessibilidade, mas adiciona
  dependência para um primitivo que o nativo já cobre no escopo atual. Fica como **escalonamento** se a
  Fase 2 precisar de composição mais rica (dialogs aninhados, transições complexas).
- **Implementação por portal + gestão manual de foco**: reinventa o que o `<dialog>` já entrega.
