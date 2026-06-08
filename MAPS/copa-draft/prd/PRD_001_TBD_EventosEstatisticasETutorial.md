# PRD: Eventos com Impacto, Estatísticas da Copa e Aba "Como Jogar?"

**Sequência**: 001
**Ticket**: TBD
**Versão**: 1
**Data**: 2026-06-04
**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO

**Metadados:**
- **Prioridade**: Alta
- **Complexidade**: 🔴 Alta
- **Repositório(s)**: `game` (`C:/Projects/Personal/copa-draft`)
- **Domínio(s)**: engine, match, ratings, ui, store, achievements, draft

---

## 1. VISÃO GERAL

### 1.1. Contexto

O **Copa Draft** já entrega o loop completo (draft no dado → mata-mata → simulação minuto a minuto → conquistas), mas tem três lacunas de profundidade e clareza:

1. **Opacidade das regras.** Todo o balanceamento vive em `config.js` (gols esperados, "dia"/zebra, fadiga, pressão da garotada, pênaltis, notas), mas o jogador não tem como entender por que ganhou ou perdeu. A home só mostra 3 passos genéricos ("Role / Escolha / Conquiste").
2. **Eventos sem consequência.** Hoje o motor gera os gols numa primeira passada (`runPeriod`) e, numa **segunda passada totalmente desacoplada**, sorteia 6–10 eventos de narração (falta, amarelo, defesa, trave, contra-ataque). Esses eventos são **puramente decorativos** — não alteram o placar nem a probabilidade de vitória.
3. **Sem memória da campanha.** As notas (`ratings.js`) e estatísticas (`log.stats`) existem só por partida. Nada é acumulado ao longo do mata-mata, então não há premiação ao final (artilheiro, melhor jogador, etc.).

### 1.2. Objetivo

Adicionar três melhorias que tornam o jogo mais transparente, mais estratégico e mais recompensador:

1. **Aba "Como Jogar?"** — um tutorial que explica todas as mecânicas configuráveis e **como os cálculos são feitos**, lendo os números reais do `CONFIG` dinamicamente (o jogador "decifra" o balanceamento; o texto nunca desatualiza).
2. **Eventos com impacto real no resultado** — cartão vermelho, pênalti, lesão e amarelo acumulado passam a **influenciar a chance de vitória**, integrados causalmente à simulação. Consequências (suspensão/lesão) **atravessam as fases da campanha**.
3. **Estatísticas gerais ao final da Copa** — premiações acumuladas ao longo da campanha, considerando apenas o time do jogador: Artilheiro, Melhor Jogador, Melhor Goleiro e afins.

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Aba "Como Jogar?" acessível e fiel ao CONFIG
**Dado** que estou na tela inicial (ou no cabeçalho do jogo)
**Quando** abro a aba "Como Jogar?"
**Então** vejo a explicação de cada mecânica configurável (draft no dado, derivação de atributos, gols esperados, dia/zebra, fadiga, pressão da garotada, substituições, prorrogação, pênaltis, notas, eventos e conquistas)
**E** os números exibidos (ex.: amplitude da zebra, pressão por fase, energia perdida por ponto de cansaço) são **lidos do `CONFIG`** — se o balanceamento mudar, o texto reflete automaticamente
**E** consigo fechar a aba e voltar exatamente para onde estava, sem afetar a campanha em andamento.

### Critério 2 — Cartão vermelho deixa o time com um a menos e muda a chance de vitória
**Dado** uma partida em andamento
**Quando** um jogador recebe cartão vermelho direto (ou o 2º amarelo na mesma partida)
**Então** o time joga com um a menos pelo **resto da partida**
**E** a expectativa de gols do time expulso cai e a do adversário sobe nos minutos seguintes (impacto mensurável no resultado)
**E** o evento aparece na narração identificando o jogador e o motivo.

### Critério 3 — Pênalti usa o mini-game interativo já existente
**Dado** uma partida em andamento
**Quando** é marcado um pênalti
**Então** a simulação **pausa** e abre o mini-game de cobrança (reaproveitando `PenaltyShootout`) para **uma única cobrança**
**E** se o pênalti for a favor do meu time eu **cobro** (escolho o canto); se for contra, eu **defendo** (escolho o lado)
**E** o resultado (gol, defesa ou para fora) entra no placar e a simulação **retoma** de onde parou.

