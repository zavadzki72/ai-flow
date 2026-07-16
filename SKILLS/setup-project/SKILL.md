---
name: setup-project
description: Cria um novo projeto no ai-flow. Coleta todas as informações necessárias via perguntas guiadas em blocos (projeto, stack, arquitetura, repositórios, tooling e contexto opcional), gera a estrutura completa em MAPS/{slug}/ com {slug}-map.json e {slug}-context.md preenchidos, e configura o .ai-project nos repositórios locais informados.
---

# Skill: Setup Project (Criar Novo Projeto)

## Trigger
`/setup-project` · "criar projeto" · "novo projeto" · "adicionar projeto"

## Processo Completo
Leia e siga: `SKILLS/SHARED/setup-project.md`

> **Âncora:** todo path deste arquivo é relativo à raiz do **ai-flow** (o repositório que contém
> `CONVENTIONS.md`). Se não encontrar, localize a raiz antes de desistir.

---

## Ambiente — resolva antes do Passo 0

Esta skill é a mesma para qualquer ferramenta. **Não existe adapter por CLI: o adapter é você.**

- **Arquivos** — use suas tools nativas de leitura, busca e edição. Invariante: **ler antes de
  editar**, sempre; e **nunca** usar shell (`cat`, `sed`, `awk`, `Get-Content`) para ler ou escrever
  texto. `{slug}-map.json`, `{slug}-context.md` e `.ai-project` são **sempre** escritos por tool.
- **Shell** — os blocos do SHARED são POSIX. O dialeto vem do **SO da máquina**, não do seu nome:
  em Windows, `git`, `gh` e `docker compose` funcionam idênticos via Git Bash — não traduza para
  PowerShell sem necessidade real. Aqui o shell serve só para criar pastas/`.gitkeep` e testar
  existência de caminho (`[ -d "{path}" ] && echo exists || echo not_found`).
- **Perguntas** — esta skill é uma entrevista em blocos (Passos 1 a 6): **nunca** colete tudo em
  texto solto. Se você tem pergunta estruturada (`AskUserQuestion`, `ask_user`), use, agrupando por
  bloco e oferecendo `choices` quando houver opções predefinidas. Se não tem — ou se você é
  subagent, onde ela costuma ser bloqueada — lista numerada no chat e **espere a resposta**.
  Nunca assuma.

---

## Invariantes (valem em todos os CLIs)

### Derivação do Slug

Refina o Passo 1 do SHARED — o slug é **sempre** derivado, nunca perguntado direto:

1. Converter para minúsculas
2. Substituir acentos e cedilhas pelos equivalentes sem acento (ã→a, ç→c, é→e, etc.)
3. Substituir espaços e underscores por hífens
4. Remover qualquer caractere que não seja letra, número ou hífen
5. Remover hífens duplicados ou nas extremidades

Exemplos: "Meu Sistema" → `meu-sistema` · "Order Manager 2.0" → `order-manager-20` ·
"Clarity" → `clarity` · "Gestão de KPIs" → `gestao-de-kpis`

O slug derivado vai para confirmação do dev antes de qualquer escrita.

### Nada de sobrescrita silenciosa

Antes de criar, verifique se `MAPS/{slug}/` já existe. Se existir, **avise o dev e peça confirmação
explícita** antes de prosseguir — pode ser uma reconfiguração, mas nunca decida isso sozinho.

### Repositórios

Verifique o caminho local de cada repositório antes de escrever o `.ai-project`. Só crie o arquivo
se o diretório existir; os que não existirem entram no relatório do Passo 9 como pendência manual.

---

## Próximos Skills na Sequência
- Criar o primeiro PRD: `/spec`
