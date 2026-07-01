# Plano de Execução: Fase de Grupos, Tela Final em Modais e Ajustes de Jogabilidade

## Informações
- **PRD Relacionado**: `prd/copa-draft-prd-002-tbd-fase-de-grupos-tela-final-e-ajustes.md`
- **Repositório(s)**: `game` (`C:/Projects/Personal/copa-draft`)
- **Domínio(s)**: engine, team, match, ui, store, draft, sound
- **Branch Base**: `main`
- **Complexidade**: 🔴 Alta
- **Criado em**: 2026-06-06
- **Última atualização**: 2026-06-06

---

## PROGRESSO GERAL

**Status**: ✅ Concluída
**Progresso**: 11/11 etapas concluídas (100%)

```
[🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢] 100%
```

> As features do PRD_001 (eventos com impacto, estatísticas da Copa, "Como Jogar?") já estão implementadas no código. Este plano constrói sobre elas.

---

## VISÃO GERAL

Sete entregas, agrupadas em "ganhos rápidos e independentes" primeiro e a "fase de grupos" (maior risco) por último, antes do redesenho das telas finais (que consome dados da fase de grupos):

1. **Ganhos rápidos de feedback (ETAPAS 2–5)** — som de gol do adversário, eventos do adversário em vermelho, viés de expressão no draft e seletor de velocidade. Cada um é pequeno, isolado e entrega valor imediato.
2. **Fase de grupos + escala de força (ETAPAS 6–9)** — o coração do plano e o maior risco. Hoje `app.jsx` vai `draft → bracket` direto, e `lib/team.js:buildBracket` sorteia 4 adversários por força crescente. Será inserida uma **fase de grupos** (grupo de 4, top-2 avança): o jogador joga 3 partidas e os 3 jogos AI×AI dos rivais são simulados pelo engine puro (`simulateMatch`) para montar a tabela. A força dos adversários passa a **escalar por fase** (grupos mais fracos → final mais forte), tudo determinístico (RNG semeado) e configurável.
3. **Telas finais em modais (ETAPAS 10–11)** — `PostMatchScreen` e `CampaignEndScreen` (`ui/post.jsx`) passam de "coluna que despeja tudo" para **hero enxuto + modais** (notas, gols, prêmios, campanha [tabela do grupo + chaveamento], conquistas), reaproveitando o padrão de overlay já existente (`.overlay`/`.modal` em `kit.css`, `.howto-overlay` em `game.css`). A `CampaignEndScreen` também suporta o novo desfecho "eliminado na fase de grupos".

**Componentes por "camada" (arquitetura SPA sem build — ordem: balanceamento → lógica pura → UI → wiring → index.html):**
- **Balanceamento:** `config.js`
- **Lógica pura (lib/):** `team.js` (grupo + tabela + escala de força), `sound.js`, `engine.js` (reusado)
- **UI (ui/):** `match.jsx`, `draft.jsx`, `home.jsx`, `post.jsx`, novos `group.jsx` e `modal.jsx`
- **Wiring / estado:** `app.jsx`, `store.js`
- **Entrada:** `index.html` (ordem dos `<script>`)
- **Testes:** `tests/` (smoke tests em Node, sem deps — já existe do PRD_001)

---

## OBJETIVOS

- [ ] Fase de grupos (grupo de 4, 3 jogos do jogador + 3 AI×AI) com tabela real e desempates; top-2 avança, 3º/4º elimina.
- [ ] Força dos adversários escala por fase (grupos mais fracos → final mais forte), determinística e configurável.
- [ ] Pós-jogo e fim de campanha redesenhados com hero enxuto + modais.
- [ ] SFX distinto para gol do adversário; eventos do adversário em vermelho no ticker.
- [ ] Sorteio ponderado por overall no draft (viés pequeno, nenhuma seleção excluída).
- [ ] Seletor de velocidade (normal/rápido/super), persistido e trocável na home e em partida; resultado inalterado.
- [ ] Determinismo preservado (grupos AI×AI + sorteios escalonados via RNG semeado).
- [ ] Saves antigos (`copa_draft_run_v2`) e perfis sem `speed` continuam funcionando (defaults aditivos).

---

## MAPA DE COMPONENTES IDENTIFICADOS

### Balanceamento
- `config.js` (alterado) — `GROUP_SIZE`, `GROUP_QUALIFY`, `GROUP_POINTS`, escala de força por fase (`PHASE_STRENGTH`/`OPP_STRENGTH_BIAS`), `DRAFT_STRENGTH_BIAS`, `MATCH_SPEEDS`, `MATCH_SPEED_DEFAULT`.

### Lógica pura (lib/)
- `lib/team.js` (alterado) — escala de força em `drawOpponents`/`buildBracket`; novos `buildGroup(rng)` e `groupStandings(group)` (puros).
- `lib/sound.js` (alterado) — novo padrão `goalAway` em `PATTERNS`.
- `lib/engine.js` (reusado, sem mudança de regra) — `simulateMatch` para os jogos AI×AI do grupo (opts neutros).

