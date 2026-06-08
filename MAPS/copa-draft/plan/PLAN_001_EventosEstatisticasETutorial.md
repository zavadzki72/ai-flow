# Plano de Execução: Eventos com Impacto, Estatísticas da Copa e Aba "Como Jogar?"

## Informações
- **PRD Relacionado**: `prd/PRD_001_TBD_EventosEstatisticasETutorial.md`
- **Repositório(s)**: `game` (`C:/Projects/Personal/copa-draft`)
- **Domínio(s)**: engine, match, ratings, ui, store, achievements, draft
- **Branch Base**: `main`
- **Complexidade**: 🔴 Alta
- **Criado em**: 2026-06-05
- **Última atualização**: 2026-06-05

---

## PROGRESSO GERAL

**Status**: ✅ Concluído (working tree — ainda não commitado)
**Progresso**: 10/10 etapas concluídas (100%)

```
[🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢] 100%
```

> Implementado em 2026-06-05/06. Testes (Node, sem deps): **engine 25 · team 9 · stats 10 = 44 checks**, todos verdes.

### Notas de implementação e desvios do plano
- **ETAPA 1** — overlay `HowToPlay` (não fase), acessível da home e do cabeçalho.
- **ETAPA 3** — engine reescrito para timeline causal; determinismo blindado por smoke test. `RATING_RED` adicionado ao `config.js`.
- **ETAPA 4** — engine ganhou capacidade de auto-substituição (banco via `side.bench`/`subsLeft`); fiação real feita na ETAPA 7.
- **ETAPA 5** — `ratings.js` **não precisou mudar** (gol de pênalti reusa `goals`, defesa reusa `saves`); evitado bônus indevido ao cobrador em pênalti perdido.
- **ETAPA 6** — pênalti interativo via `InMatchPenalty` + `finalizeInMatchPenalty` (desfecho semeado + override); pausa/retomada do ticker escondendo o desfecho.
- **ETAPA 7** — `store.js` **não precisou mudar** (serialização genérica + default no `resumeRun`); incluiu a fiação do banco da ETAPA 4.
- **ETAPA 8** — substituição forçada (suspenso/lesionado) é grátis e aceita reserva do mesmo tipo (anti-softlock).
- **ETAPA 9** — `store.js` sem mudança (idem). **Limitação conhecida:** reserva que entra por lesão no meio do jogo não carrega nome/pos no log → fica fora do ranking de campanha.
- **Testes:** rodam com `node tests/*.test.js`. Neste ambiente WSL não há `node` nativo — usado `node.exe` (interop Windows, v24).
- **Pendente de verificação manual no navegador** (UI não testável headless): overlay Como Jogar, ticker com novos eventos, pênalti interativo (cobrar/defender/pular), bloqueio no pré-jogo, tela final de estatísticas.

---

## VISÃO GERAL

Três melhorias no Copa Draft, em ordem de risco crescente:

1. **Aba "Como Jogar?"** (ETAPA 1) — overlay que explica todas as mecânicas configuráveis lendo os números reais do `CONFIG`. Independente e de baixo risco; pode ser entregue primeiro.
2. **Eventos com impacto** (ETAPAS 2–8) — o coração da feature e o maior risco. Hoje os eventos não-gol são uma **segunda passada decorativa** em `lib/engine.js`, totalmente desacoplada do placar. Serão reestruturados para uma **linha do tempo causal** onde cartão vermelho/2º amarelo (um a menos), lesão e pênalti alteram a chance de vitória. As consequências (suspensão/lesão) **atravessam as fases** via estado persistido no run. O determinismo do engine é preservado (RNG semeado); a única exceção é o pênalti interativo (input do jogador), tratado com o padrão de **desfecho semeado + hook de finalização** (espelhando o `finalizeShootout` já existente).
3. **Estatísticas da Copa** (ETAPAS 9–10) — agregador puro (`lib/stats.js`) que acumula as estatísticas **apenas do time do jogador** ao longo da campanha e premia Artilheiro, Melhor Jogador e Melhor Goleiro na tela final.