### Critério 4 — Lesão é rara e respeita as substituições
**Dado** uma partida em andamento
**Quando** ocorre uma lesão (evento de baixíssima probabilidade)
**Então** o jogador lesionado sai de campo
**E** se houver reserva da posição **e** substituição disponível, um reserva entra automaticamente; caso contrário o time segue desfalcado (um a menos)
**E** o jogador lesionado fica **indisponível pelas próximas fases** definidas.

### Critério 5 — Suspensões e lesões atravessam a campanha
**Dado** que um jogador foi expulso ou lesionado em uma fase
**Quando** chega a tela de pré-jogo da fase seguinte
**Então** esse jogador aparece como **suspenso/lesionado** e **não pode ser escalado**
**E** o jogo me avisa claramente o motivo e por quantas fases
**E** ao avançar de fase, suspensões cumpridas são zeradas e o contador de lesão é decrementado.

### Critério 6 — Estatísticas da Copa ao final
**Dado** que minha campanha terminou (campeão **ou** eliminado)
**Quando** chego à tela de encerramento
**Então** vejo uma seção "Estatísticas da Copa" com as premiações: **Artilheiro**, **Melhor Jogador** e **Melhor Goleiro** (mais os prêmios secundários definidos)
**E** cada prêmio mostra o jogador e os números que o justificam
**E** os dados são acumulados de **todas as partidas da campanha**, considerando **apenas os jogadores do meu time**.

### Critério 7 — Determinismo preservado
**Dado** o mesmo elenco, formação e seed
**Quando** a partida é simulada **sem** intervenção interativa (sem pênalti interativo)
**Então** o log resultante é idêntico em toda execução (mesma entrada ⇒ mesmo resultado)
**E** a única fonte de não-determinismo permitida é o **pênalti interativo em tempo real**, que depende do input do jogador (mesma exceção já aplicada à disputa de pênaltis atual).

---

## 3. ESCOPO TÉCNICO

### 3.1. Componentes a Alterar

**Repositório `game`:**

- **`config.js`** — adicionar a seção de balanceamento dos novos eventos e regras (probabilidades de vermelho/2º amarelo/pênalti/lesão, penalidade de força do "um a menos", duração de suspensão e de lesão, parâmetros das premiações). Nada de números mágicos fora daqui.
- **`lib/engine.js`** — reestruturar a geração de eventos: os eventos com impacto (vermelho, amarelo, pênalti, lesão) deixam de ser uma segunda passada decorativa e passam a integrar a **linha do tempo causal** da partida, afetando os gols esperados subsequentes; expor no log os novos dados (cartões, pênaltis, lesões, momentos de "um a menos"); adicionar um **ponto de pausa** para o pênalti interativo (espelhando o mecanismo `needsShootout`/`finalizeShootout` já existente).
- **`lib/ratings.js`** — refletir os novos eventos nas notas (ex.: expulsão penaliza a nota; gol de pênalti conta como gol; defesa de pênalti valoriza o goleiro), mantendo a pureza/determinismo.
- **`ui/match.jsx`** — `MatchScreen`: renderizar os novos tipos de evento no ticker (vermelho, pênalti, lesão), indicar o estado de "um a menos", e tratar o **fluxo de pausa → pênalti interativo → retomada**. `PreMatchScreen`: bloquear jogadores suspensos/lesionados na escalação e exibir os avisos correspondentes.
- **`ui/penalty.jsx`** — habilitar um **modo de cobrança única** (pênalti no meio da partida), reaproveitando a mecânica do mini-game.
- **`app.jsx`** — nova máquina de estado/estados para: status por jogador (suspensão/lesão) na campanha; estatísticas acumuladas da campanha; orquestração do pause→pênalti→retomada; decremento/limpeza de status ao avançar de fase; repasse das estatísticas para a tela final.
- **`ui/post.jsx`** — `CampaignEndScreen`: nova seção "Estatísticas da Copa" com os cards de premiação.
- **`ui/home.jsx`** — ponto de entrada para a aba "Como Jogar?".
- **`ui/components.jsx`** — `GameHeader`: acesso à aba "Como Jogar?" a partir do cabeçalho.
- **`lib/store.js`** — garantir que o snapshot do run (que já serializa o estado inteiro) inclua os novos campos (status por jogador + estatísticas) e que o resume aplique defaults seguros para runs antigos.
- **`lib/achievements.js`** — (opcional/nice-to-have) novas conquistas relacionadas aos eventos (ex.: vencer com um a menos).
- **`index.html`** — incluir o(s) novo(s) `<script>` na ordem correta (libs → dados → ui → `app.jsx` por último).

