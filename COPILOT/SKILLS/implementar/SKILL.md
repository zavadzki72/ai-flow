---
name: implementar
description: Implementa uma etapa específica do plano de execução (baby step). Lê contexto via map.json e context.md, verifica dependências, prepara branch, analisa código existente, implementa seguindo padrões do projeto, roda build e testes, faz commit e atualiza PLAN marcando a etapa como concluída.
---

# Skill: Implementar (Executar Etapa do Plano)

## Trigger
`/implementar` · `/executar` · "implementar etapa" · "executar etapa"

Aceita PLAN e etapa inline:
`/implementar {map.docs.plan}/PLAN_001_Nome.md ETAPA 1`
`/implementar ETAPA 1` (se PLAN já foi mencionado na conversa)
`/implementar 1`

## Processo Completo
Leia e siga: `SKILLS/SHARED/implementar.md`

---

## Notas Específicas do GitHub Copilot CLI

### Leitura e Edição de Arquivos

Use **sempre** as ferramentas nativas — nunca powershell para ler ou criar arquivos de texto:
- `view` — ler arquivos antes de editar (obrigatório)
- `edit` — modificações pontuais em arquivos existentes
- `create` — apenas para arquivos novos
- `glob` — listar estrutura de pastas
- `grep` — buscar padrões no código

### Execução de Comandos

Use `powershell` para build, testes e git. Ver `docs/architecture/` para os comandos exatos da stack.

**Atenção:** O ambiente é Windows. Adapte os comandos do SHARED (bash/Unix) para PowerShell:
```powershell
# Verificar working tree
Set-Location "{repo.path}"
git status --porcelain

# Checkout de branch existente
Set-Location "{repo.path}"
git checkout {branch}

# Criar nova branch
Set-Location "{repo.path}"
git checkout -b {branch}

# Branch a partir do remoto
Set-Location "{repo.path}"
git checkout -b {branch} origin/{branch}

# Adicionar arquivos específicos e commitar (nunca git add -A sem verificar)
Set-Location "{repo.path}"
git add "{arquivo1}" "{arquivo2}"
git status
git commit -m "feat: descricao`n`n- detalhe 1`n- detalhe 2`n`nRefs: ETAPA N — PLAN_NNN_Nome_Feature`n`nCo-Authored-By: GitHub Copilot <noreply@github.com>"
```

Antes de qualquer `git add`, mostrar ao dev os arquivos que serão incluídos.

### Co-authored-by no Commit

Sempre incluir no commit:
```
Co-Authored-By: GitHub Copilot <noreply@github.com>
```

### Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
