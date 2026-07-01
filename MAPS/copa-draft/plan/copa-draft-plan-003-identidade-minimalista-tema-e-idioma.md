# Plano de Execução: Identidade Minimalista, Tema Claro/Escuro e Multi-idioma (PT/EN/ES)

## Informações
- **PRD Relacionado**: prd/copa-draft-prd-003-tbd-identidade-minimalista-tema-e-idioma.md
- **Repositório(s)**: `game` (C:/Projects/Personal/copa-draft)
- **Domínio(s)**: ui, engine, achievements, store
- **Branch Base**: main
- **Complexidade**: 🔴 Alta
- **Criado em**: 2026-06-06
- **Última atualização**: 2026-06-06

---

## PROGRESSO GERAL

**Status**: ✅ Concluído
**Progresso**: 11/11 etapas concluídas (100%)

```
[🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢] 100%
```

> Implementado na branch `feature/plan-03`. Cobertura também estendida ao
> conteúdo que evoluiu além do plano original (fase de grupos: `ui/group.jsx`,
> `ui/modal.jsx`). Engine valida determinismo multi-idioma (PT/EN/ES) por teste.

> Este progresso será atualizado automaticamente pelo skill `/implementar`.

---

## VISÃO GERAL

Quatro melhorias correlatas para o Copa Draft (SPA sem build, React via CDN):
nova identidade minimalista do time (ícone geométrico + nome "Seu Draft"), tema
claro completo além do escuro existente, toggle de idioma PT/EN/ES cobrindo
**toda** a experiência (UI, narração do engine, conquistas) e um passe final de
refino visual minimalista.

A espinha dorsal são duas infraestruturas novas:
- **i18n** — um módulo `lib/i18n.js` (`window.I18N`) com dicionários PT/EN/ES e
  `t(key, vars)`, carregado como script puro (compatível com o VM dos testes).
- **Theming** — tema claro via override dos tokens CSS sob `[data-theme="light"]`,
  com aplicação pré-pintura e persistência.

Todo o resto (engine, achievements, telas) passa a **consumir** essas duas
infraestruturas. A ordem das etapas segue dados/infra → consumidores → UI →
polimento, isolando a etapa de maior risco (i18n da narração do engine, que hoje
acopla texto à lógica de fluxo).

**Decisão central de i18n da narração:** estratégia *generate-time* — o engine lê
os templates já no idioma corrente via `window.I18N` no momento da simulação,
mantendo `event.text` como string pronta. Isso preserva os consumidores de
`e.text` (ticker, pós-jogo, share card) e **preserva o determinismo**, pois a
ordem de saques do RNG não muda. A troca de idioma afeta as **próximas** partidas
(RN03 do PRD), não re-narra logs já gerados.

---

## OBJETIVOS

- [ ] Substituir a identidade do time (estrela ★ + "Time dos Sonhos") por marca geométrica minimalista + "Seu Draft" (localizado)
- [ ] Entregar tema claro completo + toggle no cabeçalho, com persistência e detecção do sistema na 1ª visita
- [ ] Entregar toggle de idioma PT/EN/ES traduzindo UI, narração e conquistas
- [ ] Preservar o determinismo do engine em qualquer idioma (mesma seed → mesmo resultado)
- [ ] Remover o acoplamento texto↔lógica no engine (filtros por chave semântica, não por texto)
- [ ] Refino geral de design minimalista consistente nos dois temas

---

## MAPA DE COMPONENTES IDENTIFICADOS

### Infraestrutura i18n (nova)
- `lib/i18n.js` (**novo**) — `window.I18N`: dicionários PT/EN/ES, `t(key, vars)`, `lang`, `setLang`, fallback PT, templates de narração.
- `index.html` (alterado) — incluir `<script src="lib/i18n.js">` antes dos consumidores (logo após `config.js`).
- `tests/_shim.js` (alterado) — incluir `lib/i18n.js` na ordem de carga do VM (antes de `engine.js`).

### Theming (novo / alterado)
- `styles/colors_and_type.css` (alterado) — bloco `:root[data-theme="light"]` com override de superfícies/texto/sombras; manter tokens dark como padrão.
- `styles/kit.css` (alterado) — migrar cores hardcoded para tokens (22 ocorrências).
- `game.css` (alterado) — migrar cores hardcoded de superfície/texto para tokens (~90 ocorrências; cores puramente decorativas como o gramado podem permanecer).
- `index.html` (alterado) — pequeno script inline no `<head>` para aplicar `data-theme` antes da 1ª pintura (evita "flash").

