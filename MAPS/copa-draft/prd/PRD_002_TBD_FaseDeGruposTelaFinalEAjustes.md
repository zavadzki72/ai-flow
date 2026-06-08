# PRD: Fase de Grupos, Tela Final em Modais e Ajustes de Jogabilidade

**Sequência**: 002
**Ticket**: TBD
**Versão**: 1
**Data**: 2026-06-06
**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO

**Metadados:**
- **Prioridade**: Alta
- **Complexidade**: 🔴 Alta
- **Repositório(s)**: `game` (`C:/Projects/Personal/copa-draft`)
- **Domínio(s)**: engine, team, match, ui, store, draft, sound

---

## 1. VISÃO GERAL

### 1.1. Contexto

O **Copa Draft** entrega o loop completo (draft no dado → mata-mata → simulação minuto a minuto → conquistas/estatísticas), com as features do PRD_001 **já implementadas** (eventos com impacto, estatísticas da Copa, aba "Como Jogar?"). Hoje a campanha vai **direto para o mata-mata**: `app.jsx` transita `home → draft → [reveal] → bracket → prematch → match → [shootout] → post → end`, e o chaveamento (`lib/team.js:buildBracket`) sorteia 4 adversários (`CONFIG.ROUNDS`: oitavas, quartas, semi, final) já ordenados por força crescente (`drawOpponents` → `squadAvg` ascendente).

Seis lacunas/oportunidades foram identificadas:

1. **Sem fase de grupos.** A campanha começa abruptamente nas oitavas. Falta a fase inicial de classificação que dá ritmo e contexto de Copa; e a dificuldade dos adversários deveria escalar de forma mais clara ao longo da competição.
2. **Tela final pesada e visualmente datada.** `PostMatchScreen` e `CampaignEndScreen` (`ui/post.jsx`) empilham tudo numa coluna só (placar + craque + gols + notas dos dois times; e, no fim, chaveamento + prêmios + grade de conquistas + botões + confete). É muita informação "cuspida" de uma vez e esteticamente fraca.
3. **Som de gol único.** `lib/sound.js` tem um único padrão `goal`; o ticker (`ui/match.jsx:251`) toca `beep('goal')` para **qualquer** gol, sem distinguir gol do jogador (`home`) do gol do adversário (`away`).
4. **Eventos do adversário sem destaque.** No ticker (`ui/match.jsx:344-351`), os eventos são coloridos só por `type` (`.tk.goal`, `.tk.yellow`, etc.), sem diferenciar o **lado**. Eventos do adversário deveriam saltar aos olhos em vermelho.
5. **Draft sem viés de expressão.** `doDraw` (`ui/draft.jsx:48-52`) sorteia a seleção com `Math.random()` **uniforme**: toda seleção tem a mesma chance, independentemente de ser uma potência ou uma seleção de baixa expressão.
6. **Velocidade da partida fixa.** O ticker tem `DURATION_MS = 34000` e `TICK = 90` **hardcoded** em `ui/match.jsx:229-230`. O jogador não consegue acelerar (ou desacelerar) a simulação.

### 1.2. Objetivo

Adicionar uma **fase de grupos** com dificuldade escalonada, **redesenhar as telas finais** com modais, e três **ajustes de jogabilidade/feedback** (som de gol do adversário, eventos do adversário em vermelho, viés de expressão no draft e seletor de velocidade):

1. **Fase de grupos (grupo de 4, top-2 avança)** — antes do mata-mata, o jogador disputa um grupo de 4 seleções (3 jogos, pontos corridos); precisa terminar em 1º ou 2º para entrar nas oitavas. Os jogos dos outros rivais do grupo são simulados pelo engine para montar uma **tabela real**.
2. **Escala de força por fase** — seleções mais fortes (maior overall médio) aparecem **menos** nas fases iniciais (grupos) e **mais** nas fases finais (semifinal/final), de forma determinística e configurável.
3. **Tela final em modais** — `PostMatchScreen` e `CampaignEndScreen` ficam com um **hero enxuto** + botões que abrem **modais** (notas, gols, prêmios, chaveamento, conquistas), reaproveitando o padrão de overlay já existente.
4. **Som de gol do adversário** — novo SFX distinto (mais sóbrio) tocado quando o gol revelado é do lado `away`.
5. **Eventos do adversário em vermelho** — o ticker passa a marcar eventos do lado `away` com paleta vermelha.
6. **Viés de expressão no draft** — seleções com maior overall médio têm uma **pequena chance a mais** de serem sorteadas no dado (peso derivado da força, configurável).
7. **Seletor de velocidade** — normal, rápido e super rápido, escolhível na home e ajustável durante a partida, persistido no perfil.

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Fase de grupos com tabela real
**Dado** que confirmei meu elenco no draft
**Quando** a campanha começa
**Então** entro numa **fase de grupos** com meu time e 3 seleções sorteadas (Grupo de 4)
**E** disputo **3 partidas** (todos contra todos), e os jogos entre os outros rivais são simulados pelo engine
**E** vejo uma **tabela de classificação** com pontos, jogos, V/E/D, saldo de gols (SG) e gols pró (GP), atualizada a cada rodada.