**Componentes por "camada" (arquitetura SPA sem build do projeto — ordem: balanceamento → lógica pura → UI → wiring → index.html):**
- **Balanceamento:** `config.js`
- **Lógica pura (lib/):** `engine.js`, `ratings.js`, `team.js`, novo `stats.js`
- **UI (ui/):** `match.jsx`, `penalty.jsx`, `post.jsx`, `home.jsx`, `components.jsx`, novo `howto.jsx`
- **Wiring / estado:** `app.jsx`, `store.js`
- **Entrada:** `index.html` (ordem dos `<script>`)
- **Testes:** novo `tests/` (smoke tests em Node, sem dependências)

---

## OBJETIVOS

- [ ] Aba "Como Jogar?" acessível (home + cabeçalho), fiel ao `CONFIG`, sem afetar a campanha.
- [ ] Cartão vermelho e 2º amarelo deixam o time com um a menos e mudam a expectativa de gols.
- [ ] Lesão rara, com substituição automática quando possível.
- [ ] Pênalti reaproveita o mini-game interativo (cobrar/defender) com placar e prorrogação coerentes.
- [ ] Suspensão e lesão persistem e atravessam as fases; pré-jogo bloqueia indisponíveis.
- [ ] Estatísticas da Copa (Artilheiro / Melhor Jogador / Melhor Goleiro + secundários) só do time do jogador.
- [ ] Determinismo preservado em todo caminho não-interativo (smoke test em Node).
- [ ] Saves antigos (`copa_draft_run_v2`) continuam funcionando (defaults aditivos no resume).

---

## MAPA DE COMPONENTES IDENTIFICADOS

### Balanceamento
- `config.js` (alterado) — novas constantes de eventos (probabilidades, penalidade do um-a-menos, duração de suspensão/lesão, limiares das premiações).

### Lógica pura (lib/)
- `lib/engine.js` (alterado) — linha do tempo causal; cartões/expulsão; lesão; pênalti (desfecho semeado + ponto de pausa); log estendido; novo `finalizeInMatchPenalty`.
- `lib/ratings.js` (alterado) — refletir cartões/pênaltis/defesa de pênalti nas notas.
- `lib/team.js` (alterado) — helpers de elegibilidade considerando suspensão/lesão; decremento de status por fase.
- `lib/stats.js` (novo) — `computeCampaignStats` puro: premiações a partir do acumulado.

### UI (ui/)
- `ui/howto.jsx` (novo) — `HowToPlay` (overlay), lê valores do `CONFIG`.
- `ui/match.jsx` (alterado) — `MatchScreen`: novos eventos no ticker + estado "um a menos" + fluxo pausa→pênalti→retomada; `PreMatchScreen`: bloqueio de suspensos/lesionados + avisos.
- `ui/penalty.jsx` (alterado) — modo "cobrança única" reaproveitando o mini-game.
- `ui/post.jsx` (alterado) — `CampaignEndScreen`: seção "Estatísticas da Copa".
- `ui/components.jsx` (alterado) — `GameHeader`: botão de acesso à aba "Como Jogar?".
- `ui/home.jsx` (alterado) — botão/entrada para a aba "Como Jogar?".

### Wiring / Estado
- `app.jsx` (alterado) — estado de overlay do tutorial; status por jogador (suspensão/lesão); acumulação de estatísticas; orquestração pausa→pênalti→finalize; decremento de status ao avançar de fase; repasse à tela final.
- `lib/store.js` (alterado) — snapshot inclui os novos campos; defaults no resume (mantendo a chave `v2`).

### Entrada
- `index.html` (alterado) — incluir `<script>` de `ui/howto.jsx` e `lib/stats.js` na ordem certa.

### Testes
- `tests/_shim.js` (novo) — shim mínimo de `window` para rodar libs em Node.
- `tests/engine.test.js` (novo) — determinismo + impacto do um-a-menos + desfecho semeado de pênalti/lesão.
- `tests/stats.test.js` (novo) — premiações e desempates.

---

## ESTRATÉGIA DE TESTES

**Sem framework e sem build** (decisão do projeto). Abordagem em dois níveis:

