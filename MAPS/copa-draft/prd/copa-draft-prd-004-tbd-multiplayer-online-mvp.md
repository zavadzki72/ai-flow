# PRD: Multiplayer Online — Salas, Torneio com Amigos (MVP)

**Sequência**: 004
**Ticket**: TBD
**Versão**: 4
**Data**: 2026-06-10
**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO

**Metadados:**
- **Prioridade**: Alta
- **Complexidade**: 🔴 Alta
- **Repositório(s)**: `game` (**mono-repo**) — pastas `frontend/` (existente, migrada para a subpasta) e `backend/` (**.NET 10**, NOVA)
- **Domínio(s)**: multiplayer, lobby, auth, engine (porte), draft, match, ui, store, realtime

---

## 1. VISÃO GERAL

### 1.1. Contexto

O **Copa Draft** é hoje um jogo **100% client-side, sem backend e sem build**: React via CDN, máquina de estados em `app.jsx` (`home → draft → [reveal] → group → bracket → prematch → match → [shootout] → post → end`), engine **puro e determinístico** (`ENGINE.simulateMatch(home, away, config, seed, opts)`), dados em `data/squads.js` e persistência local em `localStorage` (`copa_draft_run_v2`, `copa_draft_profile_v1`). A fase de grupos (1 grupo de 4, top-2 avança) e o mata-mata contra IA já estão implementados (PRD_002).

A proposta é criar um **modo Multiplayer Online**: amigos criam uma **sala (lobby)**, compartilham com outros amigos, **cada um monta seu time** e disputam um **torneio único** — distribuídos em **grupos diferentes** para que só se cruzem nas fases de mata-mata.

Isso exige uma mudança estrutural grande, decidida com o dev na fase de clarificação:

- O projeto passa a ser um **mono-repo**: o `copa-draft` ganha as pastas **`frontend/`** (todo o jogo atual migra do root para essa subpasta) e **`backend/`** (o servidor .NET). Frontend e backend versionam e deployam juntos.
- O lobby é um **estado compartilhado** que vários jogadores leem/escrevem em **tempo real** → não cabe no navegador isolado. Será criado um **backend próprio em .NET 10**, hospedado na **VPS do dev** (24/7), em vez de BaaS (Supabase/Firebase pausam/cold-start no free tier).
- A **simulação do torneio** (grupos + mata-mata) passa a rodar **no servidor** (server-authoritative): o **engine determinístico será portado de JavaScript para C#**, virando a **fonte única da verdade** do multiplayer (anti-cheat e sincronia). O modo **solo** continua usando o engine JS offline, inalterado.
- Jogadores têm **conta** (login com **Google**).
- O tempo real é entregue via **WebSockets (SignalR)**: presença na sala, ready-check, draft com timer, e **streaming dos eventos da partida** minuto-a-minuto.

### 1.2. Objetivo

Entregar um **MVP de multiplayer online jogável ponta-a-ponta**:

1. **Conta** via login Google.
2. **Criar / entrar em sala** por link/código; lista de jogadores e presença em tempo real.
3. **Anfitrião + ready-check**: os jogadores marcam "pronto"; o anfitrião dispara o início.
4. **Draft de pool independente com timer**: cada um monta seu time rolando o dado em paralelo; quem não terminar a tempo (ou cair) tem o time **autocompletado**.
5. **Torneio único** com **N humanos** (sala flexível, 2 a N), **semeados em grupos diferentes**; vagas que sobram são **preenchidas por seleções IA** para fechar os grupos e o chaveamento.
6. **Simulação no servidor** (engine portado): fase de grupos (round-robin) → mata-mata; humanos só se encontram a partir do mata-mata.
7. **Assistir ao vivo**: cada jogador assiste ao **ticker da sua própria partida**; a **tabela dos grupos** e o **chaveamento** da sala atualizam **em tempo real** conforme os jogos terminam.
8. **Desconexão**: se um jogador cai/abandona, a **IA assume o time** e o torneio segue; ao reconectar, ele retoma o controle.

**Fora do escopo deste MVP** (viram PRDs seguintes): histórico de torneios e perfil com estatísticas multiplayer; revanche (rematch) na mesma sala; rankings/ligas; login por e-mail+senha (só Google no MVP); espectadores; tela de partida **sincronizada** entre todos (no MVP cada um assiste no próprio ritmo); **pênalti interativo** no multiplayer (no MVP a disputa de pênaltis do MP é **resolvida automaticamente** no servidor); **substituições ao vivo** no MP (no MVP vale a escalação confirmada no pré-jogo); chat de sala.

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Login com Google
**Dado** que abro o jogo e escolho o modo Multiplayer
**Quando** clico em "Entrar com Google" e autorizo
**Então** fico autenticado com um perfil (nome e avatar do Google)
**E** minha sessão persiste entre recargas até eu sair (logout).

### Critério 2 — Criar sala
**Dado** que estou autenticado
**Quando** crio uma nova sala
**Então** viro o **anfitrião**, recebo um **código/link de convite** compartilhável
**E** vejo a sala vazia (só eu) aguardando outros jogadores.

