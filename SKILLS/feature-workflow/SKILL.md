---
name: feature-workflow
description: Orquestra o ciclo completo de uma feature de forma autônoma, delegando cada fase a um agente por papel em janela isolada — Product Manager (/spec), Arquiteto Sênior (/planejar), Dev Sênior (/implementar em ondas paralelas) e Tech Lead (/code-review) — com validação objetiva entre artefatos no lugar de gates humanos. Modo normal tem uma única rodada de perguntas no início; --auto roda sem nenhuma interação.
compatibility: Requer subagents (tool Agent + .claude/agents/) e paralelismo real (N chamadas numa mesma mensagem) — hoje só Claude Code. Ver CONVENTIONS.md § Skills que exigem um harness específico.
---

# Skill: Feature Workflow (Orquestrador Autônomo de Papéis)

## ⛔ Requisito de harness (HARD STOP)

Esta skill delega a subagents em janela isolada (tool `Agent` + `.claude/agents/`) e depende de
**paralelismo real** (N chamadas numa mesma mensagem). Se você não tem isso: **pare** e diga ao dev
para rodar `/spec` → `/planejar` → `/implementar` → `/code-review` na mão.
**Não simule em sequência** — sem janela isolada seria outra skill com o nome da certa.

## Trigger
`/feature-workflow` · `/feature-workflow --auto` · `/fluxo-feature` · "roda o ciclo completo da feature" · "orquestra os agentes"

## Processo Completo
Leia e siga: `SKILLS/SHARED/feature-workflow.md`

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

Esta skill é um **orquestrador autônomo**: para cada fase, ela **delega a um subagent por papel**
e avança por **validação objetiva** (checklist do artefato, build/testes verdes, review sem 🔴)
— sem gate humano. Sempre que o processo mandar "delegar ao subagent X", use a tool `Agent`,
passando **paths** (não o conteúdo inteiro) + as respostas/premissas já coletadas.

Agentes referenciados (instalados em `.claude/agents/` — ver `AGENTS/SHARED/`):
- `product-manager` (Fase 1 · /spec)
- `arquiteto-senior` (Fase 2 · /planejar)
- `dev-senior` (Fase 3 · /implementar — até 3 em paralelo por onda)
- `qa` (Fase 4 · /test-e2e — validação no browser; configura o ambiente local se faltar)
- `tech-lead` (Fase 5 · /code-review)

---

## Ambiente — resolva antes do Passo 0

- **Arquivos** — use suas tools nativas de leitura, busca e edição. Invariante: **ler antes de
  editar**, sempre; e **nunca** usar shell (`cat`, `sed`, `awk`) para ler ou escrever texto.
- **Shell** — os blocos abaixo e os do SHARED são POSIX. O dialeto vem do **SO da máquina**, não do
  seu nome: em Windows, `git`, `gh`, `node` e `docker compose` funcionam idênticos via Git Bash —
  não traduza sem necessidade real.
- **Perguntas** — se você tem pergunta estruturada (`AskUserQuestion`, `ask_user`), use. Se não tem
  — ou se você é subagent, onde ela costuma ser bloqueada — lista numerada no chat e **espere a
  resposta**. Nunca assuma. (Aqui vale o teto de interação do modo: ver § Interação humana.)

---

## Dashboard de agentes (Orchestrator) — rodar ANTES de tudo (Passo 0)

No **começo do Passo 0**, garanta que o dashboard local esteja no ar e **dê o link ao humano**,
sugerindo acompanhar as fases e os agentes por lá. É **best-effort**: se algo falhar (sem Node,
porta 4319 ocupada por outro processo, etc.), **siga o fluxo normalmente** — o dashboard é
observabilidade, **nunca** um gate e nunca uma parada por guardrail.

1. Cheque se já está rodando; se não, suba **destacado** (sobrevive ao fim da sessão):
   ```bash
   curl -s -o /dev/null --max-time 2 http://localhost:4319/api/snapshot \
     && echo "orchestrator já no ar" \
     || ( nohup node /Users/zavadzki72/Projects/Personal/ai-flow/ORCHESTRATOR/server.js \
            > /tmp/ai-flow-orchestrator.log 2>&1 & echo "orchestrator iniciado" )
   ```
   Se acabou de subir, repita o `curl` 1x para confirmar que respondeu antes de anunciar.