### Critério 2 — Classificação top-2 define o avanço
**Dado** que terminei minhas 3 partidas da fase de grupos
**Quando** a tabela final é calculada (com os critérios de desempate)
**Então** se eu terminar em **1º ou 2º**, avanço para as **oitavas** (mata-mata)
**E** se eu terminar em **3º ou 4º**, a campanha **encerra** com a tela de fim (eliminado na fase de grupos), exibindo a posição final e a tabela.

### Critério 3 — Dificuldade escala da fase de grupos à final
**Dado** uma campanha completa (grupos → oitavas → quartas → semi → final)
**Quando** comparo a força média (overall) dos adversários por fase
**Então** os adversários da **fase de grupos são, em média, mais fracos** e os das **fases finais são mais fortes**, com a **final** tendendo às seleções de maior expressão
**E** essa progressão é **determinística** para a mesma seed e **configurável** em `config.js` (sem números mágicos espalhados).

### Critério 4 — Tela de pós-jogo enxuta com modais
**Dado** que terminei uma partida
**Quando** chego à tela de pós-jogo
**Então** vejo um **resumo enxuto** (resultado, placar, craque do jogo) e **botões** para abrir detalhes
**E** ao tocar "Notas" abre um **modal** com as notas dos jogadores (abas meu time / adversário); ao tocar "Gols", abre um **modal** com os gols da partida
**E** consigo fechar cada modal (botão ✕ ou tecla Esc ou clique no fundo) e voltar ao resumo, sem perder o estado da partida.

### Critério 5 — Tela de fim de campanha enxuta com modais
**Dado** que minha campanha encerrou (campeão, eliminado no mata-mata, ou eliminado na fase de grupos)
**Quando** chego à tela final
**Então** vejo um **hero** (troféu/estado + título + chamada) e **botões** que abrem em **modais**: "Estatísticas da Copa" (premiações), "Campanha" (tabela do grupo + chaveamento) e "Conquistas" (grade)
**E** a tela não despeja tudo de uma vez; o visual fica limpo e moderno, mantendo os botões de compartilhar (📸 card, 📋 resumo) e ↻ jogar novamente.

### Critério 6 — Som diferente para gol do adversário
**Dado** uma partida em andamento com som ligado
**Quando** o ticker revela um **gol do adversário** (lado `away`)
**Então** toca um efeito sonoro **distinto** (mais sóbrio/grave) do efeito do gol do meu time
**E** quando o gol é do meu time (lado `home`), toca o efeito comemorativo atual.

### Critério 7 — Eventos do adversário em vermelho
**Dado** uma partida em andamento
**Quando** um evento do **adversário** (lado `away`) aparece no ticker (gol, falta, amarelo, defesa, pênalti, etc.)
**Então** ele é exibido com **paleta vermelha** (destaque de lado), diferenciando-se visualmente dos meus eventos
**E** eventos neutros (apito inicial, intervalo, fim de jogo) permanecem sem cor de lado.

### Critério 8 — Seleções de maior expressão aparecem um pouco mais no draft
**Dado** que rolo o dado para sortear uma seleção numa vaga
**Quando** o sorteio acontece
**Então** seleções com **maior overall médio** têm uma **chance levemente maior** de serem sorteadas do que seleções de baixa expressão
**E** **toda** seleção elegível para a vaga continua podendo aparecer (nenhuma é excluída); o viés é pequeno e **configurável** em `config.js`.

### Critério 9 — Seletor de velocidade da partida
**Dado** que estou na tela inicial (e/ou em partida)
**Quando** escolho a velocidade (**normal**, **rápido**, **super rápido**)
**Então** a simulação minuto a minuto roda mais rápido ou mais devagar conforme a escolha
**E** a preferência é **persistida** (vale para as próximas partidas/campanhas) e pode ser trocada **durante** a partida
**E** o resultado da partida (placar, eventos) **não muda** com a velocidade — só o ritmo de exibição.

### Critério 10 — Determinismo e compatibilidade preservados
**Dado** o mesmo elenco, formação e seed
**Quando** simulo a fase de grupos e o mata-mata sem interação (sem pênalti interativo)
**Então** os resultados (incluindo os jogos AI×AI do grupo e o sorteio escalonado dos adversários) são **idênticos** a cada execução
**E** runs antigos salvos (sem fase de grupos / sem campos novos) continuam carregando sem quebrar, com defaults seguros.

---

## 3. ESCOPO TÉCNICO

