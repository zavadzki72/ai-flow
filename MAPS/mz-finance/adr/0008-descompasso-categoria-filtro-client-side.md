# ADR 0008 — Descompasso de categoria: filtro client-side por nome (não usar `category_slug` do Visor)

- **Status**: ⛔ SUPERADO por [ADR 0009](0009-import-visor-preview-editavel-exclusao-cartao.md) (2026-07-07)
- **Data**: 2026-07-06
- **Contexto**: PRD 004 — Handoff §17 item 4; RN14; DP5; C3
- **Decisores**: Arquiteto de Software Sênior (humano ausente)

> **⛔ SUPERADO (2026-07-07):** Após teste do usuário, o **filtro de categoria foi removido** do import.
> A seção de categorias saiu do modal e não há mais filtragem por categoria no backend. A categoria
> agora é apenas **sugerida por linha no preview** (nome da categoria do Visor) e **editável** antes de
> confirmar — ver ADR 0009. O restante deste ADR fica como registro histórico.

## Contexto

O modal de importação oferece um multiselect de categoria **populado pelas categorias do mz-finance** (DP5/RN14) — que hoje são apenas **strings** agregadas das transações/recorrências/compras do usuário (ver `GetCategoriesQueryHandler`). Já o filtro `category_slug` do `get_transactions` espera **slugs próprios do Visor**. O payload do Visor, por outro lado, traz `category_name` (nome legível, ex.: "Alimentação"). O PRD (RN14) **não** presume solução — só exige que o multiselect seja local.

## Decisão

1. **Não** enviar o filtro `category_slug` ao Visor. As chamadas `get_transactions` carregam apenas prazo, tipo, `exclude_ignored` e busca.
2. **Filtrar client-side no handler** de importação: quando o usuário seleciona categorias, manter apenas os itens cujo `category_name` do Visor **casa (case-insensitive)** com algum nome selecionado.
3. **Sem categorias selecionadas** ⇒ sem filtro de categoria (importa tudo do prazo/tipo).
4. A `Transaction` importada grava o `category_name` do Visor como **texto** em `Category` (RN08); ausente ⇒ "Sem categoria".

## Consequências

- (+) Zero manutenção de mapa slug↔categoria; imune a mudanças de slug do Visor.
- (+) Usa o dado que o Visor já entrega (`category_name`), coerente com "categoria é texto" (RN08).
- (+) O multiselect permanece 100% local (RN14/DP5).
- (−) Se o usuário renomeou uma categoria localmente e ela diverge do `category_name` do Visor, o filtro pode não casar aquele item — **limitação conhecida e aceitável** (o critério só pede multiselect local; sem seleção, importa tudo).
- (−) Traz mais linhas do Visor do que o estritamente filtrado (filtra depois) — irrelevante no volume pessoal.

## Alternativas consideradas

- **Manter um mapa categoria-local ↔ slug-Visor**: exige descobrir/curar slugs do Visor e mantê-los sincronizados — frágil e fora do espírito de "categoria é texto" — rejeitada.
- **Aplicar o filtro só sobre transações já importadas**: semântica confusa (filtraria o histórico local, não a importação) — rejeitada.
- **Usar `get_categories` do Visor para popular o multiselect**: contraria DP5/RN14 (multiselect deve ser local) — rejeitada.
