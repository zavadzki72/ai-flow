# PRD: Identidade Minimalista, Tema Claro/Escuro e Multi-idioma (PT/EN/ES)

**Sequência**: 003
**Ticket**: TBD
**Versão**: 1
**Data**: 2026-06-06
**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO

**Metadados:**
- **Prioridade**: Média
- **Complexidade**: 🔴 Alta
- **Repositório(s)**: `game` (C:/Projects/Personal/copa-draft)
- **Domínio(s)**: ui, engine, achievements, store

---

## 1. VISÃO GERAL

### 1.1. Contexto

O Copa Draft é uma SPA sem build (React via CDN), hoje **dark-only** e **100% em português**, com todo o texto hardcoded espalhado por `lib/engine.js` (narração minuto-a-minuto), `lib/achievements.js` (conquistas) e todos os `ui/*.jsx` (menus, telas, tutorial). A identidade do "time do jogador" é um nome fixo `CONFIG.TEAM_NAME = 'Time dos Sonhos'` e um emblema de **estrela ★** (componente `Crest`).

Quatro melhorias foram solicitadas, todas de natureza de produto/experiência:

1. **Identidade do time mais minimalista** — novo nome ("Seu Draft") e novo ícone (marca geométrica abstrata, sem moldura de escudo, substituindo a estrela).
2. **Refinamento geral de design** com tom minimalista.
3. **Toggle de tema** (claro/escuro).
4. **Toggle de idioma** (PT / EN / ES), traduzindo **toda** a experiência: UI, narração da partida e conquistas.

### 1.2. Objetivo

Entregar uma identidade visual mais limpa e neutra, com tema claro completo além do escuro existente, e suporte a três idiomas cobrindo todos os textos voltados ao usuário — preferências de tema e idioma persistidas entre sessões. Tudo isso **sem quebrar o determinismo do engine** nem introduzir números mágicos fora do `config.js`.

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — Nova identidade do time (nome + ícone)
**Dado** que o jogador abre o jogo
**Quando** a identidade do "seu time" é exibida (cabeçalho da campanha, escalações, tela final, share card)
**Então** o nome exibido é "Seu Draft" (localizado conforme idioma: PT "Seu Draft" · EN "Your Draft" · ES "Tu Draft")
**E** o ícone é a nova marca geométrica abstrata minimalista (sem moldura de escudo, sem estrela), legível em tema claro e escuro.

### Critério 2 — Toggle de tema claro/escuro
**Dado** que o jogador está em qualquer tela
**Quando** ele aciona o controle de tema no cabeçalho
**Então** a interface inteira alterna entre tema escuro e tema claro mantendo a identidade verde/amarelo
**E** a escolha é persistida e reaplicada na próxima visita.

### Critério 3 — Detecção de tema na primeira visita
**Dado** um jogador sem preferência de tema salva
**Quando** ele abre o jogo pela primeira vez
**Então** o tema inicial respeita a preferência do sistema operacional (`prefers-color-scheme`)
**E** a partir de qualquer mudança manual, a preferência manual passa a prevalecer.

### Critério 4 — Toggle de idioma (PT/EN/ES)
**Dado** que o jogador está em qualquer tela
**Quando** ele seleciona PT, EN ou ES no controle de idioma
**Então** todos os textos de interface, tutorial e conquistas passam para o idioma escolhido
**E** a narração minuto-a-minuto das partidas seguintes é gerada no idioma escolhido
**E** a escolha é persistida e reaplicada na próxima visita.

### Critério 5 — Determinismo do engine preservado sob tradução
**Dado** uma mesma seed de partida
**Quando** a partida é simulada em qualquer idioma
**Então** o resultado (placar, eventos, sequência) é idêntico ao de qualquer outro idioma — apenas o texto narrado muda
**E** nenhuma lógica de fluxo do engine depende de comparação de texto traduzível.

### Critério 6 — Nomes próprios preservados
**Dado** qualquer idioma selecionado
**Quando** seleções históricas e jogadores são exibidos/narrados
**Então** nomes de jogadores e de seleções permanecem inalterados (não são traduzidos).

