# Skill: Feature Workflow (Orquestrador de Papéis)

## Descrição
Orquestra o ciclo completo de uma feature delegando cada fase a um **agente por papel** que roda
em **janela de contexto isolada** (subagent): Product Manager (`/spec`) → Arquiteto Sênior
(`/planejar`) → Dev Sênior (`/implementar`) → Tech Lead (`/code-review`).

Esta skill é o **maestro + broker**: ela roda na **sessão principal**, delega cada fase, aplica um
**gate humano** entre artefatos, e faz a **ponte de comunicação** (perguntas agente→humano e
consultas agente→agente). Ela **não reescreve** a lógica das skills — cada agente executa a skill
SHARED da sua fase. É análoga ao `start-project`, que também reusa skills SHARED.

> **Complementar ao `start-project`:** `start-project` = bootstrap zero→MVP (cria o projeto).
> `feature-workflow` = loop recorrente por feature em projeto **já existente**.

---

## Pré-requisitos

- Os 4 agentes instalados como subagents (ex.: `.claude/agents/` no cliente): `product-manager`,
  `arquiteto-senior`, `dev-senior`, `tech-lead`. Ver `AGENTS/SHARED/` e os adapters da ferramenta.
- Projeto ativo configurado (`.ai-project` → `MAPS/{projeto}`).

---

## Princípios de orquestração

1. **Humano-no-loop.** Há um **gate** (aprovação) ao fim de cada fase. Nada avança sem o "ok".
2. **Publish/subscribe.** Uma fase só dispara quando o artefato da anterior **existe e foi aprovado**.
3. **Delegação isolada.** Cada fase roda num subagent com janela própria. Passe **paths** (não o
   conteúdo inteiro) + as respostas já coletadas do humano.
4. **Broker.** Perguntas do agente ao humano e consultas entre agentes passam por você (§ Broker).
5. **Guardrails.** Máx. de consultas por dúvida/fase; "uma etapa por vez" no Dev; nunca swarm autônomo.
6. **Handoff durável.** Cada fase termina com uma **Nota de Handoff** no artefato; decisões relevantes
   vão para o **log de decisões** (`adr/`). O próximo agente lê isso no Passo 0.

---

## Processo

### Passo 0: Carregar Contexto e Confirmar Escopo

**0.1.** Identificar projeto ativo (`.ai-project`) e ler `{slug}-map.json` + `{slug}-context.md` (igual às demais skills).

**0.2.** Confirmar com o dev o ponto de entrada:

```
🎛️ Feature Workflow — vou conduzir os 4 papéis (PM → Arquiteto → Dev → Tech Lead).

Por onde começamos?
1. Do zero (nova feature) → começa no Product Manager (/spec)
2. Já tenho PRD → começa no Arquiteto (/planejar)
3. Já tenho PLAN → começa no Dev (/implementar ETAPA N)
4. Só revisar → Tech Lead (/code-review)

Qual o ponto de entrada?
```

Use as ferramentas de escolha estruturada da ferramenta (ex.: `AskUserQuestion` no Claude Code) quando disponível.

---

### Passo 1: FASE 1 — Product Manager (`/spec`)

*(pular se o ponto de entrada for posterior)*

**1.1.** Delegar ao subagent **`product-manager`**, passando: a demanda/descrição, o path do projeto
e o modo de coleta. O agente segue `SKILLS/SHARED/spec.md`.

**1.2. Broker de perguntas (ask-upfront).** O agente **retorna uma lista de dúvidas** de negócio em
vez de perguntar sozinho. Apresente-as ao humano (escolha estruturada), colete as respostas e
**re-invoque** o agente com as respostas anexadas ao prompt.

**1.3. ⛔ GATE.** Quando o PRD estiver salvo, apresente o resumo + path e **pare para aprovação**:

```
✅ PRD criado: {path}
📊 [complexidade, repos, domínios, nº de critérios]
📝 Nota de Handoff: [dúvidas em aberto p/ o Arquiteto]

Aprovar e seguir para o Arquiteto (/planejar)? [aprovar / ajustar / parar]
```

Só avance com aprovação. Se "ajustar", re-invoque o `product-manager` com os ajustes.

---

### Passo 2: FASE 2 — Arquiteto Sênior (`/planejar`)