- **Lógica pura (engine, ratings, stats):** smoke tests em **Node puro, sem dependências**. Um `tests/_shim.js` define um `window` global e usa `require`/concatenção para carregar `config.js`, `lib/rng.js`, `lib/derive.js`, `lib/engine.js`, `lib/ratings.js`, `lib/stats.js` (que hoje atribuem a `window`). Cada `*.test.js` faz asserts com `assert` nativo e sai com código ≠ 0 em falha. Rodar com `node tests/engine.test.js`.
- **UI (overlay, ticker, pré-jogo, tela final):** verificação manual no navegador (`python3 -m http.server 8000`), com checklist por etapa.

Cenários-chave:
- [ ] Determinismo: mesma seed sem interação ⇒ logs idênticos (deep-equal).
- [ ] Um a menos reduz a expectativa de gols do time expulso e aumenta a do adversário.
- [ ] 2º amarelo vira expulsão.
- [ ] Pênalti semeado é determinístico; gol de pênalti entra no placar e respeita o gatilho de prorrogação.
- [ ] Lesão sem reserva deixa o time desfalcado.
- [ ] Premiações e desempates corretos (artilheiro/melhor jogador/melhor goleiro).
- [ ] Resume de save antigo aplica defaults sem quebrar.

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Aba "Como Jogar?" (overlay) — mecânicas atuais

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Entregar a aba "Como Jogar?" como overlay acessível da home e do cabeçalho, explicando as mecânicas **já existentes** com os números lidos do `CONFIG`. Independente das demais etapas (entrega de valor imediata). As mecânicas novas (eventos) serão acrescentadas nas etapas que as criam.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `ui/howto.jsx` (novo)
- `ui/home.jsx` (alterado)
- `ui/components.jsx` (alterado — `GameHeader`)
- `app.jsx` (alterado — estado booleano de overlay)
- `index.html` (alterado — novo `<script>` antes de `app.jsx`)

**O que implementar:**
- Componente `HowToPlay` (overlay/modal) que recebe um `onClose` e renderiza seções explicando: draft no dado, derivação de atributos (overall + posição + arquétipo, via `DERIVE.ATTR_FULL`), gols esperados (λ base, ataque = média MEI+ATA, defesa = média GOL+ZAG+LAT, expoente, escala), "dia"/zebra (amplitude `ZEBRA_Z`), fadiga (idade `FATIGUE_OLD_AGE`, custos, recuperação, energia `STAMINA_PER_PT`), pressão da garotada (`PRESSURE_U_AGE`, `PRESSURE_PER_ROUND`, líder), substituições (`SUBS_MAX`), prorrogação (`ET_MINUTES`), pênaltis (`PK_ROUNDS`), notas (`RATING_*`), formações e conquistas.
- Todos os números exibidos vêm de `window.CONFIG`/`window.DERIVE` (nada hardcoded).
- Botão de acesso na `HomeScreen` e ícone no `GameHeader`; `app.jsx` controla `showHowTo` (abre por cima de qualquer fase, fecha voltando ao mesmo ponto).
- Expor `HowToPlay` em `window`; incluir o `<script>` em `index.html` na ordem certa.

**Testes Necessários:**
- [ ] Manual: abrir/fechar pela home e pelo cabeçalho em fases diferentes; confirmar retorno ao mesmo ponto.
- [ ] Manual: alterar um valor no `config.js` e ver o número refletido na aba.

**Critérios de Aceitação:**
- [ ] Aba acessível da home e do cabeçalho; fecha sem afetar a campanha.
- [ ] Números lidos do `CONFIG` (Critério 1 / Cenário 8 do PRD).
- [ ] Componente exposto em `window` e `<script>` em ordem.
- [ ] Preview manual sem erros de console.

**Dependências:** Nenhuma

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 2: Config — constantes de balanceamento dos eventos

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Adicionar em `config.js` toda a parametrização dos novos eventos, antes de qualquer lógica. Fundação para as etapas do engine.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `config.js` (alterado)

**O que implementar:**
Novas constantes nomeadas (valores iniciais sugeridos, ajustáveis):
- Cartões: probabilidade de a falta/evento "dura" virar amarelo e de virar vermelho direto; lógica do 2º amarelo = expulsão.
- Pênalti: probabilidade de pênalti por partida/lado.
- Lesão: probabilidade (baixíssima) por minuto/evento.
- Um a menos: magnitude da penalidade aplicada à força (ataque/defesa) do time desfalcado.
- Campanha: duração da suspensão (em partidas, ex.: 1) e faixa de duração da lesão (em fases, ex.: 1–2).
- Premiações: participação mínima para "Melhor Jogador" (ex.: nº mínimo de partidas).