### UI (ui/)
- `ui/match.jsx` (alterado) — `MatchScreen`: velocidade via prop/`CONFIG.MATCH_SPEEDS`, troca em partida; SFX de gol por `e.side`; eventos `away` em vermelho no ticker.
- `ui/draft.jsx` (alterado) — `doDraw`/`randomFill`: sorteio ponderado por `squadAvg`.
- `ui/home.jsx` (alterado) — `HomeScreen`: seletor de velocidade (`Segmented`).
- `ui/post.jsx` (alterado) — `PostMatchScreen` e `CampaignEndScreen` em hero + modais; desfecho "eliminado na fase de grupos".
- `ui/group.jsx` (novo) — `GroupStageScreen` (tabela + calendário/rodadas).
- `ui/modal.jsx` (novo, opcional/recomendado) — `Modal` genérico reutilizável (Esc/fundo/✕ + trava scroll).
- `ui/components.jsx` (alterado, se necessário) — `GameHeader` reflete a fase de grupos.

### Wiring / Estado
- `app.jsx` (alterado) — nova fase `group`; estado do grupo (rivais, fixtures, resultados, tabela); orquestração (3 jogos do jogador + simulação AI×AI); decisão de avanço/eliminação; estado/preferência de velocidade; SFX de gol por lado; snapshot/resume com defaults.
- `lib/store.js` (alterado) — `DEFAULT_PROFILE` ganha `speed`; snapshot inclui o grupo (serialização genérica); defaults no resume (avaliar bump `v2→v3` só se necessário).

### Entrada
- `index.html` (alterado) — `<script>` de `ui/group.jsx` e `ui/modal.jsx` na ordem certa (após `ui/post.jsx`, antes de `app.jsx`).

### Testes
- `tests/team.test.js` (novo) — `groupStandings` (pontos/desempates) + escala de força por fase (determinismo).
- `tests/_shim.js` (reusado do PRD_001) — carrega libs em Node.

---

## ESTRATÉGIA DE TESTES

**Sem framework e sem build** (decisão do projeto). Dois níveis (mesmo padrão do PLAN_001):

- **Lógica pura (team: grupo/tabela/escala de força):** smoke tests em **Node puro** via `tests/_shim.js` + `assert` nativo. Rodar com `node tests/team.test.js`.
- **UI (telas finais, modais, ticker, seletor de velocidade, fase de grupos):** verificação manual no navegador (`python3 -m http.server 8000`), com checklist por etapa.

Cenários-chave:
- [ ] Tabela do grupo determinística (mesma seed ⇒ mesmos jogos AI×AI e mesma classificação).
- [ ] Desempate por SG → GP → critério estável; top-2 correto.
- [ ] Escala de força: média dos adversários cresce de grupos → final, determinística.
- [ ] Velocidade não altera placar/eventos (só ritmo).
- [ ] SFX por lado e cor vermelha por lado no ticker.
- [ ] Viés do draft: seleções mais fortes aparecem um pouco mais, todas continuam possíveis.
- [ ] Resume de save antigo (sem grupo) e perfil sem `speed` aplicam defaults sem quebrar.

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Config — constantes (grupos, escala de força, viés do draft, velocidades)

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Adicionar em `config.js` toda a parametrização nova, antes de qualquer lógica. Fundação para as demais etapas.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `config.js` (alterado)

**O que implementar:**
- **Fase de grupos:** `GROUP_SIZE: 4`, `GROUP_QUALIFY: 2`, `GROUP_POINTS: { win: 3, draw: 1, loss: 0 }`.
- **Escala de força por fase:** estrutura nomeada (ex.: `PHASE_STRENGTH`) que define, por fase (`grupos`, `oitavas`, `quartas`, `semi`, `final`), o alvo/peso de força (faixa de `squadAvg` ou peso) usado no sorteio — fases finais puxam para squads de maior overall. E/ou `OPP_STRENGTH_BIAS` (intensidade da ponderação).
- **Draft:** `DRAFT_STRENGTH_BIAS` (intensidade do peso por overall médio; `0` = uniforme, valor inicial **pequeno**).
- **Velocidade:** `MATCH_SPEEDS: { normal: { durationMs: 34000, label: 'Normal' }, rapido: { durationMs: ~18000, label: 'Rápido' }, super: { durationMs: ~9000, label: 'Super rápido' } }` e `MATCH_SPEED_DEFAULT: 'normal'`. (Os 34000 espelham o `DURATION_MS` atual de `ui/match.jsx`.)

**Testes Necessários:**
- [ ] Manual: app carrega sem erro; `window.CONFIG` expõe as novas chaves.

