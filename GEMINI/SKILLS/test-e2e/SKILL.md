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

### Subir/Derrubar Ambiente

Usar as capacidades de shell do Gemini para os comandos de `environments.local` do `{slug}-map.json`:
```bash
docker compose -f {environments.local.compose-path} up -d
docker compose -f {environments.local.compose-path} down -v
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
