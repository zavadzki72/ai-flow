---
name: start-project
description: Orquestrador end-to-end para iniciar um projeto do zero. Conduz uma conversa de descoberta, recorta um MVP_000001 enxuto, escolhe boilerplate interativamente, registra o projeto no ai-flow (delega para /setup-project), faz bootstrap físico (git init, deps), gera {slug}-prd-000001-mvp (delega para /spec) e {slug}-plan-000001-mvp (delega para /planejar). Ao final, o projeto está pronto para /implementar ETAPA 1.
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
- `SKILLS/SHARED/spec.md` (Passo 8)
- `SKILLS/SHARED/planejar.md` (Passo 9)

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
mkdir -p "MAPS/{slug}/prd" "MAPS/{slug}/plan" "MAPS/{slug}/adr"
touch "MAPS/{slug}/prd/.gitkeep" "MAPS/{slug}/plan/.gitkeep" "MAPS/{slug}/adr/.gitkeep"
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

### Detecção de Tamanho do MVP

Após o dev confirmar o recorte (Passo 2), conte os fluxos. Se > 5 OU envolve
integrações externas complexas, dispare o alerta de slicing usando
`AskUserQuestion` com as 3 opções (fatiar / manter / outro recorte).

### Sem Limite Duro

A skill **não impõe** um limite de tamanho para o MVP_000001. Apenas alerta
e oferece slicing. Se o dev disser "manter como está", siga adiante.

### Próximo Skill na Sequência
Após o `/start-project`, o dev deve rodar `/implementar ETAPA 1` para começar
a execução do MVP_000001.