**Critérios de Aceitação:**
- [ ] Todas as constantes em `config.js` (RN12 — sem números mágicos fora daqui).
- [ ] Nomes coerentes com o padrão existente.

**Dependências:** Nenhuma

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 2: Som — `goalAway` + SFX de gol por lado no ticker

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Tocar um efeito distinto quando o gol revelado é do adversário (lado `away`). (Feature 3)

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `lib/sound.js` (alterado — novo padrão `goalAway`)
- `ui/match.jsx` (alterado — escolher `goal` vs `goalAway` pelo `e.side`)

**O que implementar:**
- Em `PATTERNS` (`lib/sound.js`), adicionar `goalAway`: timbre mais **sóbrio/grave** (ex.: tons descendentes / `sine`/`square` em frequências mais baixas), claramente diferente do `goal` comemorativo atual.
- Em `MatchScreen` (`ui/match.jsx:249-253`), hoje `beep('goal')` dispara para qualquer novo gol. Detectar o **lado do gol recém-revelado** (último evento `type === 'goal'` com `e.side`) e tocar `goal` (home) ou `goalAway` (away). Manter a contagem incremental (`goalsSeen`) para não retrotocar.

**Testes Necessários:**
- [ ] Manual: partida com gols dos dois lados → som comemorativo no meu gol, som sóbrio no gol adversário (Cenário 5).

**Critérios de Aceitação:**
- [ ] SFX distinto por lado (RN08 / Critério 6).
- [ ] Sem retrotocar sons ao recarregar o feed.

**Dependências:** Nenhuma

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 3: Ticker — eventos do adversário em vermelho

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Marcar visualmente os eventos do lado `away` em vermelho no ticker. (Feature 4)

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `ui/match.jsx` (alterado — classe de lado no item do ticker)
- `game.css` (alterado — `.tk.away.*`)

**O que implementar:**
- Em `MatchScreen` (`ui/match.jsx:345-350`), adicionar a classe de lado: `className={`tk ${e.type} ${e.side === 'away' ? 'away' : ''}`}`. Eventos neutros (`kickoff`, `half`, `full`, `pens`) **não** têm `side` → permanecem sem cor de lado.
- Em `game.css` (junto ao bloco `.tk.*`, ~linhas 224-248), adicionar regras `.tk.away` usando `var(--loss)` para `border-left`/background/realce, cobrindo os tipos relevantes (`goal`, `yellow`, `save`, `foul`, `penalty`, `bigchance`, etc.). Eventos do jogador (`home`) mantêm a paleta atual (verde/amarelo).

**Testes Necessários:**
- [ ] Manual: eventos do adversário aparecem em vermelho; os meus mantêm a paleta; neutros sem cor de lado (Cenário 6).

**Critérios de Aceitação:**
- [ ] Eventos `away` em vermelho; `home` inalterados; neutros sem lado (RN09 / Critério 7).

**Dependências:** Nenhuma

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 4: Draft — sorteio ponderado por overall (viés de expressão)

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Seleções de maior overall médio têm uma pequena chance a mais de saírem no dado, sem excluir nenhuma elegível. (Feature 5)

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/draft.jsx` (alterado — `doDraw` e `randomFill`)

**O que implementar:**
- Em `doDraw` (`ui/draft.jsx:48-52`), hoje a seleção é sorteada com `Math.random()` uniforme em `window.SQUADS`. Trocar por um **sorteio ponderado por `window.TEAM.squadAvg(squad)`**, controlado por `CONFIG.DRAFT_STRENGTH_BIAS` (ex.: peso = `1 + bias * (squadAvg - mediaGlobal)` ou função monotônica equivalente; com `bias = 0` recai no uniforme). Garantir que só entram no sorteio squads com **jogador elegível** para a vaga (manter o filtro de `eligible`/fallback atual — nenhuma elegível excluída).
- Aplicar a mesma ponderação em `randomFill` (`ui/draft.jsx:92-106`), que hoje embaralha uniformemente (`sort(() => Math.random() - 0.5)`).
- O draft é interativo (não-semeado) — manter esse comportamento (consistente com o atual); a mudança é só na distribuição de probabilidade.
- Helper de peso pode ficar em `lib/team.js` (ex.: `squadDrawWeight(squad, config)`) para reuso e testabilidade, exposto em `window.TEAM`.

**Testes Necessários:**
- [ ] Node (se o helper for para `team.js`): peso cresce com `squadAvg`; `bias = 0` ⇒ pesos iguais.
- [ ] Manual: muitos sorteios para a mesma vaga → potências aparecem um pouco mais, mas seleções fracas ainda aparecem (Cenário 7).

**Critérios de Aceitação:**
- [ ] Viés pequeno e configurável; nenhuma seleção elegível excluída (RN10 / Critério 8).

**Dependências:** ETAPA 1

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 5: Velocidade — seletor (perfil + home + partida)

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Permitir escolher a velocidade da partida (normal/rápido/super), persistida no perfil e trocável na home e durante a partida, sem alterar o resultado. (Feature 6)

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/store.js` (alterado — `DEFAULT_PROFILE.speed`)
- `app.jsx` (alterado — estado `speed`, init do perfil, `setSetting`, repasse a `MatchScreen`)
- `ui/home.jsx` (alterado — `Segmented` de velocidade)
- `ui/match.jsx` (alterado — `DURATION_MS` da prop/`CONFIG.MATCH_SPEEDS`; troca em partida)

