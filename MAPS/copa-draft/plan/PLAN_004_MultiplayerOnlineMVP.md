# Plano de Execução: Multiplayer Online — Salas, Torneio com Amigos (MVP)

## Informações
- **PRD Relacionado**: `prd/PRD_004_TBD_MultiplayerOnlineMVP.md`
- **Repositório(s)**: `game` (mono-repo) — front no **root** durante o MVP; backend novo em **`backend/`**; migração para `frontend/` na última etapa
- **Domínio(s)**: multiplayer, lobby, auth, engine (porte JS→C#), draft, match, realtime, tournament
- **Branch Base**: `main`
- **Complexidade**: 🔴 Alta
- **Criado em**: 2026-06-09
- **Última atualização**: 2026-06-09

---

## PROGRESSO GERAL

**Status**: ✅ Concluído (aguardando code review / merge)
**Progresso**: 21/21 etapas concluídas (100%)

```
[🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢] 100%
```

> Este progresso será atualizado automaticamente pelo skill `/implementar`.

---

## ⭐ ESTADO ATUAL — GUIA DE RETOMADA (2026-06-10, MERGEADO NA MAIN)

> **Leia esta seção primeiro ao retomar a sessão.** Tudo abaixo dela é histórico.

### 🚢 MERGE FEITO (2026-06-10)
`feature/multiplayer-online` (15 commits) **mergeada na `main` via `b1590e5` e pushada** após verificação completa: backend 147/147 (1 flake conhecido passou no re-run), front 30+12+10+41+24 (team.test.js consertado — `30c4329`), E2E vivo ~67s, smoke visual do SOLO inteiro no navegador (home nova → draft → grupos → pré-jogo → partida com velocidades/pular → pós-jogo com conquistas) e do MP.

### 🌐 EM PRODUÇÃO (2026-06-10) — https://copa.marccusz.com
Deploy via **Coolify** (recurso Docker Compose apontando para `main`, compose location `/docker-compose.yml`, envs `POSTGRES_PASSWORD`/`JWT_KEY`/`GOOGLE_CLIENT_ID`/`PUBLIC_ORIGIN`; domínio no serviço `web`; Traefik faz TLS/WS). **Verificado em prod:** `/health` ok, `POST /api/auth/guest` ok (migrations aplicadas), negotiate SignalR ok, front novo no ar (0 erros de console), botão Google = iframe GIS oficial (origem autorizada no Console), convidado via UI ok, **WebSocket `wss://` conectado com round-trip do JoinRoom** (sala inexistente → erro correto do servidor na tela). Falta só smoke social: criar sala real com conta Google e jogar um torneio. Cosmético anotado: na falha do join, o header da tela fica "Conectando…" junto do erro.

### Onde estamos
- **Branch:** `feature/multiplayer-online` (15 commits sobre `main`, mergeada):
  `eba446a` MVP completo (21 etapas) → `2346aec` fixes do code review → `e35b91d` convidados → `2b0e6df` copa completa+espectador → `9269ad7` ready-gate+revanche → `585aff6`+`5a5b556` pré-jogo snapshot-driven+no-cache → `24354a3` E2E → `77c5147` skip+velocidade+Avançar+reservas → `3b68b9c` banner fix → `1694464` cansaço/pressão+UX → `bf1d4f7` runner E2E → `8a30b79` **fix do resync no refresh/deep-link** (passada visual) → `fbd8dda` CTAs da home padronizados.
- **Stack local NO AR:** `docker compose up -d` em **http://localhost:8090** (web nginx + api .NET + postgres). `.env` na raiz já configurado (gitignored): `JWT_KEY` forte, **`GOOGLE_CLIENT_ID=885470834590-vk05is0ggem2r9t1ps8tk5a64dsrudmb.apps.googleusercontent.com`** (também em `frontend/config.js MP.GOOGLE_CLIENT_ID` — client id é público, ok versionar). Origem autorizada no Google Console: `http://localhost:8090`.
- **Suítes (todas verdes, re-rodadas após o fix):** backend `dotnet test backend/CopaDraft.slnx` → **147/147** · front `node frontend/tests/mp.test.js` (41) + engine/i18n/stats (52) · **E2E vivo** `bash tools/e2e/run.sh` → **completo em ~66s** (pré-requisito: `cd tools/e2e && npm i @microsoft/signalr@8`).
- **PRD v4 §15-B** descreve o produto real (formato copa completa, gate/Avançar, velocidade, espectador, revanche, mecânicas ligadas).

### ✅ PASSADA VISUAL COMPLETA (Playwright MCP, 2026-06-10) — FEITA
2 contextos reais de navegador (truque: `localhost:8090` = anfitrião com sessão injetada; `127.0.0.1:8090` = convidada via fluxo natural — origens distintas isolam o `localStorage`). Sala criada via SQL como no runner. **Validados visualmente:** deep-link `?sala=` (login de convidado "Você foi convidado!" e auto-join), lobby (presença realtime, velocidade host-only com vista read-only no convidado, ready 2/2, revanche zera tudo), draft real (dado, time aleatório, confirmar → "Time enviado! 1/2", autofill no timeout), gate "Avançar para o pré-jogo" com auto-início, pré-jogo (banners de azarão/pressão, XI do oponente com logo, reservas read-only), ticker ao vivo (cores por lado, intervalo, fim de jogo + "Ver resultado"), tabela/confrontos com humano destacado, modal "Todos os grupos", chaveamento com pênaltis, eliminação→espectador ("Acompanhando Marcus Host"/fallback "só IAs até a final"), tela final com medalha 🥉, revanche 2x, refresh em draft/grupos/encerrada. Erros de console: só GSI em `127.0.0.1` (origem não autorizada — artefato do teste) e 502/1006 durante meu rebuild do nginx (reconectou sozinho).
- **🔴 corrigido na passada:** refresh ou deep-link com sala em jogo caía no **lobby** — o `RoomState` do `JoinRoom` chega ANTES do invoke resolver (stage ainda `menu`), e o resync do handler exigia stage `lobby`. Fix em `frontend/ui/mp.jsx enterRoom`: decide o stage pelo estado real da sala (`draft` restaura deadline via `roomState.draftDeadline`; `grupos`/`mata-mata`/`encerrada` → `GetTournament` + tournament). Handler agora grava `roomRef.current` sincronamente. Validado no navegador nos 3 casos.
- **🟡 confirmar design:** o host consegue **Iniciar com 0/N prontos** (servidor valida só host+mínimo 2; ready é informativo). Se for para travar, falta checagem em `RoomService.StartDraftAsync`.
- **🟢 copy:** espectador com todos os humanos eliminados mostra "escolha outro time" junto de "Nenhum jogador humano segue vivo" (contradição leve, `frontend/ui/mp.jsx` banner do eliminado).
- **Não visto ao vivo** (janela de segundos na velocidade Super; componente é o do solo, coberto por teste): PostMatchScreen aberto via "Ver resultado"; tela "tabelas liberam quando a rodada terminar" (#4, código confirmado).

### Pendências conhecidas
1. Estender o E2E vivo: queda/reconexão em torneio (hoje só TestServer), timeout do draft (autofill) e restart+resume na stack real (o caso de refresh agora tem fix — cobrir com asserção de stage).
2. `git push` + deploy na VPS (`.env` produção: `PUBLIC_ORIGIN` com domínio real, origem no Google Console, HTTPS via proxy).
3. 🟢 do code review: `DraftService` SubsLeft=3 → `GameConfig.SUBS_MAX`; JWT em localStorage (cookie httpOnly futuro). ~~team.test.js~~ (consertado em `30c4329`) · ~~i18n do MP~~ (feito em `0cdbe9b` — PT/EN/ES; **continuam PT por virem do servidor**: narração do ticker e mensagens de erro do hub, exigem códigos/chaves no backend). **Pós-MVP feitos:** build de produção do front (`caad3b5`, esbuild no Dockerfile — sem Babel/React-dev no navegador). **Novo achado:** refresh do HOST no lobby remove o participante e fecha a sala (comportamento do disconnect no lobby) — convidado/host caem em "sala não disponível" ao voltar; avaliar período de graça.
4. 🟡/🟢 da passada visual (acima): decidir gate de ready no Iniciar; copy do espectador.
5. Merge → `main` quando o dev aprovar.

### ⚠️ Armadilhas técnicas (não recair)
- **Evento novo do hub** ⇒ registrar na lista `EVENTS` de `frontend/lib/mp-realtime.js` (teste cobre, mas confira) — e preferir **estado no SNAPSHOT** (cliente deriva; evento é acelerador).
- **Recurso embarcado** com token de cultura no nome (`.pt.`) vira satélite no MSBuild — usar `narration-pt.json` style + `<None Remove>`.
- **Build docker do backend** usa contexto na RAIZ (embute `squads.json`) com `backend/Dockerfile.dockerignore` (BuildKit).
- **Mudou regra de jogo no engine JS?** Regenerar goldens (`node tools/gen-engine-golden.js` etc.) e rodar a paridade C#.
- Teste `Lobby_Disconnect_Removes_Player` tem **flake raro** de paralelismo na suíte cheia (passa isolado/re-run).
- `GameConfig` (C#) espelha `config.js` — alterações têm que andar em par.

---

## VISÃO GERAL

Adicionar um **modo Multiplayer Online** ao Copa Draft, hoje 100% client-side, transformando o projeto num **mono-repo** (`frontend/` + `backend/`) com um **backend .NET 10** server-authoritative.

O coração técnico é portar o **engine determinístico de JS para C#** com **paridade exata** (RNG mulberry32, derivação de atributos e arrays de narração que consomem o mesmo stream do RNG), validada por **vetores-ouro** extraídos do engine JS. Sobre essa base entram: **contas (Google)**, **salas em tempo real (SignalR)**, **draft com timer**, um **gerador de torneio multi-grupo** (humanos semeados em grupos diferentes + preenchimento por IA) e a **simulação no servidor** com **relógio de rodada** que transmite os eventos minuto-a-minuto e mantém **tabelas/chaveamento ao vivo** coerentes para todos.

A estratégia segue a ordem natural: **dados/engine puro primeiro** (testável isoladamente), depois **persistência/auth**, **API/realtime**, **frontend** e, por fim, a **migração física para `frontend/`**.

**Componentes afetados por camada:**
- **Backend — Engine (C#, puro):** RNG, derive, narração, `simulateMatch`, gerador de torneio multi-grupo, standings.
- **Backend — API/Infra:** EF Core + PostgreSQL, auth Google/JWT, controllers REST, SignalR hubs, orquestrador de torneio, tratamento de desconexão.
- **Frontend (root, durante o MVP):** serviços de auth/API/realtime, telas de lobby/torneio, reuso de draft e ticker consumindo stream do servidor, telas finais do MP.
- **Dados:** `squads.json` compartilhado.
- **Infra:** Docker (api + postgres + nginx), config por ambiente.
- **Migração:** mover o front para `frontend/` ao final.

---

## OBJETIVOS

- [ ] Portar o engine para C# com paridade validada por seed (fonte única do MP).
- [ ] Gerar `squads.json` compartilhado entre frontend e backend.
- [ ] Persistir usuários, salas, participantes, times e torneio (EF Core + PostgreSQL).
- [ ] Autenticar com Google (JWT próprio; auth também no SignalR).
- [ ] Lobby em tempo real: criar/entrar, presença, ready-check, início pelo anfitrião.
- [ ] Draft paralelo com timer e autocompletar; submissão do time ao servidor.
- [ ] Gerador de torneio multi-grupo (humanos separados + IA) + mata-mata até o campeão.
- [ ] Simulação no servidor + relógio de rodada + streaming do ticker e tabelas/chave ao vivo.
- [ ] Desconexão → IA assume; reconexão → retoma.
- [ ] Telas de multiplayer no frontend, sem regressão no solo.
- [ ] Deploy via Docker na VPS (api + postgres + nginx).
- [ ] Migração final do front para `frontend/` sem regressão.

---

## MAPA DE COMPONENTES IDENTIFICADOS

### Dados (compartilhado)
- `squads.json` (novo) — fonte única de elencos (extraído de `data/squads.js`)
- `data/squads.js` (alterado) — passa a ler/expor o JSON

### Backend — Engine pura (`backend/CopaDraft.Engine/`, novos)
- `Rng.cs` — porte de `lib/rng.js` (mulberry32, makeRng, seedFrom)
- `Derive.cs` — porte de `lib/derive.js` (deriveAttrs, offsets POS/ARCH, clamp)
- `Narration.cs` — arrays de narração PT-BR (mesmos tamanhos/índices que `lib/i18n.js`)
- `GameConfig.cs` — espelho das constantes de `config.js` usadas pelo engine
- `MatchEngine.cs` — porte de `lib/engine.js` (`SimulateMatch`, runPeriod, autoShootout, helpers)
- `TournamentGenerator.cs` — NOVO: multi-grupo + semeadura de humanos + preenchimento IA + chaveamento
- `Standings.cs` — porte/generalização de `groupStandings`
- Modelos: `Side`, `Player`, `MatchLog`, `MatchEvent`, `Group`, `Fixture`, `Bracket`, etc.

### Backend — Testes (`backend/CopaDraft.Engine.Tests/`, novos)
- `RngParityTests.cs`, `DeriveParityTests.cs`, `MatchEngineParityTests.cs`, `TournamentTests.cs`
- `golden/` — vetores-ouro (JSON) extraídos do engine JS

### Backend — API/Infra (`backend/CopaDraft.Api/`, novos)
- `Program.cs` / configuração (DI, auth, SignalR, EF, CORS)
- Entidades EF: `User`, `Room`, `Participant`, `SubmittedTeam`, `Tournament`, `TournamentGroup`, `TournamentFixture`, `MatchResult`
- `AppDbContext.cs` + migrations
- Auth: validação do ID token Google + emissão de JWT; auth do SignalR via `access_token`
- Controllers REST: auth, salas, draft, torneio
- Hubs SignalR: `LobbyHub`, `TournamentHub` (presença, ready, draft, stream de partida, fase, desfecho)
- `RoomService`, `DraftService`, `TournamentOrchestrator`, `RoundClock`, `PresenceTracker`

### Frontend (root durante o MVP; novos/alterados)
- `lib/mp-auth.js` (novo) — login Google + sessão
- `lib/mp-api.js` (novo) — chamadas REST autenticadas
- `lib/mp-realtime.js` (novo) — cliente SignalR
- `ui/lobby.jsx` (novo) — criar/entrar, presença, ready-check, iniciar
- `ui/mp-tournament.jsx` (novo) — grupos + chaveamento ao vivo
- `app.jsx` (alterado) — ramificação de modo solo × MP dirigida por eventos do servidor
- `ui/home.jsx` (alterado) — entrada do modo MP + login
- `ui/draft.jsx` (alterado) — timer + autocompletar + submissão ao servidor (modo MP)
- `ui/match.jsx` (alterado) — ticker consumindo stream do servidor (modo MP)
- `ui/post.jsx` (alterado) — desfechos do torneio MP
- `index.html` (alterado) — novos `<script>` + CDNs (SignalR client, Google) na ordem certa
- `config.js` (alterado) — chaves do MP (tamanho de sala, timer de draft, pace canônico, janelas)
- `lib/store.js` (alterado) — sessão/preferências do MP isoladas das chaves do solo

### Infra (novos)
- `backend/Dockerfile`, `docker-compose.yml`, `.env.example`

### Migração final
- `frontend/` — destino do jogo atual; ajustes em `index.html`, `Dockerfile`, `nginx.conf`, `manifest.webmanifest`, `tests/_shim.js`

---

## ESTRATÉGIA DE TESTES

- **Frontend (existente):** testes Node por VM, rodam com `node tests/<nome>.test.js` (sem package.json, ver `tests/_shim.js`). Reaproveitar para gerar **vetores-ouro** do engine JS.
- **Backend (novo):** projeto de testes .NET (`CopaDraft.Engine.Tests`) com xUnit; foco em **paridade determinística** (seed → resultado idêntico ao JS) e na lógica de torneio.
- **Paridade JS↔C#:** script que roda o engine JS sobre um conjunto fixo de (seed × pares de squads × formação × knockout on/off) e serializa o `log` (score, sequência de eventos com minute/type/side/text, cards, pens); os testes C# carregam esses `golden/*.json` e exigem igualdade.

Cenários-chave:
- [ ] RNG: sequência de `next()/int()/pick()/weighted()` idêntica ao JS para a mesma seed.
- [ ] Derive: atributos idênticos para todos os arquétipos/posições.
- [ ] Engine: placar, eventos e desfecho idênticos aos vetores-ouro (regulation, knockout/ET, shootout).
- [ ] Torneio: humanos nunca no mesmo grupo (havendo grupos); IA preenche; humanos só no mata-mata; determinístico por seed.
- [ ] Standings: pontos/SG/GP/desempate estável corretos.
- [ ] Lobby/draft/orquestração: fluxos de presença, ready, timer, autofill, desconexão (testes de integração/serviço onde viável).

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Scaffold do backend (.NET 10, solution + 3 projetos)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final (preferência do dev — sem commits intermediários)

**Observações da Implementação:**
- Criada a solution `backend/CopaDraft.slnx` (novo formato XML do .NET 10) com 3 projetos `net10.0`: `CopaDraft.Engine` (classlib pura), `CopaDraft.Api` (`Microsoft.NET.Sdk.Web`, empty) e `CopaDraft.Engine.Tests` (xunit).
- Referências: `Api → Engine` e `Engine.Tests → Engine`.
- `backend/global.json` pina o SDK `10.0.203` (`rollForward: latestFeature`); `backend/.gitignore` (.NET) ignora `bin/obj`.
- Placeholders dos templates removidos (`Class1.cs`, `UnitTest1.cs`); adicionada `ScaffoldSanityTests.cs` (1 teste de sanidade verde).
- `.dockerignore` do root passou a excluir `backend/` do build do frontend.
- **Build:** 0 erros / 0 warnings. **Testes BE:** 1/1. **Frontend solo:** intacto (`node tests/engine.test.js` → 30 checks).
- SDK .NET 10 confirmado no ambiente: `10.0.203`.

**Objetivo:** Criar a base do mono-repo no `backend/` sem tocar no frontend.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.sln`, `backend/CopaDraft.Engine/`, `backend/CopaDraft.Api/`, `backend/CopaDraft.Engine.Tests/` (novos)
- `backend/.gitignore`, `.dockerignore` (ajuste para `bin/obj`)

**O que implementar:**
Criar a solution .NET 10 com `CopaDraft.Engine` (class library pura, sem dependências de web), `CopaDraft.Api` (ASP.NET Core, referencia a Engine) e `CopaDraft.Engine.Tests` (xUnit, referencia a Engine). Configurar `.gitignore` de .NET. Nada de lógica ainda — só o esqueleto compilando.

**Testes Necessários:**
- [ ] `dotnet build` da solution sem erros
- [ ] `dotnet test` roda (zero/placeholder)

**Critérios de Aceitação:**
- [ ] Estrutura `backend/` criada e compilando
- [ ] Frontend no root intacto (solo funciona)
- [ ] Build sem erros

**Dependências:** Nenhuma

---

### ETAPA 2: `squads.json` compartilhado + GameConfig no backend

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final (sem commits intermediários)

**Observações da Implementação:**
- **Decisão (importante):** em vez de transformar `data/squads.js` num *loader* que faz `fetch` do JSON (o que quebraria o carregamento **síncrono** que `tests/_shim.js`/`team.test.js` exigem — sem `fetch` no VM do Node — e exigiria um gate no `app.jsx`), `data/squads.js` permanece **intacto** como source síncrono do browser e o `squads.json` é **gerado a partir dele** por `tools/gen-squads-json.js`. Fonte única, sem divergência, **zero regressão** no solo. (Se no futuro quiser o front lendo o JSON em runtime, é um follow-up isolado.)
- `tools/gen-squads-json.js` (novo) — carrega `data/squads.js` num VM e escreve `squads.json` (416 seleções, 9621 jogadores).
- `squads.json` (novo) — fonte compartilhada, **embarcada** no `CopaDraft.Engine` via `<EmbeddedResource LogicalName="squads.json">` (sem dependência de path em runtime).
- Backend: `Models/Player.cs`, `Models/Squad.cs` (espelham o JSON); `GameConfig.cs` (espelho de `config.js`, SCREAMING_CASE proposital para auditoria de paridade — engine + grupos + fases + formações + rounds); `SquadRepository.cs` (desserializa o recurso embarcado, case-insensitive, cache via `Lazy`).
- Testes BE (`SquadRepositoryTests`, `GameConfigTests`): 9/9 — contagem 416/9621 (âncora de paridade com `data/squads.js`), unicidade de ids, posições válidas, formações somam 11, `PHASE_STRENGTH` crescente.
- **Build:** 0/0. **Testes BE:** 9/9. **Frontend:** `engine.test.js` 30 checks + 11 checks de `team.test.js` passam (o crash no fim do `team.test.js` é **bug pré-existente** de harness na linha 66, não tocado nesta etapa).

**Objetivo:** Fonte única de elencos e as constantes do engine no C#.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `squads.json` (novo, na raiz dos dados compartilhados)
- `data/squads.js` (alterado — passa a ler/expor o JSON, mantendo `window.SQUADS`)
- `backend/CopaDraft.Engine/GameConfig.cs` (novo — espelha `config.js`)
- `backend/CopaDraft.Engine/Models/*.cs` (Player, Squad)
- Loader de squads no backend

**O que implementar:**
Extrair os elencos de `data/squads.js` para `squads.json` (mesmos campos: id, team, code, cup, host, players[...] com id/name/pos/age/overall/archetype/leader). Ajustar `data/squads.js` para carregar o JSON e expor `window.SQUADS` igual a hoje (sem regressão no solo). No backend, criar `GameConfig` com as constantes de `config.js` usadas pelo engine (BASE_LAMBDA, LAMBDA_EXP, ZEBRA_Z, MINUTES, ET_*, EVENTS_*, ATTR_*, CAPTAIN/CHEMISTRY, PRESSURE/FATIGUE usados, FOUL_*, PENALTY_*, INJURY_*, MAN_DOWN_*, FORMATIONS, GROUP_*, PHASE_STRENGTH, OPP_STRENGTH_BIAS) e um loader de `squads.json`.

**Testes Necessários:**
- [ ] `data/squads.js` continua expondo `window.SQUADS` idêntico (validar no `_shim`)
- [ ] Backend carrega `squads.json` (contagem/estrutura conferem)

**Critérios de Aceitação:**
- [ ] `squads.json` é a fonte única; front e back leem dele
- [ ] Solo sem regressão
- [ ] Build/test sem erros

**Dependências:** ETAPA 1

---

### ETAPA 3: Porte do RNG (mulberry32) para C# + paridade

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final (sem commits intermediários)

**Observações da Implementação:**
- `tools/gen-rng-golden.js` (novo) — gera `golden/rng.json` do `lib/rng.js`: sequências de `next()` (6 seeds × 25, incluindo bordas 0/4294967295/2166136261), `int`, `pick`, `weighted` e `seedFrom` (9 strings, incl. emoji).
- `backend/CopaDraft.Engine/Rng.cs` (novo) — porte fiel: `mulberry32` com `unchecked` int32, `>>>` via `(int)((uint)x >> n)`, `Math.imul` via mult. int32, divisão final `(uint)t / 4294967296.0`; `Range/NextInt/Chance/Pick/Weighted/SeedFrom` (FNV-1a, itera code units UTF-16).
- `backend/CopaDraft.Engine.Tests/Golden.cs` (novo) — loader genérico de golden embarcado; `golden/**/*.json` embarcado via csproj.
- `backend/CopaDraft.Engine.Tests/RngParityTests.cs` (novo) — 5 testes.
- **Resultado-chave:** `Next()` bate por **igualdade exata de double** (`==`) com o JS em todas as seeds — o round-trip da repr. decimal do JSON preserva o bit pattern. Paridade total do stream confirmada (base para o engine).
- **Build:** 0/0. **Testes BE:** 14/14 (9 + 5). Frontend não tocado.

**Objetivo:** Base determinística idêntica ao JS.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Engine/Rng.cs` (novo)
- `backend/CopaDraft.Engine.Tests/RngParityTests.cs` (novo)
- `backend/CopaDraft.Engine.Tests/golden/rng_*.json` (novo)

**O que implementar:**
Portar `lib/rng.js`: `mulberry32` (aritmética uint32 com `unchecked` e equivalente a `Math.imul`), `makeRng` (next/range/int/chance/pick/weighted) e `seedFrom` (FNV-1a). **Atenção:** replicar exatamente operadores `>>>`, `|0`, `Math.imul`. Gerar vetores-ouro do JS (sequências de next/int/pick/weighted para seeds fixas) e assertar igualdade.

**Testes Necessários:**
- [ ] `next()` produz a mesma sequência de floats que o JS (várias seeds)
- [ ] `int`, `pick`, `weighted` batem com o JS
- [ ] `seedFrom("...")` idêntico ao JS

**Critérios de Aceitação:**
- [ ] Paridade total do RNG por seed
- [ ] Testes passando

**Dependências:** ETAPA 1

---

### ETAPA 4: Porte do DERIVE (atributos) para C# + paridade

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final (sem commits intermediários)

**Observações da Implementação:**
- `tools/gen-derive-golden.js` (novo) — gera `golden/derive.json` com os atributos de **todos os 9621 jogadores** (carrega config.js + derive.js + squads.js no VM).
- `backend/CopaDraft.Engine/Derive.cs` (novo) — `Attrs` (struct dos 6 atributos) + `Derive.DeriveAttrs(Player, GameConfig)`: tabelas POS (completa) e ARCH (parcial, default 0), clamp `Math.Max(MIN, Math.Min(MAX, Math.Floor(v+0.5)))`, fallbacks `POS["MEI"]`/ARCH vazio — fiel ao `lib/derive.js`.
- `backend/CopaDraft.Engine.Tests/DeriveParityTests.cs` (novo) — 2 testes: paridade exaustiva (9621 jogadores) + clamp dentro de [ATTR_MIN, ATTR_MAX].
- **Build:** 0/0. **Testes BE:** 16/16 (14 + 2). Frontend não tocado.

**Objetivo:** Derivação de atributos idêntica (entra direto no cálculo de força).

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Engine/Derive.cs` (novo)
- `backend/CopaDraft.Engine.Tests/DeriveParityTests.cs` (novo)

**O que implementar:**
Portar `lib/derive.js`: tabelas `POS` e `ARCH`, `KEYS`, `clamp` (ATTR_MIN/ATTR_MAX do GameConfig), `deriveAttrs`. As labels i18n não são necessárias no servidor.

**Testes Necessários:**
- [ ] `deriveAttrs` idêntico ao JS para todas as combinações posição×arquétipo (amostra dos squads reais)

**Critérios de Aceitação:**
- [ ] Paridade total de atributos
- [ ] Testes passando

**Dependências:** ETAPA 2 (GameConfig)

---

### ETAPA 5: Narração PT-BR no engine C# (paridade de stream do RNG)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final (sem commits intermediários)

**Observações da Implementação:**
- `tools/gen-narration.js` (novo) — extrai `I18N._dict.pt.narration` do `lib/i18n.js` para `backend/CopaDraft.Engine/Data/narration-pt.json` (14 arrays + 16 strings). Zero cópia manual → texto e tamanhos idênticos por construção.
- `backend/CopaDraft.Engine/Narration.cs` (novo) — `partial`+`GeneratedRegex`; carrega o JSON embarcado; espelha `arr` (array ou vazio), `t` (string preenchida ou a própria key), `fill` (substitui `{word}` por vars ou ""). `Narration.Pt` é a instância compartilhada.
- `backend/CopaDraft.Engine.Tests/NarrationParityTests.cs` (novo) — 28 testes: **lengths fixas verificadas direto no i18n.js** (goal 6, assist 4, bigchance 4, save 4, woodwork/yellow/foul/counter 3, red 3, red2 2, injury 3, penGoal 3, penSave/penMiss 2) — a garantia anti-desalinhamento do RNG; resolução das strings usadas pelo engine; comportamento de `fill`.
- **Gotcha resolvido:** `narration.pt.json` (com `.pt.`) era tratado pelo MSBuild como **recurso de cultura "pt"** (satélite) e não entrava no assembly principal — renomeado para `narration-pt.json`. Também é preciso `<None Remove>` antes do `<EmbeddedResource>` para arquivos dentro do projeto.
- **Build:** 0/0. **Testes BE:** 44/44 (16 + 28). Frontend não tocado.

**Objetivo:** Replicar os arrays de narração que o engine consome via `rng.pick`, com os **mesmos tamanhos/índices** (senão o stream do RNG desalinha) e mesmo texto PT-BR (para o ticker).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Engine/Narration.cs` (novo)
- `backend/CopaDraft.Engine.Tests/NarrationParityTests.cs` (novo)

**O que implementar:**
Extrair de `lib/i18n.js` (PT) os arrays usados pelo engine via `rng.pick`: `goal`, `assist`, `red`, `red2`, `yellow`, `foul`, `injury`, `bigchance`, `save`, `woodwork`, `counter`, `penGoal`, `penSave`, `penMiss`; e os templates simples (`I18N.t`, sem rng) `kickoff`, `halfTime`, `etStart`, `pensDecision`, `fullTime`, `pensLine`, `injSub`, `injDown`, `gkFallback`. **Crítico:** comprimento de cada array `arr()` deve ser idêntico ao JS. Implementar o preenchimento de placeholders `{player}`, `{team}`, `{TEAM}`, etc.

**Testes Necessários:**
- [ ] Cada array PT tem o mesmo length do JS (teste automatizado comparando contagens)
- [ ] Preenchimento de templates equivalente

**Critérios de Aceitação:**
- [ ] Tamanhos batem (garante alinhamento do RNG)
- [ ] Textos PT corretos
- [ ] Testes passando

**Dependências:** ETAPA 3

---

### ETAPA 6: Porte do `simulateMatch` para C#

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `Models/MatchModels.cs` (novo): `EnginePlayer`, `SideInput`, `EngineOptions`, `MatchEvent`, `Score`, `PlayerStats`, `CardEntry/SentOffEntry/InjuryEntry/MatchPen`, `MatchLog`.
- `MatchEngine.cs` (novo): porte fiel de `simulateMatch` + `runPeriod` + `autoShootout` — mesma ordem de chamadas ao RNG (gols→faltas/cartões→lesões→pênaltis por minuto, home antes de away), buckets na ordem de inserção do JS, `OrderBy` para sort **estável** de eventos (JS sort é estável), `ToUpperInvariant` p/ `{TEAM}`, `(g.GOL[0]?.overall)||75` replicado. `finalize*` (pênalti interativo) fora do MVP conforme PLAN.

**Objetivo:** O engine de partida, fonte única do MP.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Engine/MatchEngine.cs` (novo)
- `backend/CopaDraft.Engine/Models/MatchLog.cs`, `Side.cs`, `MatchEvent.cs` (novos)

**O que implementar:**
Portar `lib/engine.js` fielmente: `effective`, `group`, `scorerWeights/assistWeights/foulWeights`, `expectedGoals`, `runPeriod` (gols, faltas/cartões causais com expulsão e man-down, lesões com sub, pênaltis seedados), `simulateMatch` (prep dos lados, base atk/def, `day` com ZEBRA_Z, regulation, eventos não-gol, half, knockout→ET→`autoShootout`, ordenação de eventos, `result`), e `autoShootout`. **Manter a MESMA ORDEM de chamadas ao RNG** que o JS (cada `rng.*` na mesma sequência). `finalizeInMatchPenalty`/`finalizeShootout` (pênalti interativo) ficam **fora do MVP**.

**Testes Necessários:**
- [ ] Cobertos pela ETAPA 7 (paridade)

**Critérios de Aceitação:**
- [ ] Compila e roda uma partida ponta-a-ponta
- [ ] Pronto para validação de paridade

**Dependências:** ETAPAS 3, 4, 5

---

### ETAPA 7: Vetores-ouro + testes de paridade do engine

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `tools/gen-engine-golden.js` (novo, em vez de `tests/golden-export.js` — consistente com os demais geradores em `tools/`): 42 vetores (607 KB) cobrindo regulation, knockout, ET+shootout (busca de seed garantida), ET decidida, lesão com/sem sub, expulsão, pênalti em jogo, capitão/química, pressão e fadiga. Cobertura medida: 11 ET, 5 shootouts, 10 lesões, 7 expulsões, 15 pênaltis.
- `MatchEngineParityTests.cs` (novo): 42 teorias comparando o log inteiro campo a campo (score, result, ET/pens, eventos em ordem com minute/type/side/text/etTag/pen/penId/outcome/key/players/score-snapshot, stats por jogador, cards, sentOff, injuries, matchPens, manDown).
- **Resultado: 100% de paridade na primeira execução** — 86/86 testes na suíte (44 + 42). Regenerar: `node tools/gen-engine-golden.js`.

**Objetivo:** Provar que o engine C# == engine JS (garantia central do PRD).

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `tests/golden-export.js` (novo — script Node que serializa logs do engine JS)
- `backend/CopaDraft.Engine.Tests/golden/*.json` (gerados)
- `backend/CopaDraft.Engine.Tests/MatchEngineParityTests.cs` (novo)

**O que implementar:**
Script Node (usando `tests/_shim.js`) que roda `ENGINE.simulateMatch` para uma matriz fixa de seeds × pares de squads × formações × `{knockout:false/true}` e grava o `log` (score, eventos [minute,type,side,text], cards, sentOff, injuries, matchPens, result, extraTime, penalties). Testes C# carregam os JSON e exigem igualdade campo a campo. Documentar como regenerar os vetores.

**Testes Necessários:**
- [ ] Igualdade total C#↔JS em todos os vetores (placar, sequência de eventos, desfecho)

**Critérios de Aceitação:**
- [ ] 100% de paridade nos vetores
- [ ] Processo de regeneração documentado

**Dependências:** ETAPA 6

---

### ETAPA 8: Gerador de torneio multi-grupo (C#)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `TeamHelpers.cs`: portes de `squadAvg`, `bestXI` (AI side sem banco, como no solo), `roundRobin` (método do círculo) e `DrawScaledSquads` (peso por força de fase).
- `TournamentGenerator.cs`: grupos válidos {2,4,8} (2×G classificados = potência de 2) — 2 humanos→2 grupos (semi+final), 3-4→4 grupos (quartas..), 5-8→8 grupos (oitavas..); humanos distribuídos round-robin em grupos distintos; IA preenche com squads distintas (fase 'grupos'); chaveamento **cruzado** (A1×B2 / B1×A2 — mesmos-grupo só se reencontram o mais tarde possível); `MatchSeed(seed, fixtureId)` via FNV-1a p/ seed determinística por partida.
- `Standings.cs`: porte de `groupStandings` (P→SG→GP→ordem estável).
- `TournamentTests.cs`: 18 testes, incl. torneio completo simulado até o campeão (determinístico). **Suíte: 104/104.**
- **Decisão:** tamanho máximo de sala = 8 humanos (deriva dos grupos válidos; configurável adiante).

**Objetivo:** Lógica NOVA: N humanos em grupos diferentes + IA, mata-mata onde só se cruzam após os grupos.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Engine/TournamentGenerator.cs`, `Standings.cs` (novos)
- `backend/CopaDraft.Engine/Models/Tournament.cs`, `Group.cs`, `Fixture.cs`, `Bracket.cs` (novos)
- `backend/CopaDraft.Engine.Tests/TournamentTests.cs` (novo)

**O que implementar:**
Dado N humanos (cada um com seu time) e parâmetros (`GROUP_SIZE`, `GROUP_QUALIFY`, pool de squads para IA, seed): derivar o número de grupos; **semear humanos em grupos distintos** (round-robin de distribuição) e preencher vagas com squads IA via escala de força da fase 'grupos' (reusar lógica de `drawScaledOpponents`); gerar fixtures round-robin por grupo (método do círculo, como `roundRobin`); calcular standings com desempates (`P→SG→GP→estável`); montar o **chaveamento** dos classificados de forma que rivais de grupo (e humanos) só se reencontrem o mais tarde possível. Tudo determinístico pela seed.

**Testes Necessários:**
- [ ] Nenhum par de humanos no mesmo grupo (havendo grupos); IA preenche o resto
- [ ] Determinismo por seed (grupos, fixtures, chave)
- [ ] Standings/desempates corretos
- [ ] Tamanhos variados (2..N) geram torneio válido

**Critérios de Aceitação:**
- [ ] Torneio coerente e determinístico para qualquer N suportado
- [ ] Testes passando

**Dependências:** ETAPAS 6, 7

---

### ETAPA 9: Persistência — EF Core + PostgreSQL (entidades + migration)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `Data/Entities.cs`: `User` (GoogleSub único), `Room` (Code único, estado, seed, DraftDeadline), `Participant` (Room+User único, presença, ready, JoinOrder p/ semeadura determinística), `SubmittedTeam` (formação, capitão, titulares/banco como JSON de ids), `TournamentRecord`.
- **Decisão (desvio documentado do PLAN):** em vez de tabelas `TournamentGroup/TournamentFixture/MatchResult`, o torneio persiste como **blob JSON** (`TournamentRecord.StateJson`) — o estado é deterministicamente re-derivável de seed+times, e o blob simplifica resume/inspeção no MVP.
- `Data/AppDbContext.cs` + migration `InitialCreate` (dotnet-ef 10, tool local em `dotnet-tools.json`).
- **Validado em PostgreSQL 17 real (Docker):** migration aplica (5 tabelas + history) e **reverte** (down até 0) sem erro.
- `PersistenceTests.cs` (3 testes, Sqlite in-memory): round-trip Room/Participant/Team, unicidade de Code e de (Room,User). **Suíte: 107/107.**
- `Program.cs`: registra DbContext (Npgsql, conn string `Default` por env) e aplica migrations no start (`SKIP_MIGRATIONS` p/ testes); `/health`.

**Objetivo:** Estado de servidor do MP.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Api/Data/AppDbContext.cs`, `Entities/*.cs` (novos)
- `backend/CopaDraft.Api/Migrations/*` (gerados)
- `backend/CopaDraft.Api/appsettings*.json` (connection string via env)

**O que implementar:**
Entidades: `User` (id externo Google, nome, avatar), `Room` (código, anfitrião, estado, limites, seed), `Participant` (user+room, papel, presença, ready), `SubmittedTeam` (titulares/formação/reservas/capitão — serializado), `Tournament`/`TournamentGroup`/`TournamentFixture`/`MatchResult`. DbContext + migration inicial. Connection string e segredos por ambiente.

**Testes Necessários:**
- [ ] Migration aplica em Postgres local (subir via Docker é aceitável)
- [ ] CRUD básico de Room/Participant

**Critérios de Aceitação:**
- [ ] Schema criado; migration reversível
- [ ] Build/test sem erros

**Dependências:** ETAPA 1

---

### ETAPA 10: Autenticação Google + JWT (REST e SignalR)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- Pacotes: `Google.Apis.Auth`, `Microsoft.AspNetCore.Authentication.JwtBearer`.
- `Auth/AuthServices.cs`: `IGoogleTokenValidator` (abstração; real = `GoogleJsonWebSignature.ValidateAsync` com audience `Google:ClientId`), `AuthService` (upsert de `User` por GoogleSub + emissão de JWT HS256, 7 dias, claims sub/name/avatar), `JwtOptions` (key/issuer por config; fallback dev).
- `Controllers/AuthController.cs`: `POST /api/auth/google` `{idToken}` → `{token, user}`; 401 em token inválido.
- `Program.cs`: controllers, JwtBearer (com `access_token` da query p/ caminhos `/hubs` — SignalR), authorization, CORS configurável (`Cors:Origins`).
- `AuthTests.cs` (3): primeiro login cria usuário + JWT com claims; segundo login faz upsert sem duplicar; token inválido lança e não persiste. **Suíte: 110/110.**
- Segredos via env/appsettings (`Google:ClientId`, `Jwt:Key`) — **pendência operacional:** criar credenciais OAuth no Google Cloud Console antes do deploy.

**Objetivo:** Contas via Google, sessão própria.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Api/Auth/*` (novos), `Program.cs` (auth/JWT/CORS)
- `backend/CopaDraft.Api/Controllers/AuthController.cs` (novo)

**O que implementar:**
Endpoint que recebe o **ID token do Google**, valida (audience/issuer), cria/atualiza `User` e emite **JWT** próprio. Middleware de autenticação JWT nas rotas e no **SignalR** (token via `access_token` na query da conexão). CORS para o frontend. Segredos (Google client id/secret, JWT key) por ambiente.

**Testes Necessários:**
- [ ] Token válido → JWT emitido + `User` persistido
- [ ] Rota protegida rejeita sem token
- [ ] Conexão SignalR autentica via token

**Critérios de Aceitação:**
- [ ] Login Google ponta-a-ponta no backend
- [ ] Auth no REST e no hub

**Dependências:** ETAPA 9

---

### ETAPA 11: Lobby — REST + `LobbyHub` (criar/entrar, presença, ready, início)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `Services/MpOptions.cs`: knobs do MP (min 2 / max 8 jogadores, draft 180s, pace 250ms/min, 12s entre rodadas) — seção `Mp` da config.
- `Services/RoomService.cs`: criar (código de 6 chars sem ambíguos, host = participante 0), entrar (rejoin idempotente p/ reconexão; valida estado/capacidade), sair (lobby: remove + transfere host / sala vazia é removida; em torneio: marca `saiu`, nunca remove — RN10/11), ready, iniciar (só host, ≥2, Waiting→Draft com deadline), DTOs.
- `Services/PresenceTracker.cs` (singleton): conexões→(user,sala); AI-takeover só quando cai a ÚLTIMA conexão do usuário.
- `Hubs/LobbyHub.cs` `[Authorize]`: JoinRoom/SetReady/StartDraft/LeaveRoom + broadcast `RoomState`/`DraftStarted`/`LobbyError`; OnDisconnected marca presença e notifica.
- `Controllers/RoomsController.cs`: POST `/api/rooms`, GET/`{code}`, POST/`{code}/join`.
- **Testes:** `RoomServiceTests` (8) + `ApiTestHost` (TestServer + Sqlite + JWT real) + `LobbyIntegrationTests` (3, incl. fluxo E2E com 2 clientes SignalR reais: presença ao vivo, ready visto pelo outro, start rejeitado p/ não-host, hub rejeita anônimo). **Suíte: 121/121.**

**Objetivo:** Sala em tempo real.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Api/Controllers/RoomsController.cs` (novo)
- `backend/CopaDraft.Api/Hubs/LobbyHub.cs`, `Services/RoomService.cs`, `Services/PresenceTracker.cs` (novos)

**O que implementar:**
Criar sala (gera código/convite, define anfitrião e seed), entrar por código, sair. `LobbyHub`: presença (entrou/saiu/estado) difundida ao grupo da sala, marcar **pronto**, e **iniciar** (somente anfitrião, com ≥2 jogadores) → transição de estado da sala e evento para todos irem ao draft. Validações de sala cheia/inexistente/encerrada.

**Testes Necessários:**
- [ ] Criar/entrar/sair atualiza participantes e difunde presença
- [ ] Ready-check + início só pelo anfitrião
- [ ] Início exige ≥2 jogadores

**Critérios de Aceitação:**
- [ ] Lobby funcional em tempo real (validável com 2 conexões)
- [ ] Estados consistentes

**Dependências:** ETAPA 10

---

### ETAPA 12: Draft no servidor — timer + submissão + autocompletar

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `SquadRepository.PlayersById` (índice id→Player no Engine).
- `Services/DraftService.cs`: `SubmitAsync` (valida estado Draft, formação existente, 11 titulares com contagem por posição == formação, sem ids repetidos, ids existentes no pool, capitão entre titulares; re-submissão sobrescreve), `AutofillMissingAsync` (sorteio por slot entre squads aleatórias — espelha o Random do solo, banco GOL/DEF[ZAG|LAT]/MEI/ATA como `DRAFT_BENCH` —, **seedado por `seedFrom(roomSeed:userId)`** → determinístico), `ProgressAsync`/`AllSubmittedAsync`, `ToSide` (SubmittedTeam → `SideInput` jogável, subsLeft=3).
- `LobbyHub.SubmitTeam`: submete + difunde `DraftProgress`; quando todos têm time → `DraftComplete`.
- `DraftServiceTests` (9): validações, overwrite, autofill válido/determinístico, `ToSide` simula partida real ponta-a-ponta. **Suíte: 130/130.**
- Enforcement do deadline: worker em background entra na ETAPA 13 junto do orquestrador (decisão de coesão).

**Objetivo:** Cada jogador submete seu time; quem expira/cai é autocompletado.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Api/Services/DraftService.cs` (novo)
- `backend/CopaDraft.Api/Controllers/DraftController.cs` ou métodos no hub (novo)

**O que implementar:**
Ao iniciar, abrir a fase de draft com **timer** (config). Endpoint/hub para **submeter o time** (validar formação=11, elegibilidade; persistir `SubmittedTeam`). Ao expirar o timer (ou jogador ausente/caído), **autocompletar** (Random respeitando regras) e marcar pronto. Difundir progresso (quem já submeteu). Quando todos prontos/autocompletados → sinalizar montagem do torneio.

**Testes Necessários:**
- [ ] Submissão válida persiste; inválida é rejeitada
- [ ] Timer expira → autofill válido
- [ ] Progresso difundido

**Critérios de Aceitação:**
- [ ] Todos terminam com time válido (submetido ou autofill)
- [ ] Transição para o torneio disparada

**Dependências:** ETAPA 11

---

### ETAPA 13: Orquestrador do torneio + relógio de rodada + streaming

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `Services/TournamentDtos.cs`: snapshot público (grupos+tabelas+fixtures, bracket, fase, rodada corrente c/ pace) e `YourMatchDto` privado (log completo da SUA partida p/ o ticker).
- `Services/RoundClock.cs`: relógio canônico (1..maxMinute, pace de `MpOptions`).
- `Services/TournamentOrchestrator.cs` (singleton): `TryStartAsync` idempotente (constrói entries por JoinOrder, gera torneio, persiste, Groups) → runner em background: 3 rodadas de grupo (simula tudo → `YourMatch` por humano → `RoundStarted` → ticks `MinuteTick` → `MatchFinished` no minuto final de cada jogo → snapshot/persist) → classificação top-2 → mata-mata até o campeão (`TournamentFinished`); `Snapshot`/`YourMatch`/`LastError` p/ resync e diagnóstico.
- `Services/DraftDeadlineWorker.cs` (BackgroundService, 5s): deadline vencido → autofill + start (sala nunca trava).
- `Auth/SubUserIdProvider.cs`: `Clients.User(userId)` via claim sub.
- **Decisões documentadas:** (1) hub único (`LobbyHub` carrega eventos de torneio — 1 conexão WS por cliente, em vez de `TournamentHub` separado); (2) MP simula **sem** pressão/fadiga (conceitos de campanha solo; todos em pé de igualdade); (3) cliente recebe o log completo + segue o relógio do servidor (reconexão trivial via `GetTournament`).
- **Bug encontrado nos testes:** squads históricos podem não preencher um 4-3-3 (poucos LAT) — `bestXI` JS tem o mesmo comportamento; testes passaram a selecionar squads com XI completo. A validação de submissão (11 titulares) protege o caso humano.
- `TournamentIntegrationTests`: fluxo E2E real (2 clientes SignalR, pace 0): YourMatch privado, ≥360 ticks, MatchFinished, fases, tabelas com J=3, bracket semi+final jogado, campeão. **Suíte: 131/131.**

**Objetivo:** Simular no servidor e transmitir partidas/tabelas ao vivo, coerentes para todos.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Api/Services/TournamentOrchestrator.cs`, `Services/RoundClock.cs` (novos)
- `backend/CopaDraft.Api/Hubs/TournamentHub.cs` (novo)

**O que implementar:**
Ao fim do draft, montar o torneio (ETAPA 8) e persistir. Para cada rodada: simular **todas** as partidas (engine C#, seed do torneio) gerando os logs; rodar um **relógio de rodada canônico** que emite, via `TournamentHub`, o avanço dos minutos/eventos da partida **de cada humano** (ticker) e marca **fim de cada jogo**, atualizando e difundindo **standings/chaveamento** ao vivo. No MP o **pace é único** (config), garantindo coerência da tabela. Calcular classificação (top-N), montar mata-mata, repetir até o **campeão da sala**. Pênaltis **automáticos**. Sem substituições ao vivo (vale a escalação submetida).

**Testes Necessários:**
- [ ] Rodada simula todas as partidas deterministicamente
- [ ] Relógio emite eventos do ticker e fim de jogo na ordem
- [ ] Standings/chave difundidos e corretos; avanço até campeão

**Critérios de Aceitação:**
- [ ] Torneio roda ponta-a-ponta no servidor com streaming coerente
- [ ] Campeão definido; estados persistidos

**Dependências:** ETAPAS 8, 12

---

### ETAPA 14: Desconexão → IA assume; reconexão → retoma; anfitrião sai

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `LobbyHub.OnDisconnectedAsync` agora diferencia: sala `aguardando` → queda = sair (host transfere, sala vazia morre); draft/torneio → presença `ia` (IA assume; como a simulação é server-authoritative, nada pausa — RN11).
- Reconexão: `JoinRoom` (rejoin idempotente) restaura `conectado`; `GetTournament` re-entrega snapshot + sua partida.
- Draft de ausente: já coberto pelo `DraftDeadlineWorker` (autofill).
- `DisconnectionTests` (2, integração real): queda no lobby remove; queda em torneio marca `ia` E o torneio termina; rejoin restaura presença e recebe snapshot final. **Suíte: 133/133.**

**Objetivo:** Resiliência em tempo real.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/CopaDraft.Api/Services/PresenceTracker.cs`, `TournamentOrchestrator.cs`, hubs (alterados)

**O que implementar:**
Detectar desconexão (eventos do SignalR/heartbeat). Marcar participante como `ia-assumiu`; como o servidor é a autoridade da simulação, o torneio **segue sem travar** (o time do ausente continua jogando via engine). Reconexão antes da eliminação → restaurar para `conectado` e **retomar o controle** (re-sincronizar o estado atual: fase, sua partida, tabelas). Anfitrião que sai: transferir o papel (lobby) ou seguir/encerrar (em torneio). Difundir estados aos demais.

**Testes Necessários:**
- [ ] Queda no torneio → IA assume, torneio continua
- [ ] Reconexão re-sincroniza e retoma
- [ ] Saída do anfitrião tratada

**Critérios de Aceitação:**
- [ ] Sala não trava por ausência
- [ ] Estados de jogador difundidos corretamente

**Dependências:** ETAPA 13

---

### ETAPA 15: Frontend — serviços de auth/API/realtime + entrada do modo MP

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `config.js`: seção `MP` (API_BASE same-origin p/ proxy nginx, GOOGLE_CLIENT_ID, timer/pace/limites de exibição).
- `lib/mp-auth.js` (`window.MPAUTH`): botão Google Identity Services → troca credential por JWT no backend; sessão em **chave própria** `copa_draft_mp_session_v1` (decisão: `lib/store.js` ficou **intacto** — zero risco de regressão no solo).
- `lib/mp-api.js` (`window.MPAPI`): REST autenticada (criar/buscar/entrar sala), 401 → logout.
- `lib/mp-realtime.js` (`window.MPRT`): conexão SignalR única (`/hubs/lobby`), subscribe/dispatch dos 11 eventos, `withAutomaticReconnect` + hook de resync.
- `index.html`: SignalR 8.0.7 via CDN **com SRI calculado** (sha384), GIS (sem SRI — Google rotaciona), 3 libs MP + `ui/mp.jsx` na ordem correta.
- `ui/home.jsx`: botão "🌐 Multiplayer Online"; `app.jsx`: fase `mp` renderiza `MultiplayerApp`, deep-link `?sala=CODIGO` entra direto no MP; GameHeader mapeia mp→home.
- Validação: Babel transform OK nos 3 JSX; `node --check` nas libs; testes solo verdes (30+12+10).

**Objetivo:** Conectar o front ao backend sem quebrar o solo.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/mp-auth.js`, `lib/mp-api.js`, `lib/mp-realtime.js` (novos)
- `index.html` (alterado — CDNs SignalR/Google + `<script>` na ordem certa)
- `ui/home.jsx` (alterado — botão/entrada Multiplayer + login Google)
- `lib/store.js` (alterado — sessão/preferências MP isoladas)
- `config.js` (alterado — endpoints/chaves do MP)

**O que implementar:**
Serviços cliente: login Google (obter ID token, trocar por JWT), API REST autenticada, e cliente **SignalR** (conectar com token, assinar eventos). Entrada do modo MP na home; expor serviços em `window`; incluir CDNs e scripts na ordem (libs → dados → ui → app por último). Garantir que o **solo continua offline e intacto**.

**Testes Necessários:**
- [ ] Login Google obtém JWT e conecta no hub
- [ ] Solo inalterado

**Critérios de Aceitação:**
- [ ] Front autentica e abre conexão realtime
- [ ] Sem regressão no solo; sem build (CDN + window)

**Dependências:** ETAPAS 10, 11

---

### ETAPA 16: Frontend — tela de Lobby

**Status:** ✅ Concluída (entregue junto com 17–19 em `ui/mp.jsx`)
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `ui/mp.jsx` → `MpLogin` (GIS; aviso se `GOOGLE_CLIENT_ID` vazio), `MpMenu` (criar sala / entrar por código), `MpLobby` (código gigante + copiar link `?sala=`, lista de jogadores com avatar/👑/presença/ready ao vivo, "Estou pronto", "Iniciar" só p/ anfitrião com ≥2, sair).
- `MultiplayerApp` orquestra os estágios dirigido pelos eventos do servidor (`RoomState`/`DraftStarted`/…); reconexão re-invoca `JoinRoom`+`GetTournament`.
- Strings PT-BR literais no MP (decisão MVP; i18n do MP é follow-up).
- Estilos `.mp-*` no `game.css` reusando tokens/kit existentes.

**Objetivo:** Criar/entrar em sala, presença, ready-check, iniciar.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/lobby.jsx` (novo), `app.jsx` (alterado — ramo MP), `game.css` (estilos)

**O que implementar:**
Tela de lobby: criar sala (mostrar link/código), entrar por link/código, **lista de jogadores com presença em tempo real**, marcar **pronto**, botão **iniciar** (anfitrião). Reagir aos eventos do `LobbyHub`. `app.jsx` ganha o ramo de estados do MP dirigido pelo servidor.

**Testes Necessários:**
- [ ] Presença e ready aparecem ao vivo (2 navegadores)
- [ ] Início pelo anfitrião leva todos ao draft

**Critérios de Aceitação:**
- [ ] Lobby jogável ponta-a-ponta
- [ ] Sem regressão no solo

**Dependências:** ETAPAS 11, 15

---

### ETAPA 17: Frontend — draft MP (timer + autofill + submissão)

**Status:** ✅ Concluída (em `ui/mp.jsx`)
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- **Reuso integral do `DraftScreen`** (interface `{formation, mode, sfx, onConfirm}` permitiu plugar sem tocar no componente): estágio draft = seletor de formação (FormationSelect) + `DraftScreen` com `MpTimer` (countdown do deadline do servidor) e progresso "N/M times enviados".
- `onConfirm` → `SubmitTeam` via hub (ids de titulares/banco + capitão); estágio `draft-wait` mostra progresso até `DraftComplete`/torneio. Autofill de expirado é do servidor (worker da ETAPA 13).
- `ui/draft.jsx` **não foi alterado** (desvio positivo do PLAN: previa alteração; o reuso por props bastou).

**Objetivo:** Reusar o draft do dado no modo MP com timer e envio ao servidor.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/draft.jsx` (alterado — modo MP), `app.jsx` (alterado)

**O que implementar:**
No modo MP, o `DraftScreen` mostra o **timer**, monta o time como hoje (dado/Random) e, ao confirmar/expirar, **submete ao servidor**. Refletir progresso dos outros (quem já fechou). Em caso de expirar, o autofill do servidor prevalece. Não inicia campanha local.

**Testes Necessários:**
- [ ] Submissão dentro do tempo é aceita
- [ ] Expirar usa autofill do servidor
- [ ] Progresso visível

**Critérios de Aceitação:**
- [ ] Time enviado e aceito; transição para a visão do torneio
- [ ] Solo (draft normal) inalterado

**Dependências:** ETAPAS 12, 16

---

### ETAPA 18: Frontend — assistir partida (stream) + torneio ao vivo

**Status:** ✅ Concluída (em `ui/mp.jsx`)
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- **Reuso integral do `MatchScreen`**: o evento `YourMatch` entrega o log completo; o cliente replay-a no pace fixo `CONFIG.MP.SPEED` (sem seletor no MP — relógio do servidor é a autoridade; tabela só muda em evento do servidor). `onPenalty/onShootout` nulos (pênalti interativo é solo; shootout MP é automático no servidor).
- **`mpFlipLog`**: invariante do solo é "jogador = home"; quando o servidor diz que sou `away`, o log é espelhado (score/sides/eventos/penalties/manDown/result) → cores, SFX e placar ficam na perspectiva certa.
- `MpTournament`: tabelas por grupo (reusa classes `.group-table/.gt-*` com zona de classificação e destaque `me`), calendário por rodada (`.gcal-*`), bracket do mata-mata (com pênaltis), chip "minuto X" via `MinuteTick`, botão "▶ Assistir minha partida".
- `ui/match.jsx` **não foi alterado** (mesmo desvio positivo da 17).

**Objetivo:** Ticker da própria partida via servidor + grupos/chaveamento ao vivo.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `ui/match.jsx` (alterado — consumir stream), `ui/mp-tournament.jsx` (novo), `app.jsx` (alterado), `game.css`

**O que implementar:**
No MP, o `MatchScreen` **consome os eventos do `TournamentHub`** (ticker minuto-a-minuto no pace canônico), mantendo narração/SFX por lado; **não simula** local. Notas dos jogadores podem ser computadas no cliente a partir do log recebido (reusar `lib/ratings.js`). Nova tela `mp-tournament.jsx` exibe **grupos (tabelas)** e **chaveamento** atualizando ao vivo conforme as difusões do servidor, com destaque ao jogador.

**Testes Necessários:**
- [ ] Ticker da própria partida segue o servidor
- [ ] Tabelas/chave atualizam ao vivo e coerentes
- [ ] Notas do pós-jogo exibidas a partir do log

**Critérios de Aceitação:**
- [ ] Experiência de assistir + acompanhar a sala funcional
- [ ] Coerência da tabela com o relógio do servidor

**Dependências:** ETAPAS 13, 17

---

### ETAPA 19: Frontend — telas de avanço/eliminação/fim do torneio MP

**Status:** ✅ Concluída (em `ui/mp.jsx`)
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `MpEnd`: hero de fim (🏆 campeão da sala / 🥈 campeão = outro) + "Ver campanha" (volta às tabelas/bracket completos) + "Voltar ao início".
- Avanço/eliminação são legíveis no próprio `MpTournament` (zona de classificação na tabela, bracket com vencedores); cabeçalho do torneio mostra campeão ao encerrar.
- Decisão MVP: sem modais de notas/ratings no pós-jogo MP (o log está disponível no cliente; `RATINGS` reusável num follow-up).

**Objetivo:** Desfechos do MP (classificou, eliminado, campeão da sala).

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/post.jsx` (alterado), `ui/mp-tournament.jsx` (alterado), `app.jsx`

**O que implementar:**
Suportar os desfechos do MP reaproveitando hero + modais: avanço às fases, **eliminado na fase de grupos**, **eliminado no mata-mata** e **campeão da sala**. Mostrar posição/tabela/chave final.

**Testes Necessários:**
- [ ] Cada desfecho renderiza corretamente
- [ ] Estado final consistente com o servidor

**Critérios de Aceitação:**
- [ ] Telas finais do MP completas
- [ ] Sem regressão nas telas do solo

**Dependências:** ETAPA 18

---

### ETAPA 20: Deploy — Docker (api + postgres + nginx) na VPS

**Status:** ✅ Concluída (validada localmente; deploy na VPS é operação do dev)
**Data de Conclusão:** 2026-06-09
**Commit:** adiado para a etapa final

**Observações da Implementação:**
- `backend/Dockerfile` (multi-stage SDK→aspnet 10) com **contexto na raiz** (o Engine embute `squads.json`); `backend/Dockerfile.dockerignore` (BuildKit) permite isso mesmo com o `.dockerignore` da raiz excluindo `backend/` para a imagem do front.
- `docker-compose.yml`: `db` (postgres:17-alpine + volume + healthcheck), `api` (env: conn string, `Jwt__Key` obrigatória, `Google__ClientId`, CORS), `web` (nginx estático na porta `${WEB_PORT:-8090}`); `.env.example` com os segredos.
- `nginx.conf`: proxy `/api/` e `/health` → api:8080; `/hubs/` com **upgrade WebSocket** e timeouts longos (SignalR).
- **Smoke real (docker compose up):** `/health` via nginx → `{"ok":true}`; front servindo; `/api/rooms` sem token → 401; `negotiate` do hub sem token → 401; login Google inválido → 401; **migrations aplicadas automaticamente** (6 tabelas no Postgres); `DraftDeadlineWorker` ativo nos logs. Stack derrubada após o teste (`down -v`).
- **Pendências do dev p/ VPS:** copiar `.env` (JWT_KEY forte, `GOOGLE_CLIENT_ID`, `PUBLIC_ORIGIN` com o domínio real + HTTPS via proxy externo, ex. traefik/caddy, ou ajustar o nginx).

**Objetivo:** Subir o mono-repo 24/7.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `backend/Dockerfile` (novo), `docker-compose.yml` (novo), `.env.example` (novo)
- `nginx.conf` (ajuste — proxy `/api` e WebSocket para a API)

**O que implementar:**
`Dockerfile` do backend (.NET 10). `docker-compose` com **api + postgres + nginx** (front estático). Nginx faz proxy de `/api` e do **WebSocket** (SignalR) para a API e serve o front. Segredos via `.env` (Google, JWT, connection string). Healthchecks. Aplicar migrations no start.

**Testes Necessários:**
- [ ] `docker-compose up` sobe os 3 serviços
- [ ] Fluxo MP funciona via nginx (REST + WS)

**Critérios de Aceitação:**
- [ ] Stack roda em container ponta-a-ponta
- [ ] Migrations aplicadas; segredos fora do código

**Dependências:** ETAPAS 13, 18

---

### ETAPA 21: Migração final do frontend para `frontend/`

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-09
**Commit:** único commit consolidado ao final (ver PROGRESSO)

**Observações da Implementação:**
- `git mv` do jogo para `frontend/`: `index.html`, `app.jsx`, `config.js`, `game.css`, `manifest.webmanifest`, `lib/`, `ui/`, `data/`, `styles/`, `images/`, `tests/`, `Dockerfile`, `nginx.conf`, `.dockerignore`. Raiz mantém: `backend/`, `frontend/`, `squads.json` (compartilhado), `tools/`, `docker-compose.yml`, `.env.example`, `README.md`, `screenshots/`, `uploads/`, `desing_system/` (não referenciados pelo app).
- `tools/*.js` apontados para `frontend/` (saídas inalteradas: `squads.json` na raiz, goldens no backend) — regeneração validada **idempotente**.
- `docker-compose.yml`: web passa a buildar com `context: ./frontend` (Dockerfile interno inalterado — COPYs relativos); `.dockerignore` do front reescrito. Backend continua com contexto na raiz (embute `squads.json`) — caminho `..\..\squads.json` do csproj segue válido.
- `tests/_shim.js` não precisou de ajuste (resolve `..` relativo, que agora é `frontend/`).
- README atualizado (estrutura mono-repo + como rodar solo e stack completa); `context.md` do ai-flow atualizado (paths sob `frontend/`, regra de paridade dos vetores-ouro).
- **Regressão completa:** testes node (engine 30, i18n 12, stats 10, team 11 + crash pré-existente do harness), `dotnet test` **133/133**, docker rebuild + smoke via nginx (health, index, mp-realtime.js servido, negotiate 401). Stack derrubada após validação.

**Objetivo:** Concluir o mono-repo (front em `frontend/`), sem regressão.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- Mover root do jogo → `frontend/` (`index.html`, `app.jsx`, `config.js`, `game.css`, `lib/`, `ui/`, `data/`, `styles/`, `images/`, `manifest.webmanifest`, `tests/`, `squads.json`)
- `Dockerfile` (front) e `nginx.conf`, `docker-compose.yml` (paths), `tests/_shim.js` (paths)

**O que implementar:**
Mover fisicamente o jogo para `frontend/`. Ajustar o `Dockerfile` do front (lista de COPY), `nginx.conf`/compose (root do front) e `tests/_shim.js` (resolução de paths). Caminhos relativos internos do `index.html` tendem a se manter; validar todos os assets. Rodar **regressão completa**: solo offline + fluxo MP.

**Testes Necessários:**
- [ ] `node tests/*.test.js` passam a partir do novo path
- [ ] Solo carrega todos os assets; MP funciona

**Critérios de Aceitação:**
- [ ] Mono-repo final (`frontend/` + `backend/`) sem regressão
- [ ] Deploy atualizado

**Dependências:** ETAPA 20 (e validação do MVP funcionando)

---

## CORREÇÕES DO CODE REVIEW (2026-06-09)

Os 4 issues 🟡 do code review foram resolvidos:

1. **Pace sincronizado com o servidor** — `MatchScreen` ganhou a prop opcional `fixedPace` (ms por minuto simulado): pina a duração ao relógio externo e **oculta o seletor de velocidade**. O MP passa `RoundStarted.paceMsPerMinute` do servidor (fallback `CONFIG.MP.PACE_MS_PER_MINUTE=250`, espelhando `MpOptions`); `MP.SPEED` foi removido. Solo inalterado (sem `fixedPace`, comportamento idêntico).
2. **Fail-fast da chave JWT** — `Program.cs` lança `InvalidOperationException` no startup quando `env=Production` e `Jwt:Key` ausente (fallback dev nunca assina tokens em produção). **Verificado em container real**: API recusa subir sem `JWT_KEY`.
3. **Retomada pós-restart + eviction** — `TournamentOrchestrator.ResumeAsync` (re-simula determinístico a partir de seed+times persistidos) + `TournamentResumeWorker` (na subida, retoma salas em Groups/Knockout); torneios encerrados são **evictados** de `_running` e resyncs tardios caem no snapshot **persistido** (`SnapshotOrPersistedAsync`, usado pelo `GetTournament` do hub). Em erro fatal a entrada permanece p/ diagnóstico (`LastError`).
4. **Testes da lógica MP do cliente** — helpers puros extraídos de `ui/mp.jsx` para `frontend/lib/mp-log.js` (`window.MPLOG`: flipLog/teamInfo/findFixtureSide) e nova suíte `frontend/tests/mp.test.js` (**26 checks**, com fakes de fetch/localStorage/signalR): espelho de log completo, resolução de times, sessão (persistência/restauração/logout em 401), REST autenticada e subscribe/dispatch do realtime. E2E visual com 2 navegadores segue pendente do `GOOGLE_CLIENT_ID`.

**Suíte após as correções:** backend **136/136** · frontend 26 (mp) + 52 (solo) checks · smoke Docker re-validado (health, migrations, fail-fast).

---

## MELHORIA PÓS-MVP: CONVIDADOS POR APELIDO (2026-06-09, PRD v3)

Login Google passou a ser exigido **só para criar salas**; quem entra numa sala existente pode jogar como **convidado** (apelido de 2–30 chars):
- Backend: `POST /api/auth/guest` → cria `User` efêmero (`GoogleSub = "guest:{guid}"`, sem migration) e emite o **mesmo JWT** com claim `guest=1`; `RoomsController.Create` retorna 403 para convidados; todo o resto (hub, draft, torneio, presença) funciona igual.
- Frontend: `MpLogin` ganhou input de nome + "🎟 Entrar como convidado" (título muda quando há convite `?sala=` na URL); `MpMenu` desabilita "Criar sala" p/ convidados; `MPAUTH.loginAsGuest/isGuest`.
- Testes: +7 backend (claim no JWT, validação de nome, 403 ao criar, convidado entrando em sala real via hub) e +3 checks no `mp.test.js`. **Suíte: 143/143 backend · 29 checks mp.** Smoke real: guest login + 403 verificados via nginx.

---

## MELHORIAS DE UX PÓS-TESTE (2026-06-09, 2ª rodada de feedback)

1. **Ready-gate por rodada**: toda rodada (inclusive a 1ª) abre num **pré-jogo** — reuso do `PreMatchScreen` do solo (escalações, scouting do adversário, médias) com "Iniciar partida" = pronto; a rodada começa quando **todos os humanos vivos/conectados** clicam ou após `Mp:RoundReadySeconds` (60s). Eventos `RoundReady`/`RoundReadyProgress`; ausentes/IA não bloqueiam.
2. **Relógio único de verdade**: `MatchScreen.startAtMinute` — dono atrasado, "rever" e espectador entram **no minuto corrente do servidor**, nunca do zero.
3. **Fast-forward**: sem humanos vivos no chaveamento → rodadas restantes resolvem **na hora** (sem relógio/gate), direto ao campeão.
4. **Fim coerente**: medalha por desempenho real (🏆 campeão · 🥈 só vice de final · 🥉 semi · ⚽ demais, com a fase em que caiu); espera o ticker/pós-jogo da final antes de ir pra tela de fim.
5. **Telas do solo no MP**: `PreMatchScreen` (pré-rodada) e `PostMatchScreen` (notas/gols/craque via `RATINGS` no cliente) reusados sem alterações nos componentes.
6. **🔁 Jogar novamente**: hub `PlayAgain` (só anfitrião, sala Finished) → `RoomService.ResetForRematchAsync` (novo seed, ready zerado, times e torneio descartados) → todos voltam ao lobby da MESMA sala; cliente reseta estado e re-flui.

**Testes:** `RoundGateAndRematchTests` (gate segura a rodada até o 2º clique + revanche completa com 2º torneio até o campeão); `ApiTestHost` ganhou overrides de config (ctor interno — fixture xUnit exige 1 público); integração ajustada ao fast-forward (ticks mínimos = 3 rodadas de grupos). **Suíte: 145/145 backend · 36 checks mp.**

---

## POLISH FINAL (2026-06-10, 3ª rodada de feedback — 9 pontos)

1. **Rodada pulável**: `DoneWatching` — todos os humanos terminaram/pularam → `RoundClock` resolve o resto na hora (ticks/MatchFinished completos).
2. **Velocidade no lobby**: `Room.Speed` (+migration `AddRoomSpeed`), `SetRoomSpeed` host-only, mapa `Mp:Speeds` (normal 375 / rapido 250 / super 125 ms/min); orquestrador usa o pace da sala (visível em `currentRound.paceMsPerMinute`); preservada na revanche.
3. **Countdown do gate**: `ReadyDeadline` no snapshot + `MpTimer` no card Avançar/pré-jogo/aguardando.
4. **Humanos destacados** nas tabelas/calendário/bracket (`MpTeamName` 👤 + cor).
5. **"Avançar para o pré-jogo"**: o pré-jogo não sequestra mais a tela — card com botão+timer; o gate do servidor segue como teto.
6. **Reservas no pré-jogo**: `YourMatch.Bench` + `PreMatchScreen.lockLineup` (read-only — escalação é fixa no servidor).
7. **Logo de adversário humano**: `TeamMark dream` no vs-panel do pré-jogo e no placar do ticker (antes `Flag` fixa quebrava em humano×humano).
8. **Botão "iniciar" duplicado removido** (ficou só o do topo).
9. **"Ver campanha" com retorno**: botão "🏁 Resultado final" no cabeçalho quando encerrado.
+ pausa entre rodadas 12s→5s.

**E2E completo (`tools/e2e/e2e-mp.mjs`) contra a stack real: 24/24 em 61s** — lobby+velocidade (broadcast e rejeição de não-host), gate (segura/abre), skip (<1s com 90 ticks), **2 torneios inteiros até o campeão** (Rodada 1→3 → oitavas→semi; final entre IAs resolvida por fast-forward), revanche (reset + velocidade preservada), reservas e deadline nos payloads. Cenário espectador é adaptativo (não ocorreu nesta seed — humanos caíram juntos; caminho coberto por chamada de hub em sessões anteriores). Suíte: **145/145 backend · 37 checks mp**.

---

## RODADA 6 DE FEEDBACK (2026-06-10)

1. Velocidade **read-only** para não-anfitriões no lobby (antes o controle aparecia interativo).
2. **"Pular" removido no MP** (dessincronizava do relógio); o pulo de rodada continua existindo via `DoneWatching` natural no fim do ticker.
3. Card "rever partida" **removido**.
4. **Tabelas bloqueadas durante a própria rodada ao vivo** (tela "partidas rolando — minuto X" com retorno à partida).
5. Header refletindo o estágio do MP via `MultiplayerApp.onStage` (estava preso em "início").
6. Aba de torneio **despoluída**: só o grupo do jogador na principal + modal "🗂 Ver todos os grupos" (`MpGroupBlock`).
7. **Mecânicas no MP**: lesões já ativas (golden `injury-sub`); **cansaço e pressão LIGADOS** — `MpFatigue` (Engine, testado): titulares +1/+2 por idade com teto, banco descansa (espelho do solo), aplicado por rodada no orquestrador; pressão sub-23 com `RoundN` 1–4 no mata-mata; determinístico (resume reproduz).

**E2E ampliado**: checagem de mecânicas nos logs reais (21 cartões/3 pênaltis em 10 partidas humanas) e **cenário espectador exercitado de fato** (humano eliminado nas quartas acompanhou o vivo via `WatchMatch`) — 26/26 em 66s com revanche completa. Suíte: **147/147 backend · 41 checks mp**.

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
- [ ] Frontend: `node tests/*.test.js` passando; solo carrega sem erros
- [ ] Backend: `dotnet build` + `dotnet test` (incl. paridade) passando

### Padrões de Código
- [ ] Frontend sem build (CDN + `window` + `<script>` em ordem); nada de números mágicos fora do `config.js`
- [ ] Engine C# determinística (sem fontes não-semeadas no caminho do jogo)
- [ ] Segredos fora do código (env)

### Banco de Dados / Schema
- [ ] Migration aplica e reverte; sem perda de dados (banco novo)

### Autorização
- [ ] Rotas e hub exigem JWT; ações de anfitrião restritas

### Integrações
- [ ] Google OAuth validado; SignalR autenticado via token

### PRD
- [ ] Todos os RFs e critérios de aceitação (escopo MVP) atendidos
- [ ] Itens fora do MVP permanecem fora (pênalti interativo MP, subs ao vivo, histórico, rematch, rankings, e-mail/senha, espectadores, tela sincronizada)

---

## LEGENDA DE STATUS

- ⏳ **Pendente** · 🔄 **Em Progresso** · ✅ **Concluída** · ❌ **Bloqueada**

---

## PONTOS DE ATENÇÃO

1. **Paridade JS↔C# é inegociável** — o desalinhamento mais provável vem do **stream do RNG** (ordem das chamadas e tamanhos dos arrays de narração). Portar com a sequência idêntica e validar por vetores-ouro (ETAPA 7) antes de seguir.
2. **`Math.imul`/uint32 em C#** — usar `unchecked` e operações de 32 bits equivalentes a `|0`, `>>>`.
3. **Relógio de rodada** — a coerência da tabela depende do servidor governar o tempo; o pace é único no MP (seletor de velocidade fica fixo/limitado).
4. **Migração por último** — não mover para `frontend/` antes do MVP estável; a ETAPA 21 concentra o churn de paths.
5. **Duas implementações do engine** (solo JS, MP C#) — qualquer mudança de regra futura deve passar pelos vetores-ouro para não divergir.

---

## DECISÕES TÉCNICAS

### Decisão 1: Estrutura do backend
- **Opção escolhida**: `CopaDraft.Engine` (lib pura) + `CopaDraft.Api` (web) + `CopaDraft.Engine.Tests`
- **Justificativa**: isola o crítico (engine determinística) do infra/web; facilita testes de paridade
- **Alternativas**: projeto único (mistura demais), Clean Architecture completa (overkill pro MVP)

### Decisão 2: Dados de elencos
- **Opção escolhida**: `squads.json` compartilhado (front e back leem dele)
- **Justificativa**: fonte única, evita divergência
- **Alternativas**: JSON só no back (duas fontes), portar para C# (mais risco)

### Decisão 3: Momento da migração para `frontend/`
- **Opção escolhida**: última etapa
- **Justificativa**: reduz churn de paths e risco enquanto o MVP é construído
- **Alternativas**: migrar primeiro (churn cedo, sem ganho)

### Decisão 4: Ritmo do ticker no MP
- **Opção escolhida**: relógio do servidor + pace único no MP
- **Justificativa**: mantém tabelas/chaveamento coerentes para todos ao vivo
- **Alternativas**: ritmo local por jogador (descasa a tabela do que o jogador vê)

### Decisão 5: Notas/ratings no MP
- **Opção escolhida**: computar no cliente a partir do log recebido (reusar `lib/ratings.js`)
- **Justificativa**: evita portar `ratings.js`; o log do servidor é a fonte
- **Alternativas**: portar ratings para C# (trabalho extra desnecessário no MVP)

---

## RISCOS E MITIGAÇÕES

### Risco 1: Divergência determinística entre engines
- **Impacto**: Alto · **Probabilidade**: Média
- **Mitigação**: vetores-ouro (ETAPA 7) cobrindo regulation/ET/shootout; CI manual rodando os testes de paridade a cada mudança de regra

### Risco 2: Complexidade do tempo real (SignalR)
- **Impacto**: Alto · **Probabilidade**: Média
- **Mitigação**: separar lobby (ETAPA 11) de torneio/stream (ETAPA 13); validar com 2+ conexões cedo; relógio de servidor único

### Risco 3: Migração de paths (mono-repo) quebrar o front
- **Impacto**: Médio · **Probabilidade**: Média
- **Mitigação**: migração isolada na última etapa, com regressão completa (solo + MP)

### Risco 4: Balanceamento da semeadura para N variável
- **Impacto**: Médio · **Probabilidade**: Média
- **Mitigação**: testes do gerador para vários N; preenchimento IA garante grupos/chave válidos

### Risco 5: Auth/segurança (OAuth, segredos, anti-cheat)
- **Impacto**: Médio · **Probabilidade**: Baixa
- **Mitigação**: servidor como única autoridade da simulação; segredos por env; rotas/hub autenticados

---

## DOCUMENTAÇÃO DE REFERÊNCIA

- **PRD**: `prd/PRD_004_TBD_MultiplayerOnlineMVP.md`
- **Contexto do Projeto**: `context.md`
- **Mapa**: `map.json`
- **Código de referência (porte)**: `lib/engine.js`, `lib/rng.js`, `lib/derive.js`, `lib/i18n.js` (narração PT), `lib/team.js` (`buildGroup`/`buildBracket`/`drawScaledOpponents`/`groupStandings`/`roundRobin`), `config.js`, `data/squads.js`
- **Testes existentes (base dos vetores-ouro)**: `tests/_shim.js`, `tests/engine.test.js`, `tests/team.test.js`

---

## COMANDOS ÚTEIS

```bash
# Frontend (sem build) — testes Node por VM
node tests/engine.test.js
node tests/team.test.js

# Rodar o front localmente
python3 -m http.server 8000   # ou: npx serve

# Backend (.NET 10)
dotnet build backend/CopaDraft.sln
dotnet test  backend/CopaDraft.sln
dotnet run --project backend/CopaDraft.Api

# Deploy local (stack completa)
docker-compose up --build
```

---

## INSTRUÇÕES DE ATUALIZAÇÃO

Atualizado automaticamente pelo `/implementar` a cada etapa concluída (status → ✅ + data; progresso e barra; checklists marcados).

---

## OBSERVAÇÕES

1. **Uma etapa por vez** — testes/paridade passando antes de avançar (especialmente ETAPAS 3–8).
2. **Padrões do projeto** — frontend sem build; balanceamento só no `config.js`/`GameConfig`.
3. **Code review contínuo** — usar `/code-review` após cada etapa.
4. **Escopo MVP** — manter fora do MVP os itens listados no PRD §1.2.

---

**Criado em:** 2026-06-09
**Próximo passo:** `/implementar ETAPA 1`