### Critério 7 — Refinamento minimalista geral
**Dado** que o jogador navega pelas telas (home, draft, partida, pós-jogo, chaveamento, final)
**Quando** compara com a versão atual
**Então** percebe um visual mais limpo e consistente (hierarquia tipográfica, espaçamento, redução de ruído visual) sem perda de funcionalidade.

---

## 3. ESCOPO TÉCNICO

### 3.1. Componentes a Alterar

**Repositório `game` — camada UI (`ui/`)**
- `ui/components.jsx` — `Crest`/`TeamMark` (novo ícone), `GameHeader` (controles de tema e idioma; nome do time localizado), `AttrBars` (labels via i18n).
- `ui/home.jsx`, `ui/draft.jsx`, `ui/match.jsx`, `ui/penalty.jsx`, `ui/post.jsx`, `ui/howto.jsx` — substituir strings hardcoded por chamadas ao dicionário de i18n; ajustes de design minimalista.

**Camada lógica/dados (`lib/`)**
- `lib/engine.js` — narração: extrair templates (`EVENT_T`, `PEN_GOAL_T`, etc.) e strings inline/hardcoded para o dicionário de i18n por locale; **substituir comparações de texto por chaves semânticas estáveis** (ver Riscos / RNF02).
- `lib/achievements.js` — `name`/`desc` de cada conquista via i18n.
- `lib/derive.js` — `ATTR_LABELS` (labels dos 6 atributos) por idioma.
- `lib/ratings.js`, `lib/stats.js`, `lib/sharecard.js` — qualquer rótulo voltado ao usuário (ex.: "craque do jogo", textos do share card) via i18n.
- `lib/store.js` — persistir `theme` e `lang` no profile (`copa_draft_profile_v1`).

**Configuração e estado**
- `config.js` — `TEAM_NAME` deixa de ser string fixa e passa a ser resolvido por idioma; constantes novas (idiomas suportados, idioma/tema padrão) centralizadas aqui.
- `app.jsx` — estado global de `theme` e `lang`; aplicar atributo de tema no elemento raiz; propagar idioma; inicialização a partir do profile + `prefers-color-scheme`.
- `index.html` — incluir o novo script de i18n na ordem correta (antes dos consumidores); aplicação inicial de tema antes da renderização para evitar "flash".

**Estilos (`styles/`, `game.css`)**
- `styles/colors_and_type.css` — definir o conjunto de tokens do **tema claro** (escopo por atributo de tema), mantendo o tema escuro atual como padrão dos tokens.
- `styles/kit.css`, `game.css` — garantir que componentes usem apenas tokens (sem cores hardcoded) para funcionarem nos dois temas; ajustes de design minimalista; estilos do novo ícone e dos controles de tema/idioma.

### 3.2. Componentes Novos
- **Módulo de i18n** (`lib/i18n.js` ou equivalente) — exposto em `window` (ex.: `window.I18N`): dicionários PT/EN/ES, função de tradução com placeholders (`{player}`, `{team}`, etc.), idioma corrente, fallback para PT quando faltar chave.
- **Tokens de tema claro** — bloco de variáveis CSS em escopo de tema (sem novo arquivo obrigatório).
- **Controle de idioma** no cabeçalho (segmented/dropdown PT·EN·ES).
- **Controle de tema** no cabeçalho (botão-ícone, padrão dos `btn-icon` existentes).
- **Novo ícone de marca** (SVG/elemento minimalista geométrico) substituindo a estrela em `Crest`.

### 3.3. Componentes Reutilizados
- `lib/rng.js`, `lib/team.js` — sem alteração de lógica.
- `data/squads.js` — sem alteração (nomes próprios não traduzidos).
- Padrão visual `btn-icon` e estrutura do `GameHeader` — reutilizados para os novos controles.
- Sistema de templates `fill()` da narração — reutilizado, apenas alimentado por dicionários por idioma.

### 3.4. Fluxo de Dados