**O que implementar:**
- `lib/store.js`: `DEFAULT_PROFILE` ganha `speed: <MATCH_SPEED_DEFAULT>`; reusar `setSetting('speed', …)` (já existe).
- `app.jsx`: novo estado `speed` inicializado de `profile0.speed`; handler que atualiza estado + `window.STORE.setSetting('speed', v)`; passar `speed` a `MatchScreen`.
- `ui/home.jsx`: adicionar um `setcard` com `Segmented` (componente já existente) para Velocidade, ao lado de Modo/Formação, opções `normal/rapido/super` (labels de `CONFIG.MATCH_SPEEDS`).
- `ui/match.jsx`: substituir o `DURATION_MS = 34000` hardcoded (linha 229) por `CONFIG.MATCH_SPEEDS[speed].durationMs`; permitir trocar a velocidade **durante** a partida (mini-seletor no cabeçalho do placar) reconfigurando o `setInterval` (recriar o efeito do ticker quando `speed` muda, preservando o `clockRef` atual). `prefers-reduced-motion` continua pulando direto ao fim, independente da velocidade.

**Testes Necessários:**
- [ ] Manual: trocar velocidade na home e ver o ritmo do ticker mudar; trocar durante a partida; recarregar e confirmar persistência (Cenário 9).
- [ ] Manual: mesma partida em normal e super → placar/eventos finais idênticos (Cenário 8).

**Critérios de Aceitação:**
- [ ] Velocidade configurável, persistida e trocável em partida; resultado inalterado (RN11 / Critério 9).
- [ ] Perfil sem `speed` usa o default (CE04).

**Dependências:** ETAPA 1

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 6: team.js — escala de força dos adversários por fase

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Fazer o sorteio dos adversários do mata-mata escalar a força por fase (oitavas → final mais forte), de forma determinística e configurável — preparando o terreno para o grupo (pool mais fraco). (Feature 1a)

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/team.js` (alterado — `drawOpponents`/`buildBracket`)
- `tests/team.test.js` (novo)

**O que implementar:**
- Hoje `drawOpponents` (`lib/team.js:76-85`) embaralha `SQUADS` (RNG semeado) e ordena por `squadAvg` **crescente**. Generalizar para usar a `CONFIG.PHASE_STRENGTH`/`OPP_STRENGTH_BIAS`: cada fase puxa de uma faixa/peso de força (grupos mais fracos; final mais forte), via sorteio ponderado (`RNG.weighted`) ou particionamento por tier — **mantendo RNG semeado** (determinismo).
- `buildBracket` (`lib/team.js:87-93`) passa a aplicar a escala às fases do mata-mata. Garantir que os adversários do grupo (ETAPA 7) e do mata-mata não se repitam indevidamente na mesma campanha (na medida do pool).
- Evitar números mágicos: toda a curva vem de `config.js`.

**Testes Necessários (Node):**
- [ ] Determinismo: mesma seed ⇒ mesmos adversários por fase.
- [ ] Monotonicidade média: força média esperada das fases finais ≥ das iniciais (amostragem por seeds fixas).

**Critérios de Aceitação:**
- [ ] Escala determinística e configurável (RN04 / Critério 3 / Cenário 4).
- [ ] `node tests/team.test.js` passa.

**Dependências:** ETAPA 1

**Comandos Úteis:** `node tests/team.test.js`

---

### ETAPA 7: team.js — `buildGroup` + `groupStandings` (puros) + tabela

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Criar a estrutura da fase de grupos e o cálculo puro da tabela com desempates. (Feature 1b)

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/team.js` (alterado — `buildGroup`, `groupStandings`)
- `tests/team.test.js` (alterado)

**O que implementar:**
- `buildGroup(rng)`: sorteia `GROUP_SIZE - 1` rivais (pool mais fraco, via escala da ETAPA 6) e monta a estrutura: `{ rivals: [...], fixtures: [...] }`, onde `fixtures` cobre o round-robin de `GROUP_SIZE` times (o jogador é uma das entradas). Marcar quais fixtures são do jogador e quais são AI×AI. Seeds das partidas derivadas de forma estável (`RNG.seedFrom`).
- `groupStandings(group)`: função **pura** que recebe os resultados (incl. os jogos já simulados) e devolve a tabela ordenada `[{ teamRef, J, V, E, D, GP, GC, SG, P }]`, aplicando `GROUP_POINTS` e os desempates: **P → SG → GP → critério estável** (ordem de sorteio/seed). Não depende de DOM.
- Expor ambos em `window.TEAM`.