### Critério 3 — Entrar em sala por convite
**Dado** que recebi um link/código de uma sala aberta
**Quando** abro o link autenticado
**Então** entro na sala e apareço na **lista de jogadores em tempo real** para todos
**E** os outros já presentes me veem entrar **sem recarregar**.

### Critério 4 — Ready-check e início pelo anfitrião
**Dado** que há 2+ jogadores na sala
**Quando** os jogadores marcam "pronto" e o **anfitrião** dispara o início
**Então** a sala sai do lobby e **todos** transitam juntos para a fase de **draft**
**E** jogadores que não marcaram "pronto" são tratados conforme a regra de ausência (RN10).

### Critério 5 — Draft paralelo com timer e autocompletar
**Dado** que o torneio começou
**Quando** entro na fase de draft
**Então** monto meu time rolando o dado **no meu ritmo**, em paralelo aos outros, dentro de um **tempo limite** visível
**E** se o tempo acabar (ou eu cair) com o time incompleto, ele é **autocompletado** (Random) automaticamente
**E** lendas **podem se repetir** entre jogadores (pool independente, como no solo).

### Critério 6 — Distribuição em grupos diferentes + IA completa
**Dado** que todos confirmaram (ou tiveram autocompletado) seus times
**Quando** o torneio é montado
**Então** os **humanos são semeados em grupos diferentes** (nunca dois humanos garantidos no mesmo grupo enquanto houver grupos disponíveis)
**E** as **vagas restantes** dos grupos e do chaveamento são preenchidas por **seleções IA**
**E** os humanos **só podem se enfrentar a partir do mata-mata** (não na fase de grupos).