### 3.2. Componentes Novos

- **`ui/howto.jsx`** — componente/tela "Como Jogar?" (`HowToPlay`), exposto em `window` no fim do arquivo e referenciado no `index.html` na ordem certa.
- **`lib/stats.js`** — agregador **puro** de estatísticas de campanha: recebe os resultados por partida (stats + ratings) **do time do jogador** e devolve as premiações. Mantém o padrão de lógica pura/testável do projeto (como `engine`/`ratings`).

### 3.3. Componentes Reutilizados

- **`lib/rng.js`** — RNG semeado (mulberry32) para todo o conteúdo determinístico.
- **`lib/derive.js`** — derivação de atributos para o tutorial e para o cálculo de eventos.
- **`lib/team.js`** — helpers de elegibilidade/escalação (estendidos para considerar suspensão/lesão).
- **`PenaltyShootout`** (`ui/penalty.jsx`) — mini-game reaproveitado para a cobrança única.
- **`PosPill`, `Flag`, `Crest`, `TeamMark`** (`ui/components.jsx`) — apresentação.

### 3.4. Fluxo de Dados

```
1. Pré-jogo: a escalação filtra jogadores suspensos/lesionados (status vindo do run).
2. Simulação (engine, semeada):
   2.1. Linha do tempo única processa minuto a minuto gols + eventos com impacto.
   2.2. Vermelho/2º amarelo → time fica com um a menos → ajusta gols esperados dali em diante.
   2.3. Lesão (rara) → jogador sai; entra reserva (se houver sub) ou time desfalca.
   2.4. Pênalti → marca PAUSA no log (se for partida interativa do jogador).
3. UI da partida: ao encontrar a pausa do pênalti, abre o mini-game (cobrar/defender);
   o resultado é aplicado ao placar e a simulação retoma.
4. Pós-jogo: estatísticas da partida do meu time (gols, assist., defesas, notas,
   cartões) são acumuladas no agregador da campanha; status de suspensão/lesão é registrado.
5. Avanço de fase: suspensões cumpridas zeram; contador de lesão decrementa.
6. Fim da campanha: stats.js calcula as premiações e a tela final as exibe.
```

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos

- **Status do jogador na campanha** (novo, por `playerId`): indicação de **suspenso** (nº de partidas a cumprir) e/ou **lesionado** (nº de fases restantes). Persistido no snapshot do run.
- **Estatística acumulada do jogador** (novo, por `playerId`): identificação (nome, posição, lado/time, fase em que jogou), e somatórios de gols, assistências, defesas, "big chances", partidas jogadas, cartões e soma/contagem de notas para média.
- **Evento de partida** (estendido em `log.events`): além dos tipos atuais (`goal`, `bigchance`, `save`, `woodwork`, `yellow`, `foul`, `counter`), passam a existir tipos com impacto: **cartão vermelho**, **pênalti** (com seu desfecho), **lesão** — cada um referenciando o(s) jogador(es) envolvido(s) e o minuto.
- **Resultado da partida** (estendido em `log`): além de `score`, `stats`, `penalties`, passa a reportar cartões, pênaltis (e desfecho), lesões e a linha do tempo de "um a menos" por lado.

### 4.2. Comandos / Queries / DTOs

- **`CONFIG` (novas chaves de balanceamento)**: probabilidades por minuto/evento de vermelho, 2º amarelo, pênalti e lesão; magnitude da penalidade de força quando o time joga com um a menos; duração da suspensão (em partidas) e faixa de duração da lesão (em fases); parâmetros/limiares das premiações (ex.: participação mínima para "Melhor Jogador"). Especificados como constantes nomeadas, **sem valores hardcoded fora do `config.js`**.
- **Agregador de campanha (`lib/stats.js`)**: recebe a lista de partidas jogadas (stats + ratings + cartões) e devolve as premiações com o(s) vencedor(es) e os números que os justificam.

