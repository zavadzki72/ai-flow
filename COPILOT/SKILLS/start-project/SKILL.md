---
name: start-project
description: Orquestrador end-to-end para iniciar um projeto do zero. Conduz uma conversa de descoberta, recorta o escopo inicial, escolhe boilerplate interativamente, registra o projeto no ai-flow (delega para /setup-project), faz bootstrap físico (git init, deps, commit inicial) e gera os artefatos num de dois formatos escolhidos pelo dev: ENXUTO (1 PRD + 1 PLAN do MVP_000001, via /spec e /planejar) ou COMPLETO (N PRDs + N PLANs + grafo, via /epic-workflow --so-planejar). Ao final, o projeto está pronto para /implementar.
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
- `SKILLS/SHARED/setup-project.md` (Passo 6)
- `SKILLS/SHARED/spec.md` (Passo 8A — caminho enxuto)
- `SKILLS/SHARED/planejar.md` (Passo 9 — caminho enxuto; não roda no completo)
- `SKILLS/SHARED/epic-workflow.md` (Passo 8B — caminho completo, sempre com `--so-planejar`)

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
- `create` — para `{slug}-map.json`, `{slug}-context.md`, `.ai-project`, `README.md`, `.gitignore`
- `powershell` — apenas para `mkdir`, copiar boilerplate, `git init`, `restore/install`

Para criar a estrutura do map:
```powershell
$slug = "{slug}"
$base = "MAPS\$slug"
foreach ($d in "prd","plan","adr","epic","e2e") {
  New-Item -ItemType Directory -Path "$base\$d" -Force | Out-Null
  "" | Out-File "$base\$d\.gitkeep" -Encoding utf8
}
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

### Bifurcação Enxuto × Completo (Passo 2)

O recorte do Passo 2 pode terminar em **dois formatos de saída**, e é o dev quem escolhe.
As condições, as opções e o que cada caminho produz estão **só** no SHARED
(`start-project.md` § Enxuto × Completo e Passo 2) — leia de lá e não decida por memória:
este menu já mudou uma vez, e os adaptadores que o copiaram ficaram oferecendo o menu antigo.

Aqui só a mecânica: apresentar as opções via `ask_user` com `choices`, e respeitar a escolha nos Passos 8/9/10
sem perguntar de novo.

### Próximo Skill na Sequência
Depende do caminho — o Passo 10 do SHARED (10A enxuto / 10B completo) traz o comando exato.