### 3.1. Componentes a Alterar

**Repositório `game`:**

- **`config.js`** — adicionar:
  - **Fase de grupos**: `GROUP_SIZE` (4), `GROUP_QUALIFY` (2), `GROUP_POINTS` (`{ win:3, draw:1, loss:0 }`).
  - **Escala de força por fase**: estrutura que define o **alvo/peso de força** por fase (grupos → final), p.ex. `PHASE_STRENGTH` (curva ou faixas de `squadAvg` por fase) e/ou `OPP_STRENGTH_BIAS`.
  - **Draft (viés de expressão)**: `DRAFT_STRENGTH_BIAS` (intensidade do peso por overall; `0` = uniforme).
  - **Velocidade**: `MATCH_SPEEDS` (`{ normal:{durationMs, label}, rapido:{...}, super:{...} }`) e `MATCH_SPEED_DEFAULT`.
  - Nada de números mágicos fora daqui.
- **`lib/team.js`** — generalizar a geração de adversários:
  - `drawOpponents`/`buildBracket`: aplicar a **escala de força por fase** (sorteio ponderado/por faixa via RNG semeado), em vez do simples shuffle + sort ascendente.
  - Nova função **`buildGroup(rng)`** (ou estender `buildBracket`): sortear os 3 rivais do grupo do jogador (pool mais fraco) e montar a estrutura do grupo + calendário de 6 partidas (3 do jogador + 3 AI×AI).
  - Nova função **`groupStandings(group)`** (pura): calcular a tabela (pontos, J, V, E, D, GP, GC, SG) e ordená-la pelos critérios de desempate.
  - `squadAvg` reaproveitado para força; pode expor um helper de **tier/força** das squads.
- **`lib/engine.js`** — sem mudança de regra; reaproveitado para **simular os jogos AI×AI do grupo** (já é puro/determinístico via `simulateMatch`). Confirmar que `result`/`score` bastam para a tabela.
- **`app.jsx`** — máquina de estados:
  - Nova fase **`group`** (e, se necessário, `groupmatch`) entre `draft`/`reveal` e o mata-mata.
  - Estado novo: `group` (rivais, calendário, resultados, tabela) e índice da rodada de grupo.
  - Fluxo: confirmar draft → montar grupo → jogar 3 partidas do jogador (intercaladas com simulação AI×AI) → calcular tabela → se classificado, montar o **bracket** (mata-mata) e seguir para `bracket`; senão, ir para `end` (eliminado na fase de grupos).
  - Persistência: incluir os novos campos no `snapshot()` e no `resumeRun()` com defaults.
  - Estado/preferência de **velocidade** (`speed`), inicializado do perfil, repassado a `MatchScreen`.
  - Repassar o **lado** correto para o SFX de gol (ou deixar o `MatchScreen` decidir).
- **`ui/match.jsx`** — `MatchScreen`:
  - **Velocidade**: ler `DURATION_MS` de `CONFIG.MATCH_SPEEDS[speed]` (prop), em vez de constante; permitir troca de velocidade durante a partida (mini-seletor no cabeçalho do placar) reconfigurando o `setInterval`.
  - **Som por lado**: ao detectar novo gol revelado, tocar `goal` (home) ou o novo `goalAway` (away) conforme `e.side`.
  - **Eventos em vermelho**: adicionar classe de lado ao item do ticker (`className={`tk ${e.type} ${e.side === 'away' ? 'away' : ''}`}`).
- **`ui/draft.jsx`** — `doDraw` e `randomFill`: substituir o sorteio uniforme da seleção por **sorteio ponderado por overall médio** (`squadAvg`), respeitando a elegibilidade da vaga e o viés de `CONFIG.DRAFT_STRENGTH_BIAS`.
- **`ui/post.jsx`** — redesenho:
  - `PostMatchScreen`: hero enxuto + botões → modais (Notas, Gols). Reaproveitar a estrutura de notas/gols atual dentro dos modais.
  - `CampaignEndScreen`: hero + botões → modais (Estatísticas da Copa, Campanha [tabela do grupo + chaveamento], Conquistas). Suportar o novo desfecho "eliminado na fase de grupos".
  - `BracketScreen`: pode ganhar um indicador de que a fase de grupos foi superada (opcional/nice-to-have).