**2.1.** Delegar ao subagent **`arquiteto-senior`**, passando o **path do PRD** aprovado.
O agente segue `SKILLS/SHARED/planejar.md` e dá **HARD STOP** após o PLAN.

**2.2. Broker.** Dúvidas de negócio do arquiteto → **consultar o `product-manager`** (§ Broker) e
devolver a resposta. Dúvidas técnicas para o humano → apresentar (ask-upfront) e re-invocar.

**2.3. ⛔ GATE.** Apresente o resumo do PLAN (nº de etapas, riscos, deps) + path e **pare para aprovação**.

---

### Passo 3: FASE 3 — Dev Sênior (`/implementar`) — etapa a etapa

**3.1.** Para **cada** ETAPA do PLAN, delegar ao subagent **`dev-senior`**, passando: **path do PLAN**,
**número da ETAPA** e **branch**. O agente segue `SKILLS/SHARED/implementar.md`, descobre a stack e
carrega a lente (`AGENTS/SHARED/lenses/{lang}.md`).

**3.2. Broker.** Ambiguidade no PLAN → **consultar o `arquiteto-senior`**. Decisão do humano
(nome de branch, conflito git) → apresentar ao humano. **Nunca** o agente resolve conflito git sozinho.

**3.3. ⛔ GATE por etapa.** Ao fim de cada etapa, confirme build/testes verdes e pergunte:

```
✅ ETAPA N concluída — build ✅ testes ✅ commit {hash}
Próximo? [próxima etapa / revisar agora (Tech Lead) / push / parar]
```

Uma etapa por vez — nunca dispare várias em paralelo.

---

### Passo 4: FASE 4 — Tech Lead (`/code-review`)

**4.1.** Delegar ao subagent **`tech-lead`** (read-only), passando os paths do **PRD**, do **PLAN** e a **branch**.
O agente segue `SKILLS/SHARED/code-review.md` e devolve **apenas o relatório** 🔴/🟡/🟢 + decisão.

**4.2. Broker.** Dúvida de intenção → consultar `product-manager`; de arquitetura → `arquiteto-senior`.

**4.3. ⛔ GATE final.**
- ✅ / ⚠️ → oferecer criação de PR (conforme `map.tooling`).
- ❌ → listar os 🔴; o ciclo **volta à FASE 3** (Dev corrige) e depois re-revisa.

---

## Broker (comunicação entre papéis)

Como cada agente roda isolado, **você** faz a ponte. Padrão recomendado: **broker pelo orquestrador**.

- **Agente → humano:** o agente retorna uma lista de dúvidas → você pergunta ao humano → re-invoca o agente com as respostas.
- **Agente A → Agente B:** o agente A retorna "preciso consultar {B} sobre X" → você invoca **B** com a
  pergunta + os paths dos artefatos → devolve a resposta a **A**.
- **Guardrail anti-loop:** no máximo **2 consultas por dúvida**; a pergunta é sempre **focada** (uma questão,
  não "revise tudo"). Se estourar, escale para o humano.

---

## Passo Final: Resumo do Ciclo

```
🎉 Feature Workflow concluído (ou parado em {fase}).

PRD:    {path}   ✅
PLAN:   {path}   ✅  (N/N etapas)
Código: branch {branch} — {commits}
Review: {✅/⚠️/❌}  — {nº 🔴 / 🟡 / 🟢}
PR:     {link ou "não criado"}

Próximo passo sugerido: [ ... ]
```

---

## O Que Este Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Carrega contexto do projeto e confirma o ponto de entrada
- Delega cada fase a um subagent isolado (PM → Arquiteto → Dev → Tech Lead)
- Aplica gate humano entre cada artefato (publish/subscribe)
- Faz o broker de perguntas agente→humano e consultas agente→agente
- Garante "uma etapa por vez" no Dev e guardrails anti-loop
- Consolida o resumo do ciclo

### ❌ NÃO FAZ:
- ❌ Reescrever a lógica das skills (cada agente segue sua skill SHARED)
- ❌ Avançar de fase sem aprovação humana
- ❌ Rodar as fases em paralelo / swarm autônomo
- ❌ Implementar código diretamente (isso é do `dev-senior`)
- ❌ Resolver conflitos git ou dar push automático
