# Skill: Feature Workflow (Orquestrador Autônomo de Papéis)

## Descrição
Orquestra o ciclo completo de uma feature delegando cada fase a um **agente por papel** que roda
em **janela de contexto isolada** (subagent): Product Manager (`/spec`) → Arquiteto Sênior
(`/planejar`) → Dev Sênior (`/implementar`, **em ondas paralelas**) → Tech Lead (`/code-review`).

Esta skill é o **maestro + broker** e conduz o ciclo de forma **autônoma**: no lugar de gates
humanos, cada fase é liberada por **validação objetiva** (checklist do artefato, build/testes
verdes, review sem 🔴). Ela **não reescreve** a lógica das skills — cada agente executa a skill
SHARED da sua fase.

### Modos de execução

| Modo | Interação humana |
|------|------------------|
| `/feature-workflow` (normal) | **Uma única rodada no início**: ponto de entrada (se ambíguo), branch da feature e **todas** as dúvidas de negócio do PM num bloco só. Depois disso, zero interação até o relatório final. |
| `/feature-workflow --auto` | **Zero interação.** Toda dúvida vira **premissa assumida**, registrada no artefato (seção "Premissas Assumidas") e no log de decisões (`adr/`). |
| **sub-orquestrado** (invocado pelo `/epic-workflow`) | **Zero interação**, e você mesmo roda dentro de um subagent — uma feature entre várias. Ver § Modo Sub-orquestrado. |

Em **todos** os modos: **nunca** push nem PR automáticos — o fluxo termina com o relatório final
**sugerindo** os comandos. E em todos eles o fluxo **para e devolve** ao nível de cima quando um
guardrail estoura (ver § Paradas por guardrail).

> **Complementar ao `start-project`:** `start-project` = bootstrap zero→MVP (cria o projeto).
> `feature-workflow` = loop recorrente por feature em projeto **já existente**.
> **`epic-workflow`** = pacote de features / épico grande, uma altitude **acima** desta skill.

---

## Modo Sub-orquestrado (invocado pelo `/epic-workflow`)

Quando o prompt de invocação indicar **modo sub-orquestrado**, esta skill roda dentro de um subagent
`engineering-manager`, como **uma feature entre várias** que o `/epic-workflow` está tocando em
paralelo. O processo abaixo muda nestes pontos (o restante segue igual ao `--auto`):

1. **Ponto de entrada dado.** O prompt traz o **path do PLAN** → comece direto na **FASE 3**. Não
   re-resolva o ponto de entrada (Passo 0.2) e não refaça as FASES 1 e 2 — o PRD e o PLAN já foram
   escritos e **já foram validados** pelo `/epic-workflow`.
2. **Branch, branch base e worktrees vêm no prompt.** A branch da feature já foi criada a partir de
   `epic/{nome}` pelo orquestrador, com o worktree pronto — em **cada repo** que a feature toca.
   Use-os; não crie nem mova nada.
3. **Teto de `dev-senior` vem no prompt.** Use-o no lugar do padrão do Passo 3.1. Ele é sempre
   **≤ 3** (o limite desta skill continua valendo) e pode ser menor — outros orquestradores de
   feature estão consumindo o mesmo orçamento ao mesmo tempo.
4. **Não mergeie na branch base.** O merge das efêmeras de etapa **na branch da feature** continua
   sendo seu (Passo 3.4). O merge da **feature no épico** é de quem te invocou — pare na branch da
   feature.
5. **Atualize o PLAN, não o épico.** O artefato do épico é consolidado por quem te invocou.
6. **Resumo estruturado no retorno:** branch, etapas fechadas (nº + hash), resultado de build/testes,
   veredito do review, **premissas assumidas** e o que ficou pendente. Retorno vazio ou sem hash é
   lido como **falha** pelo orquestrador — não como sucesso silencioso.