- **`ui/home.jsx`** — `HomeScreen`: novo seletor de **velocidade** (componente `Segmented` já existente), abaixo de Modo/Formação.
- **`ui/components.jsx`** — `GameHeader`: refletir a fase de grupos no rótulo de fase (campanha), se aplicável.
- **`lib/sound.js`** — novo padrão `goalAway` (efeito sóbrio/grave) em `PATTERNS`.
- **`lib/store.js`** — `DEFAULT_PROFILE` ganha `speed` (default `MATCH_SPEED_DEFAULT`); `setSetting('speed', …)`. Snapshot do run passa a incluir os campos da fase de grupos com defaults no resume. Avaliar bump da chave do run (`copa_draft_run_v2` → `v3`) **se** a coexistência de saves antigos sem grupo gerar estado inconsistente.
- **`index.html`** — incluir eventuais novos `<script>` (ex.: `ui/group.jsx`, `ui/modal.jsx`) na ordem certa (libs → dados → ui → `app.jsx` por último).
- **`game.css` / `styles/kit.css`** — estilos:
  - `.tk.away.*` (eventos do adversário em vermelho), usando `--loss`.
  - Tela final: cards/hero + botões e o conteúdo dos modais (reusar `.overlay`/`.modal` de `kit.css` ou o padrão `.howto-overlay`/`.howto-panel` de `game.css`).
  - Tabela de grupo (`.group-table` ou equivalente) e seletor de velocidade.

### 3.2. Componentes Novos

- **`ui/group.jsx`** — `GroupStageScreen` (tabela de classificação do grupo, calendário/rodadas, botão "Disputar próxima partida" / "Avançar"), exposto em `window` e referenciado no `index.html`.
- **`ui/modal.jsx`** (opcional, recomendado) — componente genérico `Modal`/`Overlay` reutilizável (fecha em Esc/clique no fundo/✕, trava scroll), para padronizar os modais das telas finais. Alternativamente, reusar diretamente o padrão `.howto-overlay` já existente em `ui/howto.jsx`.

### 3.3. Componentes Reutilizados

- **`lib/engine.js`** (`simulateMatch`) — simula os jogos AI×AI da fase de grupos (puro/determinístico).
- **`lib/rng.js`** (`makeRng`, `seedFrom`, `weighted`, `int`) — sorteio ponderado escalonado (adversários por fase) e estrutura de grupo, **semeados**.
- **`lib/team.js`** (`bestXI`, `squadAvg`, `makeSide`) — montagem dos XIs adversários e força das squads.
- **`Flag`, `Crest`, `TeamMark`, `PosPill`, `Segmented`** — apresentação e seletor.
- **`window.STATS`, `window.ACHIEVEMENTS`, `window.SHARECARD`** — premiações, conquistas e compartilhamento na tela final.

### 3.4. Fluxo de Dados

```
1. Draft confirmado (app.jsx:confirmDraft):
   - monta o GRUPO: 3 rivais sorteados (pool mais fraco, escala por fase) + calendário de 6 jogos.
2. Fase de grupos (phase 'group'):
   2.1. Jogador disputa suas 3 partidas (prematch → match → post), uma por rodada.
   2.2. Os 3 jogos AI×AI são simulados pelo engine (semeados) para preencher a tabela.
   2.3. groupStandings() recalcula a classificação a cada rodada (pontos, SG, GP, desempates).
3. Fim dos grupos:
   - top-2 → buildBracket() com escala de força (oitavas..final mais fortes) → phase 'bracket'.
   - 3º/4º → phase 'end' (eliminado na fase de grupos).
4. Mata-mata: igual ao atual (prematch → match → [shootout] → post), com adversários mais fortes por fase.
5. Partida (match): velocidade lida de CONFIG.MATCH_SPEEDS[speed]; SFX de gol por lado;
   eventos 'away' em vermelho no ticker.
6. Telas finais (post / end): hero enxuto + modais (notas, gols, prêmios, campanha, conquistas).
7. Persistência: snapshot inclui grupo/tabela/resultados; perfil inclui 'speed'.
```

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos

- **Grupo (novo, no run)**: `{ rivals: [squad, squad, squad], fixtures: [{ round, home: idx, away: idx, played, log? }], myResults: [...], standings: [...] }`. O jogador é uma das 4 entradas; os 3 rivais são squads sorteadas. `fixtures` cobre as 6 partidas do round-robin (3 do jogador + 3 AI×AI).
- **Linha da tabela (standing)**: `{ teamRef, J, V, E, D, GP, GC, SG, P }`, ordenável por `P → SG → GP → (critério final estável: ordem de sorteio/seed)`.
- **Escala de força por fase (CONFIG)**: define, por fase (`grupos`, `oitavas`, `quartas`, `semi`, `final`), o **alvo de força** (faixa de `squadAvg` ou peso) usado no sorteio dos adversários — fases finais puxam para squads de maior overall.
- **Preferência de velocidade (perfil)**: `speed ∈ { 'normal', 'rapido', 'super' }`, persistida em `copa_draft_profile_v1`.
- **Evento de partida (existente, `log.events`)**: já carrega `side: 'home' | 'away'` (engine.js) — base para SFX por lado e coloração vermelha; eventos neutros (`kickoff`, `half`, `full`, `pens`) **não** têm `side`.

### 4.2. Comandos / Queries / DTOs

