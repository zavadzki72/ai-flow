# Design: Agentes por Papel no ai-flow

> **Status:** 🟢 Implementado (1º corte) — estrutura criada em 2026-07-01
> **Data:** 2026-06-30 · **Atualizado:** 2026-07-01
> **Autor:** Marccus + IA
> **Escopo:** meta-repo `ai-flow` (não é um projeto específico em `MAPS/`)

Documento de estruturação para introduzir **agentes por papel** que usam as skills
existentes do ai-flow, preservando a filosofia agnóstica (`SHARED` + adapters por ferramenta,
maps como appsettings, handoff via arquivos).

**Princípio-chave desta versão:** cada agente roda em **sua própria janela de contexto
(isolada)** e os agentes **se comunicam entre si** por consulta + estado compartilhado em arquivo.

---

## Sumário

- [1. Conceito central: Agente ≠ Skill](#1-conceito-central-agente--skill)
- [2. O que a pesquisa mostrou](#2-o-que-a-pesquisa-mostrou)
- [3. Isolamento: cada agente em sua própria janela de contexto](#3-isolamento-cada-agente-em-sua-própria-janela-de-contexto)
- [4. Comunicação entre agentes](#4-comunicação-entre-agentes)
- [5. Estrutura de arquivos](#5-estrutura-de-arquivos)
- [6. Os 4 papéis (personas)](#6-os-4-papéis-personas)
- [7. O orquestrador `/feature-workflow`](#7-o-orquestrador-feature-workflow)
- [8. Dev por linguagem: híbrido core + lentes](#8-dev-por-linguagem-híbrido-core--lentes)
- [9. Orquestração e humano-no-loop](#9-orquestração-e-humano-no-loop)
- [10. AGENTS.md (camada de contexto — complementar)](#10-agentsmd-camada-de-contexto--complementar)
- [11. Sugestões de melhoria](#11-sugestões-de-melhoria)
- [12. Plano de implementação (baby steps)](#12-plano-de-implementação-baby-steps)
- [13. Riscos e mitigações](#13-riscos-e-mitigações)
- [14. Decisões tomadas e em aberto](#14-decisões-tomadas-e-em-aberto)
- [15. Referências](#15-referências)

---

## Decisões desta rodada

| Decisão | Escolha |
|---|---|
| Dev por linguagem | **Híbrido**: 1 `dev-senior` core que lê a stack do map + **lentes** de linguagem |
| Escopo do 1º corte | **Os 4 papéis**: PM, Arquiteto, Dev, Tech Lead |
| Orquestração / UX | Skill **`/feature-workflow`** que delega cada papel a um **subagent isolado** (janela própria), com gates humanos entre artefatos |
| Isolamento | **Cada agente roda em janela de contexto NOVA e própria** — especificado dentro de cada persona |
| Comunicação | Agentes **se consultam entre si** (request/response) + handoff durável em arquivo |
| Ferramentas-alvo | **Só Claude Code** (`.claude/agents/` já é lido nativamente por Cursor e Copilot) |

---

## 1. Conceito central: Agente ≠ Skill

São **camadas ortogonais** (confirmado na doc oficial de Claude Code, Cursor, Gemini e Copilot):

| | O que é | Onde roda | No ai-flow |
|---|---|---|---|
| **Skill** | O **processo** — o "COMO/QUANDO", em passos | Contexto principal | `SKILLS/SHARED/*.md` ✅ existe |
| **Agente** | A **persona** — o "QUEM": mindset + model + tools + especialização | **Janela própria (subagent)** | ❌ o que falta |

**Contrato de conteúdo de uma persona** (regra de ouro contra duplicação):
o corpo de um agente contém **apenas**:

1. Identidade / mindset do papel;
2. "Seu processo é a skill `/X` — siga `SKILLS/SHARED/X.md`";
3. Perfil de tools do papel (least-privilege);
4. **Bloco de isolamento** — deixa explícito que ele roda em janela própria (ver §3);
5. **Como se comunicar** — quando consultar outro agente e como devolver dúvidas (ver §4);
6. `description` acionável (é o que dispara a delegação).

> ❌ **Nunca** colocar passos de negócio / lógica na persona. Isso é da skill. `SHARED` continua a fonte única de verdade.

Mapeamento 1:1 com o que você pediu:

| Papel (persona) | Skill | Perfil de tools |
|---|---|---|
| **Product Manager / Owner** | `/spec` | Write só em `prd/` |
| **Arquiteto Sênior** | `/planejar` | Write só em `plan/`, `adr/` |
| **Dev Sênior** | `/implementar` | Edit / Write / Bash (código) |
| **QA** (E2E) | `/test-e2e` | Write só em `e2e/` + Bash (docker) + MCP de browser |
| **Tech Lead** (guardião) | `/code-review` | read-only + Bash só p/ diff e PR |

---

## 2. O que a pesquisa mostrou

Pesquisamos a mecânica oficial (Claude Code, Cursor, Gemini, Copilot), o padrão AGENTS.md, e
os principais "times de agentes" para dev (BMAD-METHOD, MetaGPT, ChatDev, wshobson/agents,
VoltAgent/awesome-claude-code-subagents, CrewAI, AutoGen, LangGraph, claude-flow).

**Três lições que confirmam o rumo do ai-flow:**

1. **Handoff por artefato é o padrão mais robusto contra perda de contexto.** BMAD e MetaGPT
   fazem PRD → arquitetura → stories → código → review. O ai-flow **já faz** (`prd/` → `plan/`
   → código → review). O documento é o "contrato" entre passadas; a janela de chat evapora, o arquivo não.

2. **Uma fonte de verdade + adapters nativos por ferramenta** é a arquitetura vencedora
   (é o que o wshobson/agents faz p/ 5 harnesses). O ai-flow **já faz** com `SHARED` + adapters.

3. **Swarm autônomo é armadilha.** Papers recentes reportam **41–86% de falha** e ~**15× mais
   tokens** em multi-agente autônomo. Frameworks maduros (BMAD) mantêm o **humano orquestrando**.
   → Agentes isolados que se consultam: ótimo. Swarm sem humano no loop: não.

---

## 3. Isolamento: cada agente em sua própria janela de contexto

**Regra do design:** cada papel é um **subagent** e roda numa **janela de contexto nova, fresca e
isolada**. Um agente **NÃO vê** a conversa principal, **NÃO vê** o que outros agentes fizeram e
**NÃO vê** os arquivos que o orquestrador já leu.

Os únicos insumos de um agente são:
1. **O prompt de invocação** (passe **paths** do PRD/PLAN/branch e as decisões relevantes — não o conteúdo inteiro);
2. **Os arquivos no disco** (ele lê o que precisar);
3. **O Passo 0 da sua skill** (`.ai-project` → `{slug}-map.json` + `{slug}-context.md` + `docs/`);
4. **CLAUDE.md** e a hierarquia de memória (herdados automaticamente).

E a única saída de volta ao orquestrador é o **resumo final** (o trabalho intermediário fica
contido na janela do agente — é isso que mantém o contexto principal limpo).

### Consequência importante (e como lidamos)

Subagent isolado **não recebe `AskUserQuestion` / `EnterPlanMode`** → ele **não pergunta ao
humano no meio** da execução. Mas as skills `/spec` e `/planejar` hoje fazem perguntas inline.
Dois mecanismos resolvem isso, **sem** tirar o agente da janela própria:

- **Perguntar antes (ask-upfront):** o agente levanta **todas** as dúvidas no início e **retorna
  uma lista estruturada** de perguntas em vez de perguntar no meio;
- **Broker pelo orquestrador:** o `/feature-workflow` (sessão principal) apresenta essas perguntas
  ao humano (via `AskUserQuestion`), coleta as respostas e **re-invoca o agente** com as respostas
  anexadas ao prompt.

> Isso exige uma pequena adaptação nas skills interativas (uma variante "batch/ask-upfront").
> Está no plano (§12) e nas decisões em aberto (§14).

### O que cada persona declara sobre isolamento

Todo `AGENTS/SHARED/{papel}.md` inclui um bloco assim (especificado **para ele**):

```markdown
## Janela de contexto (isolamento) — LEIA
Você roda em uma JANELA DE CONTEXTO NOVA E PRÓPRIA. Você NÃO vê a conversa principal
nem o trabalho de outros agentes. Seus insumos: (1) este prompt (paths do PRD/PLAN/branch),
(2) os arquivos no disco (leia-os), (3) o Passo 0 da sua skill (map do projeto).
- Dúvida de OUTRO PAPEL (ex.: técnica, de arquitetura)? CONSULTE aquele agente (§4).
- Precisa de DECISÃO DO HUMANO? NÃO pergunte direto — RETORNE a lista de dúvidas ao orquestrador.
- Ao terminar, escreva a NOTA DE HANDOFF no artefato e devolva um resumo enxuto.
```

---

## 4. Comunicação entre agentes

Como você pediu, os agentes **se conversam para tirar dúvidas**. O Claude Code **não** tem chat
bidirecional ao vivo entre pares; o que existe (e usamos) é **consulta request/response** +
**estado compartilhado em arquivo**. Três canais:

### 4.1. Consulta ponto-a-ponto (síncrona, request/response)
Um agente invoca outro como **subagent aninhado** com uma **pergunta focada**; o consultado lê os
artefatos, responde, e o agente que perguntou segue. Exemplos:
- `dev-senior`, ao implementar, encontra ambiguidade no PLAN → **consulta `arquiteto-senior`**;
- `arquiteto-senior`, ao planejar, tem dúvida de regra de negócio → **consulta `product-manager`**;
- `tech-lead`, na revisão, quer confirmar a intenção de um critério → **consulta `product-manager`**.

> Mecânica: aninhamento de subagent é permitido (profundidade máx. **5**, fixa). O consultado
> devolve **só a resposta**. **Guardrail anti-loop:** no máx. **2 consultas por dúvida** e a
> consulta é sempre **específica** (uma pergunta, não "revise tudo").

### 4.2. Broker pelo orquestrador (padrão recomendado — determinístico e auditável)
Em vez de A chamar B direto, A **retorna** ao `/feature-workflow`: *"preciso consultar o arquiteto
sobre X"*. O orquestrador faz a ponte (invoca B com a pergunta + contexto) e devolve a resposta a A.
Vantagem: fluxo visível pra você, sem aninhamento profundo, fácil de auditar/parar.

### 4.3. Handoff durável em arquivo (a "conversa" que persiste)
O canal principal continua sendo o **disco**. Ao fim de cada fase, o agente escreve:
- **Nota de Handoff** no próprio artefato (PRD/PLAN): *o que fez, decisões, dúvidas em aberto pro próximo papel*;
- Uma linha no **log de decisões** da feature (ADR leve — ver §11), quando toma uma decisão relevante.
O próximo agente **lê** essas notas no Passo 0. É assim que o PM "fala" com o Arquiteto que "fala"
com o Dev — de forma assíncrona, versionada e sem depender de a conversa estar viva.

**Resumindo:** consulta (4.1/4.2) para tirar dúvida na hora; handoff em arquivo (4.3) para o
contrato entre fases. Default recomendado: **broker pelo orquestrador** + **handoff em arquivo**.

---

## 5. Estrutura de arquivos

```
ai-flow/
  SKILLS/SHARED/*.md                        (INALTERADO)
  SKILLS/SHARED/feature-workflow.md         (NOVO — orquestrador: delega os 4 papéis com gates)
  CLAUDE/SKILLS/feature-workflow/SKILL.md   (NOVO — comando /feature-workflow)

  AGENTS/
    DESIGN.md                               (este documento)
    SHARED/                                 (NOVO — personas agnósticas, fonte de verdade)
      product-manager.md                    → /spec        · Write só prd/
      arquiteto-senior.md                   → /planejar    · Write só plan/, adr/
      dev-senior.md                         → /implementar · Edit/Write/Bash · lê stack do map
      tech-lead.md                          → /code-review · read-only + PR
      lenses/                               (lentes de linguagem — só conhecimento idiomático)
        dotnet.md   react.md                (2 primeiras — cobrem velox e fake-bet)
  CLAUDE/AGENTS/*.md                        (NOVO → instalado em .claude/agents/*.md — 4 arquivos)

  CONVENTIONS.md · README.md                (ATUALIZAR — nova seção "Agentes" + /feature-workflow)
```

**Por que só Claude Code agora:** `.claude/agents/*.md` é lido **nativamente por Claude Code,
Cursor e Copilot (VS Code)**. Um formato só cobre 3 ferramentas. Só o **Gemini** precisaria de
arquivo próprio (`.gemini/agents/`, campos `kind/temperature/max_turns`) — fica para depois.

**Comandos ≠ personas:** `CLAUDE/SKILLS` (comandos `/skill`) continua separado de `CLAUDE/AGENTS`
(personas). A árvore `AGENTS/` só cuida de "quem executa".

> ⚠️ **Recarregamento:** editar um arquivo de agente em disco **não** recarrega na sessão ativa —
> é preciso reiniciar a sessão (ou criar via `/agents`). Documentar isso no CONVENTIONS.md.

---

## 6. Os 4 papéis (personas)

Cada sketch abaixo já inclui o **bloco de isolamento** (§3) e o **de comunicação** (§4).

### 6.1. `AGENTS/SHARED/tech-lead.md`

```markdown
---
name: tech-lead
description: Tech Lead guardião de engenharia. Use após um baby step de /implementar
  para revisar aderência ao PRD/PLAN, segurança, performance e padrões. Read-only.
tools: Read, Glob, Grep, Bash
model: opus
---
# Papel: Tech Lead (Guardião de Engenharia)
Você é um Tech Lead sênior, cético e rigoroso: prioriza segurança, corretude e
manutenibilidade acima de velocidade. Critica o código (nunca a pessoa), aponta
`arquivo:linha`, sugere a correção e baseia toda crítica nos padrões do projeto.

## Seu processo
É a skill /code-review — siga `SKILLS/SHARED/code-review.md` à risca. NÃO reescreva os passos.

## Tools
Read-only (Read/Glob/Grep). Bash só p/ `git diff` e criar PR (gh/az) no passo confirmado. Nunca edite código.

## Janela de contexto (isolamento) — LEIA
Você roda em janela NOVA e PRÓPRIA. Não vê a conversa principal nem o trabalho de outros agentes.
Insumos: este prompt (paths de PRD/PLAN/branch) + arquivos no disco + Passo 0 da skill (map + docs/code-review/).

## Comunicação
Dúvida sobre a INTENÇÃO de um critério? Consulte @product-manager (uma pergunta focada).
Precisa de decisão do humano? RETORNE ao orquestrador. Ao fim, anexe a Nota de Handoff ao relatório.
```

### 6.2. `AGENTS/SHARED/product-manager.md`

```markdown
---
name: product-manager
description: Product Manager/Owner. Use para transformar ideia/ticket em PRD (/spec) —
  foca no "O QUÊ" (negócio, critérios BDD), nunca no "COMO". Levanta dúvidas no início.
tools: Read, Glob, Grep, Write
model: opus
---
# Papel: Product Manager / Owner
Você é um PM sênior. Pensa em valor de negócio, critérios de aceite mensuráveis (BDD) e
regras de negócio. NÃO especifica implementação nem código.

## Seu processo
É a skill /spec — siga `SKILLS/SHARED/spec.md`.

## Tools
Write só na pasta prd/. Não toca em código.

## Janela de contexto (isolamento) — LEIA
Você roda em janela NOVA e PRÓPRIA. Insumos: este prompt + arquivos no disco + Passo 0 (map + docs/business/).

## Comunicação (ask-upfront)
Você NÃO pergunta ao humano no meio. Levante TODAS as dúvidas de negócio no início e RETORNE a
lista estruturada ao orquestrador; siga só após as respostas. Ao fim, anexe a Nota de Handoff ao PRD.
```

### 6.3. `AGENTS/SHARED/arquiteto-senior.md`

```markdown
---
name: arquiteto-senior
description: Arquiteto de Software Sênior. Use para transformar um PRD em PLAN técnico com
  baby steps independentes (/planejar). Explora o código a fundo. Levanta dúvidas no início.
tools: Read, Glob, Grep, Write, Bash
model: opus
---
# Papel: Arquiteto de Software Sênior
Você é um arquiteto sênior. Explora o código real por camada, respeita os padrões do projeto
e quebra a feature em baby steps pequenos, ordenados (dados/domínio → API por último) e testáveis.

## Seu processo
É a skill /planejar — siga `SKILLS/SHARED/planejar.md`. HARD STOP após salvar o PLAN.

## Tools
Write só em plan/ e adr/. Bash só p/ atualizar o repo (git fetch/checkout/pull), nunca editar código.

## Janela de contexto (isolamento) — LEIA
Janela NOVA e PRÓPRIA. Insumos: este prompt (path do PRD) + código no disco + Passo 0 (map + docs/architecture/).

## Comunicação
Dúvida de regra de negócio? Consulte @product-manager. Dúvidas técnicas p/ o humano: RETORNE ao
orquestrador (ask-upfront). Ao fim, anexe a Nota de Handoff ao PLAN e registre decisões no log da feature.
```

### 6.4. `AGENTS/SHARED/dev-senior.md` (core + lente)

```markdown
---
name: dev-senior
description: Dev Sênior especialista. Use para implementar UM baby step do PLAN (/implementar).
  Descobre a linguagem/stack pelo {slug}-map.json e aplica a lente idiomática correspondente.
tools: Read, Glob, Grep, Edit, Write, Bash
model: sonnet
---
# Papel: Dev Sênior
Você é um dev sênior pragmático. Implementa EXATAMENTE o baby step do PLAN, replicando o
estilo do código existente, sem adicionar complexidade não pedida. Roda build e testes.

## Seu processo
É a skill /implementar — siga `SKILLS/SHARED/implementar.md`. Uma etapa por vez.

## Especialização por linguagem (lente)
Linguagem é DADO, não persona: descubra a stack no Passo 0 ({slug}-map.json → stack.backend/frontend/infra).
Carregue a lente em `AGENTS/SHARED/lenses/{lang}.md` como apoio idiomático.
⚠️ **Precedência:** `docs/architecture/` DO PROJETO sempre vence a lente.

## Janela de contexto (isolamento) — LEIA
Janela NOVA e PRÓPRIA. Insumos: este prompt (path do PLAN + nº da etapa + branch) + código + Passo 0 (map).

## Comunicação
Ambiguidade no PLAN? Consulte @arquiteto-senior (uma pergunta focada) antes de "inventar".
Precisa de decisão do humano (ex.: nome de branch)? RETORNE ao orquestrador. Anexe Nota de Handoff.

## Tools / regras
Edit/Write/Bash (código, build, testes, commit). Nunca `git add -A` sem verificar; nunca push automático.
```

### 6.5. Lente de linguagem — `AGENTS/SHARED/lenses/dotnet.md` (exemplo)

```markdown
# Lente: .NET / C#
Conhecimento idiomático genérico de .NET para apoiar o dev-senior. (docs/architecture/ do
projeto SEMPRE vence isto.)
- Async/await ponta a ponta; `CancellationToken` propagado; nada de `.Result`/`.Wait()`.
- LINQ legível; evitar N+1 (Include/projeção); `AsNoTracking` em leitura.
- Nullable reference types; guard clauses; `record` p/ DTOs imutáveis.
- Testes: xUnit + FluentAssertions + Arrange/Act/Assert; mocks sem over-mocking.
- Nomes: PascalCase p/ público, camelCase p/ local; um tipo por arquivo.
```

*(analogamente `lenses/react.md`: hooks, TanStack Query, componentes puros, zod, etc.)*

### 6.6. Adapter Claude — `CLAUDE/AGENTS/tech-lead.md`

```markdown
---
name: tech-lead
description: Tech Lead guardião de engenharia. Use após /implementar para revisar
  aderência ao PRD/PLAN, segurança, performance e padrões. Read-only.
tools: Read, Glob, Grep, Bash
model: opus
---
# Tech Lead (adapter Claude Code)
Persona e processo completos: leia `AGENTS/SHARED/tech-lead.md`.

## Notas Claude Code
- Use Read/Glob/Grep nativos para PRD, PLAN e diff.
- Criação de PR conforme `map.tooling.project-management` (MCP azure-devops | `gh` | `glab`).
- Ambiente Windows → adaptar comandos para PowerShell.
```

---

## 7. O orquestrador `/feature-workflow`

`/feature-workflow` roda na **sessão principal** e é o **maestro + broker**. Ele **delega cada fase
a um subagent isolado** (janela própria), coleta o resumo, aplica o **gate humano** e só então
dispara a próxima fase. Também faz a **ponte de comunicação** (§4.2) e de perguntas ao humano (§3).

```
/feature-workflow   (sessão principal = maestro + broker; humano-no-loop)
  │
  ├─ Passo 0: carregar contexto ({slug}-map.json + {slug}-context.md do projeto ativo)
  │
  ├─ FASE 1 · delega → [subagent product-manager]  (janela própria)  → roda /spec
  │      ↑ perguntas ao humano voltam pelo broker;  ↓ retorna PRD + Nota de Handoff
  │      ⛔ GATE: apresenta PRD, pede aprovação
  │
  ├─ FASE 2 · delega → [subagent arquiteto-senior]  (janela própria)  → roda /planejar
  │      ↔ pode consultar product-manager (via broker);  ↓ retorna PLAN + Nota de Handoff
  │      ⛔ GATE: apresenta PLAN, pede aprovação
  │
  ├─ FASE 3 · delega → [subagent dev-senior]  (janela própria)  → roda /implementar (1 etapa)
  │      ↔ pode consultar arquiteto-senior;  carrega lente conforme stack;  ↓ retorna diff + Nota
  │      ⛔ GATE por etapa: build/testes verdes? seguir p/ próxima etapa?
  │
  └─ FASE 4 · delega → [subagent tech-lead]  (janela própria, read-only)  → roda /code-review
         ↔ pode consultar product-manager;  ↓ retorna relatório 🔴/🟡/🟢
         ⛔ GATE: decide PR
```

Regras do orquestrador:
- **Publish/subscribe:** só dispara a fase seguinte quando o artefato da anterior existe **e** foi aprovado.
- **Broker:** relaya perguntas agente→humano e consultas agente→agente (§4.2); mantém tudo auditável.
- **Não** reescreve os passos das skills (reusa `SHARED`, como o `start-project` já faz).
- **Guardrails anti-loop** nas consultas e "uma etapa por vez" no dev.

> **Complementar ao `start-project`:** `start-project` = bootstrap zero→MVP (cria projeto).
> `/feature-workflow` = loop recorrente por feature em projeto existente. Não se sobrepõem.

---

## 8. Dev por linguagem: híbrido core + lentes

**Decisão:** um único `dev-senior` (core) + **lentes** de linguagem.

**Racional:** linguagem é **DADO** (já está em `{slug}-map.json` → `stack.*`; ex.: `velox` = .NET 8 +
React 18, `fake-bet` = .NET 10 + React 19), não persona. Um dev que lê a stack do map preserva a
regra "sem contexto de projeto embutido"; N agentes fixos por linguagem duplicariam arquivos e
reintroduziriam stack hard-coded.

**Mecanismo:** o core descobre a stack no Passo 0 e carrega `lenses/{lang}.md` (só idiomas).
**Precedência inequívoca:** `docs/architecture/` do projeto **sempre vence** a lente.

**Evolução:** começar com `dotnet` e `react`; adicionar lentes conforme surgirem stacks novas.

---

## 9. Orquestração e humano-no-loop

- **Humano é o orquestrador.** Gates entre artefatos = determinismo + auditoria. Resistir a swarm
  autônomo (custo/loops/41–86% de falha na pesquisa).
- Subagents podem aninhar (profundidade fixa 5) — usamos isso só para **consulta pontual** (§4.1),
  não para montar swarm.
- **Tiers de modelo por complexidade** (controle de custo, estilo wshobson): Opus p/ PM/Arquiteto/
  Tech Lead (análise crítica), Sonnet p/ Dev. Ajustável por `model: inherit` se preferir escolher por sessão.

---

## 10. AGENTS.md (camada de contexto — complementar)

`AGENTS.md` é **contexto de repo** ("README para agentes"), **não** persona — camadas ortogonais.
Hoje `{slug}-map.json` + `{slug}-context.md` + `.ai-project` já cumprem esse papel no ai-flow.

**Opcional / futuro:** gerar um `AGENTS.md` **fino** por repo-alvo (ao lado do `.ai-project`) que
só aponta para o map. Bônus: Codex/Cursor/Copilot/Gemini leem de graça. Manter enxuto (limite de
32 KiB do Codex). Fora do escopo do 1º corte.

---

## 11. Sugestões de melhoria

Ideias que **não** estavam no pedido, mas fortalecem o design. Marcadas por quando adotar.

1. **Nota de Handoff padronizada (adotar já).** Um bloco fixo no fim de cada artefato:
   `## Handoff` → *De/Para · Decisões · Dúvidas em aberto · O que o próximo papel deve saber*.
   Torna a "conversa" entre agentes **auditável e durável** (é o antídoto nº 1 contra perda de contexto).

2. **Log de decisões por feature / ADR leve (adotar já).** Um `DECISIONS.md` (ou reusar `adr/`) onde
   cada agente anexa 1 linha ao decidir algo relevante. Vira a **memória inter-agente persistente**
   (a versão simples e file-based do "shared state" do MetaGPT/claude-flow).

3. **Padrão "perguntar antes" nas skills interativas (adotar já — é pré-requisito do isolamento).**
   Adaptar `/spec` e `/planejar` para levantar **todas** as dúvidas no início e retorná-las
   estruturadas, em vez de perguntar no meio. Menos idas e vindas, casa com a janela isolada.

4. **Guardrails anti-loop de consulta (adotar já).** Máx. de consultas por dúvida e por fase
   (estilo ChatDev: "2 sem mudança / 10 rodadas"). Sem isso, consulta A↔B pode gastar tokens à toa.

5. **Passar paths, não conteúdo (adotar já).** O prompt de invocação passa **caminhos** (PRD/PLAN)
   e deixa o agente ler o que precisa — economiza o canal de entrada e mantém o contexto enxuto.

6. **`/feature-workflow --resume` (evolução).** Como o estado vive nos arquivos (PRD/PLAN/Notas),
   dá pra retomar do último gate sem recomeçar. Barato e muito útil.

7. ✅ **Agente de QA / Testes (5º papel — adotado em 2026-07-01).** Persona `qa` (`AGENTS/SHARED/qa.md`)
   + skill `/test-e2e` (`SKILLS/SHARED/test-e2e.md`): sobe o ambiente local via Docker, simula
   navegação real via MCP de browser e reporta bugs com evidência em screenshot. Roda entre
   `/implementar` (todas as etapas) e `/code-review`; ainda não integrado ao `/feature-workflow`
   (ver §14).

8. **`memory: project` no tech-lead e no arquiteto (evolução).** Acumula recorrências/decisões do
   projeto entre execuções — alinhado ao `{slug}-context.md`.

9. **Contrato de fase explícito (evolução).** Cada fase declara pré-condições (artefato anterior
   aprovado) e pós-condições (artefato + Nota de Handoff). Formaliza o publish/subscribe.

10. **`disallowedTools` reforçando o least-privilege (adotar já).** Ex.: tech-lead com
    `disallowedTools: Edit, Write` garante que ele **nunca** edita código, só sugere.

---

## 12. Plano de implementação (baby steps)

1. **Fundação** — criar `AGENTS/SHARED/` + seção "Agentes" no `CONVENTIONS.md` (contrato "persona =
   identidade + qual skill + tools + isolamento + comunicação"; regra "reinicie a sessão após editar agentes").
2. **4 personas SHARED** — `product-manager`, `arquiteto-senior`, `dev-senior`, `tech-lead`
   (cada uma com bloco de isolamento §3 + comunicação §4).
3. **Lentes** — `lenses/dotnet.md` + `lenses/react.md` + regra de precedência.
4. **Adapters Claude** — `CLAUDE/AGENTS/*.md` (4) prontos para `.claude/agents/`.
5. **Adaptar skills interativas** — variante "ask-upfront" em `/spec` e `/planejar` (retornar dúvidas
   estruturadas) + convenção de **Nota de Handoff** e **log de decisões** nos artefatos.
6. **Orquestrador** — `SKILLS/SHARED/feature-workflow.md` + `CLAUDE/SKILLS/feature-workflow/SKILL.md`
   (delegação a subagents isolados, gates, broker de perguntas/consultas, guardrails).
7. **Docs** — atualizar `README.md` (tabela de agentes + `/feature-workflow`).

---

## 13. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Persona duplicar a lógica da skill | Contrato rígido "persona = identidade + qual skill + tools"; review no CONVENTIONS.md |
| Skill interativa não pergunta ao humano dentro do subagent | Padrão ask-upfront (retornar dúvidas) + broker do orquestrador (§3) |
| Consulta A↔B vira loop / gasto de tokens | Guardrails: máx. consultas por dúvida/fase; pergunta sempre focada (§4) |
| Lente divergir do projeto | `docs/architecture/` do projeto **sempre vence** a lente |
| Editar agente em disco não recarrega na sessão | Documentar "reinicie a sessão após editar agentes" |
| Least-privilege do reviewer não é absoluto (Bash p/ diff/PR) | Separar análise (read-only) da criação de PR; `disallowedTools: Edit, Write` |
| Contexto perdido entre agentes isolados | Handoff em arquivo + Nota de Handoff + log de decisões (§4.3, §11) |
| Tentação de swarm autônomo (nesting até 5) | Nesting só p/ consulta pontual; humano é o único orquestrador |
| Superfícies em evolução (Cursor/Gemini/Copilot) | 1º corte só Claude Code; outras ferramentas quando estabilizar |

---

## 14. Decisões tomadas e em aberto

**Tomadas:** híbrido core+lentes · 4 papéis · orquestrador `/feature-workflow` · **cada agente em
janela isolada** · **agentes se consultam (request/response) + handoff em arquivo** · só Claude Code.

> **Atualização 2026-07-07 — autonomia + paralelismo.** O `/feature-workflow` deixou de ter gates
> humanos: cada fase é liberada por **validação objetiva** (checklist do PRD/PLAN, build/testes
> verdes, review sem 🔴, ciclos limitados por guardrail). Modo normal = **uma única rodada de
> perguntas no início**; `--auto` = zero interação (toda dúvida vira **premissa assumida**
> registrada). A FASE 3 roda em **ondas topológicas paralelas** — máx. 3 `dev-senior` simultâneos,
> branch efêmera + worktree por etapa, merge + build/testes integrados fechando cada onda, PLAN
> consolidado pelo orquestrador. Push/PR seguem **nunca automáticos**. Isso substitui as seções §7
> e §9 no que diz respeito a gates; fonte atual: `SKILLS/SHARED/feature-workflow.md`.

**Em aberto (futuro):**
- Consulta agente↔agente: **default broker pelo orquestrador** (§4.2) vs permitir consulta direta aninhada (§4.1)? (Impacta auditabilidade.)
- Tiers de modelo fixos vs `inherit`.
- Formato exato da variante "ask-upfront" de `/spec` e `/planejar` (quanto muda das skills atuais).
- Adotar já o `DECISIONS.md`/ADR leve por feature ou só a Nota de Handoff?
- Gerar `AGENTS.md` por repo (e symlink p/ CLAUDE.md) no `setup-project`/`start-project`.
- Adapters Gemini/Cursor/Copilot explícitos (quando cobrir além do Claude Code).
- Integrar `/test-e2e` (papel `qa`) ao `/feature-workflow` como uma 5ª fase entre Dev e Tech Lead.
- Lentes adicionais (python, node, angular…).

---

## 15. Referências

**Mecânica oficial**
- Claude Code — Subagents: https://code.claude.com/docs/en/sub-agents
- Claude Agent SDK — Subagents: https://code.claude.com/docs/en/agent-sdk/subagents
- Claude Code — Skills: https://code.claude.com/docs/en/skills
- Cursor — Subagents: https://cursor.com/docs/subagents · Rules: https://cursor.com/docs/rules
- Gemini CLI — Subagents: https://geminicli.com/docs/core/subagents/
- GitHub Copilot — Custom agents (VS Code): https://code.visualstudio.com/docs/copilot/chat/chat-modes
- GitHub Copilot CLI — custom agents: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli

**AGENTS.md**
- Site oficial: https://agents.md/
- OpenAI Codex — AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- InfoQ — AGENTS.md open standard: https://www.infoq.com/news/2025/08/agents-md/

**Times de agentes para dev**
- BMAD-METHOD: https://github.com/bmad-code-org/BMAD-METHOD
- wshobson/agents: https://github.com/wshobson/agents
- VoltAgent/awesome-claude-code-subagents: https://github.com/VoltAgent/awesome-claude-code-subagents
- MetaGPT: https://github.com/FoundationAgents/MetaGPT · paper: https://arxiv.org/html/2308.00352v6
- ChatDev: https://github.com/OpenBMB/ChatDev · paper: https://arxiv.org/html/2307.07924v5
- CrewAI (hierarchical): https://docs.crewai.com/en/learn/hierarchical-process
- LangGraph vs AutoGen: https://www.zenml.io/blog/langgraph-vs-autogen
- claude-flow (swarm): https://github.com/ruvnet/claude-flow/wiki/Agent-Categories
- Custo multi-agente (paper): https://arxiv.org/html/2510.26585v2