7. **Guardrail estourado → preserve o estado e retorne** dizendo onde parou. Não insista.
8. **Correção pós-review de integração:** se o prompt te reinvocar com 🔴 de um review de épico, ele
   traz uma **branch de correção própria** (`fix/...`) e o worktree dela. Trabalhe nela — a branch
   original da feature já não existe, e a do épico não é sua.

---

## Pré-requisitos

- Os 4 agentes instalados como subagents (ex.: `.claude/agents/` no cliente): `product-manager`,
  `arquiteto-senior`, `dev-senior`, `tech-lead`. Ver `AGENTS/SHARED/` e os adapters da ferramenta.
- Projeto ativo configurado (`.ai-project` → `MAPS/{projeto}`).

---

## Princípios de orquestração

1. **Validação objetiva no lugar de gate humano.** Uma fase só dispara quando o artefato da
   anterior **existe e passou na validação automática** (checklists nas fases abaixo). O
   publish/subscribe continua — só muda quem aprova.
2. **Interação humana limitada.** Modo normal = só a rodada inicial; `--auto` = nenhuma. Depois
   da rodada, dúvida nova **não volta ao humano**: vira consulta entre agentes (broker) ou
   **premissa registrada** — destacada no relatório final.
3. **Delegação isolada.** Cada fase roda num subagent com janela própria. Passe **paths** (não o
   conteúdo inteiro) + as respostas/premissas já coletadas.
4. **Broker.** Consultas agente→agente passam por você (§ Broker). Perguntas agente→humano **só
   existem na rodada inicial** do modo normal.
5. **Paralelismo em ondas (FASE 3).** As etapas do PLAN rodam em **ondas topológicas**: etapas sem
   dependência mútua **e com arquivos disjuntos** entram na mesma onda, até **3 `dev-senior`
   simultâneos**, cada um em **branch efêmera + worktree próprio**. Merge + build/testes
   integrados fecham a onda antes da próxima.
6. **Guardrails anti-loop.** Todo ciclo automático é limitado (2 re-invocações por validação
   reprovada, 2 correções por build/teste vermelho, 1 re-execução por conflito de merge, 2 ciclos
   de correção no review). Estourou → **PARA e reporta** — nunca insiste indefinidamente.
7. **Handoff durável.** Cada fase termina com uma **Nota de Handoff** no artefato; decisões e
   premissas vão para o **log de decisões** (`adr/`). O próximo agente lê isso no Passo 0.
8. **Isolamento de working tree (OBRIGATÓRIO).** Quem toca o disco do projeto sempre trabalha em
   **git worktree** dedicado à branch, nunca no clone principal. No paralelismo, cada etapa da
   onda ganha **branch efêmera própria** (o Git recusa dois worktrees na mesma branch — por isso
   paralelo exige branches distintas). Ver `CONVENTIONS.md` § Git Worktree.
9. **Sem push automático.** O orquestrador nunca faz push nem cria PR — o relatório final sugere
   os comandos e o humano decide.

---

## Processo

### Passo 0: Carregar Contexto e Resolver o Ponto de Entrada

**0.1.** Identificar projeto ativo (`.ai-project`) e ler `{slug}-map.json` + `{slug}-context.md`
(igual às demais skills). **Detectar o modo:**
- prompt indica **sub-orquestrado** (veio do `/epic-workflow`) → § Modo Sub-orquestrado; pule para a
  FASE 3 com o PLAN que veio no prompt;
- `--auto` presente → modo autônomo total;
- caso contrário → modo normal.

**0.2. Resolver o ponto de entrada sem perguntar, quando possível:**
- O comando trouxe **path de PRD** → começar na FASE 2 (`/planejar`)
- Trouxe **path de PLAN** → começar na FASE 3 (`/implementar`)
- Trouxe **branch para revisar** → começar na FASE 4 (`/code-review`)
- Trouxe **só a demanda em texto** → começar na FASE 1 (`/spec`)
- Ambíguo no modo `--auto` → assumir o ponto mais conservador (FASE 1) e registrar premissa
- Ambíguo no modo normal → incluir a pergunta na rodada inicial (0.3)

