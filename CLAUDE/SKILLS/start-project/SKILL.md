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

## Notas Específicas do Claude Code

### Estilo da Conversa

O Passo 1 (Descoberta) deve ser **conversacional**, não um questionário rígido.
Faça as 4 perguntas em uma única mensagem mas deixe claro que o dev pode
responder em estilo livre. Capture o que vier e siga.

Para escolhas com opções predefinidas (boilerplate, slicing do MVP, confirmações
de `git init`/`install`), use a ferramenta `AskUserQuestion` para apresentar
as opções de forma estruturada.

### Leitura das Skills Reusadas

Antes de executar os passos 4, 6 e 7, leia o arquivo SHARED correspondente
com a tool `Read`. Não confie na memória — leia o conteúdo atualizado.

### Criação de Arquivos e Pastas

Use as ferramentas nativas — nunca bash para escrever arquivos de texto:
- `Write` — para `{slug}-map.json`, `{slug}-context.md`, `.ai-project`, `README.md`, `.gitignore`
- `Bash` — apenas para `mkdir`, copiar boilerplate, `git init`, `restore/install`

Para criar a estrutura do map:
```bash
mkdir -p "MAPS/{slug}"/{prd,plan,adr,epic,e2e}
touch "MAPS/{slug}"/{prd,plan,adr,epic,e2e}/.gitkeep
```

### Listagem de Boilerplates

Use `Glob` para listar boilerplates disponíveis:
```
BOILERPLATES/BACK/*
BOILERPLATES/FRONT/*
```

Para cada boilerplate encontrado, tente ler o `README.md` dele (se existir)
para mostrar uma descrição curta junto da opção.

### Cópia de Boilerplate

No Windows:
```bash
# PowerShell via Bash tool
powershell -Command "Copy-Item -Path 'BOILERPLATES/{categoria}/{nome}/*' -Destination '{repo-path}' -Recurse -Force"
```

Ou via Bash tool com `cp -r BOILERPLATES/{categoria}/{nome}/* {repo-path}/`
se o ambiente suportar.

### Comandos com Confirmação

Antes de rodar `git init`, `npm install`, `dotnet restore`, etc., **sempre**
confirmar com `AskUserQuestion`. Não rode silenciosamente.

### Verificação de Path Existente

```bash
[ -d "{path}" ] && [ "$(ls -A {path})" ] && echo "exists_with_content" || echo "ok"
```

### Bifurcação Enxuto × Completo (Passo 2)

O recorte do Passo 2 pode terminar em **dois formatos de saída**, e é o dev quem escolhe.
As condições, as opções e o que cada caminho produz estão **só** no SHARED
(`start-project.md` § Enxuto × Completo e Passo 2) — leia de lá e não decida por memória:
este menu já mudou uma vez, e os adaptadores que o copiaram ficaram oferecendo o menu antigo.

Aqui só a mecânica: apresentar as opções com `AskUserQuestion`, e respeitar a escolha nos Passos 8/9/10
sem perguntar de novo.

### Próximo Skill na Sequência
Depende do caminho — o Passo 10 do SHARED (10A enxuto / 10B completo) traz o comando exato.