**Testes Necessários (Node):**
- [ ] Tabela: pontos corretos (V/E/D), SG/GP corretos.
- [ ] Desempate determinístico (P, SG, GP iguais → critério estável).
- [ ] `buildGroup` determinístico com a mesma seed.

**Critérios de Aceitação:**
- [ ] Grupo de 4 com round-robin; tabela e desempates corretos (RN01/RN02/RN03 / Cenário 2).
- [ ] `node tests/team.test.js` passa.

**Dependências:** ETAPA 6

**Comandos Úteis:** `node tests/team.test.js`

---

### ETAPA 8: app.jsx — fase de grupos na máquina de estados + persistência

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Inserir a fase de grupos no fluxo do jogo: jogar 3 partidas do jogador, simular os jogos AI×AI dos rivais, calcular a tabela, e decidir avanço (top-2) ou eliminação — com persistência e resume com defaults. **Maior risco do plano.** (Feature 1c)

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `app.jsx` (alterado — nova fase `group`, estado e orquestração)
- `lib/store.js` (alterado — snapshot inclui o grupo via serialização genérica; default no resume; avaliar bump `v2→v3`)

**O que implementar:**
- Novo estado: `group` (saída de `team.buildGroup`), `groupRound` (índice da rodada do jogador) e tabela computada via `team.groupStandings`.
- Em `confirmDraft` (`app.jsx:118-130`): após montar o time, **montar o grupo** (`buildGroup` com `RNG.makeRng`/`seedFrom`) e ir para a fase **`group`** (no modo Almanaque, manter o `reveal` antes do grupo).
- Fluxo da fase de grupos: para cada rodada do jogador, ir a `prematch → match → post` reusando o pipeline atual (com `opts` de jogo de grupo: `{ knockout: false }` — empate é permitido, sem prorrogação). Após cada rodada, **simular os jogos AI×AI** daquela rodada com `window.ENGINE.simulateMatch(home, away, C, seed, { knockout: false, fatigue: false, pressure: false })` (neutros) e atualizar `fixtures`/tabela.
- Ao fim das 3 rodadas: `groupStandings` final → se o jogador está no top-`GROUP_QUALIFY`, **`buildBracket`** (mata-mata, ETAPA 6) e seguir para `bracket`; senão, ir para `end` com flag de **eliminado na fase de grupos** (consumida na ETAPA 11).
- Reuso: a acumulação de fadiga, estatísticas (`STATS.accumulate`) e conquistas das partidas do jogador continua valendo nos jogos do grupo.
- Persistência: `snapshot()` (`app.jsx:62-65`) e `resumeRun()` (`app.jsx:66-78`) passam a incluir `group`/`groupRound`; `loadRun` aplica defaults para runs antigos (sem grupo → seguir o fluxo legado/knockout). Decidir bump `copa_draft_run_v2 → v3` **somente** se a coexistência gerar estado inconsistente (preferir defaults aditivos). Incluir `group` em `RESUMABLE` se aplicável.

**Testes Necessários:**
- [ ] Node: dada uma seed, os 3 jogos AI×AI e a tabela são determinísticos (Cenário 1).
- [ ] Manual: jogar os 3 jogos, ver a tabela evoluir, classificar em top-2 → oitavas.
- [ ] Manual: terminar em 3º/4º → tela de eliminado na fase de grupos.
- [ ] Manual: resume de save antigo (sem grupo) não quebra (Cenário 10 / CE03).

**Critérios de Aceitação:**
- [ ] Fase de grupos completa, com tabela real e decisão de avanço/eliminação (RN01–RN05 / Critérios 1 e 2).
- [ ] Determinismo dos jogos AI×AI (RNF01 / Critério 10).
- [ ] Persistência/resume com defaults (RNF05 / CE03).

**Dependências:** ETAPA 6 e ETAPA 7

**Comandos Úteis:** `python3 -m http.server 8000` · `node tests/team.test.js`

---

