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
- `SKILLS/SHARED/spec.md` (Passo 8A — caminho enxuto)
- `SKILLS/SHARED/planejar.md` (Passo 9 — caminho enxuto; não roda no completo)
- `SKILLS/SHARED/epic-workflow.md` (Passo 8B — caminho completo, sempre com `--so-planejar`)

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
foreach ($d in "prd","plan","adr","epic","e2e") {
  New-Item -ItemType Directory -Path "$base\$d" -Force | Out-Null
  "" | Out-File "$base\$d\.gitkeep" -Encoding utf8
}
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

### Bifurcação Enxuto × Completo (Passo 2)

O recorte do Passo 2 pode terminar em **dois formatos de saída**, e é o dev quem escolhe.
As condições, as opções e o que cada caminho produz estão **só** no SHARED
(`start-project.md` § Enxuto × Completo e Passo 2) — leia de lá e não decida por memória:
este menu já mudou uma vez, e os adaptadores que o copiaram ficaram oferecendo o menu antigo.

Aqui só a mecânica: apresentar as opções numa lista curta e numerada, pedindo escolha explícita, e respeitar a escolha nos Passos 8/9/10
sem perguntar de novo.

### Próximo Skill na Sequência
Depende do caminho — o Passo 10 do SHARED (10A enxuto / 10B completo) traz o comando exato.