**Testes Necessários:**
- [ ] Manual: app carrega sem erro; `window.CONFIG` expõe as novas chaves.

**Critérios de Aceitação:**
- [ ] Todas as constantes em `config.js` (RN12 — sem números mágicos fora daqui).
- [ ] Nomes coerentes com o padrão existente.

**Dependências:** Nenhuma

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 3: Engine — linha do tempo causal + cartão vermelho / 2º amarelo

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Reestruturar a geração de eventos de uma segunda passada decorativa para uma **linha do tempo causal**, introduzindo cartão vermelho e 2º amarelo (um a menos), com impacto na expectativa de gols subsequente. É a mudança de maior risco — encapsula o invariante de determinismo.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `lib/engine.js` (alterado)
- `lib/ratings.js` (alterado — penalizar nota de expulso)
- `tests/_shim.js` (novo), `tests/engine.test.js` (novo)
- `ui/howto.jsx` (alterado — documentar o novo evento)

**O que implementar:**
- Em `runPeriod`/`simulateMatch`, processar minuto a minuto numa única passagem que intercala gols e eventos com impacto, usando o RNG **semeado** (`window.RNG`), nunca `Math.random()`.
- Cartão vermelho (direto) e acúmulo de amarelo: ao 2º amarelo do mesmo jogador na mesma partida, expulsar. Marcar o jogador como fora e registrar o minuto.
- "Um a menos": a partir do minuto da expulsão, reduzir a força efetiva (ataque/defesa) do lado desfalcado conforme a constante de config, recalculando a expectativa de gols dos minutos restantes (do lado expulso ↓, do adversário ↑).
- Estender o log: lista de cartões por jogador, linha do tempo de "um a menos" por lado, e eventos de tipo `red`/`yellow` com `players`/`minute`.
- `ratings.js`: aplicar penalidade de nota a quem foi expulso.
- Manter os eventos decorativos restantes (falta, defesa, trave, contra-ataque, big chance) como narração.

**Testes Necessários (Node):**
- [ ] Determinismo: `simulateMatch` 2× com a mesma seed ⇒ logs deep-equal.
- [ ] Um a menos: com expulsão forçada (config/seed), expectativa de gols do lado expulso cai e do adversário sobe.
- [ ] 2º amarelo do mesmo jogador ⇒ expulsão registrada.

**Critérios de Aceitação:**
- [ ] Eventos com impacto integrados à linha do tempo (RN01/RN02/RN03).
- [ ] Determinismo preservado (RNF01 / Critério 7).
- [ ] Log estendido consumível pela UI e por ratings.
- [ ] `node tests/engine.test.js` passa.

**Dependências:** ETAPA 2

**Comandos Úteis:** `node tests/engine.test.js`

---

### ETAPA 4: Engine — lesão rara + substituição automática

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Adicionar lesão como evento raro: o jogador sai e, havendo reserva da posição e substituição disponível, entra automaticamente; senão o time joga desfalcado.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/engine.js` (alterado)
- `tests/engine.test.js` (alterado)
- `ui/howto.jsx` (alterado — documentar lesão)

**O que implementar:**
- Probabilidade baixíssima (config) de lesão por minuto, via RNG semeado.
- O engine precisa conhecer o banco para auto-substituir: passar reservas elegíveis via `opts` (ou estender o `side`). Respeitar limite de substituições e correspondência de posição (reaproveitando a regra do pré-jogo).
- Sem reserva/sub disponível ⇒ aplica o mesmo efeito de "um a menos" da ETAPA 3.
- Registrar no log: jogador lesionado, minuto, e se houve substituição.

**Testes Necessários (Node):**
- [ ] Lesão forçada com reserva ⇒ substituição registrada; sem reserva ⇒ um a menos.
- [ ] Determinismo mantido.

**Critérios de Aceitação:**
- [ ] Lesão rara e determinística (RN05).
- [ ] Substituição automática respeita posição e limite.
- [ ] `node tests/engine.test.js` passa.

**Dependências:** ETAPA 3

**Comandos Úteis:** `node tests/engine.test.js`

---

### ETAPA 5: Engine — pênalti com desfecho semeado (determinístico) + narração

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Gerar pênaltis na linha do tempo com **desfecho semeado** (gol/defesa/fora), entrando no placar de forma determinística e respeitando o gatilho de prorrogação. Esta etapa NÃO inclui interatividade — entrega o caminho auto 100% determinístico, sobre o qual a ETAPA 6 adiciona o input.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/engine.js` (alterado)
- `lib/ratings.js` (alterado — gol de pênalti = gol; defesa de pênalti valoriza o goleiro)
- `tests/engine.test.js` (alterado)
- `ui/howto.jsx` (alterado — documentar pênalti)