### ETAPA 9: ui/group.jsx — `GroupStageScreen` (tabela + calendário)

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Tela da fase de grupos: tabela de classificação e calendário/rodadas, com botão para disputar a próxima partida ou avançar. (Feature 1d)

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/group.jsx` (novo — `GroupStageScreen`)
- `index.html` (alterado — `<script>` antes de `app.jsx`)
- `app.jsx` (alterado — renderizar `GroupStageScreen` na fase `group`)
- `ui/components.jsx` (alterado, se necessário — `GameHeader` reflete a fase)
- `game.css` (alterado — estilos da tabela)

**O que implementar:**
- `GroupStageScreen`: recebe `group`, `standings`, `groupRound`, `me` e callbacks. Renderiza:
  - **Tabela** (P, J, V, E, D, GP, GC, SG) com destaque ao time do jogador e à **zona de classificação** (top-2), reusando tokens visuais existentes (`Flag`, `Crest`, `.brow`/`.bracket` ou nova `.group-table`).
  - **Calendário/rodadas** (jogos do jogador e dos rivais, com placares já decididos).
  - Botão "Disputar próxima partida →" (vai ao `prematch` daquela rodada) ou, ao fim, "Ir para o mata-mata →" / "Ver resultado →" conforme classificação.
- Expor em `window`; incluir `<script>` em `index.html` na ordem (após `ui/post.jsx`, antes de `app.jsx`).

**Testes Necessários:**
- [ ] Manual: tabela e calendário corretos; destaque do top-2; navegação entre rodadas (RF02).

**Critérios de Aceitação:**
- [ ] Tabela e calendário exibidos e atualizados por rodada (RF02 / Critério 1).
- [ ] Componente exposto em `window` e `<script>` em ordem.

**Dependências:** ETAPA 8

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 10: UI — `Modal` genérico + `PostMatchScreen` enxuto com modais

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Redesenhar o pós-jogo: resumo enxuto (resultado, placar, craque) + botões que abrem **modais** (Notas, Gols). (Feature 2a)

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/modal.jsx` (novo — `Modal` reutilizável) ou reuso direto do padrão `.howto-overlay`
- `ui/post.jsx` (alterado — `PostMatchScreen`)
- `index.html` (alterado — `<script>` de `ui/modal.jsx`, se criado)
- `styles/kit.css` / `game.css` (alterado — hero/botões/conteúdo dos modais)

**O que implementar:**
- `Modal`: componente genérico (props `title`, `onClose`, `children`) que fecha com **Esc / clique no fundo / ✕** e **trava o scroll** do fundo — espelhando o que `HowToPlay` já faz (`ui/howto.jsx:12-20`). Reusar `.overlay`/`.modal` de `kit.css` (linhas 127-134) e/ou `.howto-overlay`/`.howto-panel` de `game.css`.
- `PostMatchScreen` (`ui/post.jsx:6-118`): manter o **hero** (resultado `✦ Classificado/Eliminado`, placar grande, craque do jogo, badge de goleada 7-0). Mover **Notas** (abas home/away) e **Gols** para **modais** acionados por botões. Reaproveitar o markup atual (`ratings-list`, `subtabs`) dentro dos modais. Manter o botão "Próxima fase/Erguer a taça/Fim da campanha".
- Visual mais limpo/moderno (espaçamento, cards), conforme PRD.

**Testes Necessários:**
- [ ] Manual: abrir/fechar modais Notas e Gols (✕/Esc/fundo); resumo permanece; estado da partida intacto (Critério 4 / Cenário 9).

**Critérios de Aceitação:**
- [ ] Pós-jogo enxuto com modais de Notas e Gols (RN06 / Critério 4 / RF05).
- [ ] Modais somente leitura; `prefers-reduced-motion` respeitado.

**Dependências:** Nenhuma rígida (independente do grupo). Recomendado após as etapas de grupo para ter o padrão consolidado, mas pode ser feita em paralelo.

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 11: UI — `CampaignEndScreen` enxuta com modais + desfecho de grupos

**Status:** ✅ Concluída (2026-06-06)