**0.3. Rodada inicial (SÓ no modo normal — a única interação do ciclo):**

Antes de montá-la, se o ponto de entrada for a FASE 1, invoque o `product-manager` em **modo
levantamento** (ele só devolve a lista de dúvidas de negócio, sem escrever o PRD — ver FASE 1).
Então apresente **um único bloco estruturado** ao humano com:

```
🎛️ Feature Workflow — rodada inicial (única interação; depois sigo sozinho até o fim)

1. Ponto de entrada: {inferido ou pergunta}
2. Branch da feature: {sugestão: feature/{slug-da-feature}} — confirmar/editar
3. Dúvidas de negócio do Product Manager:
   Q1. ...
   Q2. ...
```

Colete todas as respostas de uma vez. **Depois desta rodada, nenhuma outra pergunta é feita ao
humano** — exceto parada por guardrail.

No modo `--auto`: pule 0.3 — branch = `feature/{slug-da-feature}` derivada da demanda; dúvidas
viram premissas assumidas.

---

### Passo 1: FASE 1 — Product Manager (`/spec`)

*(pular se o ponto de entrada for posterior)*

**1.1.** Modo normal: invoque o `product-manager` em **modo levantamento** (devolve só a lista de
dúvidas — alimenta a rodada inicial do Passo 0.3); depois **re-invoque** com as respostas
anexadas para escrever o PRD.
Modo `--auto`: invoque direto em **modo autônomo** — sem perguntas; cada dúvida vira premissa na
seção **"Premissas Assumidas"** do PRD.

**1.2. ✅ Validação automática do PRD (substitui o gate humano).** Verifique no arquivo salvo:
- [ ] Critérios de aceite em BDD (Dado/Quando/Então) e falsificáveis
- [ ] Escopo com não-objetivos explícitos (o que fica FORA)
- [ ] Caminhos infelizes cobertos (erro, vazio, permissão, concorrência)
- [ ] Toda regra de negócio com fonte — ou registrada como premissa assumida
- [ ] Nota de Handoff presente

Reprovou → re-invoque o `product-manager` apontando **exatamente os gaps** (máx. **2**
re-invocações). Persistiu → ⛔ parada por guardrail.

**1.3.** Registre no log (`adr/`): "PRD {path} validado automaticamente — {resumo}". Avance.

---

### Passo 2: FASE 2 — Arquiteto Sênior (`/planejar`)

**2.1.** Delegar ao subagent **`arquiteto-senior`**, passando o **path do PRD** validado e o modo.
Em **ambos os modos** (a rodada inicial já passou): dúvida de **negócio** → consulta ao
`product-manager` via broker; decisão **técnica** → o arquiteto **decide, registra em ADR e
segue** (não volta ao humano). O agente dá **HARD STOP** após o PLAN.

**2.2. ✅ Validação automática do PLAN.** Verifique no arquivo salvo:
- [ ] Toda etapa tem: **Dependências**, **Arquivo(s) Afetado(s)** (paths completos),
      **Paralelizável: Sim/Não** e critérios de aceitação verificáveis
- [ ] Grafo de dependências **sem ciclo**
- [ ] Migrations / mudanças irreversíveis marcadas **Paralelizável: Não**
- [ ] Nota de Handoff presente

Reprovou → re-invoque com os gaps (máx. **2**). Persistiu → ⛔ parada por guardrail.

**2.3.** Montar o **grafo de ondas** (Passo 3.1) e registrar no log o plano de execução
(quantas ondas, quais etapas em cada uma).

---

### Passo 3: FASE 3 — Dev Sênior (`/implementar`) — ondas paralelas

**3.1. Montar as ondas (do grafo do PLAN):**
1. Nível topológico pelo campo **Dependências** (uma etapa só entra quando todas as suas
   dependências já concluíram em ondas anteriores);
2. Dentro do nível, etapas com **interseção de Arquivo(s) Afetado(s)** não rodam juntas — a
   segunda desce para uma sub-onda seguinte;