```
1. Boot: app.jsx lê profile (STORE) → { theme, lang }.
2. Se theme ausente → usa prefers-color-scheme; se lang ausente → usa CONFIG.DEFAULT_LANG (PT).
3. app.jsx aplica data-theme no elemento raiz e define I18N.lang = lang.
4. Componentes UI renderizam textos via I18N.t(chave, params) e TEAM_NAME via I18N.
5. Ao simular partida: engine gera eventos com chave semântica (type/key) + texto já no idioma corrente (templates do I18N).
6. Toggle de tema/idioma → atualiza estado em app.jsx → STORE.setSetting('theme'|'lang', valor) → re-render.
7. Reload → repete a partir do passo 1 com a preferência salva.
```

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos
- **Profile** (localStorage `copa_draft_profile_v1`): adicionar campos `theme` (`'dark' | 'light'`) e `lang` (`'pt' | 'en' | 'es'`). Default: `theme` derivado do sistema na 1ª visita; `lang = 'pt'`.
- **Evento de narração**: cada evento passa a carregar uma **chave semântica estável** (campo já existente `type` e/ou novo identificador) que não depende do texto traduzido.

### 4.2. Comandos / Queries / DTOs
- `I18N.t(key, params?)` → string traduzida no idioma corrente, com interpolação de placeholders e fallback PT.
- `I18N.setLang(lang)` / `I18N.lang` → leitura/escrita do idioma corrente.
- `STORE.setSetting('theme'|'lang', value)` (mecanismo já existente) e leitura via `loadProfile()`.

### 4.3. Handlers / Services
- **app.jsx**: orquestra estado de tema/idioma, aplica tema ao raiz, inicializa idioma, persiste mudanças, repassa via props/contexto aos componentes.
- **engine.js**: ao montar eventos, seleciona templates do idioma corrente e mantém a decisão de fluxo baseada em chave semântica, não em texto.

### 4.4. Persistência
- Leitura/escrita de `theme` e `lang` em `copa_draft_profile_v1` via `STORE` (reutiliza `setSetting`/`loadProfile`). Sem migração destrutiva: campos ausentes assumem default.

### 4.5. Validações
- `lang` deve ser um dos suportados (`CONFIG`), senão cai no default PT.
- `theme` deve ser `dark` ou `light`, senão deriva do sistema.
- Toda chave i18n ausente deve renderizar o fallback PT (nunca string vazia ou a chave crua).

### 4.6. Autorização
- Não se aplica — jogo single-player no navegador, sem perfis/roles de acesso.

---

## 5. REGRAS DE NEGÓCIO

- **RN01**: O nome do time do jogador é "Seu Draft", localizado por idioma (PT "Seu Draft" · EN "Your Draft" · ES "Tu Draft").
- **RN02**: Nomes de jogadores e de seleções históricas **nunca** são traduzidos.
- **RN03**: A troca de idioma afeta a narração das **próximas** partidas; partidas/logs já gerados não precisam ser re-narrados retroativamente.
- **RN04**: A identidade verde/amarelo/azul (paleta de marca) é mantida nos dois temas; o tema claro adapta superfícies e texto, não a cor de marca.
- **RN05**: Preferências de tema e idioma são por dispositivo/navegador (localStorage), independentes da campanha em andamento.
- **RN06**: Idioma padrão é PT; tema padrão na 1ª visita segue o sistema operacional.

---

## 6. REQUISITOS FUNCIONAIS

- **RF01**: Exibir o novo ícone minimalista e o nome "Seu Draft" em todos os pontos onde o time do jogador aparece.
- **RF02**: Disponibilizar controle de tema (claro/escuro) acessível no cabeçalho em todas as fases.
- **RF03**: Disponibilizar controle de idioma (PT/EN/ES) acessível no cabeçalho em todas as fases.
- **RF04**: Traduzir toda a UI, tutorial, conquistas e narração de partida para os três idiomas.
- **RF05**: Persistir e reaplicar tema e idioma entre sessões.
- **RF06**: Aplicar o tema escolhido antes da primeira pintura para evitar "flash" de tema incorreto.

---

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01**: Manter o padrão "sem build" — i18n e theming implementados em JS/CSS puro carregados via `<script>`/CSS, sem dependências externas.
- **RNF02**: Preservar o determinismo do engine — nenhuma lógica de fluxo pode depender de texto traduzível; comparações devem usar chave semântica. Mesma seed → mesmo resultado em qualquer idioma.
- **RNF03**: Zero números mágicos fora de `config.js`; zero cores hardcoded fora dos tokens de tema.
- **RNF04**: Acessibilidade — controles de tema/idioma com `aria-label`/`title`; contraste adequado em ambos os temas.
- **RNF05**: Performance — troca de tema/idioma sem recarregar a página e sem travamento perceptível.

