---
name: start-project
description: Orquestrador end-to-end para iniciar um projeto do zero. Conduz uma conversa de descoberta, recorta um MVP_000001 enxuto, escolhe boilerplate interativamente, registra o projeto no ai-flow (delega para /setup-project), faz bootstrap físico (git init, deps), gera PRD_000001_MVP (delega para /spec) e PLAN_000001_MVP (delega para /planejar). Ao final, o projeto está pronto para /implementar ETAPA 1.
---

# Skill: Start Project (Zero ao MVP_000001 Rodando)

## Trigger
`/start-project` · "começar projeto" · "novo projeto do zero" · "criar projeto e MVP"

## Processo Completo
Leia e siga: `SKILLS/SHARED/start-project.md`

Esta skill é um **orquestrador** que reusa a lógica de outras skills SHARED.
Sempre que o processo mandar "delegar para `SKILLS/SHARED/X.md`", carregue
aquele arquivo e execute seus passos dentro desta conversa.

Skills referenciadas:
- `SKILLS/SHARED/setup-project.md` (Passo 4)
- `SKILLS/SHARED/spec.md` (Passo 6)
- `SKILLS/SHARED/planejar.md` (Passo 7)

---

## Notas Específicas do GitHub Copilot CLI

### Interação com o Dev

Use a ferramenta `ask_user` para **todas** as perguntas — nunca pergunte apenas
via texto. Agrupe perguntas relacionadas e use `choices` quando houver
opções predefinidas (boilerplate, slicing do MVP, confirmação de comandos).

O Passo 1 (Descoberta) deve ser **conversacional** — use `ask_user` com texto
livre, sem `choices`, para capturar a ideia.

### Leitura das Skills Reusadas

Antes de executar os passos 4, 6 e 7, leia o arquivo SHARED correspondente
com a tool `view`. Não confie na memória — releia o conteúdo atualizado.

### Criação de Arquivos e Pastas

Use as ferramentas nativas — nunca powershell para escrever arquivos de texto:
- `create` — para `map.json`, `context.md`, `.ai-project`, `README.md`, `.gitignore`
- `powershell` — apenas para `mkdir`, copiar boilerplate, `git init`, `restore/install`

Para criar a estrutura do map:
```powershell
$slug = "{slug}"
$base = "MAPS\$slug"
New-Item -ItemType Directory -Path "$base\prd", "$base\plan", "$base\adr" -Force | Out-Null
"" | Out-File "$base\prd\.gitkeep" -Encoding utf8
"" | Out-File "$base\plan\.gitkeep" -Encoding utf8
"" | Out-File "$base\adr\.gitkeep" -Encoding utf8
```

### Listagem de Boilerplates

Use PowerShell para listar boilerplates disponíveis:
```powershell
Get-ChildItem -Path "BOILERPLATES\BACK" -Directory | Select-Object -ExpandProperty Name
Get-ChildItem -Path "BOILERPLATES\FRONT" -Directory | Select-Object -ExpandProperty Name
```

Para cada boilerplate, tente ler o `README.md` dele (se existir) e mostre uma
descrição curta junto da opção em `ask_user`.

### Cópia de Boilerplate

```powershell
Copy-Item -Path "BOILERPLATES\{categoria}\{nome}\*" -Destination "{repo-path}" -Recurse -Force
```

Substituir placeholders comuns (`{{PROJECT_NAME}}`, `{{REPO_NAME}}`, etc.) pelos
valores reais após a cópia, se o boilerplate usar essa convenção.

### Comandos com Confirmação

Antes de rodar `git init`, `npm install`, `dotnet restore`, etc., **sempre**
confirmar com `ask_user`. Não execute silenciosamente.

### Verificação de Path Existente

```powershell
if (Test-Path "{path}" -PathType Container) {
  if ((Get-ChildItem "{path}" -Force | Measure-Object).Count -gt 0) { "exists_with_content" }
  else { "exists_empty" }
} else { "not_found" }
```

### Detecção de Tamanho do MVP

Após o dev confirmar o recorte (Passo 2), conte os fluxos. Se > 5 OU envolve
integrações externas complexas, dispare o alerta de slicing via `ask_user`
com as 3 opções (fatiar / manter / outro recorte).

### Sem Limite Duro

A skill **não impõe** um limite de tamanho para o MVP_000001. Apenas alerta
e oferece slicing. Se o dev disser "manter como está", siga adiante.

### Próximo Skill na Sequência
Após o `/start-project`, o dev deve rodar `/implementar ETAPA 1` para começar
a execução do MVP_000001.