### 4.3. Handlers / Services

- **`engine.simulateMatch`**: responsabilidade ampliada para processar eventos com impacto na mesma linha do tempo dos gols, ajustar a expectativa de gols após expulsão/lesão, e marcar a pausa do pênalti interativo. Deve continuar **puro e determinístico** para tudo que não for o pênalti interativo.
- **`engine.finalizeInMatchPenalty`** (novo, análogo a `finalizeShootout`): aplica ao log o desfecho de uma cobrança interativa e retoma a simulação a partir do ponto de pausa.
- **`ratings.computeRatings`**: passa a considerar os novos eventos no cálculo das notas.
- **`stats.computeCampaignStats`** (novo): calcula Artilheiro, Melhor Jogador, Melhor Goleiro e prêmios secundários a partir do acumulado.

### 4.4. Persistência

- O snapshot do run (`store.saveRun`/`loadRun`) já serializa o estado inteiro do `App`; deve passar a carregar também o status por jogador e o acumulado de estatísticas. O `loadRun`/resume deve aplicar **defaults seguros** para snapshots antigos (sem esses campos), sem quebrar.
- O **perfil** (`copa_draft_profile_v1`) permanece como está (conquistas/contadores vitalícios); estatísticas de campanha são do **run**, não do perfil.

### 4.5. Validações

- Jogador **suspenso ou lesionado** não pode ser escalado nem entrar como substituição na fase em que está indisponível.
- Pênalti interativo só interrompe a simulação em partidas do jogador; em qualquer auto-simulação (ex.: "Pular ⏭", `prefers-reduced-motion`), o desfecho do pênalti é resolvido automaticamente, **mantendo o determinismo** quando não houver input.
- Substituição por lesão respeita o limite de substituições e a correspondência de posição já existentes.
- "Como Jogar?" é somente leitura: não altera estado de jogo algum.

### 4.6. Autorização

- Jogo single-player, 100% no navegador, sem autenticação. Não há perfis/roles. Todas as ações são do próprio jogador local.

---

## 5. REGRAS DE NEGÓCIO

- **RN01** — Eventos com impacto (vermelho, 2º amarelo, pênalti, lesão) **alteram a probabilidade do resultado**; demais eventos (falta, defesa, trave, contra-ataque, "big chance") permanecem decorativos.
- **RN02** — Cartão vermelho (direto ou por 2º amarelo) deixa o time com **um a menos pelo resto da partida**, reduzindo sua expectativa de gols e aumentando a do adversário nos minutos seguintes.
- **RN03** — O **2º cartão amarelo** ao mesmo jogador na mesma partida resulta em **expulsão** (equivalente a vermelho).
- **RN04** — Pênalti gera **uma cobrança**. Para o time do jogador (lado `home`) é interativo (jogador cobra/defende), reaproveitando o mini-game; o desfecho (gol/defesa/fora) entra no placar.
- **RN05** — Lesão é um evento **raro**. O jogador lesionado sai; entra reserva se houver substituição disponível e da posição; senão o time segue desfalcado.
- **RN06** — Expulsão gera **suspensão na próxima partida**; lesão afasta o jogador por **X fases** (configurável). Ambas **atravessam a campanha** e bloqueiam a escalação.
- **RN07** — Ao **avançar de fase**, suspensões já cumpridas são limpas e o contador de fases de lesão é decrementado.
- **RN08** — As **estatísticas da Copa** consideram **apenas os jogadores do time do jogador** (lado `home`), acumulados ao longo de todas as fases disputadas. Adversários não entram nos rankings.
- **RN09** — Premiações:
  - **Artilheiro (Chuteira de Ouro)**: mais gols (desempate: assistências, depois menos partidas jogadas).
  - **Melhor Jogador (Bola de Ouro)**: maior média de nota, respeitando participação mínima (desempate: gols + assistências).
  - **Melhor Goleiro (Luva de Ouro)**: goleiro com melhor combinação de jogos sem sofrer gol e defesas (desempate: média de nota).
  - **Prêmios secundários (nice-to-have)**: Maestro (mais assistências), Revelação (melhor sub-23).