2. **Informe o humano** com o link (frase sugerida):
   > 🎛️ Acompanhe os agentes ao vivo no dashboard: **http://localhost:4319**
   >    (fases PM→Arquiteto→Dev→Tech Lead, ondas paralelas e, clicando em cada agente,
   >     a tarefa/resultado do que ele está fazendo)
   - **Modo normal:** inclua essa linha **no bloco da rodada inicial** (Passo 0.3), antes das perguntas.
   - **Modo `--auto`:** imprima como **primeira mensagem** do ciclo.
3. O "ao vivo" por agente depende dos hooks (`PreToolUse`/`PostToolUse`/`SubagentStart`/`SubagentStop`
   → `ORCHESTRATOR/hooks/notify.js`) já registrados no `settings.json`. Sem hooks, o dashboard ainda
   mostra o progresso lido dos PLANs — não bloqueie nem tente instalar hooks no meio do fluxo.

---

## Invariantes

### Delegação (tool Agent)
- Invoque cada papel com a tool `Agent`, passando no prompt os **paths** do PRD/PLAN/branch +
  o **modo** (normal | --auto) + respostas/premissas. O subagent roda em **janela própria** e
  devolve só o resumo.
- **Paralelismo (Fase 3):** dispare os `dev-senior` de uma mesma onda **numa única mensagem com
  múltiplas chamadas `Agent`** (uma por etapa) — é isso que os faz rodar concorrentes. Aguarde
  **todos** retornarem antes de fechar a onda (merge + build/testes). Nunca dispare a onda
  seguinte antes de fechar a atual.
- Um agente só consegue disparar outro se **`Agent` estiver na sua lista `tools:`**. Lista explícita
  sem `Agent` = agente sem poder de delegação (o **campo omitido herda tudo**, inclusive `Agent`).
  Hoje só o `engineering-manager` tem `Agent` — os demais papéis são folhas, e a comunicação entre
  eles passa **sempre pelo broker** (você). Ver `CONVENTIONS.md` § Delegação.
- Subagents **não recebem `AskUserQuestion`** — dúvidas que voltarem de um agente **não vão ao
  humano** fora da rodada inicial: viram consulta a outro agente (broker) ou **premissa
  registrada** (ADR + destaque no relatório final).

### Interação humana
- **Modo normal:** UMA chamada de `AskUserQuestion` no início (rodada inicial: ponto de entrada,
  branch, dúvidas do PM em bloco). Depois, nenhuma outra — exceto ⛔ parada por guardrail.
- **Modo `--auto`:** nenhuma chamada de `AskUserQuestion` em hipótese alguma; toda dúvida vira
  premissa assumida registrada.
- Em ambos os modos: **nunca** `git push` nem criação de PR — o relatório final só sugere.

### Git (fechamento de onda — Fase 3.4)
- **Nunca faça checkout no clone principal** — worktree dedicado por branch (`CONVENTIONS.md` § Git
  Worktree). Cada etapa da onda tem branch efêmera própria: o Git recusa dois worktrees na mesma
  branch, por isso paralelo exige branches distintas.
- Merge das branches efêmeras (`{branch}--etapa-{N}`) na branch da feature com
  `git merge --no-ff`, dentro do **worktree da feature**.
- Conflito → aborte o merge (`git merge --abort`), descarte a efêmera e re-invoque o dev sobre a
  feature atualizada. Nunca edite arquivos para resolver conflito.
- Limpeza: `git worktree remove` + `git branch -d` após cada onda.
- **Nunca** adicione trailer `Co-Authored-By` de IA nos commits — nem você, nem os `dev-senior` que
  você despacha. Se o harness anexa por padrão (**o Claude Code anexa**), remova. Sem exceção.

### Reinício após editar agentes
- Editar um arquivo de agente em disco **não** recarrega na sessão ativa — reinicie a sessão (ou crie via `/agents`).

---

## Próximos Skills na Sequência
- Validar no browser: **já integrado** como FASE 4 (`/test-e2e` via agente `qa`) — roda dentro do
  ciclo, configurando o ambiente local se faltar. Rode `/test-e2e` avulso só para re-validar fora do fluxo.
- Épico / pacote de features (uma altitude acima): `/epic-workflow`
- Publicar: o relatório final sugere `git push` + comando de PR — o humano decide e executa.
