---
name: epic-workflow
description: Orquestra um PACOTE DE FEATURES ou um ÉPICO grande que não cabe num PRD só, uma altitude acima do /feature-workflow. Decompõe em features (validadas por cruzamento PM × arquiteto), roda /spec e /planejar de todas em paralelo, monta o grafo global cruzando dependências e colisão de arquivos, e executa as features em ondas — cada uma num /feature-workflow isolado. Com --so-planejar, para nos artefatos (N PRDs + N PLANs + grafo) sem escrever código. Sempre autônomo, zero interação.
---

# Skill: Epic Workflow (Orquestrador Autônomo de Múltiplas Features)

## Trigger
`/epic-workflow` · `/epico` · "roda esse pacote de features" · "esse épico não cabe num PRD só" · "orquestra essas N features"

`/epic-workflow --so-planejar` · "planeja tudo mas não implementa" · "quero ver o plano inteiro antes de codar"
→ roda as FASES 0-2, monta o grafo e **para** (`SKILLS/SHARED/epic-workflow.md` § `--so-planejar`).
É também como o `/start-project` entra aqui, no caminho "completo" do recorte inicial.

## Processo Completo
Leia e siga: `SKILLS/SHARED/epic-workflow.md`

Esta skill é o **maestro de épico**. Ela delega a **feature inteira** a um subagent
`engineering-manager`, que roda o `/feature-workflow` na janela dele. Ela **não** reimplementa nada
do ciclo por feature — as fases de documento invocam os **modos** que já existem no `spec.md` e no
`planejar.md`.

```
/epic-workflow      (sessão principal)     ← você está aqui
  └─ engineering-manager   (subagent, janela própria)   → /feature-workflow
       └─ dev-senior       (subagent aninhado)          → /implementar
```

Agentes referenciados (instalados em `.claude/agents/`):
- `product-manager` (FASE 0 · decomposição · FASE 1 · /spec — N em paralelo)
- `arquiteto-senior` (FASE 0.3 · crítica do recorte · FASE 2 · /planejar — N em paralelo)
- `engineering-manager` (FASE 3 · /feature-workflow — **único papel com a tool `Agent`**)
- `tech-lead` (FASE 4 · /code-review de integração)
- `qa` (FASE 4.3 · /test-e2e — condicional)

---

## Notas Específicas do Claude Code

### Dashboard de agentes (Orchestrator) — rodar ANTES de tudo (Passo 0)
Mesma regra do `/feature-workflow`, e aqui vale ainda mais: um épico dispara **dezenas** de agentes
e o dashboard é a única forma de o humano ver o que acontece sem interromper. É **best-effort** — se
falhar, siga; observabilidade nunca é gate nem parada por guardrail.

1. Cheque se já está rodando; se não, suba **destacado** (`{AI_FLOW_ROOT}` = a raiz deste repo):
   ```bash
   curl -s -o /dev/null --max-time 2 http://localhost:4319/api/snapshot \
     && echo "orchestrator já no ar" \
     || ( nohup node {AI_FLOW_ROOT}/ORCHESTRATOR/server.js \
            > /tmp/ai-flow-orchestrator.log 2>&1 & echo "orchestrator iniciado" )
   ```
   (Windows → PowerShell: `Start-Process node -ArgumentList "{AI_FLOW_ROOT}\ORCHESTRATOR\server.js" -WindowStyle Hidden`.)
2. **Imprima o link como primeira mensagem do ciclo** (não há rodada inicial nesta skill):
   > 🎛️ Acompanhe o épico ao vivo: **http://localhost:4319**
3. O "ao vivo" por agente depende dos hooks (`ORCHESTRATOR/hooks/notify.js`) no `settings.json`.
   Sem hooks, o dashboard ainda lê o progresso dos PLANs — não tente instalar hooks no meio do fluxo.

### Delegação (tool Agent)
- Invoque cada papel com a tool `Agent`, passando **paths** (nunca conteúdo) + o modo + os limites
  que o SHARED calcular. O subagent roda em janela própria e devolve só o resumo.
- **Paralelismo:** dispare os agentes de uma mesma fase/onda **numa única mensagem com múltiplas
  chamadas `Agent`** — é isso que os faz rodar concorrentes. As quantidades e os tetos estão no
  SHARED (§ Teto); não os recalcule aqui.
- **Aninhamento:** o `engineering-manager` dispara os `dev-senior` **dentro** da janela dele.
  Profundidade máxima **5**, fixa; a cadeia `/epic-workflow` → EM → `dev-senior` usa 2. Você **não
  vê** os devs dele — só o resumo da feature.
- **O Claude Code não documenta limite de subagents concorrentes** — os tetos do SHARED são
  auto-impostos e ninguém vai aplicá-los por você.
- Subagents **não recebem `AskUserQuestion`** mesmo se listada no frontmatter.

### Interação humana
- **Nenhuma chamada de `AskUserQuestion` em hipótese alguma.** Esta skill é sempre autônoma; não
  existe modo normal nem flag `--auto`. A única saída para o humano é ⛔ parada por guardrail ou o
  relatório final.
- **Nunca** `git push` nem criação de PR — o relatório só sugere.

### Git
- Todo comando de topologia (fetch, worktree, branch, merge) é **do orquestrador** — os agentes
  recebem worktrees prontos. É o que permite disparar N agentes no mesmo repo sem colidir no
  `index.lock`. A mecânica exata está no SHARED.
- Conflito → `git merge --abort` (e o resto conforme o SHARED). Nunca edite arquivos para resolver.

### Reinício após editar agentes
- Editar um agente em disco **não** recarrega na sessão ativa — reinicie a sessão (ou crie via
  `/agents`). Vale sobretudo para o `engineering-manager`, que é novo.

### Ambiente
- Windows → adaptar comandos para PowerShell.