- **RN10** — As estatísticas são exibidas **tanto na conquista do título quanto na eliminação**.
- **RN11** — O motor permanece **puro e determinístico** para todo conteúdo não-interativo; a única exceção é o pênalti interativo em tempo real (input do jogador).
- **RN12** — Todo balanceamento novo reside em **`config.js`**; nenhum número mágico fora dele.
- **RN13** — A aba "Como Jogar?" exibe os valores **lidos do `CONFIG`** (não duplicados/hardcoded), de modo que mudanças de balanceamento se reflitam automaticamente.

---

## 6. REQUISITOS FUNCIONAIS

- **RF01** — Aba "Como Jogar?" acessível da tela inicial e do cabeçalho, sem afetar a campanha.
- **RF02** — Tutorial cobre: draft no dado, derivação de atributos, gols esperados (λ, ataque/defesa, expoente, escala), dia/zebra, fadiga (idade/energia/recuperação), pressão da garotada (sub-23/fase/líder), substituições, prorrogação, pênaltis, notas e os **novos eventos** e seu impacto.
- **RF03** — Engine gera cartão vermelho e trata o 2º amarelo como expulsão, deixando o time com um a menos.
- **RF04** — Engine gera pênalti que, para o jogador, abre o mini-game de cobrança única; o resultado entra no placar.
- **RF05** — Engine gera lesão rara, com substituição automática quando possível.
- **RF06** — Eventos com impacto alteram a expectativa de gols subsequente (chance de vitória).
- **RF07** — Pré-jogo bloqueia jogadores suspensos/lesionados e explica o motivo.
- **RF08** — Estado de suspensão/lesão persiste no run e é atualizado ao avançar de fase.
- **RF09** — Estatísticas por partida são acumuladas ao longo da campanha (apenas o time do jogador).
- **RF10** — Tela final exibe a seção "Estatísticas da Copa" com as premiações e seus números.
- **RF11** — O ticker da partida exibe os novos eventos (vermelho, pênalti, lesão) e o estado de "um a menos".

---

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01 — Determinismo**: mesma entrada (elenco, formação, seed) sem interação ⇒ mesmo log. Não usar `Math.random()` no caminho determinístico do engine; usar sempre o RNG semeado. (O pênalti interativo é a exceção documentada, como já ocorre no shootout.)
- **RNF02 — Sem build**: solução em HTML/CSS/JS + React via CDN; novos arquivos `.jsx`/`.js` expostos em `window` e incluídos no `index.html` na ordem certa.
- **RNF03 — Balanceamento centralizado**: tudo configurável em `config.js`.
- **RNF04 — Performance**: a simulação e a agregação devem rodar instantaneamente no navegador (sem percepção de travamento durante o ticker).
- **RNF05 — Resiliência de storage**: leitura de runs antigos (sem os novos campos) não pode quebrar; aplicar defaults.
- **RNF06 — Acessibilidade/idioma**: textos em PT-BR; respeitar `prefers-reduced-motion` (auto-resolução de pênalti/eventos quando reduzido), mantendo os padrões atuais.

---

## 8. SCHEMA / MIGRATIONS (se aplicável)

**Migration necessária?** ☑ Sim (estrutura de dados local) ☐ Não

**Se SIM:**
- O **snapshot do run** ganha novos campos: status por jogador (suspensão/lesão) e estatísticas acumuladas da campanha.
- O **log da partida** ganha novos campos: cartões, pênaltis (e desfecho), lesões e linha do tempo de "um a menos".

**Impacto em dados existentes?** Sim — runs salvos em `copa_draft_run_v2` anteriores não terão os novos campos. Tratar com **defaults** no resume (não migrar destrutivamente; considerar bump de versão da chave somente se necessário para evitar estados inconsistentes).

**Reversível?** Sim — os novos campos são aditivos; sem eles o jogo opera como antes.

---

## 9. INTEGRAÇÕES (se aplicável)

### 9.1. Sistemas Externos Afetados

Nenhum. Jogo 100% client-side, sem backend nem serviços externos.

### 9.2. Alterações em Contratos

Contratos **internos** (formato do `log` do engine, snapshot do run) são estendidos de forma **aditiva**.

**Breaking change?** Não para o usuário (aditivo + defaults no resume). Internamente, consumidores do `log` (ratings, UI, achievements) devem reconhecer os novos tipos de evento.

---

## 10. TRATAMENTO DE ERROS