### Estado / Persistência
- `lib/store.js` (alterado) — `DEFAULT_PROFILE` ganha `theme` e `lang`; reusa `setSetting`/`loadProfile`.
- `app.jsx` (alterado) — estado `theme`/`lang`, init (profile + `prefers-color-scheme`), aplicação do `data-theme`, `I18N.setLang`, persistência, handlers de toggle; `ME.name` via I18N.
- `config.js` (alterado) — `LANGS`, `DEFAULT_LANG`, `DEFAULT_THEME`; `TEAM_NAME` migra para chave i18n (mantido como fallback PT se necessário).

### Identidade do time
- `ui/components.jsx` (alterado) — `Crest` recebe a nova marca geométrica (SVG/elemento), `TeamMark`, e o nome localizado no `GameHeader`.

### Controles de cabeçalho
- `ui/components.jsx` (alterado) — `GameHeader` ganha botão de tema (`btn-icon`) e seletor de idioma (segmented/dropdown PT·EN·ES).
- `game.css`/`styles/kit.css` (alterado) — estilos do seletor de idioma e do novo ícone.

### Narração (engine) — i18n + correção de acoplamento
- `lib/engine.js` (alterado) — templates (`GOAL_T`, `ASSIST_T`, `EVENT_T`, `RED_T`, `RED2_T`, `INJURY_T`, `PEN_*_T`) e strings inline (`Bola rolando!`, `Fim do primeiro tempo.`, `Empate…`, `Persiste…`, `Fim de jogo!`, `Nos pênaltis:`, sufixos de lesão, `penText()`, fallback `o goleiro`) lidos de `window.I18N`; **substituir as comparações `e.text === '...'` (linhas 527–529) por chave semântica** nos eventos `half`/`pens`.
- `tests/engine.test.js` (alterado) — assert de determinismo entre idiomas + ausência de dependência de texto.

### Conquistas / labels de domínio
- `lib/achievements.js` (alterado) — `name`/`desc` via I18N (manter `id`/`icon`).
- `lib/derive.js` (alterado) — `ATTR_LABELS`/`ATTR_FULL` via I18N.
- `lib/sharecard.js`, `lib/ratings.js`, `lib/stats.js` (alterado) — rótulos voltados ao usuário via I18N.

### Telas (UI)
- `ui/home.jsx`, `ui/draft.jsx` (alterado) — strings → `I18N.t`.
- `ui/match.jsx`, `ui/penalty.jsx`, `ui/post.jsx` (alterado) — strings → `I18N.t`.
- `ui/howto.jsx` (alterado) — tutorial → `I18N.t`.
- `ui/components.jsx` (alterado) — labels compartilhados restantes.

### Testes
- `tests/engine.test.js` (alterado) — determinismo multi-idioma.
- `tests/_shim.js` (alterado) — carga do `lib/i18n.js`.
- (Opcional) `tests/i18n.test.js` (**novo**) — `t()` por idioma + fallback + paridade de chaves.

---

## ESTRATÉGIA DE TESTES

**Convenção do projeto:** smoke tests em Node VM, sem build. Cada arquivo roda com
`node tests/<nome>.test.js` (exit code ≠ 0 em falha). O `tests/_shim.js` carrega as
libs `window.*` na mesma ordem do `index.html`. Tudo que for testável deve ser
**DOM-free** (i18n.js não pode tocar `document`).

> ⚠️ **Pré-requisito de ambiente:** o `node` precisa estar no PATH para rodar os
> testes (não estava disponível na sessão de planejamento). Garantir antes de
> `/implementar`.