**O que implementar:**
- Probabilidade de pênalti (config) por lado/partida; ao ocorrer, sortear cobrador (ponderado por finalização) e resolver gol/defesa/fora via RNG semeado, usando os mesmos parâmetros de balanceamento dos pênaltis (`PK_*`/finalização vs overall do goleiro).
- Aplicar o gol ao `score` **antes** da decisão de prorrogação (que depende de `score.home === score.away` no fim do tempo normal).
- Marcar no evento de pênalti: `side`, cobrador, goleiro, desfecho, minuto — e um campo que permita à UI identificar a cobrança como "ponto interativo em potencial" (consumido na ETAPA 6).
- Narração do pênalti no log.

**Testes Necessários (Node):**
- [ ] Pênalti semeado é determinístico.
- [ ] Gol de pênalti soma ao placar e altera corretamente o gatilho de prorrogação.

**Critérios de Aceitação:**
- [ ] Pênalti determinístico no caminho auto (RNF01).
- [ ] Placar/prorrogação coerentes (RN04).
- [ ] `node tests/engine.test.js` passa.

**Dependências:** ETAPA 3 (linha do tempo) · ETAPA 2 (config)

**Comandos Úteis:** `node tests/engine.test.js`

---

### ETAPA 6: UI — pênalti interativo (mini-game + pausa/retomada + finalize)

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Tornar o pênalti interativo reaproveitando o `PenaltyShootout`, com pausa do ticker, input do jogador (cobrar/defender) e **hook de finalização** que sobrescreve o desfecho semeado e recalcula placar/prorrogação/resultado — espelhando o padrão `needsShootout`/`finalizeShootout` já existente.

**Complexidade:** 🔴 Alta

**Arquivo(s) Afetado(s):**
- `ui/penalty.jsx` (alterado — modo "cobrança única")
- `ui/match.jsx` (alterado — `MatchScreen` pausa no minuto do pênalti e retoma)
- `lib/engine.js` (alterado — novo `finalizeInMatchPenalty`)
- `app.jsx` (alterado — orquestração do fluxo)

**O que implementar:**
- `PenaltyShootout`: parâmetro de modo que limita a **uma cobrança** (cobrar se o pênalti é do `home`; defender se é do `away`), reutilizando a mecânica/animação atuais e retornando o desfecho.
- `MatchScreen`: ao revelar um evento de pênalti marcado como interativo (partida do jogador, não em "Pular ⏭"/reduced-motion), pausar o ticker e sinalizar ao `app.jsx`; ao receber o desfecho, aplicar via `finalizeInMatchPenalty` e **retomar** do mesmo minuto preservando placar e eventos já revelados.
- `finalizeInMatchPenalty(log, penaltyId, outcome)`: substitui o desfecho daquele pênalti, ajusta `score`, recalcula prorrogação/`result` se necessário, e devolve o log atualizado.
- Em "Pular ⏭"/reduced-motion/pênalti do lado `away` (se assim configurado), usar o desfecho semeado (determinístico) — sem abrir o mini-game.

**Testes Necessários:**
- [ ] Manual: pênalti a favor → mini-game → cobrar → placar atualiza → ticker retoma.
- [ ] Manual: pênalti contra → defender; "Pular ⏭" resolve sem abrir o mini-game.
- [ ] Node: `finalizeInMatchPenalty` recalcula placar/prorrogação corretamente.