---

## 8. SCHEMA / MIGRATIONS (se aplicável)

**Migration necessária?** ☐ Sim ☑ Não (não há banco de dados; persistência é localStorage)

Ajuste de esquema do profile no localStorage é **aditivo e retrocompatível**: campos `theme`/`lang` ausentes assumem default; a chave `copa_draft_profile_v1` é mantida.

**Impacto em dados existentes?** Não — perfis antigos continuam válidos.
**Reversível?** Sim.

---

## 9. INTEGRAÇÕES (se aplicável)

### 9.1. Sistemas Externos Afetados
Nenhum. Jogo 100% client-side, sem backend ou serviços externos.

### 9.2. Alterações em Contratos
Nenhum contrato externo. **Breaking change?** Não.

> Observação: a "interface" interna de eventos do engine ganha uma chave semântica — mudança interna ao repositório, sem efeito externo.

---

## 10. TRATAMENTO DE ERROS

### CE01 — Chave de tradução ausente
- **Situação**: `I18N.t()` recebe uma chave inexistente no idioma corrente.
- **Tratamento**: usar fallback PT; se também ausente em PT, renderizar a própria chave de forma legível (último recurso).
- **Mensagem**: nenhuma ao usuário; log de aviso no console em desenvolvimento.

### CE02 — Preferência inválida no localStorage
- **Situação**: `theme`/`lang` corrompidos ou fora dos valores suportados.
- **Tratamento**: ignorar e aplicar default (tema do sistema / PT).
- **Mensagem**: nenhuma ao usuário.

### CE03 — Placeholder não substituído na narração
- **Situação**: template com `{player}`/`{team}` sem parâmetro correspondente.
- **Tratamento**: não exibir o placeholder cru; usar valor neutro do idioma (ex.: "o jogador"/"the player"/"el jugador").
- **Mensagem**: log de aviso em desenvolvimento.

---

## 11. CASOS DE USO

### UC01: Jogar com identidade, tema e idioma personalizados

**Ator:** Jogador (single-player, navegador)

**Pré-condições:**
- Jogo carregado no navegador.

**Fluxo Principal:**
1. O jogo abre aplicando o tema do sistema (1ª visita) ou o salvo, em PT (ou idioma salvo).
2. O jogador vê o ícone minimalista e o nome "Seu Draft".
3. O jogador alterna o tema no cabeçalho → interface inteira muda; preferência salva.
4. O jogador seleciona EN/ES → toda a UI e a narração das próximas partidas mudam de idioma; preferência salva.
5. O jogador joga uma partida → narração no idioma escolhido, nomes próprios intactos.
6. Em nova sessão, tema e idioma escolhidos são reaplicados automaticamente.

**Fluxos Alternativos:**
- **FA01 — Preferência ausente/corrompida:** aplicar defaults (tema do sistema / PT).
- **FA02 — Idioma trocado no meio da campanha:** UI muda imediatamente; partidas já jogadas não são re-narradas; próximas partidas usam o novo idioma.

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: Determinismo sob tradução (Happy Path)
**Dado** uma mesma seed de partida
**Quando** simulo a partida em PT, depois em EN, depois em ES
**Então** placar, número de eventos e sequência são idênticos; apenas o texto muda.

### Cenário 2: Persistência de preferências
**Dado** que escolhi tema claro e idioma ES
**Quando** recarrego a página
**Então** o jogo abre em tema claro e em espanhol.

### Cenário 3: Detecção de tema na 1ª visita
**Dado** um navegador com `prefers-color-scheme: light` e sem preferência salva
**Quando** abro o jogo pela primeira vez
**Então** ele inicia em tema claro.

### Cenário 4: Nomes próprios preservados
**Dado** idioma EN selecionado
**Quando** uma seleção histórica e seus jogadores aparecem na narração
**Então** os nomes não são traduzidos.

### Cenário 5: Identidade do time
**Dado** idioma PT/EN/ES
**Quando** o cabeçalho da campanha é exibido
**Então** o nome é "Seu Draft"/"Your Draft"/"Tu Draft" com o novo ícone, nos dois temas.