### CE01 — Pênalti sem reserva/contexto interativo indisponível
- **Situação**: a partida está em modo auto (Pular ⏭ / reduced-motion) quando ocorre um pênalti.
- **Tratamento**: resolver a cobrança automaticamente pelo caminho determinístico (sem abrir o mini-game).
- **Mensagem**: narração textual do desfecho no ticker.

### CE02 — Lesão sem substituição disponível
- **Situação**: jogador se lesiona, mas não há reserva da posição ou as substituições acabaram.
- **Tratamento**: time segue com um a menos pelo resto da partida.
- **Mensagem**: narração informando a saída do lesionado e o desfalque.

### CE03 — Escalação inválida por suspensão/lesão
- **Situação**: jogador indisponível tenta ser escalado.
- **Tratamento**: bloquear a seleção no pré-jogo.
- **Mensagem**: aviso indicando o motivo (suspenso/lesionado) e por quantas fases.

### CE04 — Resume de run antigo
- **Situação**: snapshot salvo sem os novos campos.
- **Tratamento**: aplicar defaults (sem suspensões/lesões, estatísticas zeradas) e continuar.
- **Mensagem**: transparente ao jogador.

### CE05 — localStorage bloqueado
- **Situação**: storage indisponível (modo restrito).
- **Tratamento**: manter o comportamento atual resiliente do `store` (não quebrar a partida).
- **Mensagem**: nenhuma; jogo segue sem persistência.

---

## 11. CASOS DE USO

### UC01: Jogar uma partida com eventos de impacto

**Ator:** Jogador

**Pré-condições:**
- Elenco montado; escalação sem jogadores indisponíveis.

**Fluxo Principal:**
1. O jogador inicia a partida.
2. O ticker avança minuto a minuto exibindo gols e eventos.
3. Ocorre um cartão vermelho no adversário → narração informa; time adversário fica com um a menos; chance de vitória do jogador sobe.
4. Ocorre um pênalti a favor do jogador → simulação pausa → mini-game de cobrança → jogador escolhe o canto → gol → placar atualizado → simulação retoma.
5. Fim de jogo: resultado e notas exibidos.

**Fluxos Alternativos:**
- **FA01 — Pular ⏭ durante a partida:** pênaltis/eventos restantes são resolvidos automaticamente (determinístico).
- **FA02 — Lesão no time do jogador:** entra reserva (se houver) ou time desfalca; jogador fica indisponível nas próximas fases.

### UC02: Consultar "Como Jogar?"

**Ator:** Jogador

**Pré-condições:** nenhuma.

**Fluxo Principal:**
1. O jogador abre a aba "Como Jogar?".
2. Lê as explicações das mecânicas com os números reais do `CONFIG`.
3. Fecha a aba e retorna ao ponto anterior.

### UC03: Ver as estatísticas ao final da Copa

**Ator:** Jogador

**Pré-condições:** campanha encerrada (campeão ou eliminado).

**Fluxo Principal:**
1. A campanha termina.
2. A tela final mostra a seção "Estatísticas da Copa".
3. O jogador vê Artilheiro, Melhor Jogador, Melhor Goleiro (e secundários), com seus números.

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: Determinismo sem interação (happy path)
**Dado** o mesmo elenco, formação e seed, e auto-simulação (sem pênalti interativo)
**Quando** simulo a partida duas vezes
**Então** os dois logs são idênticos (placar, eventos, cartões, lesões).

### Cenário 2: Vermelho muda a expectativa de gols
**Dado** uma partida onde um time recebe vermelho cedo
**Quando** comparo a expectativa de gols antes e depois da expulsão
**Então** a do time com um a menos é menor e a do adversário é maior dali em diante.

### Cenário 3: 2º amarelo vira expulsão
**Dado** um jogador que já recebeu um amarelo
**Quando** ele recebe o 2º amarelo na mesma partida
**Então** ele é expulso e o time fica com um a menos.

### Cenário 4: Pênalti interativo a favor
**Dado** um pênalti marcado para o meu time numa partida interativa
**Quando** a simulação chega ao pênalti
**Então** abre o mini-game, eu cobro, e o desfecho entra no placar e a simulação retoma.

### Cenário 5: Suspensão atravessa a campanha
**Dado** que um titular foi expulso nas oitavas
**Quando** chego às quartas
**Então** ele aparece suspenso e não pode ser escalado; nas semis volta a ficar disponível.

