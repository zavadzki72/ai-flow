# Skill: Test E2E

## Trigger
`/test-e2e` · `/teste-e2e` · "testa a feature de ponta a ponta" · "roda o teste e2e"

## Processo Completo
Leia e siga: `SKILLS/SHARED/test-e2e.md`

---

## Notas Específicas do Gemini

### Pré-requisito: MCP de Browser

Verificar se uma extensão/MCP de automação de browser (ex: Playwright MCP) está disponível no
Gemini **antes** de subir qualquer ambiente. Se não estiver, orientar o dev a configurar e parar.

### Git Worktree (Obrigatório)

**Nunca suba o ambiente contra o clone principal.** Resolva (reutilize ou crie) o worktree da branch
antes de subir o ambiente (ver `CONVENTIONS.md` § Git Worktree). Se o Git recusar a criação com
`branch already checked out at ...`, outra sessão está usando a branch agora — informe o dev e pare.

### Subir/Derrubar Ambiente

Ler `environments.local.mode` (`docker` / `hybrid` / `native`) no `{slug}-map.json`. Usar as
capacidades de shell do Gemini, sempre a partir de `{worktree.path}`:
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

### Navegação e Evidências

Usar as ferramentas de automação de browser disponíveis no Gemini para navegar, clicar, preencher e
capturar screenshots. Salvar as evidências em:
```
{map.docs.e2e}/{slug}-e2e-NNN-nome-da-feature/evidence/{numero}-{cenario}-{step}.png
```

### Próximos Passos Após Aprovação
- ✅/⚠️ → `/code-review`
- ❌ → `/implementar` (nova etapa de correção) e repetir `/test-e2e`
