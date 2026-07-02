---
name: test-e2e
description: Sobe o ambiente local via Docker, simula um usuário navegando pela feature implementada (MCP de browser) e gera relatório com evidências (screenshots) validando PRD e fluxos de impacto. Use após o /implementar terminar todas as etapas do PLAN.
---

# Skill: Test E2E

## Trigger
`/test-e2e` · `/teste-e2e` · "testa a feature de ponta a ponta" · "roda o teste e2e"

## Processo Completo
Leia e siga: `SKILLS/SHARED/test-e2e.md`

---

## Notas Específicas do GitHub Copilot CLI

### Pré-requisito: MCP de Browser

Verificar se um MCP de automação de browser (ex: Playwright MCP) está configurado no Copilot CLI
**antes** de subir qualquer ambiente. Se não estiver, orientar o dev a configurar e parar.

### Subir/Derrubar Ambiente via PowerShell

```powershell
Set-Location "{repo.path}"
docker compose -f {environments.local.compose-path} up -d
docker compose -f {environments.local.compose-path} down -v
```

### Navegação e Evidências

Usar as ferramentas de automação de browser disponíveis no Copilot CLI para navegar, clicar,
preencher e capturar screenshots. Salvar em:
```
{map.docs.e2e}/{slug}-e2e-NNN-nome-da-feature/evidence/{numero}-{cenario}-{step}.png
```

### Leitura de Arquivos

- `view` — PRD, PLAN, `{slug}-map.json`, `{slug}-context.md`
- `glob`/`grep` — localizar `docs/architecture/` e mapear rotas/telas afetadas pelo diff

### Próximos Passos Após Aprovação
- ✅/⚠️ → `/code-review`
- ❌ → `/implementar` (nova etapa de correção) e repetir `/test-e2e`
