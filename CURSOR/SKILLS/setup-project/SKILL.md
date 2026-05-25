# Skill: Setup Project (Criar Novo Projeto)

## Trigger
`/setup-project` · "criar projeto" · "novo projeto" · "adicionar projeto"

## Processo Completo
Leia e siga: `SKILLS/SHARED/setup-project.md`

---

## Notas Específicas do Cursor

### Uso como Custom Command

Este adapter pode ser instalado em `.cursor/commands/setup-project.md`.
No chat do Cursor, o comando fica disponível como `/setup-project`.

### Interação com o Dev

Use o chat do Cursor para coletar informações em blocos.
Quando houver opções predefinidas, apresente uma lista curta e peça uma escolha explícita antes de continuar.

### Criação de Arquivos e Pastas

Use o Agent do Cursor para criar e editar arquivos de texto:
- `map.json`
- `context.md`
- `.ai-project`

Use o terminal integrado apenas para criar pastas, `.gitkeep` e validar paths.

No Windows, use PowerShell:
```powershell
$slug = "{slug}"
$base = "MAPS\$slug"
New-Item -ItemType Directory -Path "$base\prd", "$base\plan", "$base\adr" -Force | Out-Null
"" | Out-File "$base\prd\.gitkeep" -Encoding utf8
"" | Out-File "$base\plan\.gitkeep" -Encoding utf8
"" | Out-File "$base\adr\.gitkeep" -Encoding utf8
```

### Verificação de Caminho Existente

Para checar se o path local do repositório existe antes de criar o `.ai-project`:
```powershell
if (Test-Path "{path}" -PathType Container) { "exists" } else { "not_found" }
```

### Verificação de Projeto Existente

Antes de criar, verificar se `MAPS/{slug}/` já existe:
```powershell
if (Test-Path "MAPS\{slug}" -PathType Container) { "exists" } else { "ok" }
```

Se existir, avisar o dev e pedir confirmação explícita antes de prosseguir.

### Derivação do Slug

Regras para derivar o slug a partir do nome do projeto:
1. Converter para minúsculas
2. Substituir acentos e cedilhas pelos equivalentes sem acento (ã→a, ç→c, é→e, etc.)
3. Substituir espaços e underscores por hífens
4. Remover qualquer caractere que não seja letra, número ou hífen
5. Remover hífens duplicados ou nas extremidades

Exemplos:
- "Meu Sistema" → `meu-sistema`
- "Order Manager 2.0" → `order-manager-20`
- "Gestão de KPIs" → `gestao-de-kpis`

### Próximo Skill na Sequência
Após o setup, sugerir: `/spec` para criar o primeiro PRD do projeto.