### Cenário 6: Lesão sem reserva
**Dado** uma lesão sem substituição disponível
**Quando** o evento ocorre
**Então** o time segue com um a menos e o jogador fica indisponível pelas fases configuradas.

### Cenário 7: Premiações ao final
**Dado** uma campanha encerrada com gols/assistências/defesas registrados
**Quando** abro a tela final
**Então** Artilheiro/Melhor Jogador/Melhor Goleiro são calculados corretamente, com desempates aplicados.

### Cenário 8: "Como Jogar?" reflete o CONFIG
**Dado** que altero um valor de balanceamento no `config.js`
**Quando** abro a aba "Como Jogar?"
**Então** o número exibido corresponde ao novo valor (sem edição de texto).

### Cenário 9: Resume de run antigo
**Dado** um snapshot salvo antes desta feature
**Quando** retomo a campanha
**Então** o jogo carrega com defaults (sem suspensões/lesões, stats zeradas) e não quebra.

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Código implementado seguindo os padrões do projeto (config centralizado, engine puro, componentes expostos em `window`, scripts em ordem no `index.html`).
- [ ] Determinismo verificado: mesma seed sem interação ⇒ mesmo log (candidato a teste de regressão do engine).
- [ ] Eventos com impacto (vermelho, 2º amarelo, pênalti, lesão) alteram a chance de vitória.
- [ ] Pênalti reaproveita o mini-game interativo; pausa e retomada funcionam.
- [ ] Suspensão/lesão persistem no run e atravessam fases; pré-jogo bloqueia indisponíveis.
- [ ] Estatísticas da Copa acumuladas e exibidas (título e eliminação).
- [ ] Aba "Como Jogar?" lê os números do `CONFIG` e não afeta a campanha.
- [ ] Resume de runs antigos com defaults, sem quebra.
- [ ] Nenhum número mágico fora do `config.js`; nenhum `Math.random()` no caminho determinístico.
- [ ] Build/preview manual passando; PRD atendido 100%.

---

## 14. REFERÊNCIAS

- Contexto do projeto: `MAPS/copa-draft/context.md`
- Mapa do projeto: `MAPS/copa-draft/map.json`
- Código-fonte: `config.js`, `lib/engine.js`, `lib/ratings.js`, `lib/team.js`, `lib/store.js`, `lib/achievements.js`, `ui/match.jsx`, `ui/penalty.jsx`, `ui/post.jsx`, `ui/home.jsx`, `ui/components.jsx`, `app.jsx`, `index.html`
- Ticket/story: TBD

---

## 15. OBSERVAÇÕES

Decisões tomadas com o dev na fase de clarificação:
1. **Eventos com impacto**: cartão vermelho, pênalti, lesão e amarelo acumulado.
2. **Pênalti**: reaproveita a gamificação interativa existente (`PenaltyShootout`), em modo de cobrança única.
3. **Lesão**: evento raro.
4. **Suspensão/lesão**: **atravessam a campanha** (suspensão na fase seguinte; lesão por X fases).
5. **Estatísticas**: escopo de **apenas o time do jogador** (decisão confirmada pelo dev).
6. **Tutorial**: explica **como** os cálculos são feitos e expõe os **números reais** do `CONFIG`, deixando o jogador "decifrar" o balanceamento.

**Riscos Identificados:**
- ⚠️ **Reestruturação do engine** (fluxo crítico): hoje os eventos são uma segunda passada decorativa; integrá-los à linha do tempo causal sem perder o determinismo é o ponto mais sensível. Tratar via RNG semeado e isolar a interatividade (pênalti) com o mesmo padrão de pausa/finalize já usado no shootout.
- ⚠️ **Pausa/retomada do ticker para o pênalti interativo**: precisa preservar o estado parcial da partida (placar e eventos já revelados) ao reabrir.
- ⚠️ **Compatibilidade de saves** antigos: aplicar defaults no resume.

**Dependências:**
- 🔗 Mecânica de pausa interativa já existente no shootout (`needsShootout`/`finalizeShootout`) como referência para o pênalti em partida.
- 🔗 `log.stats` e `ratings.players` como base para a agregação de campanha.

---

## 16. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-06-04 | 1 | IA (Claude) | Versão inicial |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