- [ ] Determinismo: mesma seed simula placar/eventos idênticos em PT, EN e ES (só o texto muda)
- [ ] Engine não depende de comparação de texto para decidir prorrogação/pênaltis (filtro por chave)
- [ ] `I18N.t('chave')` retorna o texto correto por idioma; chave ausente → fallback PT
- [ ] Paridade de chaves entre PT/EN/ES (nenhuma chave faltante em um idioma)
- [ ] Conquistas e labels de atributos retornam o idioma corrente
- [ ] Persistência: `theme`/`lang` salvos sobrevivem ao reload (verificação manual no preview)
- [ ] Tema claro: todas as telas legíveis e sem cores quebradas (verificação manual nos dois temas)

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Núcleo de i18n (`lib/i18n.js`) + ordem de carga + constantes de config

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Criar a infraestrutura de internacionalização que todas as etapas seguintes consomem, sem ainda trocar nenhuma string de UI. Entrega `window.I18N` funcional e testável.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/i18n.js` (novo)
- `index.html` (alterado)
- `tests/_shim.js` (alterado)
- `config.js` (alterado)
- `tests/i18n.test.js` (novo, opcional)

**O que implementar:**
- `window.I18N` com: `lang` corrente (default de `CONFIG.DEFAULT_LANG`), `setLang(code)` validando contra `CONFIG.LANGS`, e `t(key, vars)` que resolve a chave no dicionário do idioma corrente, interpola placeholders `{x}` (reusar a mesma ideia do `fill()` do engine) e cai em **fallback PT** quando a chave faltar (último recurso: a própria chave).
- Estrutura de dicionários por idioma com **namespaces** (ex.: `ui.*`, `team.*`, `ach.*`, `attr.*`, `narration.*`). Nesta etapa criar apenas o esqueleto + algumas chaves de fumaça (ex.: `team.name`) nos 3 idiomas para validar.
- Módulo 100% DOM-free (atribui só a `window`), para rodar no VM dos testes.
- `index.html`: incluir `<script src="lib/i18n.js">` logo após `config.js` (antes de qualquer consumidor).
- `tests/_shim.js`: adicionar `lib/i18n.js` à lista de carga (antes de `lib/engine.js`).
- `config.js`: adicionar `LANGS: ['pt','en','es']`, `DEFAULT_LANG: 'pt'`, `DEFAULT_THEME` (ou deixar o tema derivar do sistema). Manter `TEAM_NAME` como está por ora (migra na ETAPA 4).

**Testes Necessários:**
- [ ] `t('team.name')` retorna "Seu Draft"/"Your Draft"/"Tu Draft" conforme `setLang`
- [ ] Chave inexistente em EN cai no texto PT
- [ ] `setLang` com código inválido é rejeitado (mantém idioma anterior)

**Critérios de Aceitação:**
- [ ] `window.I18N` disponível após carga; nenhum erro no console
- [ ] `node tests/i18n.test.js` (ou asserts equivalentes) passando
- [ ] Demais testes existentes continuam passando (shim carrega i18n.js)
- [ ] Nenhuma string de UI alterada ainda (zero regressão visual)

**Dependências:** Nenhuma

**Comandos Úteis:**
`node tests/i18n.test.js` · `node tests/engine.test.js` · servir: `python3 -m http.server 8000`

---

### ETAPA 2: Tema claro (tokens) + migração de cores hardcoded + aplicação pré-pintura

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Tornar a UI capaz de alternar entre escuro e claro apenas trocando `data-theme` no `<html>`, sem ainda expor o toggle. Base visual para o resto.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `styles/colors_and_type.css` (alterado)
- `styles/kit.css` (alterado)
- `game.css` (alterado)
- `index.html` (alterado)

**O que implementar:**
- Em `colors_and_type.css`, adicionar bloco `:root[data-theme="light"] { … }` redefinindo superfícies (`--bg`, `--surface-1..3`, `--hairline`), texto (`--fg1..3`), sombras/glow e `--on-*` para contraste adequado no claro. Manter a **paleta de marca** (verde/amarelo/azul) idêntica nos dois temas (RN04).
- Auditar e migrar cores hardcoded para tokens nas superfícies/texto de `game.css` (~90) e `kit.css` (22). Cores **puramente decorativas** (gramado do `.pitch`, cores de posição `.pos-*`) podem permanecer literais se ficarem boas nos dois temas — decidir caso a caso.
- `index.html`: script inline mínimo no `<head>` que lê a preferência salva (ou `prefers-color-scheme`) e aplica `document.documentElement.dataset.theme` **antes** do React montar (evita flash). A escrita/estado definitivo vem na ETAPA 3.

**Testes Necessários:**
- [ ] (Manual) Forçar `data-theme="light"` no `<html>` e percorrer todas as telas: home, draft, prematch, match, shootout, post, bracket, end, tutorial, toasts
- [ ] (Manual) Repetir em `data-theme="dark"` confirmando ausência de regressão

**Critérios de Aceitação:**
- [ ] Toda superfície/texto principal usa tokens (sem cor hardcoded de fundo/texto fora dos casos decorativos justificados)
- [ ] Tema claro legível e com contraste adequado em todas as telas
- [ ] Sem "flash" de tema na carga inicial
- [ ] Build/preview sem erros

**Dependências:** Nenhuma (pode ser feita em paralelo à ETAPA 1)

**Comandos Úteis:**
`python3 -m http.server 8000` · auditar: `grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' game.css | grep -v 'var('`

---

### ETAPA 3: Estado de tema & idioma (STORE + app.jsx)

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Ligar persistência e estado: o app inicializa tema/idioma a partir do profile (com fallback ao sistema para tema e a PT para idioma), aplica e persiste mudanças. Ainda sem UI de toggle (vem na ETAPA 5).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/store.js` (alterado)
- `app.jsx` (alterado)

**O que implementar:**
- `store.js`: `DEFAULT_PROFILE` ganha `theme` (`'dark'|'light'`, default ausente → derivar do sistema) e `lang` (default `'pt'`). Migração aditiva e retrocompatível (perfis antigos seguem válidos).
- `app.jsx`: estados `theme` e `lang` iniciados do `profile0`; no mount, se `theme` ausente, derivar de `prefers-color-scheme`. Aplicar `document.documentElement.dataset.theme = theme` e `window.I18N.setLang(lang)`. Handlers `setTheme(v)`/`setLang(v)` que atualizam estado, aplicam efeito e persistem via `STORE.setSetting('theme'|'lang', v)`. Validar valores (CE02/RN: inválido → default).
- Garantir re-render da árvore ao trocar idioma (ex.: usar `lang` como parte do estado/`key` no topo, ou repassar via props/contexto) para que `I18N.t` reavalie.

**Testes Necessários:**
- [ ] (Manual) Definir tema/idioma, recarregar e confirmar que persistem
- [ ] (Manual) Limpar localStorage e abrir em SO claro → inicia no claro; SO escuro → escuro
- [ ] (Se viável) asserts de que `DEFAULT_PROFILE` inclui `theme`/`lang`

**Critérios de Aceitação:**
- [ ] Preferências persistem entre sessões (localStorage `copa_draft_profile_v1`)
- [ ] 1ª visita respeita `prefers-color-scheme`
- [ ] Valor inválido/corrompido cai no default sem quebrar
- [ ] Testes existentes seguem passando

**Dependências:** ETAPA 1, ETAPA 2

**Comandos Úteis:**
`python3 -m http.server 8000` · DevTools → Application → Local Storage

---

### ETAPA 4: Nova identidade minimalista do time (ícone + nome "Seu Draft")

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Substituir a estrela ★ pela marca geométrica abstrata minimalista e o nome "Time dos Sonhos" por "Seu Draft" (localizado), em todos os pontos de identidade.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `ui/components.jsx` (alterado)
- `config.js` (alterado)
- `app.jsx` (alterado)
- `lib/i18n.js` (alterado — chave `team.name` nos 3 idiomas)
- `game.css` (alterado — estilo do novo ícone)

**O que implementar:**
- `Crest`: trocar `<span className="cr-star">★</span>` por uma marca geométrica abstrata (ex.: losango/chevron em SVG inline com `stroke`/`fill` por token), sem moldura de escudo, legível nos dois temas; manter `role="img"` e `aria-label` (localizado).
- Nome do time: `team.name` no I18N (PT "Seu Draft" · EN "Your Draft" · ES "Tu Draft"). `config.TEAM_NAME` deixa de ser a fonte; `app.jsx` define `ME.name = I18N.t('team.name')` (recalculado quando `lang` muda). Atualizar usos diretos de `CONFIG.TEAM_NAME` no `GameHeader`.
- Ajustar CSS do ícone (`.crest`, `.cr-star`→nova classe) para alinhamento/tamanho consistentes.

**Testes Necessários:**
- [ ] (Manual) Verificar nome + ícone no header da campanha, reveal (Almanaque), bracket, prematch, shootout, end e no share card
- [ ] (Manual) Trocar idioma e confirmar o nome localizado

**Critérios de Aceitação:**
- [ ] Estrela ★ totalmente substituída pela nova marca em todos os pontos
- [ ] Nome "Seu Draft" (localizado) em todos os pontos de identidade
- [ ] Ícone nítido nos temas claro e escuro
- [ ] Sem referências remanescentes a `CONFIG.TEAM_NAME` para exibição

**Dependências:** ETAPA 1 (necessária); ETAPA 3 recomendada (para re-render ao trocar idioma)

**Comandos Úteis:**
`grep -rn "TEAM_NAME\|cr-star\|Time dos Sonhos" config.js app.jsx ui/`

---

### ETAPA 5: Controles de cabeçalho — toggle de tema + seletor de idioma

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Expor ao jogador os controles de tema (claro/escuro) e idioma (PT/EN/ES) no cabeçalho, acessíveis em todas as fases.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/components.jsx` (alterado — `GameHeader`)
- `app.jsx` (alterado — passar props/handlers)
- `game.css`/`styles/kit.css` (alterado — estilos dos controles)
- `lib/i18n.js` (alterado — rótulos/aria dos controles)

**O que implementar:**
- `GameHeader` recebe `theme`, `onToggleTheme`, `lang`, `onSetLang` e renderiza: um `btn-icon` de tema (ícone sol/lua, padrão dos botões existentes, com `aria-label`/`title` localizados) e um seletor de idioma compacto (segmented PT·EN·ES ou dropdown estilo `fsel`/`Segmented` já existentes).
- `app.jsx`: passar os handlers da ETAPA 3 ao `GameHeader`.
- Estilos consistentes com o design system nos dois temas; acessibilidade (aria, foco, contraste).

**Testes Necessários:**
- [ ] (Manual) Alternar tema no header → UI inteira muda e persiste
- [ ] (Manual) Trocar idioma no header → UI muda imediatamente e persiste
- [ ] (Manual) Controles presentes e usáveis em home, draft e campanha

**Critérios de Aceitação:**
- [ ] Toggle de tema e seletor de idioma visíveis e funcionais em todas as fases
- [ ] Mudanças refletem instantaneamente, sem reload, sem travar
- [ ] `aria-label`/`title` corretos e localizados

**Dependências:** ETAPA 3, ETAPA 1

**Comandos Úteis:**
`python3 -m http.server 8000`

---

### ETAPA 6: i18n da narração do engine + correção do acoplamento texto↔lógica (+ testes)

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Traduzir toda a narração da partida e, no mesmo passo, eliminar a dependência de comparação de texto no fluxo do engine — o principal risco do PRD (bloqueador absoluto do checklist do projeto).

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `lib/engine.js` (alterado)
- `lib/i18n.js` (alterado — namespace `narration.*` nos 3 idiomas)
- `tests/engine.test.js` (alterado)

**O que implementar:**
- Mover todos os arrays de template (`GOAL_T`, `ASSIST_T`, `EVENT_T`, `RED_T`, `RED2_T`, `INJURY_T`, `PEN_GOAL_T`, `PEN_SAVE_T`, `PEN_MISS_T`) e as strings inline (`Bola rolando! {home} x {away}.`, `Fim do primeiro tempo.`, `Empate no tempo normal…`, `Persiste o empate…`, `Fim de jogo!`, `Nos pênaltis: …`, `Decisão nos pênaltis: …`, sufixos de lesão `Entra {x} no lugar.` / `O {team} fica com um a menos.`, `penText()` e o fallback `o goleiro`) para `narration.*` no I18N, nos 3 idiomas.
- O engine seleciona os templates do **idioma corrente** (`window.I18N`, estratégia generate-time). Manter `rng.pick(...)` sobre o array do idioma — a ordem de saques do RNG não muda, então o **determinismo do resultado é preservado**. Recomendado manter os arrays com o **mesmo comprimento** entre idiomas para que até o índice da variante coincida.
- **Correção crítica:** adicionar uma `key` semântica estável aos eventos hoje identificados por texto (`half` da prorrogação e `half`/`pens` da decisão) e **substituir as comparações `e.text === 'Empate…' / 'Persiste…'` (engine.js:527–529)** por filtro via `e.key`/`e.type`. Nenhuma decisão de fluxo pode depender de texto traduzível (RNF02).
- Atualizar `tests/engine.test.js`: simular a mesma seed em PT/EN/ES e assertar placar/sequência idênticos; cobrir o caminho de `finalizeInMatchPenalty` que dropa a cauda de prorrogação/pênaltis sem depender de texto.

**Testes Necessários:**
- [ ] Mesma seed → mesmo placar e mesma sequência de eventos em PT, EN e ES
- [ ] `finalizeInMatchPenalty` que decide na prorrogação remove a cauda correta via chave (não por texto)
- [ ] Nenhuma comparação de `e.text` literal remanescente no engine

**Critérios de Aceitação:**
- [ ] Narração 100% traduzida nos 3 idiomas (gols, assistências, cartões, lesões, pênaltis, marcos de tempo)
- [ ] Determinismo preservado (teste multi-idioma verde)
- [ ] Zero dependência de texto na lógica de fluxo
- [ ] `node tests/engine.test.js` passando

**Dependências:** ETAPA 1

**Comandos Úteis:**
`node tests/engine.test.js` · `grep -n "e.text ===\|=== 'Empate\|=== 'Persiste" lib/engine.js`

---

### ETAPA 7: i18n de conquistas, labels de atributos e rótulos de domínio

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Traduzir conquistas e os rótulos derivados/compartilhados que aparecem em várias telas, num único passo coeso.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/achievements.js` (alterado)
- `lib/derive.js` (alterado)
- `lib/sharecard.js`, `lib/ratings.js`, `lib/stats.js` (alterado conforme rótulos voltados ao usuário)
- `lib/i18n.js` (alterado — `ach.*`, `attr.*`, e chaves de share/ratings)

**O que implementar:**
- `achievements.js`: `name`/`desc` resolvidos por `I18N.t('ach.<id>.name'|'.desc')`, mantendo `id`/`icon`/avaliadores intactos. Cuidar de consumidores que leem `ach.name`/`ach.desc` (toast em `app.jsx`/`post.jsx`).
- `derive.js`: `ATTR_LABELS`/`ATTR_FULL` passam a vir do I18N (`attr.<key>.short|full`).
- `sharecard.js` e quaisquer rótulos de `ratings.js`/`stats.js` (ex.: "craque do jogo", textos do PNG) via I18N.

**Testes Necessários:**
- [ ] (Manual) Conquistas exibem nome/descrição no idioma corrente (toast + painel final)
- [ ] (Manual) Barras de atributo mostram labels traduzidos
- [ ] (Manual) Share card no idioma corrente

**Critérios de Aceitação:**
- [ ] Conquistas, atributos e rótulos de share/ratings traduzidos nos 3 idiomas
- [ ] Avaliadores de conquistas inalterados (somente apresentação muda)
- [ ] Testes existentes seguem passando

**Dependências:** ETAPA 1

**Comandos Úteis:**
`grep -n "ATTR_LABELS\|ATTR_FULL" lib/derive.js ui/` · `node tests/stats.test.js`

---

### ETAPA 8: i18n das telas — Home + Draft (+ componentes compartilhados)

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Traduzir as telas iniciais e os labels compartilhados restantes.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/home.jsx` (alterado)
- `ui/draft.jsx` (alterado)
- `ui/components.jsx` (alterado — labels compartilhados restantes; `POS_LABEL` se exibido)
- `lib/i18n.js` (alterado — chaves `ui.home.*`, `ui.draft.*`, `ui.common.*`)

**O que implementar:**
- Substituir strings PT hardcoded por `I18N.t(...)` em `home.jsx` (menu, modos, formação, resume, perfil, how-to) e `draft.jsx` (dado, random, revisão, Almanaque), além de labels compartilhados em `components.jsx`.
- Posições/labels (`CONFIG.POS_LABEL`, arquétipos) decididos: manter nomes técnicos de posição (GOL/ZAG/…) e traduzir apenas rótulos longos exibidos ao usuário.

**Testes Necessários:**
- [ ] (Manual) Home e Draft 100% no idioma selecionado, sem texto PT vazado em EN/ES
- [ ] (Manual) Troca de idioma re-renderiza as telas imediatamente

**Critérios de Aceitação:**
- [ ] Nenhuma string visível hardcoded remanescente em `home.jsx`/`draft.jsx`
- [ ] Layout intacto nos 3 idiomas (sem overflow por textos mais longos em EN/ES)

**Dependências:** ETAPA 1, ETAPA 5

**Comandos Úteis:**
`python3 -m http.server 8000`

---

### ETAPA 9: i18n das telas — Match + Penalty + Post + Bracket/End

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Traduzir as telas de partida e pós-jogo (chrome ao redor da narração já traduzida na ETAPA 6).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/match.jsx` (alterado)
- `ui/penalty.jsx` (alterado)
- `ui/post.jsx` (alterado)
- `lib/i18n.js` (alterado — `ui.match.*`, `ui.penalty.*`, `ui.post.*`, `ui.bracket.*`, `ui.end.*`)

**O que implementar:**
- Substituir strings hardcoded de `match.jsx` (controles do ticker, velocidade, escalação/subs, stamina), `penalty.jsx` (mini-game) e `post.jsx` (pós-jogo, bracket, tela final/campeão) por `I18N.t`. O texto narrado (`e.text`) já vem traduzido do engine — não retraduzir.
- Rótulos de rodada (`CONFIG.ROUNDS` label/short) decididos: traduzir via I18N por `id` da rodada.

**Testes Necessários:**
- [ ] (Manual) Partida, pênaltis e pós-jogo no idioma selecionado
- [ ] (Manual) Rótulos de rodada traduzidos (Oitavas/Quartas/Semi/Final)

**Critérios de Aceitação:**
- [ ] Nenhuma string visível hardcoded em `match.jsx`/`penalty.jsx`/`post.jsx`
- [ ] Narração permanece coerente com o idioma da partida
- [ ] Layout intacto nos 3 idiomas

**Dependências:** ETAPA 1, ETAPA 5, ETAPA 6

**Comandos Úteis:**
`python3 -m http.server 8000`

---

### ETAPA 10: i18n do tutorial (How-to-play)

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Traduzir o tutorial/“como jogar”, fechando a cobertura de UI dos 3 idiomas.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `ui/howto.jsx` (alterado)
- `lib/i18n.js` (alterado — `ui.howto.*`)

**O que implementar:**
- Substituir o conteúdo do tutorial por chaves I18N nos 3 idiomas. Conteúdo mais longo — atenção à paridade de chaves e ao layout.

**Testes Necessários:**
- [ ] (Manual) Tutorial completo no idioma selecionado, sem texto vazado

**Critérios de Aceitação:**
- [ ] Tutorial 100% traduzido nos 3 idiomas
- [ ] Layout do modal intacto

**Dependências:** ETAPA 1, ETAPA 5

**Comandos Úteis:**
`python3 -m http.server 8000`

---

### ETAPA 11: Refino de design minimalista (passe final, nos dois temas)

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
Aplicar o refino visual minimalista geral consumindo os tokens e chaves já existentes — hierarquia tipográfica, espaçamento e redução de ruído, validado nos dois temas e 3 idiomas.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `game.css`, `styles/kit.css`, `styles/colors_and_type.css` (alterado)
- `ui/*.jsx` (ajustes pontuais de marcação, se necessário)

**O que implementar:**
- Passe de polimento: consistência de espaçamento (escala `--sp-*`), hierarquia de tipo (`--fs-*`), redução de bordas/sombras/ruído, alinhamentos, estados de hover/foco coerentes. Sem números mágicos fora de `config.js` (no caso, sem cores fora dos tokens).
- Verificar nos dois temas e nos 3 idiomas (textos EN/ES costumam ser mais longos).

**Testes Necessários:**
- [ ] (Manual) Revisão visual de todas as telas × {dark, light} × {PT, EN, ES}

**Critérios de Aceitação:**
- [ ] Visual mais limpo e consistente, sem perda de funcionalidade
- [ ] Sem cores hardcoded fora dos tokens (auditoria final)
- [ ] Nenhuma regressão funcional

**Dependências:** ETAPAS 2–10

**Comandos Úteis:**
`grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' game.css styles/kit.css | grep -v 'var('`

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
- [ ] `node tests/engine.test.js` passando (inclui determinismo multi-idioma)
- [ ] `node tests/stats.test.js` e `node tests/team.test.js` passando
- [ ] `node tests/i18n.test.js` passando (se criado)
- [ ] Preview estático sem erros de console (`python3 -m http.server 8000`)

### Padrões de Código (copa-draft-context.md — bloqueadores absolutos)
- [ ] Nenhum número mágico fora de `config.js`
- [ ] Atributos vindos de `lib/derive.js` (não escritos à mão)
- [ ] Componentes novos expostos em `window` e `<script>` em ordem no `index.html`
- [ ] Determinismo do engine preservado (sem `Math.random()` sem seed; sem lógica por texto)
- [ ] Sem credenciais/dados sensíveis hardcoded
- [ ] Nenhuma cor hardcoded de superfície/texto fora dos tokens de tema

### Banco de Dados / Schema
- [ ] N/A — persistência é localStorage, mudança aditiva e retrocompatível (perfis antigos válidos)

### Autorização
- [ ] N/A — jogo single-player no navegador

### Integrações
- [ ] N/A — sem backend/serviços externos

### PRD
- [ ] Critérios 1–7 atendidos (identidade, tema+detecção, idioma, determinismo, nomes próprios, refino)
- [ ] Todos os RFs (RF01–RF06) atendidos
- [ ] RNF02 (determinismo sob tradução) verificado por teste

---

## LEGENDA DE STATUS

- ⏳ **Pendente**: Não iniciada
- 🔄 **Em Progresso**: Sendo implementada
- ✅ **Concluída**: Finalizada e testada
- ❌ **Bloqueada**: Com impedimento

---

## PONTOS DE ATENÇÃO

1. **Acoplamento texto↔lógica no engine (engine.js:527–529)**: filtra eventos comparando `e.text` com literais PT. É bloqueador absoluto do checklist e deve ser trocado por chave semântica na ETAPA 6, junto com a tradução.
2. **Determinismo sob i18n**: a estratégia generate-time preserva o resultado porque a ordem de saques do RNG não muda. Manter arrays de narração com o mesmo comprimento entre idiomas para coincidir até o índice da variante.
3. **`node` ausente no PATH** na sessão de planejamento: garantir Node disponível antes de `/implementar` para rodar os testes.
4. **Working tree sujo**: há alterações locais não commitadas (`config.js`, `game.css`, `ui/draft.jsx`, `ui/match.jsx`, etc.). Não foi feito `git pull`. O `/implementar` deve preparar a branch a partir do estado atual com cuidado para não perder essas mudanças.
5. **Volume de strings (~3,2k linhas, texto em todos os `.jsx` e em `lib/`)**: risco de sobrar PT em EN/ES. Mitigar com paridade de chaves e fallback visível em dev.
6. **Cores hardcoded (~112 ocorrências em CSS)**: o tema claro só fica correto se as superfícies/texto usarem tokens; auditoria é parte das ETAPAS 2 e 11.
7. **Flash de tema**: aplicar `data-theme` antes da 1ª pintura (script inline no `<head>`).
8. **`i18n.js` DOM-free**: precisa rodar no VM dos testes; toda manipulação de `document` fica em `app.jsx`/`index.html`.

---

## DECISÕES TÉCNICAS

### Decisão 1: Estratégia de i18n da narração — generate-time
- **Opção escolhida**: o engine lê templates já no idioma corrente (`window.I18N`) na simulação; `event.text` permanece string pronta.
- **Justificativa**: preserva todos os consumidores de `e.text`, mantém o determinismo (ordem do RNG inalterada) e alinha com RN03 (troca de idioma vale para as próximas partidas).
- **Alternativas consideradas**: render-time (eventos com `{key, variant, vars}` renderizados na UI) — re-narraria logs antigos, porém exigiria refatorar todos os consumidores de `e.text` (ticker, post, sharecard) e tinha maior risco/custo.

### Decisão 2: Theming por override de tokens sob `[data-theme]`
- **Opção escolhida**: tema escuro continua nos tokens padrão de `:root`; tema claro sobrescreve em `:root[data-theme="light"]`. Aplicação via `data-theme` no `<html>`.
- **Justificativa**: zero build, troca instantânea sem recarregar, encaixa no design system existente baseado em CSS custom properties.
- **Alternativas consideradas**: dois arquivos de tema/troca de stylesheet (mais pesado, pisca) ; classes utilitárias por componente (espalha a lógica).

### Decisão 3: Ícone geométrico abstrato (sem escudo)
- **Opção escolhida**: marca geométrica simples (losango/chevron) em SVG inline, colorida por token.
- **Justificativa**: pedido do solicitante; mais "app moderno", neutro, escala bem e funciona nos dois temas.
- **Alternativas consideradas**: escudo com monograma; inicial em pílula (descartadas pelo solicitante).

### Decisão 4: Persistência no profile do localStorage
- **Opção escolhida**: `theme`/`lang` em `copa_draft_profile_v1` via `STORE.setSetting` (reuso).
- **Justificativa**: mecanismo já existe (igual ao `sound`), aditivo e retrocompatível.
- **Alternativas consideradas**: chave de localStorage própria (fragmenta o estado de preferências).

---

## RISCOS E MITIGAÇÕES

### Risco 1: Quebra de determinismo / fluxo do engine sob tradução
- **Impacto**: Alto
- **Probabilidade**: Média
- **Mitigação**: estratégia generate-time + chave semântica nos eventos + teste de determinismo multi-idioma na ETAPA 6 (gate de merge).

### Risco 2: Cobertura incompleta de tradução (PT vazando em EN/ES)
- **Impacto**: Médio
- **Probabilidade**: Alta
- **Mitigação**: namespaces de chaves, teste de paridade de chaves, fallback PT visível em dev, varredura por arquivo (ETAPAS 6–10).

### Risco 3: Tema claro com contraste/legibilidade ruins por cor hardcoded
- **Impacto**: Médio
- **Probabilidade**: Média
- **Mitigação**: migração de cores para tokens nas ETAPAS 2 e 11; auditoria por `grep` de hex/rgba fora de `var()`.

### Risco 4: Perda das alterações locais não commitadas
- **Impacto**: Médio
- **Probabilidade**: Baixa
- **Mitigação**: `/implementar` deve checar `git status`, preservar/commitar as mudanças atuais antes de criar a branch da feature.

---

## DOCUMENTAÇÃO DE REFERÊNCIA

- **PRD**: prd/copa-draft-prd-003-tbd-identidade-minimalista-tema-e-idioma.md
- **Contexto do Projeto**: MAPS/copa-draft/copa-draft-context.md
- **Arquitetura/Padrões**: copa-draft-context.md (design system, padrões frontend, checklist de code review)
- **Código relacionado**: `lib/engine.js`, `lib/i18n.js` (novo), `config.js`, `app.jsx`, `lib/store.js`, `lib/derive.js`, `lib/achievements.js`, `ui/components.jsx`, `styles/colors_and_type.css`, `styles/kit.css`, `game.css`, `tests/_shim.js`, `tests/engine.test.js`

---

## COMANDOS ÚTEIS

```bash
# Servir localmente (sem build)
python3 -m http.server 8000     # ou: npx serve

# Testes (precisam de node no PATH)
node tests/engine.test.js
node tests/stats.test.js
node tests/team.test.js
node tests/i18n.test.js          # se criado

# Auditoria de cores hardcoded
grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' game.css styles/kit.css | grep -v 'var('

# Auditoria de acoplamento texto↔lógica no engine
grep -n "e.text ===" lib/engine.js
```

---

## INSTRUÇÕES DE ATUALIZAÇÃO

Este arquivo será atualizado automaticamente pelo skill `/implementar` durante a execução.

Após cada etapa concluída:
1. Status da etapa → ✅ Concluída + data de conclusão
2. Progresso geral atualizado (% e barra visual)
3. Checklist de tarefas marcado

---

## OBSERVAÇÕES

1. **Implementar uma etapa por vez** — garantir testes/preview OK antes de avançar
2. **Seguir os padrões do projeto** — ver copa-draft-context.md (bloqueadores absolutos)
3. **Code review contínuo** — usar `/code-review` após cada etapa
4. **Etapas 1 e 2 são independentes** entre si — podem ser feitas em paralelo; tudo a partir da 3 depende delas

---

**Criado em:** 2026-06-06
**Próximo passo:** `/implementar ETAPA 1`