- **`CONFIG` (novas chaves)**: `GROUP_SIZE`, `GROUP_QUALIFY`, `GROUP_POINTS`, `PHASE_STRENGTH`/`OPP_STRENGTH_BIAS`, `DRAFT_STRENGTH_BIAS`, `MATCH_SPEEDS`, `MATCH_SPEED_DEFAULT`. Todas nomeadas, sem hardcode fora do `config.js`.
- **`team.buildGroup(rng)`** (novo): devolve a estrutura de grupo (rivais + fixtures) sorteada com o pool de força da fase de grupos.
- **`team.groupStandings(group)`** (novo, puro): devolve a tabela ordenada com desempates.
- **`team.drawOpponents`/`buildBracket`** (alterados): aceitam a escala de força por fase.

### 4.3. Handlers / Services

- **`engine.simulateMatch`**: reusado para os jogos AI×AI do grupo (sem alteração de regra; sem fadiga/pressão do jogador — opções `{ knockout:false }` ou equivalentes para jogos neutros do grupo).
- **`team.groupStandings`**: cálculo puro da classificação (testável, determinístico).
- **`app` (orquestração)**: novo controlador da fase de grupos (rodadas, simulação dos rivais, decisão de avanço), e fiação da velocidade/SFX.

### 4.4. Persistência

- **Run** (`store.saveRun`/`loadRun`): snapshot passa a incluir `group` (rivais, fixtures, resultados, standings), a fase `group` e o índice da rodada. `resumeRun` aplica **defaults** para runs antigos (sem grupo): runs legados que já estão no mata-mata continuam funcionando; runs sem grupo iniciam/continuam como hoje. Avaliar bump `copa_draft_run_v2 → v3` se necessário para evitar estados inconsistentes (preferir defaults aditivos antes de bump destrutivo).
- **Perfil** (`copa_draft_profile_v1`): adiciona `speed` (default `MATCH_SPEED_DEFAULT`), via `setSetting`. Demais campos inalterados.

### 4.5. Validações

- A fase de grupos sempre tem `GROUP_SIZE` times (jogador + 3 rivais distintos, sem repetição entre si nem com os adversários do mata-mata na mesma campanha, na medida do possível).
- O sorteio ponderado (draft e adversários) **nunca exclui** uma seleção elegível — apenas ajusta probabilidades; com pool insuficiente, faz fallback para qualquer elegível (como hoje em `doDraw`/`randomFill`).
- Velocidade altera **apenas** o ritmo de exibição; o `log` da partida é o mesmo. `prefers-reduced-motion` continua pulando direto para o fim (independente da velocidade).
- Modais são somente leitura: abrir/fechar não altera o estado da partida/campanha.

### 4.6. Autorização

- Jogo single-player, 100% no navegador, sem autenticação. Sem perfis/roles. Todas as ações são do jogador local.

---

## 5. REGRAS DE NEGÓCIO

- **RN01** — A campanha passa a ter **fase de grupos** antes do mata-mata: 1 grupo de **4** seleções (jogador + 3 rivais), todos contra todos (**3 jogos** para o jogador; 6 jogos no total no grupo).
- **RN02** — Pontuação: **vitória 3, empate 1, derrota 0** (`GROUP_POINTS`). Os jogos AI×AI dos rivais são **simulados pelo engine** para compor a tabela.
- **RN03** — **Classificam-se os 2 primeiros** (`GROUP_QUALIFY`). Critérios de desempate na ordem: **pontos → saldo de gols (SG) → gols pró (GP) → critério estável** (ordem de sorteio/seed). Se o jogador terminar **fora do top-2**, a campanha encerra (eliminado na fase de grupos).
- **RN04** — A **força dos adversários escala por fase**: fase de grupos tende às seleções **mais fracas**; o mata-mata escala até a **final**, que tende às seleções de **maior expressão** (maior `squadAvg`). Determinístico (RNG semeado) e configurável (`PHASE_STRENGTH`/`OPP_STRENGTH_BIAS`).
- **RN05** — Após a classificação, o **mata-mata** segue como hoje (oitavas → quartas → semi → final), com 1 adversário por fase.
- **RN06** — **Tela de pós-jogo**: resumo enxuto (resultado, placar, craque) + **modais** para Notas e Gols.
- **RN07** — **Tela de fim de campanha**: hero + **modais** para Estatísticas da Copa, Campanha (tabela do grupo + chaveamento) e Conquistas. Suporta três desfechos: campeão, eliminado no mata-mata, eliminado na fase de grupos.
- **RN08** — **Gol do adversário** (lado `away`) toca um **SFX distinto** (`goalAway`); gol do jogador (lado `home`) mantém o SFX `goal` atual.
- **RN09** — **Eventos do adversário** (lado `away`) no ticker são exibidos em **vermelho** (`--loss`); eventos do jogador mantêm a paleta atual; eventos **neutros** (apito, intervalo, fim) ficam sem cor de lado.
- **RN10** — No **draft**, seleções de **maior overall médio** têm **chance levemente maior** de sair no dado (peso por `squadAvg`, intensidade `DRAFT_STRENGTH_BIAS`). Toda seleção elegível continua possível; o viés é **pequeno**.
- **RN11** — **Velocidade** da partida: **normal / rápido / super rápido** (`MATCH_SPEEDS`). Persistida no perfil; trocável na home e durante a partida; **não altera o resultado**.
- **RN12** — Todo balanceamento novo reside em **`config.js`**; nenhum número mágico fora dele.
- **RN13** — O motor permanece **puro e determinístico** (grupos AI×AI e sorteios escalonados via RNG semeado); a única exceção segue sendo o **pênalti interativo** em tempo real (PRD_001).
- **RN14** — Runs antigos (sem grupo/sem `speed`) carregam com **defaults seguros**, sem quebra.