**Critérios de Aceitação:**
- [ ] Mini-game reaproveitado em cobrança única (Critério 3 / RN04).
- [ ] Pausa e retomada preservam o estado parcial.
- [ ] Caminho auto permanece determinístico (RN11).

**Dependências:** ETAPA 5

**Comandos Úteis:** `python3 -m http.server 8000` · `node tests/engine.test.js`

---

### ETAPA 7: Campanha — status por jogador (suspensão/lesão) + persistência

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Persistir e atravessar fases o status de suspensão (expulsão ⇒ próxima partida) e lesão (X fases), derivado do log da partida, com defaults seguros para saves antigos.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `app.jsx` (alterado — novo estado `playerStatus`; derivar do log no pós-jogo; decrementar/limpar ao avançar de fase)
- `lib/team.js` (alterado — helpers de status: marcar suspensão/lesão, decrementar por fase, consultar disponibilidade)
- `lib/store.js` (alterado — snapshot inclui `playerStatus`; resume aplica defaults, mantendo a chave `copa_draft_run_v2`)

**O que implementar:**
- Estrutura `playerStatus[playerId] = { suspended: nPartidas, injured: nFases }`.
- Após a partida (`recordAndPost`), ler do log quem foi expulso/lesionado e aplicar as durações de config.
- Ao avançar de fase (`nextAfterPost`/`gotoPrematch`): decrementar suspensão (zera ao cumprir) e lesão.
- `snapshot()`/`resumeRun()` incluem `playerStatus`; `loadRun` aplica `{}` como default (saves antigos).

**Testes Necessários:**
- [ ] Manual: forçar expulsão → titular suspenso na fase seguinte → disponível depois.
- [ ] Manual: resume de save antigo (sem o campo) carrega com status vazio.

**Critérios de Aceitação:**
- [ ] Suspensão/lesão atravessam a campanha (RN06/RN07).
- [ ] Saves antigos sobrevivem (RNF05 / Cenário 9).

**Dependências:** ETAPA 3 e ETAPA 4 (log com cartões/lesões)

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 8: UI — pré-jogo bloqueia suspensos/lesionados

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Refletir o status na escalação: jogadores indisponíveis não podem ser escalados nem entrar como substituição, com aviso claro do motivo e duração.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `ui/match.jsx` (alterado — `PreMatchScreen`)
- `app.jsx` (alterado — repassar `playerStatus` ao pré-jogo)

**O que implementar:**
- Receber `playerStatus` no `PreMatchScreen`; marcar visualmente suspensos/lesionados; impedir selecioná-los como titular/substituto (estender a regra de `swapInto`).
- Aviso (estilo dos blocos `.warn` existentes) listando indisponíveis e por quantas fases.

**Testes Necessários:**
- [ ] Manual: jogador suspenso aparece bloqueado e não entra na escalação (Cenário 5 / CE03).

**Critérios de Aceitação:**
- [ ] Bloqueio efetivo + mensagem (RF07).

**Dependências:** ETAPA 7

**Comandos Úteis:** `python3 -m http.server 8000`

---

### ETAPA 9: Stats — agregador puro `lib/stats.js` + acumulação na campanha

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Acumular as estatísticas **do time do jogador** ao longo de todas as fases e calcular as premiações, de forma pura e testável.

**Complexidade:** 🟡 Média

**Arquivo(s) Afetado(s):**
- `lib/stats.js` (novo)
- `app.jsx` (alterado — acumular por partida e repassar à tela final; incluir no snapshot)
- `lib/store.js` (alterado — snapshot inclui o acumulado; default no resume)
- `index.html` (alterado — `<script>` de `lib/stats.js`)
- `tests/stats.test.js` (novo)

**O que implementar:**
- `computeCampaignStats(accum, config)` → `{ artilheiro, melhorJogador, melhorGoleiro, secundarios }`, aplicando as regras/desempates do PRD (RN09): Artilheiro (gols → assist. → menos jogos); Melhor Jogador (média de nota com participação mínima → gols+assist.); Melhor Goleiro (jogos sem sofrer gol + defesas → média). Secundários (Maestro/Revelação) opcionais.
- Acumular por partida no `app.jsx` (a partir de `log.stats`/`ratings.players` do lado `home`), guardando por `playerId`: gols, assist., defesas, big chances, cartões, soma/contagem de notas, jogos. Incluir no `snapshot()`.
- Expor `STATS` em `window`; `<script>` em `index.html` (após `ratings.js`).

