---
name: setup-project
description: Cria um novo projeto no ai-flow. Coleta todas as informações necessárias via perguntas guiadas em blocos (projeto, stack, arquitetura, repositórios, tooling e contexto opcional), gera a estrutura completa em MAPS/{slug}/ com map.json e context.md preenchidos, e configura o .ai-project nos repositórios locais informados.
---

# Skill: Setup Project (Criar Novo Projeto)

## Trigger
`/setup-project` · "criar projeto" · "novo projeto" · "adicionar projeto"

## Processo Completo
Leia e siga: `SKILLS/SHARED/setup-project.md`

---

## Notas Específicas do GitHub Copilot CLI

### Interação com o Dev

Use a ferramenta `ask_user` para todas as perguntas ao dev — nunca pergunte apenas via texto.
Agrupe as perguntas de cada bloco e use `choices` quando houver opções predefinidas.

### Criação de Arquivos e Pastas

Use as ferramentas nativas — nunca powershell para criar arquivos de texto:
- `create` — para criar `map.json`, `context.md` e `.ai-project`
- `powershell` — apenas para criar as pastas e os `.gitkeep`

Para as pastas do map, executar via powershell:
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

Se existir, avisar o dev via `ask_user` e pedir confirmação antes de prosseguir.

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