3. Etapa **`Paralelizável: Não`** (migration, mudança irreversível) roda **sozinha** na sua onda;
4. Máximo **3 etapas por onda** — excedente desce para a sub-onda seguinte;
5. **PLAN antigo** (sem `Paralelizável` ou sem `Arquivo(s) Afetado(s)` em alguma etapa — ex.:
   ponto de entrada "já tenho PLAN"): trate essas etapas como **sequenciais** (onda de 1) — nunca
   assuma paralelismo sem os dois campos presentes.

**3.2. Preparar branches e worktrees da onda — é você quem cria, não o dev:**
- Branch da feature: `{branch}` (da rodada inicial, ou derivada no `--auto`). Ela vive no seu
  próprio worktree — criar na primeira onda, se não existir. **Em modo sub-orquestrado ela já vem
  pronta** no prompt; não a crie.
- Onda com **1 etapa** → o dev trabalha **direto na branch da feature** (worktree dela).
- Onda com **2+ etapas** → para cada etapa, branch efêmera **`{branch}--etapa-{N}`** criada a
  partir do **HEAD atual da branch da feature**, cada uma em worktree próprio:
  ```bash
  git -C {repo.path} worktree add "{worktrees}/{branch-slug}--etapa-{N}" -b {branch}--etapa-{N} {branch}
  ```
  (`{worktrees}` = `{repo.worktrees-path}` ou `{repo.path}-worktrees`.)

> **Quem monta a onda cria a topologia dela.** Você sabe quais etapas rodam em paralelo; o dev não.
> Por isso `implementar.md` § Modo Orquestrado proíbe o dev de criar worktree — se ele recebesse
> essa tarefa, N devs simultâneos disputariam a criação no mesmo repo. `worktree add` a partir do
> clone principal é permitido (não altera o working tree dele) — `checkout`/`pull` não.

**3.3. Disparar os `dev-senior` da onda EM PARALELO** (uma invocação por etapa, simultâneas),
cada um recebendo: **path do PLAN** + **número da ETAPA** + **branch a usar** (efêmera ou da
feature) + **branch base** + **path do worktree dela** (obrigatório — o dev não o cria e retorna
bloqueio se não vier) + instrução de **modo orquestrado** (ver `implementar.md` § Modo
Orquestrado): sem confirmações, **não atualizar o PLAN** (o orquestrador consolida), devolver
resumo estruturado (arquivos, build/testes, hash do commit, Observações da Implementação).

**3.4. Fechar a onda (barreira — só depois que TODOS os devs da onda retornarem):**
1. **Merge** de cada branch efêmera na branch da feature, na ordem das etapas
   (`git merge --no-ff` dentro do worktree da feature);
2. **Conflito de merge** → NÃO resolver na mão: descarte a branch efêmera conflitante e
   **re-invoque o dev** para reimplementar a etapa **sobre a feature já atualizada**
   (sequencial, direto na branch da feature). Máx. **1** re-execução por etapa; conflitou de
   novo → ⛔ parada por guardrail;
3. **Build + testes integrados** na branch da feature (comandos de `docs/architecture/`).
   Falhou → re-invocar o dev responsável com o erro (máx. **2** correções) → persistiu →
   ⛔ parada por guardrail;
4. **Limpeza:** `git worktree remove` + `git branch -d` das efêmeras mescladas;
5. **Atualizar o PLAN** (o orquestrador, não o dev): etapas da onda → ✅ Concluída + commit +
   Observações da Implementação devolvidas por cada dev + progresso geral.

**3.5.** Repetir 3.2–3.4 para a próxima onda até o PLAN terminar. **Nunca** duas ondas ao mesmo
tempo — a barreira de merge + testes integrados é o que mantém o repositório íntegro entre ondas.

---

### Passo 4: FASE 4 — Tech Lead (`/code-review`)