### Cenário 6: Fallback de tradução
**Dado** uma chave faltante em EN
**Quando** a tela é renderizada em EN
**Então** o texto PT correspondente é exibido, sem quebra de layout.

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Código implementado seguindo padrões do time (componentes expostos em `window`, `<script>` na ordem certa no `index.html`, sem números mágicos fora de `config.js`)
- [ ] Tema claro completo e tema escuro funcionando em todas as telas (home, draft, partida, pênaltis, pós-jogo, chaveamento, final, tutorial)
- [ ] Idioma PT/EN/ES cobrindo UI, tutorial, conquistas e narração da partida
- [ ] Determinismo do engine validado (mesma seed → mesmo resultado em qualquer idioma)
- [ ] Preferências de tema e idioma persistidas e reaplicadas
- [ ] Novo ícone e nome "Seu Draft" (localizado) em todos os pontos de identidade
- [ ] Nenhuma cor hardcoded fora dos tokens; nenhuma comparação de fluxo por texto traduzível
- [ ] Code review realizado (checklist de `copa-draft-context.md`)
- [ ] Build/preview funcionando na branch principal
- [ ] PRD atendido 100%

---

## 14. REFERÊNCIAS

- Contexto do projeto: `MAPS/copa-draft/copa-draft-context.md` (arquitetura, design system, padrões frontend, checklist de code review)
- `copa-draft-map.json` (stack, repositório `game`, docs)
- PRDs relacionados: `copa-draft-prd-001-tbd-eventos-estatisticas-e-tutorial.md`, `copa-draft-prd-002-tbd-fase-de-grupos-tela-final-e-ajustes.md`
- Código-fonte relevante: `lib/engine.js`, `lib/achievements.js`, `lib/derive.js`, `ui/components.jsx`, `config.js`, `app.jsx`, `styles/colors_and_type.css`, `lib/store.js`
- Ticket/story: TBD (projeto sem ferramenta de gestão configurada)

---

## 15. OBSERVAÇÕES

Esta entrega agrupa quatro melhorias correlatas de experiência. A maior fonte de complexidade não é o tema nem o ícone, e sim a **internacionalização completa, incluindo a narração do engine** — que hoje mistura templates (`EVENT_T`, `PEN_*_T`), strings inline interpoladas e literais fixos, e que em alguns pontos **compara `e.text` contra literais em PT para decidir fluxo** (ex.: `lib/engine.js:528-529`). Esse acoplamento texto↔lógica é o principal risco e deve ser removido em favor de chaves semânticas antes/junto da tradução.

Decisões tomadas com o solicitante:
- Escopo de i18n: **UI + narração + conquistas** (tudo traduzido; nomes próprios não).
- Tema: **dark + light completo**, com auto-detecção do sistema na 1ª visita.
- Ícone: **marca geométrica abstrata** (sem moldura de escudo), substituindo a estrela.
- Persistência: tema e idioma no **localStorage**; nome do time **localizado** (Seu Draft / Your Draft / Tu Draft).

**Riscos Identificados:**
- ⚠️ **Quebra de determinismo/fluxo do engine** por dependência de texto traduzível (mitigar com chave semântica) — bloqueador absoluto do checklist.
- ⚠️ **Cobertura incompleta de strings** — risco de sobrar texto em PT em EN/ES dado o volume (~3.2k linhas, strings em todos os `.jsx` e em `lib/`). Mitigar com varredura sistemática e fallback visível em dev.
- ⚠️ **Cores hardcoded** fora dos tokens quebrando o tema claro — exige auditoria de `game.css`/`kit.css`.
- ⚠️ **"Flash" de tema** na carga inicial se o tema for aplicado só após o React montar.
- ⚠️ **Crescimento de bundle** dos dicionários (sem build) — aceitável, mas manter organização por locale.

**Dependências:**
- 🔗 Nenhuma externa. Internamente, theming e i18n são pré-requisitos do refino de design minimalista (que deve consumir tokens e chaves já existentes).

---

## 16. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| 2026-06-06 | 1 | IA (Claude) | Versão inicial |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
