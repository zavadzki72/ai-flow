---
name: start-project
description: Orquestrador end-to-end para iniciar um projeto do zero. Conduz uma conversa de descoberta, recorta o escopo inicial, escolhe boilerplate interativamente, registra o projeto no ai-flow (delega para /setup-project), faz bootstrap físico (git init, deps, commit inicial) e gera os artefatos num de dois formatos escolhidos pelo dev: ENXUTO (1 PRD + 1 PLAN do MVP_000001, via /spec e /planejar) ou COMPLETO (N PRDs + N PLANs + grafo, via /epic-workflow --so-planejar). Ao final, o projeto está pronto para /implementar.
---

# Skill: Start Project (Zero ao MVP_000001 Rodando)

## Trigger
`/start-project` · "começar projeto" · "novo projeto do zero" · "criar projeto e MVP"

## Processo Completo
Leia e siga: `SKILLS/SHARED/start-project.md`

Esta skill é um **orquestrador** que reusa a lógica de outras skills SHARED. Sempre que o processo
mandar "delegar para `SKILLS/SHARED/X.md`", carregue aquele arquivo e execute seus passos dentro
desta conversa. **Leia o SHARED referenciado antes de executar o passo que delega** — não confie na
memória, releia o conteúdo atualizado a cada uso.

| Passo | Delega para |
|---|---|
| Passo 6 (Registro no ai-flow) | `SKILLS/SHARED/setup-project.md` |
| Passo 8A (caminho ENXUTO) | `SKILLS/SHARED/spec.md` |
| Passo 8B (caminho COMPLETO) | `SKILLS/SHARED/epic-workflow.md`, sempre com `--so-planejar` |
| Passo 9 (caminho ENXUTO; não roda no completo) | `SKILLS/SHARED/planejar.md` |

Os Passos 4 (Arquitetura e Modelo de Dados) e 7 (Bootstrap Físico) **não delegam** — rodam inteiros
no SHARED desta skill.

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

---

## Ambiente — resolva antes do Passo 0

Esta skill é a mesma para qualquer ferramenta. **Não existe adapter por CLI: o adapter é você.**

- **Arquivos** — use suas tools nativas de leitura, busca e edição para `{slug}-map.json`,
  `{slug}-context.md`, `.ai-project`, `README.md`, `.gitignore` e para substituir placeholders do
  boilerplate. Invariante: **ler antes de editar**, sempre; e **nunca** usar shell (`cat`, `sed`,
  `Get-Content`) para ler ou escrever texto. Shell só para `mkdir`, copiar boilerplate, `git init` e
  `restore/install`.
- **Shell** — os blocos do SHARED são POSIX. O dialeto vem do **SO da máquina**, não do seu nome: em
  Windows, `git`, `gh` e `docker compose` funcionam idênticos via Git Bash — não traduza para
  PowerShell sem necessidade real.
- **Perguntas** — se você tem pergunta estruturada (`AskUserQuestion`, `ask_user`), use. Se não tem —
  ou se você é subagent, onde ela costuma ser bloqueada — lista numerada no chat e **espere a
  resposta**. Nunca assuma.

---

## Invariantes (valem em todos os CLIs)

### Estilo da Conversa

O **Passo 1 (Descoberta)** é **conversacional**, não questionário rígido: faça as 4 perguntas numa
única mensagem e deixe claro que o dev pode responder em estilo livre. Capture o que vier e siga.

Para escolhas com opções predefinidas (boilerplate, slicing do MVP, confirmação de comandos),
apresente as opções de forma estruturada e peça escolha explícita antes de prosseguir.

### Boilerplates

Liste `BOILERPLATES/BACK/*` e `BOILERPLATES/FRONT/*` com sua tool nativa de busca. Para cada
boilerplate, tente ler o `README.md` dele e mostre uma descrição curta junto da opção.

Copie recursivamente `BOILERPLATES/{categoria}/{nome}/*` para o path do repo, preservando subpastas.
Depois de copiar, substitua os placeholders comuns (`{{PROJECT_NAME}}`, `{{REPO_NAME}}`, etc.) pelos
valores reais, se o boilerplate usar essa convenção.

### Verificação de Path Existente (antes de aplicar boilerplate ou criar `.ai-project`)

- Path não existe → criar a pasta e prosseguir
- Path existe e está vazio → prosseguir
- Path existe **com conteúdo** → **parar**, avisar e pedir decisão (pular / usar mesmo assim / cancelar)

```bash
[ -d "{path}" ] && [ "$(ls -A {path})" ] && echo "exists_with_content" || echo "ok"
```

### Estrutura do map

```bash
mkdir -p "MAPS/{slug}"/{prd,plan,adr,epic,e2e}
touch "MAPS/{slug}"/{prd,plan,adr,epic,e2e}/.gitkeep
```
Mais `{slug}-map.json` e `{slug}-context.md` na raiz de `MAPS/{slug}/`, escritos com tool nativa.

### Comandos com Confirmação

Antes de rodar `git init`, `npm install`, `dotnet restore`, etc., **sempre** confirme com o dev.
Nunca execute silenciosamente.

### Commits

**Nunca** adicione trailer `Co-Authored-By` de IA (Claude, Copilot, Cursor, Gemini…) — inclusive no
commit inicial do Passo 7.7. Se o seu harness anexa esse trailer por padrão — **o Claude Code
anexa** — remova-o. Sem exceção, em nenhum CLI.

### Bifurcação Enxuto × Completo (Passo 2)

O recorte do Passo 2 termina em **dois formatos de saída**, e é o dev quem escolhe. As condições, as
opções e o que cada caminho produz estão **só** no SHARED (`start-project.md` § Enxuto × Completo e
Passo 2) — leia de lá e não decida por memória. Aqui só a mecânica: apresente as opções, e respeite
a escolha nos Passos 8/9/10 sem perguntar de novo.

---

## Próximos Skills na Sequência
Depende do caminho — o Passo 10 do SHARED (10A enxuto / 10B completo) traz o comando exato.