---

## 6. REQUISITOS FUNCIONAIS

- **RF01** — Após o draft, iniciar a **fase de grupos** (grupo de 4, 3 partidas do jogador + 3 AI×AI simuladas).
- **RF02** — Exibir a **tabela de classificação** do grupo (P, J, V, E, D, GP, GC, SG), atualizada por rodada, com destaque ao time do jogador e à zona de classificação.
- **RF03** — Aplicar desempates (SG → GP → estável) e decidir **avanço (top-2)** ou **eliminação**.
- **RF04** — Sortear adversários com **força escalonada por fase** (grupos mais fracos → final mais forte), determinístico e configurável.
- **RF05** — Pós-jogo com **hero enxuto + modais** (Notas, Gols).
- **RF06** — Fim de campanha com **hero + modais** (Estatísticas da Copa, Campanha, Conquistas), suportando o desfecho "eliminado na fase de grupos".
- **RF07** — Tocar **SFX distinto** para gol do adversário (`goalAway`).
- **RF08** — Colorir **eventos do adversário em vermelho** no ticker.
- **RF09** — **Sorteio ponderado por overall** no draft (viés pequeno, configurável).
- **RF10** — **Seletor de velocidade** (normal/rápido/super), persistido e trocável na home e em partida.
- **RF11** — Persistir a fase de grupos no run e a velocidade no perfil; resume com defaults.

---

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01 — Determinismo**: grupos AI×AI e sorteios escalonados usam **RNG semeado**; mesma entrada/seed ⇒ mesmos resultados. Sem `Math.random()` no caminho determinístico do engine (o draft segue interativo/não-semeado como hoje).
- **RNF02 — Sem build**: HTML/CSS/JS + React via CDN; novos `.jsx`/`.js` expostos em `window` e incluídos no `index.html` na ordem certa.
- **RNF03 — Balanceamento centralizado**: grupos, escala de força, viés do draft e velocidades em `config.js`.
- **RNF04 — Performance**: simulação dos jogos do grupo e cálculo da tabela são instantâneos no navegador; troca de velocidade sem travar o ticker.
- **RNF05 — Resiliência de storage**: runs antigos sem grupo/`speed` não quebram (defaults).
- **RNF06 — Acessibilidade/idioma**: PT-BR; modais fecham com Esc/clique no fundo/✕ e travam o scroll do fundo (padrão `HowToPlay`); `prefers-reduced-motion` respeitado (partida instantânea, sem confete).

---

## 8. SCHEMA / MIGRATIONS (se aplicável)

**Migration necessária?** ☑ Sim (estrutura de dados local) ☐ Não

**Se SIM:**
- **Snapshot do run** ganha: `group` (rivais, fixtures, resultados, standings), fase `group` e índice de rodada do grupo.
- **Perfil** ganha: `speed`.

**Impacto em dados existentes?** Runs salvos em `copa_draft_run_v2` anteriores não terão `group`. Tratar com **defaults** no resume (run sem grupo → segue o fluxo antigo/knockout). Bump `v2 → v3` **somente** se a coexistência gerar estado inconsistente. Perfil: `speed` ausente → `MATCH_SPEED_DEFAULT`.

**Reversível?** Sim — campos aditivos; sem eles o jogo opera no fluxo anterior.

---

## 9. INTEGRAÇÕES (se aplicável)

### 9.1. Sistemas Externos Afetados
Nenhum. Jogo 100% client-side, sem backend nem serviços externos.

### 9.2. Alterações em Contratos
Contratos **internos** (snapshot do run, perfil, formato do grupo) estendidos de forma **aditiva**.

**Breaking change?** Não para o usuário (aditivo + defaults). Internamente, consumidores do run (resume) e do perfil (settings) devem reconhecer os novos campos.

---

## 10. TRATAMENTO DE ERROS

