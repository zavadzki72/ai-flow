# Context: Copa Draft

> Este arquivo contém o contexto rico do projeto. É a fonte de verdade para as skills de IA.

---

## Visão Geral

**Copa Draft** é um jogo de Copa do Mundo estilo Brasfoot, 100% no navegador.
O jogador monta um time dos sonhos rolando um dado — a cada vaga, uma seleção histórica é sorteada e ele escolhe um craque dela — e disputa um mata-mata simulado minuto a minuto com narração em português.

- **Stack:** HTML + CSS + JavaScript puro. React 18 + Babel via CDN (sem build, sem dependências).
- **Entrada:** `index.html` (carrega libs, dados e componentes nesta ordem).
- **Idioma:** português (PT-BR).
- **Design:** Marccu's Copa Design System (dark, verde/amarelo/azul, fonte Archivo, rótulos code-token). Tokens em `styles/colors_and_type.css` e `styles/kit.css`.

---

## Arquitetura

**Padrão:** SPA sem build | **Estilo:** state-machine
**Stack Frontend:** html, css, javascript, react-cdn, babel

### Princípios (manter)
- **`config.js` centraliza TODO o balanceamento** — nada de números mágicos espalhados.
- **Motor de partida puro e determinístico:** `ENGINE.simulateMatch(home, away, config, seed) → log`. Mesma entrada = mesmo resultado. Sem DOM, testável isoladamente.
- **Atributos nunca são escritos à mão** — derivados em `lib/derive.js` de overall + posição + arquétipo.
- **Dados desacoplados:** o jogo lê só `window.SQUADS` (`data/squads.js`); dá pra adicionar seleções sem tocar na lógica.
- **Arquivos pequenos:** UI dividida em vários `.jsx` importados no `index.html`. Componentes compartilhados são expostos via `Object.assign(window, {...})` no fim de cada arquivo.

### Fluxo de fases (estado `phase` em `app.jsx`)
```
home → draft → [reveal (só Almanaque)] → bracket → prematch → match →
[shootout (empate no mata-mata)] → post → (bracket de novo | end)
```

---

## Estrutura de Arquivos

```
index.html            Ponto de entrada. Ordem dos <script> importa.
config.js             window.CONFIG — todas as constantes de balanceamento.
game.css              Estilos do jogo (@import styles/kit.css).
app.jsx               Máquina de estados (fases) + fiação de tudo.

lib/
  rng.js              window.RNG — mulberry32 com semente + helpers (range/int/pick/weighted).
  derive.js           window.DERIVE — deriveAttrs(player) → 6 atributos FIFA. Labels PT.
  engine.js           window.ENGINE — simulateMatch(), autoShootout(), finalizeShootout().
  ratings.js          window.RATINGS — computeRatings(log, config) → notas + craque do jogo.
  team.js             window.TEAM — draftSlots, eligible, bestXI, buildBracket, formationRows, fadiga.
  achievements.js     window.ACHIEVEMENTS — LIST, BY_ID, matchAchievements, campaignAchievements.
  store.js            window.STORE — persistência localStorage (run + profile).
  sound.js            window.SFX — SFX sintetizados WebAudio. play/setEnabled/prime.
  sharecard.js        window.SHARECARD — render/download (canvas PNG) + copySummary.

ui/
  components.jsx      Flag, Crest, TeamMark, GameHeader, PlayerTile, Pitch, AttrBars, PosPill.
  home.jsx            Die, Segmented, FormationSelect, HomeScreen.
  draft.jsx           DraftScreen (draft no dado + Random + revisão), AlmanaqueReveal.
  match.jsx           StaminaBar, PreMatchScreen (escalação/subs), MatchScreen (ticker).
  penalty.jsx         PenaltyShootout (mini-game interativo).
  post.jsx            PostMatchScreen, BracketScreen, CampaignEndScreen, AchievementToast.

data/
  squads.js           window.SQUADS — 8 elencos (4 seleções × 2 Copas), ~18 jogadores cada.

styles/
  colors_and_type.css Tokens do design system (cores, tipo, espaçamento, easing).
  kit.css             Componentes/utilidades do design system.
```

---

## Padrões Frontend

- **Ao adicionar componente novo:** exponha em `window` no fim do arquivo e adicione o `<script>` no `index.html` na ordem certa (libs → dados → ui → app.jsx por último).
- **Posições:** `GOL | ZAG | LAT | MEI | ATA`. Arquétipos: craque, velocista, cerebral, muralha, motorzinho, finalizador, lider.
- **O jogador é sempre o lado `home`** no engine; adversários são `away`.
- **Formações** em `CONFIG.FORMATIONS` — cada uma deve somar 11. `LAT:0` é válido (ex: 3-5-2).
- **localStorage keys:** `copa_draft_run_v2` (campanha) e `copa_draft_profile_v1` (perfil).
- **Erros transitórios de carregamento** de `.jsx`/`.css` no preview são de rede (recarregar resolve), não bugs de código.

---

## Git Workflow

- **Branch principal:** `main`
- **Nomenclatura de branches:** `feature/descricao`, `fix/descricao`
- **Commit convention:** Conventional Commits (feat:, fix:, chore:)
- **Pull Request:** base em `main`, ao menos 1 aprovação

---

## Testes

> A preencher: o engine é puro e determinístico — mesma seed → mesmo resultado. Candidato natural a testes de regressão (`lib/engine.js`).

---

## Glossário

| Termo | Definição |
|-------|-----------|
| Draft | Processo de montar o elenco, escolhendo jogadores de seleções sorteadas |
| Mata-mata | Fase eliminatória: oitavas → quartas → semi → final |
| Overall | Nota geral do jogador (escala FIFA) |
| Arquétipo | Papel secundário do jogador (craque, velocista, cerebral, etc.) |
| Almanaque | Modo onde o draft é às cegas, sem ver notas/atributos |
| Elenco | Time completo: 11 titulares + reservas |

---

## Comandos

### Rodar localmente

```bash
# Python
python3 -m http.server 8000

# Node
npx serve
```

### Build
```bash
# Sem build — HTML estático puro
```

### Testes
```bash
# A preencher: testes do engine (lib/engine.js é puro e determinístico)
```

---

## Code Review Checklist

### Bloqueadores Absolutos (impedem merge)
- [ ] Números mágicos fora do `config.js`
- [ ] Atributos escritos à mão (devem vir de `lib/derive.js`)
- [ ] Componente novo não exposto em `window` ou `<script>` fora de ordem no `index.html`
- [ ] Quebra do determinismo do engine (dependência de `Math.random()` sem seed)
- [ ] Credenciais ou dados sensíveis hardcoded
