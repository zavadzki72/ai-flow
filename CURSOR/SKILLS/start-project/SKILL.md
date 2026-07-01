# Skill: Start Project (Zero ao MVP_000001 Rodando)

## Trigger
`/start-project` · "começar projeto" · "novo projeto do zero" · "criar projeto e MVP"

## Processo Completo
Leia e siga: `SKILLS/SHARED/start-project.md`

Esta skill é um **orquestrador** que reusa a lógica de outras skills SHARED.
Sempre que o processo mandar "delegar para `SKILLS/SHARED/X.md`", carregue
aquele arquivo e execute seus passos dentro desta conversa.

Skills referenciadas:
- `SKILLS/SHARED/setup-project.md` (Passo 6)
- `SKILLS/SHARED/spec.md` (Passo 8)
- `SKILLS/SHARED/planejar.md` (Passo 9)

---

## Notas Específicas do Cursor

### Uso como Custom Command

Este adapter pode ser instalado em `.cursor/commands/start-project.md`.
No chat do Cursor, o comando fica disponível como `/start-project`.

### Estilo da Conversa

O Passo 1 (Descoberta) deve ser **conversacional**, não um questionário rígido.
Faça as 4 perguntas em uma única mensagem mas deixe claro que o dev pode
responder em estilo livre. Capture o que vier e siga.

Para escolhas com opções predefinidas (boilerplate, slicing do MVP, confirmações
de `git init`/`install`), apresente uma lista numerada curta no chat e peça
uma escolha explícita do dev antes de prosseguir.

### Leitura das Skills Reusadas

Antes de executar os passos 4, 6 e 7, leia o arquivo SHARED correspondente
usando o Agent do Cursor. Não confie na memória — releia o conteúdo
atualizado a cada uso.

### Criação de Arquivos e Pastas

Use o Agent do Cursor para criar e editar arquivos de texto:
- `{slug}-map.json`
- `{slug}-context.md`
- `.ai-project`
- `README.md`
- `.gitignore`

Use o terminal integrado apenas para criar pastas, copiar boilerplate,
`git init` e instalar dependências.

No Windows, use PowerShell:
```powershell
$slug = "{slug}"
$base = "MAPS\$slug"
New-Item -ItemType Directory -Path "$base\prd", "$base\plan", "$base\adr" -Force | Out-Null
"" | Out-File "$base\prd\.gitkeep" -Encoding utf8
"" | Out-File "$base\plan\.gitkeep" -Encoding utf8
"" | Out-File "$base\adr\.gitkeep" -Encoding utf8
```

### Listagem de Boilerplates

Liste boilerplates disponíveis com PowerShell:
```powershell
Get-ChildItem -Path "BOILERPLATES\BACK" -Directory | Select-Object -ExpandProperty Name
Get-ChildItem -Path "BOILERPLATES\FRONT" -Directory | Select-Object -ExpandProperty Name
```

Para cada boilerplate, leia o `README.md` dele (se existir) e mostre uma
descrição curta junto da opção.

### Cópia de Boilerplate

```powershell
Copy-Item -Path "BOILERPLATES\{categoria}\{nome}\*" -Destination "{repo-path}" -Recurse -Force
```

Após copiar, use o Agent para substituir placeholders comuns
(`{{PROJECT_NAME}}`, `{{REPO_NAME}}`, etc.) pelos valores reais, se o
boilerplate usar essa convenção.

### Comandos com Confirmação

Antes de rodar `git init`, `npm install`, `dotnet restore`, etc., **sempre**
confirmar explicitamente com o dev no chat. Não execute silenciosamente.

### Verificação de Path Existente

```powershell
if (Test-Path "{path}" -PathType Container) {
  if ((Get-ChildItem "{path}" -Force | Measure-Object).Count -gt 0) { "exists_with_content" }
  else { "exists_empty" }
} else { "not_found" }
```

### Detecção de Tamanho do MVP

Após o dev confirmar o recorte (Passo 2), conte os fluxos. Se > 5 OU envolve
integrações externas complexas, apresente o alerta de slicing com as 3
opções (fatiar / manter / outro recorte) antes de prosseguir.

### Sem Limite Duro

A skill **não impõe** um limite de tamanho para o MVP_000001. Apenas alerta
e oferece slicing. Se o dev disser "manter como está", siga adiante.

### Próximo Skill na Sequência
Após o `/start-project`, o dev deve rodar `/implementar ETAPA 1` para começar
a execução do MVP_000001.