### CE01 — Pool insuficiente para o viés/escala de força
- **Situação**: a faixa de força alvo da fase não tem squads suficientes elegíveis.
- **Tratamento**: relaxar a faixa/fallback para qualquer elegível (como `doDraw`/`randomFill` já fazem), mantendo o sorteio possível.
- **Mensagem**: transparente ao jogador.

### CE02 — Empate total na tabela do grupo
- **Situação**: dois times empatam em P, SG e GP.
- **Tratamento**: aplicar o **critério estável** (ordem de sorteio/seed) para desempate determinístico.
- **Mensagem**: nenhuma; a tabela já reflete a ordem.

### CE03 — Resume de run antigo (sem grupo)
- **Situação**: snapshot salvo antes desta feature.
- **Tratamento**: aplicar defaults; run legado segue como knockout direto, sem quebrar.
- **Mensagem**: transparente ao jogador.

### CE04 — Perfil sem `speed`
- **Situação**: perfil antigo sem a chave.
- **Tratamento**: default `MATCH_SPEED_DEFAULT`.
- **Mensagem**: nenhuma.

### CE05 — localStorage bloqueado
- **Situação**: storage indisponível (modo restrito).
- **Tratamento**: manter o comportamento resiliente do `store` (não quebrar a partida); velocidade/escolhas valem só na sessão.
- **Mensagem**: nenhuma.

---

## 11. CASOS DE USO

### UC01: Disputar a fase de grupos e classificar
**Ator:** Jogador
**Pré-condições:** elenco montado.
**Fluxo Principal:**
1. Após confirmar o draft, entra na fase de grupos (grupo de 4).
2. Vê a tabela e o calendário; disputa sua 1ª partida.
3. Os jogos dos rivais são simulados; a tabela atualiza.
4. Disputa as 2ª e 3ª partidas.
5. Termina em 1º/2º → avança às oitavas.
**Fluxos Alternativos:**
- **FA01 — Eliminado na fase de grupos:** termina em 3º/4º → tela final (eliminado na fase de grupos) com a tabela.

### UC02: Ajustar a velocidade da partida
**Ator:** Jogador
**Pré-condições:** nenhuma.
**Fluxo Principal:**
1. Na home, escolhe "super rápido".
2. Inicia a partida; o ticker corre mais rápido.
3. Durante a partida, troca para "normal"; o ritmo ajusta na hora.
4. A preferência persiste na próxima partida/campanha.

### UC03: Consultar detalhes nas telas finais via modais
**Ator:** Jogador
**Pré-condições:** partida/campanha encerrada.
**Fluxo Principal:**
1. Vê o resumo enxuto.
2. Abre o modal "Notas"; depois "Gols"; fecha cada um.
3. No fim da campanha, abre "Estatísticas da Copa", "Campanha" e "Conquistas" em modais.

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: Tabela do grupo determinística
**Dado** a mesma seed e elenco
**Quando** simulo a fase de grupos duas vezes
**Então** os resultados (meus jogos e os AI×AI) e a tabela final são idênticos.

### Cenário 2: Classificação e desempate
**Dado** um grupo onde dois times empatam em pontos
**Quando** a tabela final é calculada
**Então** o desempate aplica SG → GP → critério estável, e o top-2 é escolhido corretamente.

### Cenário 3: Eliminado na fase de grupos
**Dado** que terminei em 3º
**Quando** a fase de grupos encerra
**Então** vou para a tela final (eliminado na fase de grupos), que mostra a tabela e minha posição.

### Cenário 4: Escala de força por fase
**Dado** uma campanha completa
**Quando** comparo a média de força dos adversários por fase
**Então** grupos < oitavas < quartas < semi < final (em média), de forma determinística.

### Cenário 5: SFX por lado do gol
**Dado** uma partida com som ligado
**Quando** revela um gol `home` e depois um gol `away`
**Então** toca `goal` no primeiro e `goalAway` (distinto) no segundo.

### Cenário 6: Eventos do adversário em vermelho
**Dado** eventos `home` e `away` no ticker
**Quando** são exibidos
**Então** os `away` aparecem em vermelho e os `home` na paleta atual; neutros sem cor de lado.

### Cenário 7: Viés de expressão no draft
**Dado** muitos sorteios para a mesma vaga
**Quando** observo a distribuição das seleções sorteadas
**Então** as de maior overall médio aparecem um pouco mais, mas todas as elegíveis aparecem.

### Cenário 8: Velocidade não altera resultado
**Dado** a mesma partida em "normal" e "super rápido"
**Quando** comparo o placar e os eventos finais
**Então** são idênticos; só o ritmo de exibição muda.

### Cenário 9: Modais nas telas finais
**Dado** a tela de pós-jogo/fim
**Quando** abro e fecho os modais (✕, Esc, clique no fundo)
**Então** o conteúdo aparece/some sem alterar o estado da partida/campanha.

