# Skill: Test E2E

## Trigger
`/test-e2e` · `/teste-e2e` · "testa a feature de ponta a ponta" · "roda o teste e2e"

## Processo Completo
Leia e siga: `SKILLS/SHARED/test-e2e.md`

---

## Notas Específicas do Cursor

### Uso como Custom Command

Este adapter pode ser instalado em `.cursor/commands/test-e2e.md`. No chat do Cursor, o comando
fica disponível como `/test-e2e`.

### Pré-requisito: MCP de Browser

Verificar se um MCP de automação de browser (ex: Playwright MCP) está configurado no Cursor
**antes** de subir qualquer ambiente. Se não estiver, orientar o dev a configurar e parar.

### Git Worktree (Obrigatório)

**Nunca suba o ambiente contra o clone principal.** Resolva o worktree da branch antes de subir o
ambiente (ver `CONVENTIONS.md` § Git Worktree):
```powershell
Set-Location "{repo.path}"
git worktree list                                              # já existe (ex.: do /implementar)?
git worktree add "{worktree.path}" {branch}                     # se não existe
```
Se o Git recusar com `branch already checked out at ...`, outra sessão está usando a branch agora —
informe o dev e pare, não force.

### Subir/Derrubar Ambiente

Use o terminal integrado do Cursor. No Windows, adapte para PowerShell:
```powershell
Set-Location "{worktree.path}"
docker compose -f {environments.local.compose-path} up -d
docker compose -f {environments.local.compose-path} down -v
```

### Navegação e Evidências

Use o Agent do Cursor com as ferramentas de automação de browser disponíveis para navegar, clicar,
preencher e capturar screenshots. Salve em:
```
{map.docs.e2e}/{slug}-e2e-NNN-nome-da-feature/evidence/{numero}-{cenario}-{step}.png
```

### Leitura de Arquivos

Use o Agent do Cursor para ler PRD, PLAN, `{slug}-map.json` e `{slug}-context.md`. Sempre leia antes
de escrever o relatório final.

### Próximos Passos na Sequência
- ✅/⚠️ → `/code-review`
- ❌ → `/implementar` (nova etapa de correção) e repetir `/test-e2e`