**4.1.** Delegar ao subagent **`tech-lead`** (read-only), passando os paths do **PRD**, do
**PLAN** e a **branch da feature**. O agente devolve **apenas o relatório** 🔴/🟡/🟢 + decisão.

**4.2. Broker.** Dúvida de intenção → consultar `product-manager`; de arquitetura →
`arquiteto-senior`.

**4.3. ✅ Fechamento automático (substitui o gate humano):**
- **✅ / ⚠️** → ciclo concluído. O relatório final **sugere** push + PR (conforme `map.tooling`)
  — **não executa**.
- **❌** → re-invoque o `dev-senior` com a lista de 🔴 (correção **sequencial, direto na branch
  da feature**), depois re-invoque o `tech-lead` para re-review. Máx. **2 ciclos**
  correção→review; persistiu ❌ → ⛔ parada por guardrail com os 🔴 remanescentes.

---

## Broker (comunicação entre papéis)

Como cada agente roda isolado, **você** faz a ponte:

- **Agente A → Agente B:** o agente A retorna "preciso consultar {B} sobre X" → você invoca **B**
  com a pergunta + os paths dos artefatos → devolve a resposta a **A**.
- **Guardrail anti-loop:** no máximo **2 consultas por dúvida**; a pergunta é sempre **focada**.
  Estourou → a decisão vira **premissa registrada** (ADR + destaque no relatório final) e o
  fluxo segue.
- **Agente → humano:** só existe na **rodada inicial** (modo normal). Fora dela, dúvida vira
  premissa registrada, sinalizada no relatório final.

---

## ⛔ Paradas por guardrail (única volta ao humano)

O fluxo só volta ao humano quando um limite automático estoura:
- Validação de artefato (PRD/PLAN) reprovada após 2 re-invocações;
- Build/testes vermelhos após 2 correções;
- Conflito de merge persistente após 1 re-execução;
- Review ❌ após 2 ciclos de correção.

Nesses casos: **PARE**, preserve o estado (branch, worktrees, PLAN com progresso real) e reporte
**exatamente** onde parou, o que falhou e o que falta — o humano decide como retomar.

---

## Passo Final: Relatório do Ciclo

```
🎉 Feature Workflow concluído (ou ⛔ parado em {fase} — {guardrail estourado}).

Modo:     {normal | --auto}
PRD:      {path} ✅ — {N} premissas assumidas
PLAN:     {path} ✅ — {N}/{N} etapas · {W} ondas (máx. 3 devs/onda)
Código:   branch {branch} — {N} commits
Review:   {✅/⚠️/❌} — {nº 🔴/🟡/🟢} · {N} ciclo(s) de correção
Decisões: {adr/...} — ⚠️ revise as premissas assumidas antes de publicar

Sugerido (NÃO executado):
  git push origin {branch}
  {comando de PR conforme map.tooling}
```

---

## O Que Este Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Resolve o ponto de entrada sozinho (paths/demanda) e conduz o ciclo de forma autônoma
- Concentra toda a interação humana numa única rodada inicial (modo normal) ou em nenhuma (`--auto`)
- Valida cada artefato com checklist objetivo e libera a fase seguinte sem gate humano
- Paraleliza as etapas do PLAN em ondas topológicas (máx. 3 devs, branch efêmera + worktree por etapa)
- Fecha cada onda com merge + build/testes integrados e consolida o PLAN
- Faz o broker de consultas agente→agente; converte dúvidas tardias em premissas registradas
- Para e reporta com estado preservado quando um guardrail estoura

### ❌ NÃO FAZ:
- ❌ Reescrever a lógica das skills (cada agente segue sua skill SHARED)
- ❌ Perguntar ao humano fora da rodada inicial (exceto parada por guardrail)
- ❌ Push ou criação de PR automáticos — só sugere
- ❌ Resolver conflito de merge manualmente — re-executa a etapa sobre a base atualizada
- ❌ Rodar duas ondas ao mesmo tempo ou mais de 3 devs por onda
- ❌ Implementar código diretamente (isso é do `dev-senior`)