**Testes Necessários (Node):**
- [ ] Artilheiro/Melhor Jogador/Melhor Goleiro corretos com desempates (Cenário 7).
- [ ] Participação mínima respeitada.

**Critérios de Aceitação:**
- [ ] Agregação só do time do jogador (RN08).
- [ ] `node tests/stats.test.js` passa.

**Dependências:** Nenhuma rígida (usa `log.stats`/`ratings` existentes); enriquecida por ETAPAS 3–5 (gols de pênalti, cartões).

**Comandos Úteis:** `node tests/stats.test.js`

---

### ETAPA 10: UI — seção "Estatísticas da Copa" na tela final

**Status:** ✅ Concluída
**Data de Conclusão:** 2026-06-06

**Objetivo:**
Exibir as premiações na `CampaignEndScreen`, tanto na conquista do título quanto na eliminação.

**Complexidade:** 🟢 Baixa

**Arquivo(s) Afetado(s):**
- `ui/post.jsx` (alterado — `CampaignEndScreen`)
- `app.jsx` (alterado — passar o resultado de `computeCampaignStats` à tela final)

**O que implementar:**
- Nova seção com cards de premiação (reaproveitando o estilo `.motm`/`.ach-card`): cada prêmio mostra nome, posição/`PosPill`, e os números que o justificam.
- Renderizar independente de vitória/eliminação (RN10).

**Testes Necessários:**
- [ ] Manual: terminar campanha (campeão e eliminado) e conferir as premiações e seus números (Critério 6).

**Critérios de Aceitação:**
- [ ] Seção exibida nos dois desfechos com dados corretos (RF10).

**Dependências:** ETAPA 9

**Comandos Úteis:** `python3 -m http.server 8000`

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
- [ ] App carrega no preview sem erros de console (`python3 -m http.server 8000`).
- [ ] `node tests/engine.test.js` e `node tests/stats.test.js` passam.

### Padrões de Código (context.md)
- [ ] Nenhum número mágico fora de `config.js`.
- [ ] Atributos só via `lib/derive.js`.
- [ ] Componentes novos expostos em `window` e `<script>` em ordem no `index.html`.
- [ ] Sem `Math.random()` no caminho determinístico do engine (só no pênalti interativo).

### Banco de Dados / Schema (localStorage)
- [ ] Snapshot do run inclui `playerStatus` e estatísticas acumuladas.
- [ ] Resume de save antigo aplica defaults (sem perda/crash).
- [ ] Chave `copa_draft_run_v2` mantida (sem bump).

### Autorização
- [ ] N/A (jogo single-player, sem roles).

### Integrações
- [ ] N/A (100% client-side).

### PRD
- [ ] RF01–RF11 atendidos.
- [ ] Critérios de Aceitação 1–7 atendidos.

---

## LEGENDA DE STATUS

- ⏳ **Pendente**: Não iniciada
- 🔄 **Em Progresso**: Sendo implementada
- ✅ **Concluída**: Finalizada e testada
- ❌ **Bloqueada**: Com impedimento

---

## PONTOS DE ATENÇÃO

1. **Reestruturação do engine (ETAPA 3) é o maior risco.** Os eventos passam de 2ª passada decorativa para linha do tempo causal. Blindar com o smoke test de determinismo ANTES de seguir.
2. **Pênalti interativo (ETAPA 6) e o gatilho de prorrogação.** O desfecho do pênalti pode mudar se o jogo vai à prorrogação — por isso o gol entra no placar antes da decisão de ET (ETAPA 5) e o `finalizeInMatchPenalty` recalcula o resultado após o input.
3. **Pausa/retomada do ticker** precisa preservar o estado parcial (placar e eventos já revelados) ao reabrir após o mini-game.
4. **Aba "Como Jogar?" é transversal:** as ETAPAS 3–5 devem acrescentar a explicação do evento que criam, para o tutorial nunca desatualizar.
5. **Auto-substituição por lesão (ETAPA 4)** exige que o engine conheça o banco — passar reservas elegíveis por `opts`, sem quebrar a pureza.

---

## DECISÕES TÉCNICAS