### Critério 7 — Simulação no servidor (fonte única)
**Dado** uma rodada do torneio
**Quando** as partidas são disputadas
**Então** a **simulação roda no servidor** (engine portado para C#), de forma **determinística** (mesma entrada/seed ⇒ mesmo resultado)
**E** os clientes **não** simulam o resultado; eles **recebem** os eventos do servidor.

### Critério 8 — Assistir à própria partida em tempo real
**Dado** que minha partida da rodada começou
**Quando** a simulação roda no servidor
**Então** vejo o **ticker minuto-a-minuto da MINHA partida** (narração PT-BR), no ritmo da velocidade configurada
**E** a **tabela do meu grupo** e o **chaveamento** da sala atualizam **ao vivo** conforme os outros jogos terminam.

### Critério 9 — Avanço do torneio e desfecho
**Dado** que terminei a fase de grupos
**Quando** a classificação é calculada
**Então** se eu fico no **top-N** do meu grupo, avanço ao mata-mata; senão, sou **eliminado** (com tela de fim)
**E** o torneio segue (mata-mata entre classificados, humanos e IA) até sair um **campeão da sala**
**E** vejo a tela final do torneio com o resultado.

### Critério 10 — Desconexão: IA assume e reconexão retoma
**Dado** que estou numa sala com torneio em andamento
**Quando** eu caio/abandono
**Então** a **IA assume o meu time** e o torneio **segue sem travar** para os demais
**E** se eu **reconectar** antes de ser eliminado, **retomo o controle** do meu time
**E** os outros jogadores são informados do meu estado (conectado / IA / saiu).

### Critério 11 — Isolamento entre solo e multiplayer
**Dado** o modo solo já existente
**Quando** uso o multiplayer
**Então** o **solo continua funcionando offline** (engine JS local, `localStorage`), **sem regressão**
**E** entrar/sair do multiplayer **não corrompe** o run solo salvo.

---

## 3. ESCOPO TÉCNICO

> O PRD descreve **O QUÊ**. O detalhamento de arquivos/baby steps é responsabilidade do `/planejar`.

### 3.1. Componentes a Alterar

**Pasta `frontend/` (migração + alterações):**

- **Migração de estrutura** — todos os arquivos do jogo atual (root do repo: `index.html`, `app.jsx`, `config.js`, `game.css`, `lib/`, `ui/`, `data/`, `styles/`, `images/`, etc.) movem para a subpasta `frontend/`. Ajustar caminhos relativos e os artefatos de deploy do frontend (`Dockerfile`, `nginx.conf`, `manifest.webmanifest`) ao novo root.
- **`app.jsx`** — adicionar uma **ramificação de modo** (solo × multiplayer). O multiplayer não usa o run de `localStorage` como fonte de verdade da campanha; ele reflete o **estado da sala vindo do servidor** (lobby → draft → grupos → mata-mata → fim). A máquina de estados do MP é **dirigida por eventos do servidor**, não pelo fluxo local.
- **`ui/home.jsx`** — entrada para o modo **Multiplayer** (criar/entrar em sala) e o **login Google**, além do solo atual.
- **`ui/draft.jsx`** — o draft no MP é o mesmo draft do dado, porém com **timer** e **autocompletar** ao esgotar/cair; ao confirmar, o time é **enviado ao servidor** (em vez de iniciar a campanha local).
- **`ui/match.jsx`** — `MatchScreen` no MP **consome eventos do servidor** (streaming) em vez de simular localmente; mantém o ticker, narração, SFX por lado e o seletor de velocidade (ritmo de exibição local).
- **`ui/post.jsx` / telas finais** — suportar o desfecho de **torneio multiplayer** (campeão da sala, eliminado na fase de grupos/mata-mata), reaproveitando hero + modais.
- **`config.js`** — novas chaves de balanceamento/regra do MP: faixas de tamanho de sala, timer do draft, política de preenchimento por IA, tempos de ready-check/reconexão. **Sem números mágicos fora daqui.**
- **`index.html`** — incluir os novos `<script>` (telas/serviços de multiplayer) na ordem certa (libs → dados → ui → `app.jsx` por último). Avaliar inclusão do **cliente SignalR** e do SDK de login Google (via CDN, mantendo o "sem build").
- **`lib/store.js`** — guardar **sessão/auth** e preferências do MP **sem** colidir com as chaves do run/perfil solo.
- **`game.css` / `styles/kit.css`** — estilos das telas de lobby, lista de jogadores/presença, ready-check, timer de draft e visão do torneio da sala (grupos + chave) ao vivo.

### 3.2. Componentes Novos

**Pasta `frontend/`:**

- **Tela de Lobby** — criar/entrar em sala, link/código de convite, lista de jogadores com **presença em tempo real**, marcação de **pronto**, botão de **iniciar** (anfitrião).
- **Tela de Torneio da Sala** — visão dos **grupos** (tabelas) e do **chaveamento** atualizando ao vivo, com destaque para o jogador.
- **Serviço de Realtime (cliente)** — conexão WebSocket (SignalR) que assina os eventos da sala (entrou/saiu, ready, início, draft, eventos de partida, avanço de fase, fim).
- **Serviço de API (cliente)** — chamadas REST autenticadas (criar/entrar sala, submeter time, etc.).
- **Serviço de Auth (cliente)** — fluxo de login Google e gestão de sessão (token).

**Pasta `backend/` (.NET 10 — NOVA):**

- **API REST (ASP.NET Core, .NET 10)** — autenticação (Google OAuth), salas (criar/entrar/listar), submissão de time, estado do torneio.
- **Hub de Realtime (SignalR)** — presença, ready-check, início, sincronização de draft, **streaming dos eventos de partida**, avanço de fase e desfecho.
- **Engine portado (C#)** — `simulateMatch` + RNG (mulberry32) + derivação de atributos, **fiel ao engine JS**, como fonte única da verdade do MP. Inclui geração de grupos/chaveamento e classificação (equivalentes a `buildGroup`/`buildBracket`/`groupStandings`).
- **Orquestrador de torneio** — montagem dos grupos (semeando humanos em grupos diferentes + preenchimento IA), execução das rodadas, classificação, mata-mata e desfecho; tratamento de **desconexão → IA assume**.
- **Persistência (EF Core + PostgreSQL)** — usuários, salas, participantes, times submetidos, estado/resultado do torneio.
- **Dados das squads no servidor** — as seleções (`data/squads.js`) precisam estar disponíveis no servidor (fonte compartilhada de elencos para a simulação e o preenchimento IA).

### 3.3. Componentes Reutilizados

- **`lib/engine.js`** (JS) — referência de paridade para o porte C# e mantido **intacto** para o **solo**.
- **`lib/team.js`** — `buildGroup`, `groupStandings`, `buildBracket`, `drawScaledOpponents`, `squadAvg`, `bestXI`, `makeSide`, `draftSlots`, `eligible` — referência de regra para o porte e reuso no solo.
- **`lib/rng.js`** — mulberry32 + helpers; referência para o RNG do servidor.
- **`config.js`** — balanceamento (grupos, fases, velocidades) como base para os defaults do MP.
- **`data/squads.js`** — fonte dos elencos (espelhada no servidor).
- **UI compartilhada** — `Flag`, `Crest`, `TeamMark`, `PlayerTile`, `Pitch`, `PosPill`, `Segmented`, `GameHeader`, ticker de partida e telas finais (hero + modais).

### 3.4. Fluxo de Dados

```
1. Login (Google) → cliente obtém sessão/token → identifica o usuário no servidor.
2. Sala:
   2.1. Anfitrião cria sala (servidor gera código/link). 
   2.2. Amigos entram pelo link (autenticados). Servidor difunde presença via SignalR.
   2.3. Jogadores marcam "pronto"; anfitrião dispara o início.
3. Draft (paralelo, com timer):
   3.1. Cada cliente monta o time (dado), no seu ritmo, dentro do tempo limite.
   3.2. Ao confirmar/expirar/cair → o time (titulares, formação, reservas) é enviado ao servidor;
        incompleto é autocompletado (Random).
4. Montagem do torneio (servidor):
   4.1. Humanos semeados em GRUPOS DIFERENTES; vagas restantes preenchidas por squads IA.
   4.2. Grupos round-robin + chaveamento do mata-mata derivados (humanos só se cruzam no mata-mata).
5. Rodadas (servidor é a fonte da verdade):
   5.1. Servidor simula as partidas (engine C#, determinístico, seed do torneio).
   5.2. Para a partida de cada humano, o servidor faz STREAMING dos eventos (minuto-a-minuto)
        ao cliente daquele jogador (ticker no ritmo da velocidade local).
   5.3. Tabelas dos grupos e chaveamento são difundidos e atualizam ao vivo para a sala.
6. Avanço:
   6.1. Top-N de cada grupo avança; demais eliminados (tela de fim).
   6.2. Mata-mata até o campeão da sala. Pênaltis resolvidos automaticamente no servidor (MVP).
7. Desconexão:
   - Jogador cai → IA assume o time; torneio segue. Reconexão antes da eliminação → retoma o controle.
8. Persistência (servidor): usuários, salas, participantes, times, estado/resultado do torneio.
   Cliente solo permanece em localStorage, isolado.
```

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos (servidor)

- **Usuário**: identidade vinda do Google (id externo, nome, avatar/e-mail), referência interna.
- **Sala (Lobby)**: código/convite, anfitrião, estado (`aguardando` → `draft` → `grupos` → `mata-mata` → `encerrada`), limites de jogadores (mín./máx.), seed do torneio.
- **Participante**: usuário + sala, papel (anfitrião/jogador), estado de presença (`conectado` / `ia-assumiu` / `saiu`), flag de pronto.
- **Time submetido**: titulares, formação, reservas, capitão — vinculado a participante + sala.
- **Torneio**: grupos (com fixtures e tabela), chaveamento do mata-mata, rodada atual, resultados, campeão.
- **Linha da tabela (standing)**: `{ ref, J, V, E, D, GP, GC, SG, P }`, ordenada por `P → SG → GP → critério estável (seed)` — equivalente a `groupStandings`.
- **Evento de partida (stream)**: já carrega `side: 'home' | 'away'`, minuto, tipo (gol, falta, amarelo, defesa, pênalti, etc.) e texto de narração; neutros (apito, intervalo, fim) sem `side`.

### 4.2. Comandos / Queries / DTOs (contratos de alto nível)

- **Auth**: iniciar login Google; validar sessão/token.
- **Salas**: criar sala; entrar por código; sair; listar participantes/estado; marcar pronto; iniciar (anfitrião).
- **Draft**: submeter time (titulares, formação, reservas, capitão); sinalizar autocompletar.
- **Torneio**: consultar estado (grupos, tabelas, chaveamento, rodada); receber stream de eventos da própria partida.
- **Realtime (SignalR)**: presença (entrou/saiu/estado), ready-check, início, progresso do draft, eventos de partida, avanço de fase, desfecho, desconexão/reconexão.
- **`config.js` (novas chaves do MP)**: tamanho de sala (mín./máx.), timer do draft, política de preenchimento por IA, janelas de ready-check e de reconexão. Nomeadas, sem hardcode fora do `config.js`.

### 4.3. Handlers / Services

- **Auth service** (servidor): valida o login Google e emite a sessão.
- **Lobby service**: ciclo de vida da sala, presença, ready-check, início pelo anfitrião.
- **Draft service**: recebe times, aplica autocompletar a quem expirou/caiu.
- **Tournament orchestrator**: montagem (semeadura humana em grupos distintos + IA), execução de rodadas, classificação, mata-mata, desfecho.
- **Engine service (C#)**: `simulateMatch` determinístico; geração de grupos/chaveamento; pênaltis automáticos (MVP).
- **Realtime hub (SignalR)**: difusão de presença/estado e **streaming dos eventos de partida** por jogador.
- **Cliente**: serviços de auth, API e realtime; telas de lobby/torneio; ticker consumindo o stream.

### 4.4. Persistência

- **Servidor (EF Core + PostgreSQL)**: usuários, salas, participantes, times submetidos, torneio (grupos, chave, resultados, campeão). Estado da sala é a **fonte da verdade** do MP.
- **Cliente (localStorage)**: sessão/token e preferências do MP, **isolados** das chaves do solo (`copa_draft_run_v2`, `copa_draft_profile_v1`), que permanecem inalteradas.

### 4.5. Validações

- Sala só inicia com **≥ 2 jogadores** e via **anfitrião** (após ready-check).
- Time submetido deve respeitar a formação (somar 11 titulares) e elegibilidade de posições, como no solo; time incompleto/ausente é **autocompletado** (Random) — nunca inválido.
- Semeadura: **nenhum par de humanos no mesmo grupo** enquanto houver grupos disponíveis; preenchimento por IA só nas vagas restantes.
- Humanos **não se enfrentam na fase de grupos** (só a partir do mata-mata).
- Simulação **determinística** no servidor (RNG semeado); resultado independe da velocidade de exibição do cliente.
- Reconexão só **retoma o controle** se o jogador ainda não foi eliminado e a sala ainda está ativa.

### 4.6. Autorização

- **Anfitrião**: cria a sala, dispara o início; (no MVP) pode encerrar a sala.
- **Jogador**: entra por convite, monta o time, joga, marca pronto.
- **Servidor**: única autoridade da simulação e do estado do torneio (clientes não decidem resultados).
- Toda ação exige **sessão autenticada** (Google).

---

## 5. REGRAS DE NEGÓCIO

- **RN01** — O multiplayer é **online e em tempo real**, com **backend próprio em .NET 10** (ASP.NET Core + SignalR + EF Core + PostgreSQL) hospedado na VPS; o lobby e o torneio são **estado de servidor**. O projeto é um **mono-repo** (`frontend/` + `backend/`).
- **RN02** — Identidade por **conta Google** (OAuth) para **criar salas** (anfitrião). Quem entra numa sala existente pode optar por **entrar como convidado** (só apelido, 2–30 chars): recebe o mesmo JWT (marcado como guest), joga normalmente, mas **não cria salas**. Sem e-mail+senha no MVP. *(Ajustado na v3 — redução de atrito para convidados.)*
- **RN03** — A **simulação roda no servidor** (engine portado para C#), como **fonte única da verdade**; clientes apenas **exibem** os eventos recebidos.
- **RN04** — O engine portado deve ser **fiel** ao `lib/engine.js` (mesma lógica, RNG mulberry32, derivação de atributos) — validado por **testes de regressão por seed**.
- **RN05** — Sala **flexível**: de **2 a N** jogadores (limite configurável em `config.js`); o número de **grupos** é derivado da quantidade de jogadores.
- **RN06** — **Humanos são semeados em grupos diferentes**; vagas restantes dos grupos e do chaveamento são preenchidas por **seleções IA**. Humanos **só se cruzam no mata-mata**.
- **RN07** — **Draft de pool independente**: cada jogador monta no dado em paralelo; **lendas podem repetir** entre jogadores. Há **timer**; ao expirar (ou cair), o time é **autocompletado** (Random).
- **RN08** — Fase de grupos = **round-robin**, pontuação `GROUP_POINTS` (V3/E1/D0), **top-N** avança (`GROUP_QUALIFY`), desempates `P → SG → GP → estável`. Mata-mata segue até o **campeão da sala**.
- **RN09** — **Anfitrião + ready-check**: jogadores marcam "pronto"; o **anfitrião dispara** o início.
- **RN10** — Quem **não está pronto / cai** no início ou no draft tem o time **autocompletado** e segue no torneio sob controle da **IA** até reconectar.
- **RN11** — **Desconexão durante o torneio** → a **IA assume** o time e o torneio **não trava**; **reconexão** antes da eliminação **retoma o controle**.
- **RN12** — Cada jogador assiste ao **ticker da própria partida**; **tabelas e chaveamento** da sala atualizam **ao vivo**. A **velocidade** só altera o ritmo de exibição local (não o resultado).
- **RN13** — No MVP, a **disputa de pênaltis do MP é automática** no servidor (sem mini-game interativo) e **não há substituições ao vivo** (vale a escalação confirmada no pré-jogo).
- **RN14** — O **modo solo permanece offline e inalterado** (engine JS + `localStorage`); o MP é uma ramificação **isolada**, sem regressão no solo.
- **RN15** — Todo balanceamento/regra novo do MP reside em **`config.js`** (cliente) e em configuração equivalente no servidor; **sem números mágicos espalhados**.
- **RN16** — **Sem build no frontend**: dependências novas (cliente SignalR, SDK Google) entram via **CDN** e `<script>` na ordem certa; componentes novos expostos em `window`.

---

## 6. REQUISITOS FUNCIONAIS

- **RF01** — Login/logout com **Google**; sessão persistente.
- **RF02** — **Criar sala** (vira anfitrião) e gerar **link/código** de convite.
- **RF03** — **Entrar em sala** por link/código; **lista de jogadores e presença** em tempo real.
- **RF04** — **Ready-check** + **início** disparado pelo anfitrião.
- **RF05** — **Draft paralelo** com **timer** e **autocompletar**; submissão do time ao servidor.
- **RF06** — **Montagem do torneio** com humanos em grupos distintos + **preenchimento IA**.
- **RF07** — **Simulação no servidor** (engine C#), determinística, semeada.
- **RF08** — **Streaming** dos eventos da própria partida (ticker minuto-a-minuto) e **atualização ao vivo** de tabelas/chaveamento.
- **RF09** — **Classificação** (top-N) e **mata-mata** até o **campeão da sala**; telas de avanço/eliminação/fim.
- **RF10** — **Desconexão → IA assume**; **reconexão → retoma**; estados de jogador difundidos.
- **RF11** — **Isolamento** entre solo (offline) e multiplayer.

---

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01 — Determinismo no servidor**: mesma entrada/seed ⇒ mesmo resultado; engine C# sem fontes não-semeadas no caminho determinístico.
- **RNF02 — Paridade engine JS↔C#**: cobertura de **testes de regressão por seed** garantindo resultados equivalentes ao `lib/engine.js`.
- **RNF03 — Tempo real responsivo**: presença/eventos com baixa latência via SignalR; reconexão suportada.
- **RNF04 — Sem build no frontend**: React/SignalR/Google via CDN; `<script>` em ordem; componentes em `window`.
- **RNF05 — Segurança**: sessão autenticada em todas as ações; servidor como única autoridade da simulação (anti-cheat); segredos (OAuth, conexão DB) **fora do código**, em configuração de ambiente.
- **RNF06 — Escalabilidade modesta (MVP)**: suportar várias salas simultâneas pequenas (amigos), sem otimização pesada nesta fase.
- **RNF07 — Idioma/UX**: PT-BR; modais fecham com Esc/clique no fundo/✕; `prefers-reduced-motion` respeitado.
- **RNF08 — Resiliência**: queda de um jogador não derruba a sala; falha de conexão do cliente tenta reconectar sem perder o torneio.

---

## 8. SCHEMA / MIGRATIONS (se aplicável)

**Migration necessária?** ☑ Sim (novo banco no servidor) ☐ Não

**Se SIM:**
- **Servidor (PostgreSQL via EF Core)** — novas tabelas: usuários, salas, participantes, times submetidos, torneio/grupos/partidas/resultados. Migrations gerenciadas pelo backend.
- **Cliente** — chaves novas em `localStorage` para sessão/preferências do MP, **sem alterar** `copa_draft_run_v2` / `copa_draft_profile_v1`.

**Impacto em dados existentes?** Nenhum no cliente solo (chaves isoladas). Servidor é novo (sem dados legados).
**Reversível?** Sim — o solo independe do servidor; remover o MP não afeta o run/perfil locais.

---

## 9. INTEGRAÇÕES (se aplicável)

### 9.1. Sistemas Externos Afetados

- [ ] **Google OAuth** — autenticação dos jogadores (login social).
- [ ] **VPS do dev** — hospedagem 24/7 do backend .NET + PostgreSQL (deploy/operacional).

### 9.2. Alterações em Contratos

- **Novos contratos** entre `frontend/` (cliente) e `backend/` (servidor) dentro do mono-repo: REST (auth, salas, draft, torneio) + eventos SignalR (presença, draft, partida, fase, desfecho).
- Contratos **internos do solo** (run/perfil) **inalterados**.

**Breaking change?** Não para o solo (aditivo/isolado). O MP é uma superfície **nova**.

---

## 10. TRATAMENTO DE ERROS

### CE01 — Falha no login Google
- **Situação**: OAuth recusado/indisponível.
- **Tratamento**: manter o usuário fora do MP, permitir nova tentativa; o solo continua acessível.
- **Mensagem**: "Não foi possível entrar com o Google. Tente novamente."

### CE02 — Sala cheia / inexistente / encerrada
- **Situação**: link inválido, sala lotada ou já encerrada.
- **Tratamento**: bloquear entrada com aviso e voltar ao menu do MP.
- **Mensagem**: "Esta sala não está disponível."

### CE03 — Jogador não pronto / draft expirado
- **Situação**: timer do draft acaba com time incompleto, ou jogador não marcou pronto.
- **Tratamento**: **autocompletar** (Random) e seguir; IA assume se o jogador estiver ausente.
- **Mensagem**: "Seu time foi completado automaticamente."

### CE04 — Desconexão durante o torneio
- **Situação**: cliente perde conexão.
- **Tratamento**: **IA assume** o time; torneio segue; tentar reconectar o cliente.
- **Mensagem**: aos demais, "Fulano caiu — IA assumiu"; ao jogador, ao voltar, "Você reassumiu seu time".

### CE05 — Anfitrião sai
- **Situação**: o anfitrião desconecta/sai.
- **Tratamento (MVP)**: se o torneio já começou, segue normalmente (anfitrião também pode ser substituído por IA); no lobby, transferir o papel de anfitrião a outro participante ou encerrar a sala se vazia.
- **Mensagem**: "O anfitrião saiu."

### CE06 — Indisponibilidade do servidor
- **Situação**: backend fora do ar.
- **Tratamento**: o MP fica indisponível com aviso; o **solo continua** funcionando offline.
- **Mensagem**: "Multiplayer indisponível no momento."

---

## 11. CASOS DE USO

### UC01: Criar sala e jogar um torneio com amigos
**Ator:** Anfitrião + jogadores
**Pré-condições:** todos autenticados (Google).
**Fluxo Principal:**
1. Anfitrião cria a sala e compartilha o link.
2. Amigos entram; presença aparece em tempo real.
3. Todos marcam "pronto"; o anfitrião inicia.
4. Cada um monta seu time no draft (com timer).
5. O servidor monta os grupos (humanos separados + IA), simula as rodadas.
6. Cada jogador assiste à sua partida; tabelas/chave atualizam ao vivo.
7. Classificados avançam ao mata-mata até sair o campeão da sala.
**Fluxos Alternativos:**
- **FA01 — Eliminado na fase de grupos:** tela de fim com a posição/tabela.
- **FA02 — Jogador cai:** IA assume; ao voltar, retoma.
- **FA03 — Draft expirado:** time autocompletado.

### UC02: Entrar por convite no meio da formação da sala
**Ator:** Jogador convidado
**Pré-condições:** sala em estado "aguardando".
**Fluxo Principal:**
1. Abre o link autenticado.
2. Entra na sala e aparece para todos.
3. Marca "pronto" e aguarda o anfitrião iniciar.

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: Paridade do engine (JS × C#)
**Dado** um conjunto de seeds e times fixos
**Quando** simulo a partida no engine JS e no engine C#
**Então** os resultados (placar, eventos relevantes) são equivalentes.

### Cenário 2: Semeadura em grupos diferentes
**Dado** uma sala com K humanos
**Quando** o torneio é montado
**Então** nenhum par de humanos cai no mesmo grupo (enquanto houver grupos), e as vagas restantes são IA.

### Cenário 3: Determinismo do torneio
**Dado** a mesma seed, mesmos times e mesma sala
**Quando** o servidor simula o torneio duas vezes
**Então** grupos, tabelas, chaveamento e campeão são idênticos.

### Cenário 4: Draft com timer e autocompletar
**Dado** que o timer do draft expira com meu time incompleto
**Quando** a fase fecha
**Então** meu time é autocompletado (Random) e válido, e eu sigo no torneio.

### Cenário 5: Streaming da própria partida + atualização ao vivo
**Dado** uma rodada em andamento
**Quando** minha partida é simulada no servidor
**Então** vejo o ticker da minha partida e a tabela/chave da sala atualiza conforme os jogos terminam.

### Cenário 6: Desconexão → IA → reconexão
**Dado** que caio durante o torneio
**Quando** fico offline e depois reconecto antes de ser eliminado
**Então** a IA conduz meu time enquanto ausente e eu retomo o controle ao voltar.

### Cenário 7: Velocidade não altera resultado no MP
**Dado** a mesma partida exibida em velocidades diferentes
**Quando** comparo o placar/eventos finais
**Então** são idênticos; só o ritmo de exibição muda.

### Cenário 8: Isolamento solo × MP
**Dado** um run solo salvo
**Quando** entro e saio do multiplayer
**Então** o run solo continua íntegro e jogável offline.

### Cenário 9: Autorização
**Dado** uma ação sem sessão válida
**Quando** tento criar/entrar em sala ou submeter time
**Então** a ação é rejeitada (não autenticado).

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Mono-repo reestruturado: jogo atual migrado para `frontend/` (sem regressão) e `backend/` criado.
- [ ] Backend **.NET 10** (ASP.NET Core + SignalR + EF Core + PostgreSQL) criado e rodando na VPS (24/7).
- [ ] Login Google funcionando (cliente + servidor); sessão persistente.
- [ ] Criar/entrar em sala por link/código; presença e lista em tempo real.
- [ ] Ready-check + início pelo anfitrião.
- [ ] Draft paralelo com timer e autocompletar; submissão do time ao servidor.
- [ ] Montagem do torneio: humanos em grupos diferentes + preenchimento IA; humanos só se cruzam no mata-mata.
- [ ] Engine portado para C# com **testes de regressão por seed** (paridade com o JS).
- [ ] Simulação no servidor + streaming da própria partida; tabelas/chave ao vivo.
- [ ] Classificação (top-N) → mata-mata → campeão da sala; telas de avanço/eliminação/fim.
- [ ] Desconexão → IA assume; reconexão → retoma; estados difundidos.
- [ ] Solo offline inalterado (sem regressão); chaves de storage isoladas.
- [ ] Sem build no frontend (CDN + `<script>` em ordem + `window`); sem números mágicos fora do `config.js`.
- [ ] Segredos (OAuth, DB) fora do código; configuração por ambiente.
- [ ] Code review realizado; PRD atendido 100% (escopo MVP).

---

## 14. REFERÊNCIAS

- Contexto do projeto: `MAPS/copa-draft/copa-draft-context.md`
- Mapa do projeto: `MAPS/copa-draft/copa-draft-map.json` (mono-repo: o repo `game` passa a ter `frontend/` + `backend/`; recomendável atualizar os `contexts` com `multiplayer`, `lobby`, `auth`, `realtime`, `backend`)
- PRDs anteriores (implementados): `PRD_001`, `PRD_002` (fase de grupos/escala de força), `PRD_003`
- Código-fonte de referência (frontend): `app.jsx` (máquina de estados), `lib/engine.js` (`simulateMatch`, RNG, eventos com `side`), `lib/team.js` (`buildGroup`, `groupStandings`, `buildBracket`, `drawScaledOpponents`, `squadAvg`, `bestXI`, `makeSide`), `lib/rng.js` (mulberry32), `config.js` (`GROUP_*`, `PHASE_STRENGTH`, `ROUNDS`, `FORMATIONS`, `MATCH_SPEEDS`), `data/squads.js`, `ui/draft.jsx`, `ui/match.jsx`, `ui/post.jsx`, `lib/store.js`, `index.html`
- Ticket/story: TBD

---

## 15. OBSERVAÇÕES

**Decisões tomadas com o dev (fase de clarificação):**
1. **Infra:** backend **próprio em .NET 10** na **VPS** (24/7), em vez de BaaS (Supabase/Firebase pausam/cold-start no free tier). Stack: ASP.NET Core + **SignalR** + EF Core + **PostgreSQL**. Projeto em **mono-repo** (`frontend/` + `backend/`), versionando e deployando juntos.
2. **Sincronicidade:** **tempo real** (ao vivo).
3. **Simulação:** **no servidor**; **engine portado de JS para C#** como fonte única da verdade.
4. **Identidade:** **conta Google** (OAuth) — sem e-mail+senha no MVP.
5. **Sala:** **flexível (2 a N)**, **IA completa** grupos/chaveamento; **humanos em grupos diferentes**.
6. **Draft:** **pool independente** + **timer** + **autocompletar** (lendas podem repetir).
7. **Experiência:** cada um **assiste à sua partida**; tabelas/chave **ao vivo**.
8. **Desconexão:** **IA assume** o time; **reconexão retoma**.
9. **Controle:** **anfitrião + ready-check**.
10. **Escopo:** **MVP enxuto** primeiro (extras adiados — ver §1.2).

**Riscos Identificados:**
- ⚠️ **Paridade do engine JS↔C#** (ponto-flutuante, RNG mulberry32, ordem de operações): risco de divergência de resultados. Mitigar com **testes de regressão por seed** e porte fiel; considerar manter o JS apenas como referência/solo.
- ⚠️ **Manutenção de duas implementações** do engine (solo JS, MP C#) tende a divergir com o tempo — definir processo (testes + revisão conjunta ao alterar regra de jogo).
- ⚠️ **Complexidade do tempo real** (SignalR): presença, reconexão, ready-check, timers de draft, streaming de partida e avanço de fase — muitos estados.
- ⚠️ **Mudança estrutural grande**: projeto passa de **client-only no root** para **mono-repo `frontend/` + `backend/`**; migrar os arquivos atuais para `frontend/` (ajustar caminhos, `Dockerfile`, `nginx.conf`, `manifest`) sem regressão, e introduzir deploy do backend, segredos e banco.
- ⚠️ **Balanceamento da semeadura/IA** para salas de tamanhos variados (de 2 a N) montando grupos justos.
- ⚠️ **Segurança/abuso**: servidor como autoridade (anti-cheat), proteção das rotas e dos segredos.

**Dependências:**
- 🔗 **VPS** com .NET 10 (runtime/SDK) + PostgreSQL provisionados.
- 🔗 **Credenciais Google OAuth** (client id/secret) configuradas.
- 🔗 Engine/regra de jogo de `lib/engine.js` + `lib/team.js` (PRD_002) como base de paridade.
- 🔗 `data/squads.js` espelhado no servidor.
- 🔗 **Atualizar `copa-draft-map.json`**: como é mono-repo, **não há repo novo** — manter o repo `game` e expandir `contexts` (ex.: `multiplayer`, `lobby`, `auth`, `realtime`, `backend`) e a stack (`backend: ["csharp", "dotnet-10", "aspnet-core", "signalr", "ef-core", "postgresql"]`). Opcionalmente refletir as pastas `frontend/`/`backend/` no `copa-draft-context.md`.

---

## 15-B. EVOLUÇÕES IMPLEMENTADAS PÓS-MVP (v4 — estado real do produto)

Decididas com o dev em 6 rodadas de teste/feedback (detalhes e justificativas no PLAN_004):

- **Formato**: SEMPRE Copa completa — 8 grupos / 32 times / oitavas→final (humanos 2–8 em grupos distintos; IA completa; rodadas só-IA resolvem em fast-forward; se todos os humanos caem, o torneio encerra na hora).
- **Ritmo controlado pelos jogadores**: cada rodada anuncia com pré-jogo (reuso do `PreMatchScreen`, reservas read-only, scouting) atrás de um botão **"Avançar"**; a rodada começa quando TODOS os humanos vivos/conectados clicam **"Iniciar partida"** ou após timeout (`Mp:RoundReadySeconds`, deadline visível). Quando todos terminam de assistir, o resto da rodada resolve na hora (`DoneWatching`). Sem botão "pular" nem "rever" no MP.
- **Velocidade da partida** escolhida pelo anfitrião no lobby (normal/rápida/super → `Room.Speed`), read-only para os demais, preservada na revanche.
- **Tela de torneio**: só o grupo do jogador na principal + modal "todos os grupos"; humanos destacados; tabelas bloqueadas enquanto a própria rodada roda; pós-jogo completo (reuso do `PostMatchScreen` com notas/craque).
- **Eliminação**: banner com a fase em que caiu + **"acompanhar campeonato"** (espectador segue um humano vivo via `WatchFixture`, sincronizado ao relógio do servidor); tela final com medalha coerente (🥈 só vice de final) e **"jogar novamente"** (anfitrião reseta a sala — `PlayAgain`).
- **Mecânicas do solo ATIVAS no MP**: lesões em jogo com substituição do banco; **cansaço entre rodadas** (`MpFatigue`: +1/+2 por idade, teto, banco descansa) e **pressão sub-23** crescendo no mata-mata — tudo determinístico (retomada pós-restart reproduz).
- **Confiabilidade**: estado da rodada (`aguardando|rolando`) vive no SNAPSHOT (cliente deriva a UI; eventos são aceleradores); js/css com no-cache no nginx; torneios retomáveis após restart da API; resync completo em refresh/reconexão.

## 16. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-06-09 | 1 | IA (Claude) | Versão inicial (MVP multiplayer online) |
| 2026-06-09 | 2 | IA (Claude) | Mono-repo (`frontend/` + `backend/`) e backend em .NET 10 |
| 2026-06-09 | 3 | IA (Claude) | Convidados por apelido (RN02): Google só para criar salas |
| 2026-06-10 | 4 | IA (Claude) | Evoluções pós-teste (ver §15-B): Copa completa (8 grupos/32 times), ready-gate+Avançar por rodada, velocidade da sala, skip de rodada, espectador p/ eliminados, revanche, cansaço/pressão LIGADOS no MP, retomada pós-restart |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
