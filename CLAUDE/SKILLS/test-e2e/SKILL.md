---
name: test-e2e
description: Sobe o ambiente local via Docker, simula um usuário navegando pela feature implementada (Playwright MCP) e gera relatório com evidências (screenshots) validando PRD e fluxos de impacto. Use após o /implementar terminar todas as etapas do PLAN.
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

### Subir/Derrubar Ambiente

Usar `Bash` para os comandos de `environments.local` do `{slug}-map.json`:
```bash
docker compose -f {environments.local.compose-path} up -d
docker compose -f {environments.local.compose-path} down -v
```
No Windows, `docker compose` funciona igual via Git Bash — não precisa de adaptação para PowerShell.

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