### Decisão 1: Tutorial como overlay/modal
- **Opção escolhida**: Overlay aberto por cima de qualquer fase, com `onClose` que volta ao ponto anterior.
- **Justificativa**: Não adiciona `phase` à state-machine nem exige guardar a origem; preserva a campanha.
- **Alternativas consideradas**: Fase dedicada `howto` (mais acoplamento no `app.jsx`).

### Decisão 2: Pênalti interativo via desfecho semeado + hook de finalização
- **Opção escolhida**: Engine gera desfecho determinístico; UI sobrescreve a cobrança do jogador via `finalizeInMatchPenalty`, recalculando placar/prorrogação.
- **Justificativa**: Mantém o modo auto/Pular/reduced 100% determinístico e reaproveita o padrão `finalizeShootout` já validado; evita tornar o mulberry32 serializável.
- **Alternativas consideradas**: Engine resumível (pausa/retoma real do RNG) — mais fiel, porém mais complexo e arriscado.

### Decisão 3: Persistência com defaults aditivos (sem bump de versão)
- **Opção escolhida**: Manter `copa_draft_run_v2` e aplicar defaults para os campos novos no resume.
- **Justificativa**: Campanhas em andamento sobrevivem à atualização.
- **Alternativas consideradas**: Bump para `v3` (descartaria runs salvos).

### Decisão 4: Testes como smoke tests em Node, sem dependências
- **Opção escolhida**: `tests/` com shim de `window` e `assert` nativo para a lógica pura; UI por checklist manual.
- **Justificativa**: Blinda o invariante de determinismo sem violar o "sem build/sem deps".
- **Alternativas consideradas**: Só verificação manual (não protege o determinismo automaticamente).

---

## RISCOS E MITIGAÇÕES

### Risco 1: Quebra do determinismo na reestruturação do engine
- **Impacto**: Alto
- **Probabilidade**: Média
- **Mitigação**: Smoke test de determinismo (deep-equal de logs) criado na ETAPA 3 e rodado a cada etapa do engine; uso exclusivo do RNG semeado.

### Risco 2: Complexidade do pênalti interativo (placar/prorrogação/retomada)
- **Impacto**: Alto
- **Probabilidade**: Média
- **Mitigação**: Separar em ETAPA 5 (determinístico, testável) e ETAPA 6 (interatividade por cima); aplicar gol antes da decisão de ET; `finalizeInMatchPenalty` espelhando `finalizeShootout`.

### Risco 3: Regressão em saves de campanhas em andamento
- **Impacto**: Médio
- **Probabilidade**: Baixa
- **Mitigação**: Campos aditivos + defaults no `loadRun`; teste manual de resume de save antigo.

### Risco 4: Balanceamento dos eventos (frequência/impacto) fora do ponto
- **Impacto**: Médio
- **Probabilidade**: Média
- **Mitigação**: Tudo em `config.js`; valores iniciais conservadores (lesão rara); ajuste via playtest sem tocar lógica.

---

## DOCUMENTAÇÃO DE REFERÊNCIA

- **PRD**: `prd/PRD_001_TBD_EventosEstatisticasETutorial.md`
- **Contexto do Projeto**: `MAPS/copa-draft/context.md`
- **Arquitetura**: `context.md` (não há `docs/architecture/` físico)
- **Código relacionado**: `config.js`, `lib/engine.js`, `lib/ratings.js`, `lib/team.js`, `lib/rng.js`, `lib/store.js`, `lib/achievements.js`, `ui/match.jsx`, `ui/penalty.jsx`, `ui/post.jsx`, `ui/home.jsx`, `ui/components.jsx`, `app.jsx`, `index.html`

---

## COMANDOS ÚTEIS

```bash
# Rodar o app localmente
python3 -m http.server 8000     # depois abrir http://localhost:8000

# Smoke tests da lógica pura (sem dependências)
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
2. **Seguir os padrões do projeto** — ver `context.md` (config central, engine puro, exposição em `window`, ordem dos scripts).
3. **Code review contínuo** — usar `/code-review` após cada etapa, em especial nas etapas do engine (3–6).

---

**Criado em:** 2026-06-05
**Próximo passo:** `/implementar ETAPA 1`
