---
name: test-e2e
description: Sobe o ambiente local (Docker, nativo ou híbrido), simula um usuário navegando pela feature implementada (Playwright MCP) e gera relatório com evidências (screenshots) validando PRD e fluxos de impacto. Use após o /implementar terminar todas as etapas do PLAN.
---

# Skill: Test E2E

## Trigger
`/test-e2e` · `/teste-e2e` · "testa a feature de ponta a ponta" · "roda o teste e2e"

## Processo Completo
Leia e siga: `SKILLS/SHARED/test-e2e.md`

---

## Notas Específicas do Claude Code

### Pré-requisito: MCP de Browser

Esta skill depende de um MCP de automação de browser (ex: Playwright MCP) instalado no Claude Code.
Verificar via `ToolSearch` se as ferramentas `mcp__playwright__*` (ou equivalente configurado)
estão disponíveis **antes** do Passo 0.4 subir qualquer ambiente. Se não estiverem, orientar o dev a
configurar o MCP e parar.

### Git Worktree (Obrigatório)

**Nunca suba o ambiente contra o clone principal.** Resolva o worktree da branch antes do Passo 4
(Passo 0.5 da skill, ver `CONVENTIONS.md` § Git Worktree):
```bash
git -C {repo.path} worktree list                                    # já existe (ex.: do /implementar)?
git -C {repo.path} worktree add "{worktree.path}" {branch}          # se não existe
```
Se o Git recusar com `branch already checked out at ...`, outra sessão está usando a branch agora —
informe o dev e pare, não force.

### Subir/Derrubar Ambiente

Ler `environments.local.mode` (`docker` / `hybrid` / `native`) no `{slug}-map.json`. Usar `Bash`
sempre a partir de `{worktree.path}`:
```bash
# mode docker/hybrid — se compose-path definido
cd {worktree.path}
docker compose -f {environments.local.compose-path} up -d
docker compose -f {environments.local.compose-path} down -v

# mode hybrid/native — cada entrada de environments.local.processes com background: true
cd {worktree.path}/{processo.cwd}
nohup {processo.up-command} > /tmp/{slug}-e2e-{processo.name}.log 2>&1 &
echo $! > /tmp/{slug}-e2e-{processo.name}.pid
# no teardown:
kill $(cat /tmp/{slug}-e2e-{processo.name}.pid) 2>/dev/null
```
No Windows, `docker compose` e `nohup`/`kill` funcionam igual via Git Bash — não precisa de adaptação para PowerShell.

### Navegação e Evidências

Use as ferramentas do MCP de browser para navegar, clicar, preencher formulários e validar texto/elementos.
Capture screenshot com a ferramenta de screenshot do MCP e salve via `Write`/`Bash` em:
```
{map.docs.e2e}/{slug}-e2e-NNN-nome-da-feature/evidence/{numero}-{cenario}-{step}.png
```

### Leitura de Contexto

- `Read` — PRD, PLAN, `{slug}-map.json`, `{slug}-context.md`
- `Glob`/`Grep` — localizar `docs/architecture/` e mapear rotas/telas afetadas pelo diff

### Próximos Passos Após Aprovação
- ✅/⚠️ → `/code-review`
- ❌ → `/implementar` (nova etapa de correção) e repetir `/test-e2e`