**Objetivo:**
Redesenhar a tela de fim de campanha: hero + modais (Estatísticas da Copa, Campanha [tabela do grupo + chaveamento], Conquistas), suportando o desfecho "eliminado na fase de grupos". (Feature 2b)

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/post.jsx` (alterado — `CampaignEndScreen`)
- `app.jsx` (alterado — passar o estado do grupo e a flag de eliminação na fase de grupos)

**O que implementar:**
- `CampaignEndScreen` (`ui/post.jsx:164-290`): manter o **hero** (troféu/🥀, título, chamada, confete na vitória respeitando reduced-motion) e os botões de compartilhar (📸 card, 📋 resumo) e ↻ jogar novamente. Mover para **modais**:
  - **Estatísticas da Copa** (premiações `STATS.compute` — Artilheiro/Melhor Jogador/Melhor Goleiro/Maestro), hoje inline em `ui/post.jsx:249-268`.
  - **Campanha**: **tabela final do grupo** + **chaveamento** do mata-mata (reusar o bloco `.bracket` de `ui/post.jsx:226-240`).
  - **Conquistas**: a grade `ach-grid` (hoje `ui/post.jsx:270-287`).
- Novo desfecho **"eliminado na fase de grupos"**: hero e textos adequados; mostrar a posição final e a tabela (via prop vinda de `app.jsx`). A `shareData`/`SHARECARD` deve refletir o desfecho de grupos (incluir a fase de grupos no resumo).
- `app.jsx`: passar `group`/`standings` e a flag de eliminação na fase de grupos para a tela.

**Testes Necessários:**
- [ ] Manual: campeão / eliminado no mata-mata / eliminado na fase de grupos → hero correto e modais abrindo (Critério 5 / Cenário 3).
- [ ] Manual: card/resumo refletem o desfecho (incl. grupos).

**Critérios de Aceitação:**
- [ ] Fim de campanha enxuto com modais; três desfechos suportados (RN07 / Critério 5 / RF06).
- [ ] Compartilhamento e conquistas preservados.

**Dependências:** ETAPA 8 (dados do grupo) · ETAPA 10 (padrão de `Modal`)

**Comandos Úteis:** `python3 -m http.server 8000`

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
- [ ] App carrega no preview sem erros de console (`python3 -m http.server 8000`).
- [ ] `node tests/team.test.js` passa (e os testes do PRD_001 continuam verdes).

### Padrões de Código (copa-draft-context.md)
- [ ] Nenhum número mágico fora de `config.js` (grupos, escala, viés, velocidades).
- [ ] Atributos só via `lib/derive.js`.
- [ ] Componentes novos (`group.jsx`, `modal.jsx`) expostos em `window` e `<script>` em ordem no `index.html`.
- [ ] Sem `Math.random()` no caminho determinístico do engine (grupos AI×AI e escala via RNG semeado; draft segue interativo).

### Banco de Dados / Schema (localStorage)
- [ ] Snapshot do run inclui o grupo (rivais/fixtures/resultados/tabela) e `groupRound`.
- [ ] Resume de save antigo aplica defaults (sem perda/crash).
- [ ] Perfil inclui `speed`; ausente → `MATCH_SPEED_DEFAULT`.
- [ ] Bump `v2→v3` só se necessário (justificado).

### Autorização
- [ ] N/A (jogo single-player, sem roles).

### Integrações
- [ ] N/A (100% client-side).

### PRD
- [ ] RF01–RF11 atendidos.
- [ ] Critérios de Aceitação 1–10 atendidos.

---

## LEGENDA DE STATUS

- ⏳ **Pendente**: Não iniciada
- 🔄 **Em Progresso**: Sendo implementada
- ✅ **Concluída**: Finalizada e testada
- ❌ **Bloqueada**: Com impedimento

---

## PONTOS DE ATENÇÃO

1. **A fase de grupos (ETAPA 8) é o maior risco** — alterar a máquina de estados de `app.jsx` para intercalar 3 partidas do jogador com 3 simulações AI×AI e transitar corretamente para mata-mata ou eliminação. Blindar a tabela com o smoke test de determinismo (ETAPA 7) antes de fiar a UI.
2. **Jogos de grupo são empatáveis** — usar `opts.knockout: false` (sem prorrogação/pênaltis) para as partidas do grupo; só o mata-mata usa `knockout: true`.
3. **Determinismo dos AI×AI** — seeds estáveis derivadas de `RNG.seedFrom` (não usar `Date.now()` nas partidas do grupo, diferente do `confirmDraft`).
4. **Escala de força e viés do draft** — calibrar conservador: o viés do draft deve ser **pequeno** (todas as seleções continuam possíveis) e a progressão de dificuldade perceptível mas suave.
5. **Modais nas telas finais** — reusar o padrão de overlay existente (Esc/fundo/✕ + trava de scroll); não perder o compartilhamento (card/resumo) nem o `prefers-reduced-motion`.
6. **Velocidade trocada em partida** — recriar o efeito do `setInterval` preservando `clockRef` para não "saltar" o relógio.

---

## DECISÕES TÉCNICAS

### Decisão 1: Fase de grupos = grupo de 4, top-2 avança
- **Opção escolhida**: 1 grupo de 4 (jogador + 3 rivais), 3 jogos do jogador + 3 AI×AI simulados; classificam-se 2.
- **Justificativa**: Fiel ao loop atual (1 partida por vez), com tabela real, sem explodir a complexidade de um chaveamento de 16/32.
- **Alternativas consideradas**: Só 1º avança (mais difícil); grupo de 3 (mais curto). Descartadas na clarificação com o dev.

### Decisão 2: Jogos AI×AI reusam o engine puro
- **Opção escolhida**: `simulateMatch` com `opts` neutros (sem fadiga/pressão, sem prorrogação) para os rivais.
- **Justificativa**: Determinismo e zero código novo de simulação; tabela coerente com o mundo do jogo.
- **Alternativas consideradas**: Resultado aleatório/heurístico simples (menos coerente e não determinístico).

### Decisão 3: Persistência com defaults aditivos (bump de versão só se necessário)
- **Opção escolhida**: Manter `copa_draft_run_v2` e aplicar defaults para os campos do grupo no resume; perfil ganha `speed` com default.
- **Justificativa**: Campanhas/perfis existentes sobrevivem à atualização.
- **Alternativas consideradas**: Bump `v3` imediato (descartaria runs salvos) — só se a coexistência gerar inconsistência.

### Decisão 4: "Conhecida" no draft = derivado do overall
- **Opção escolhida**: Peso por `squadAvg` (sem campo de fama curado), com `DRAFT_STRENGTH_BIAS` pequeno.
- **Justificativa**: Zero curadoria/manutenção de dados; simples e configurável.
- **Alternativas consideradas**: Campo de fama curado / combinação fama+força (mais trabalho de balanceamento). Descartadas na clarificação.

### Decisão 5: Telas finais com `Modal` reutilizável
- **Opção escolhida**: Componente `Modal` (ou reuso de `.howto-overlay`/`.overlay`) para Notas/Gols/Estatísticas/Campanha/Conquistas.
- **Justificativa**: Enxuga a tela, padroniza o comportamento (Esc/fundo/✕) e reaproveita CSS existente.
- **Alternativas consideradas**: Abas/acordeões inline (continuaria "despejando" muito na mesma tela).

---

## RISCOS E MITIGAÇÕES

### Risco 1: Complexidade da fase de grupos na máquina de estados
- **Impacto**: Alto
- **Probabilidade**: Média
- **Mitigação**: Isolar a lógica pura (ETAPAS 6–7) com testes antes de fiar `app.jsx` (ETAPA 8); reusar o pipeline `prematch→match→post` existente; `opts.knockout: false` nos jogos de grupo.

### Risco 2: Quebra de determinismo nos jogos AI×AI / escala de força
- **Impacto**: Alto
- **Probabilidade**: Baixa
- **Mitigação**: RNG semeado em tudo (`seedFrom`/`weighted`); smoke test de determinismo da tabela e do sorteio por fase.

### Risco 3: Regressão em saves de campanhas em andamento
- **Impacto**: Médio
- **Probabilidade**: Baixa
- **Mitigação**: Campos aditivos + defaults no `loadRun`/`resumeRun`; teste manual de resume de save antigo; bump `v3` só se necessário.

### Risco 4: Balanceamento (dificuldade por fase / viés do draft) fora do ponto
- **Impacto**: Médio
- **Probabilidade**: Média
- **Mitigação**: Tudo em `config.js`; valores iniciais conservadores; ajuste por playtest sem tocar lógica.

### Risco 5: Telas finais perderem informação ao modalizar
- **Impacto**: Médio
- **Probabilidade**: Baixa
- **Mitigação**: Mapear cada bloco atual para um modal; manter compartilhamento e conquistas; checklist manual dos três desfechos.

---

## DOCUMENTAÇÃO DE REFERÊNCIA

- **PRD**: `prd/copa-draft-prd-002-tbd-fase-de-grupos-tela-final-e-ajustes.md`
- **PRD anterior (implementado)**: `prd/copa-draft-prd-001-tbd-eventos-estatisticas-e-tutorial.md` · **PLAN**: `plan/copa-draft-plan-001-eventos-estatisticas-e-tutorial.md`
- **Contexto do Projeto**: `MAPS/copa-draft/copa-draft-context.md`
- **Arquitetura**: `copa-draft-context.md` (não há `docs/architecture/` físico)
- **Código relacionado**: `config.js`, `lib/team.js` (`buildBracket`/`drawOpponents`/`squadAvg`), `lib/engine.js` (`simulateMatch`), `lib/sound.js` (`PATTERNS`), `lib/store.js`, `ui/match.jsx` (`MatchScreen`/`DURATION_MS`/ticker), `ui/draft.jsx` (`doDraw`/`randomFill`), `ui/post.jsx` (`PostMatchScreen`/`CampaignEndScreen`/`BracketScreen`), `ui/home.jsx` (`Segmented`/`HomeScreen`), `ui/howto.jsx` (padrão de overlay), `app.jsx`, `index.html`, `styles/kit.css` (`.overlay`/`.modal`), `game.css` (`.tk.*`, `.howto-overlay`)

---

## COMANDOS ÚTEIS

```bash
# Rodar o app localmente
python3 -m http.server 8000     # depois abrir http://localhost:8000

# Smoke tests da lógica pura (sem dependências)
node tests/team.test.js
# (regressão) testes do PRD_001:
node tests/engine.test.js
node tests/stats.test.js
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

1. **Implementar uma etapa por vez** — garantir testes passando antes de avançar.
2. **Seguir os padrões do projeto** — ver `copa-draft-context.md` (config central, engine puro, exposição em `window`, ordem dos scripts).
3. **Code review contínuo** — usar `/code-review` após cada etapa, em especial na fase de grupos (ETAPAS 6–8).
4. **Ganhos rápidos primeiro** — ETAPAS 2–5 são independentes e podem ser entregues/commitadas isoladamente, reduzindo risco antes da fase de grupos.

---

**Criado em:** 2026-06-06
**Próximo passo:** `/implementar ETAPA 1`