### Cenário 10: Resume de run antigo
**Dado** um snapshot salvo antes desta feature
**Quando** retomo a campanha
**Então** carrega com defaults (sem grupo / velocidade default) e não quebra.

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Fase de grupos (grupo de 4, 3 jogos do jogador + 3 AI×AI) com tabela e desempates corretos.
- [ ] Top-2 avança às oitavas; 3º/4º encerra a campanha (tela "eliminado na fase de grupos").
- [ ] Escala de força por fase (grupos mais fracos → final mais forte), determinística e configurável.
- [ ] Pós-jogo e fim de campanha redesenhados com hero enxuto + modais (notas, gols, prêmios, campanha, conquistas).
- [ ] SFX distinto para gol do adversário; eventos do adversário em vermelho no ticker.
- [ ] Sorteio ponderado por overall no draft (viés pequeno, configurável); nenhuma seleção elegível excluída.
- [ ] Seletor de velocidade (normal/rápido/super), persistido no perfil e trocável na home e em partida; resultado inalterado.
- [ ] Determinismo verificado (grupos AI×AI e sorteios escalonados via RNG semeado).
- [ ] Resume de runs antigos com defaults, sem quebra; perfil com `speed` default.
- [ ] Nenhum número mágico fora do `config.js`; componentes novos expostos em `window` e `<script>` em ordem no `index.html`.
- [ ] Build/preview manual passando; PRD atendido 100%.

---

## 14. REFERÊNCIAS

- Contexto do projeto: `MAPS/copa-draft/context.md`
- Mapa do projeto: `MAPS/copa-draft/map.json`
- PRD anterior (já implementado): `MAPS/copa-draft/prd/PRD_001_TBD_EventosEstatisticasETutorial.md`
- Código-fonte: `config.js`, `lib/team.js` (`buildBracket`/`drawOpponents`/`squadAvg`), `lib/engine.js` (`simulateMatch`, eventos com `side`), `lib/sound.js` (`PATTERNS.goal`), `lib/store.js` (`DEFAULT_PROFILE`/run keys), `ui/match.jsx` (`MatchScreen`, `DURATION_MS`/`TICK`, ticker), `ui/draft.jsx` (`doDraw`/`randomFill`), `ui/post.jsx` (`PostMatchScreen`/`CampaignEndScreen`/`BracketScreen`), `ui/home.jsx` (`Segmented`/`HomeScreen`), `ui/howto.jsx` (padrão de overlay/modal), `app.jsx` (máquina de estados), `styles/kit.css` (`.overlay`/`.modal`), `game.css` (`.tk.*`, `.howto-overlay`), `index.html`
- Ticket/story: TBD

---

## 15. OBSERVAÇÕES

Decisões tomadas com o dev na fase de clarificação:
1. **Fase de grupos**: grupo de **4**, **top-2 avança**; jogador disputa **3** partidas; jogos dos rivais simulados pelo engine para a tabela.
2. **Telas finais a redesenhar**: **pós-jogo E fim de campanha**, ambas com **hero enxuto + modais**.
3. **Seleção "conhecida" no draft**: **derivar do overall** (mais forte = levemente mais provável), sem campo de fama curado.
4. (Implícitas) escala de força por fase, SFX de gol do adversário, eventos do adversário em vermelho e seletor de velocidade conforme o enunciado.

**Riscos Identificados:**
- ⚠️ **Mudança no fluxo da campanha** (inserir a fase de grupos na máquina de estados de `app.jsx`): orquestrar 3 partidas do jogador intercaladas com 3 simulações AI×AI, e a transição correta para o mata-mata ou para a eliminação.
- ⚠️ **Compatibilidade de saves** antigos (sem grupo): preferir defaults aditivos; bump de chave do run só se necessário.
- ⚠️ **Redesenho das telas finais**: mover muito conteúdo para modais sem perder informação nem o compartilhamento (card/resumo) e mantendo `prefers-reduced-motion`.
- ⚠️ **Calibração da escala de força e do viés do draft**: o viés deve ser **pequeno** (todas as seleções continuam possíveis) e a progressão de dificuldade perceptível mas não brusca.

**Dependências:**
- 🔗 `engine.simulateMatch` puro/determinístico (PRD_001) para os jogos do grupo.
- 🔗 `RNG.weighted`/`makeRng`/`seedFrom` (`lib/rng.js`) para sorteios semeados.
- 🔗 Padrão de overlay de `ui/howto.jsx` e `.overlay`/`.modal` de `styles/kit.css` para os modais.
- 🔗 `window.STATS`/`window.ACHIEVEMENTS`/`window.SHARECARD` para as telas finais.

---

## 16. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-06-06 | 1 | IA (Claude) | Versão inicial |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
