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

## Notas Específicas do Cursor

### Uso como Custom Command

Este adapter pode ser instalado em `.cursor/commands/implementar.md`.
No chat do Cursor, o comando fica disponível como `/implementar`.

### Leitura e Edição de Arquivos

Use o Agent do Cursor para ler, buscar e editar arquivos.
Sempre leia o arquivo antes de editá-lo e preserve mudanças existentes do dev.

Prefira:
- Busca do workspace para localizar código, testes e padrões
- Edição pontual via Agent quando o arquivo já existe
- Criação de arquivos novos apenas quando o PLAN ou o código exigir
- Terminal integrado apenas para comandos reais de build, testes, git e tooling

### Execução de Comandos

Use o terminal integrado do Cursor para build, testes e git. Ver `docs/architecture/commands.md` ou `context.md#comandos` do projeto ativo para os comandos exatos da stack.

No Windows, adapte comandos do SHARED para PowerShell:
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
```

Antes de qualquer `git add`, mostrar ao dev os arquivos que serão incluídos.

Para commit, adicionar apenas arquivos específicos:
```powershell
Set-Location "{repo.path}"
git add "{arquivo1}" "{arquivo2}"
git status
git commit -m "feat: descricao`n`n- detalhe 1`n- detalhe 2`n`nRefs: ETAPA N — PLAN_NNN_Nome_Feature`n`nCo-Authored-By: Cursor <noreply@cursor.com>"
```

### Co-authored-by no Commit

Quando o SHARED sugerir o trailer do Claude, substituir pelo trailer do Cursor.
Se o dev tiver um e-mail próprio para coautoria, usar o valor informado por ele.

Padrão:
```
Co-Authored-By: Cursor <noreply@cursor.com>
```

### Próximos Skills na Sequência
- Continuar: `/implementar ETAPA N+1`
- Revisar tudo: `/code-review`
