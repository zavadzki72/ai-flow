# Conventions

Guia de como escrever e manter skills, maps e boilerplates neste repositório.

---

## Skills

### Estrutura de uma Skill

Toda skill tem uma lógica central e um adapter por ferramenta:

```
SKILLS/SHARED/nome-skill.md     ← lógica central, agnóstica de provider
CLAUDE/SKILLS/nome-skill/SKILL.md   ← adapter com sintaxe Claude Code
GEMINI/SKILLS/nome-skill/SKILL.md   ← adapter com sintaxe Gemini
COPILOT/SKILLS/nome-skill/SKILL.md  ← adapter com sintaxe GitHub Copilot CLI
CURSOR/SKILLS/nome-skill/SKILL.md   ← adapter em Markdown para Cursor Commands/Agent
```

### Como as Skills Acessam Contexto de Projeto

**Todas as skills devem começar com um Passo 0:** localizar e ler o map do projeto ativo.

O projeto ativo é determinado por um arquivo `.ai-project` na raiz do repositório onde o dev está trabalhando, com o seguinte conteúdo:

```
MAPS/project
```

Se `.ai-project` não existir, a skill deve perguntar ao dev: `Qual projeto estamos trabalhando? (ex: projeto-1, projeto-2)`

Após identificar o projeto:
1. Ler `MAPS/{slug}/{slug}-map.json` para obter configuração estruturada
2. Ler `MAPS/{slug}/{slug}-context.md` — **sempre, e antes de `docs/`**
3. Ler os `.md` das pastas `docs/` relevantes à skill — **quando existirem**
4. Identificar o repositório correto usando o campo `contexts` de cada repo

### Precedência: `{slug}-context.md` × `docs/`

| | Obrigatório? | Papel |
|---|---|---|
| `{slug}-context.md` | ✅ **sim**, em todo map | **A fonte principal.** Arquitetura, padrões, glossário, modelo de dados e a seção `## Comandos` (build/testes) |
| `docs/architecture/` · `docs/business/` · `docs/code-review/` | ❌ não | Aprofundamento por tema, quando o projeto cresce a ponto de justificar |

**Regra:** onde os dois falarem do mesmo assunto, **`docs/` vence** — é o mais específico. Onde só o
`context.md` falar, ele é a verdade. **Nenhuma skill pode pular o `context.md`** esperando achar a
informação em `docs/`.

> 🔴 **Por que isto está escrito em maiúsculas:** as pastas `docs/` estão **vazias na maioria dos
> projetos**, e os comandos de build/teste vivem em `{slug}-context.md § Comandos`. Uma skill que só
> lê `docs/architecture/` abre uma pasta vazia e não descobre como buildar o projeto — falha que
> passa despercebida no modo interativo (o dev responde) e **quebra o fechamento de onda** nos
> fluxos autônomos, onde não há ninguém para responder.

### Regras para Escrever Skills

- **Sem contexto de projeto embutido.** Todo contexto vem do map.
- **Lógica central em SHARED.** Os adapters de Claude/Gemini/Copilot/Cursor apenas traduzem sintaxe.
- **Perguntas obrigatórias primeiro.** Se a skill precisa de PRD, PLAN ou branch, peça antes de agir.
- **Passos numerados e explícitos.** O dev deve conseguir acompanhar o que a skill está fazendo.
- **Saída estruturada.** Relatórios e resultados devem ter formato consistente.

### Frontmatter do Adapter Claude e Copilot CLI

```markdown
---
name: nome-skill
description: Uma linha descrevendo quando e para que a skill é usada.
---
```

### Adapter Cursor

O adapter Cursor deve ser Markdown simples, sem frontmatter obrigatório, para poder ser usado como Custom Command em `.cursor/commands/{nome-skill}.md`.

Todo adapter Cursor deve incluir:
- Trigger esperado no chat (`/nome-skill`)
- Referência ao processo completo em `SKILLS/SHARED/{nome-skill}.md`
- Seção `Notas Específicas do Cursor`
- Orientação para usar o Agent do Cursor para leitura/edição e o terminal integrado apenas para build, testes e git
- Adaptação de comandos para PowerShell quando o ambiente for Windows

Instruções persistentes de comportamento do Cursor devem ficar em `CURSOR/RULES/*.mdc`.

---

## Agentes (Personas por Papel)

Um **agente** é uma **persona** (o "QUEM": mindset + model + tools + especialização) que **usa uma
skill** (o "COMO"). **Agente ≠ Skill:** a skill é o processo; o agente é quem o executa.
Racional completo em `AGENTS/DESIGN.md`.

### Estrutura

```
AGENTS/SHARED/{papel}.md            ← persona canônica, agnóstica (fonte de verdade)
AGENTS/SHARED/lenses/{linguagem}.md ← lentes de linguagem (só conhecimento idiomático)
CLAUDE/AGENTS/{papel}.md            ← adapter Claude Code (instala em .claude/agents/)
```

### Contrato de conteúdo de uma persona (regra de ouro contra duplicação)

O corpo de um agente contém **apenas**:
1. Identidade / mindset do papel;
2. "Seu processo é a skill `/X` — siga `SKILLS/SHARED/X.md`" (**nunca** reescrever os passos);
3. Perfil de tools (least-privilege);
4. **Bloco de isolamento** — cada agente roda em **janela de contexto própria**;
5. **Bloco de comunicação** — quando consultar outro agente e como devolver dúvidas ao humano;
6. `description` acionável (dispara a delegação).

> ❌ Nunca colocar lógica de negócio na persona — isso é da skill. `SKILLS/SHARED` é a fonte única de verdade.

### Papéis atuais

| Papel | Skill | Tools |
|-------|-------|-------|
| `product-manager` | `/spec` | Read/Glob/Grep + Write (só `prd/`) |
| `arquiteto-senior` | `/planejar` | + Write (`plan/`, `adr/`) + Bash (git) |
| `dev-senior` | `/implementar` | + Edit/Write/Bash (lê a stack do map + lente) |
| `qa` | `/test-e2e` | Read/Glob/Grep + Bash (docker) + Write (só `e2e/`) + MCP de browser |
| `tech-lead` | `/code-review` | Read/Glob/Grep + Bash (read-only) |
| `engineering-manager` | `/feature-workflow` | Read/Glob/Grep + Bash (git) + Edit/Write (só o PLAN) + **`Agent`** |

### Delegação: quem pode invocar quem

Um agente só consegue disparar outro se **`Agent` estiver na sua lista `tools:`**. Lista explícita
sem `Agent` = agente sem poder de delegação (o campo omitido herda tudo, inclusive `Agent`).
Aninhamento é suportado até **profundidade 5**, fixa — em depth 5 o agente perde a tool `Agent`.

Hoje **só o `engineering-manager`** tem `Agent`. Os outros 5 papéis são **folhas** de propósito: a
comunicação entre eles é sempre **via broker** (o agente retorna a dúvida a quem o invocou, que faz
a ponte) — nunca consulta direta. É o default recomendado no `AGENTS/DESIGN.md` §4.2, e o
frontmatter é o que o torna obrigatório em vez de sugerido.

### Níveis de orquestração

| Skill | Unidade | Paraleliza | Teto |
|-------|---------|-----------|------|
| `/feature-workflow` | a **etapa** (baby step) | etapas em ondas topológicas | 3 `dev-senior` |
| `/epic-workflow` | a **feature** | features em ondas + as etapas de cada uma | 3 features **e** 6 `dev-senior` somados |

`/feature-workflow` (ver `SKILLS/SHARED/feature-workflow.md`) — **autônoma**: validação objetiva no
lugar de gates humanos; FASE 3 paraleliza etapas independentes em **ondas topológicas** (branch
efêmera + worktree por etapa, merge + testes integrados por onda).

`/epic-workflow` (ver `SKILLS/SHARED/epic-workflow.md`) — uma altitude acima: decompõe um épico em
features (recorte do PM **criticado pelo arquiteto**, no lugar do gate humano), roda `/spec` e
`/planejar` de todas em paralelo, e só então monta o grafo global. Cada feature é delegada a um
`engineering-manager`, que roda o `/feature-workflow` inteiro na janela dele.

> **A barreira do `/epic-workflow` é estrutural, não conservadorismo:** o grafo de features depende
> da união dos `Arquivo(s) Afetado(s)` de cada PLAN — que só existe depois da FASE 2. Sem ela, duas
> features colidem no merge do épico, e reimplementar uma feature inteira custa ordens de grandeza
> mais que reimplementar uma etapa.
>
> **Teto de concorrência é auto-imposto:** o Claude Code **não documenta** limite de subagents
> simultâneos. 3 features × 3 devs = 9 janelas — por isso o teto vai no prompt de cada
> `engineering-manager`, e não na cabeça de cada um.

### Comunicação e Handoff

- Cada agente roda **isolado**; a comunicação é por **consulta (request/response)** + **estado em arquivo**.
- Todo artefato termina com uma **Nota de Handoff**: *De/Para · Decisões · Dúvidas em aberto · O que o próximo papel deve saber*.
- Decisões relevantes vão para o **log de decisões** (`adr/`).
- Como subagent isolado **não recebe `AskUserQuestion`**, as skills interativas usam **ask-upfront**:
  o agente **retorna** as dúvidas ao orquestrador. No `/feature-workflow`, elas só chegam ao humano
  na **rodada inicial** (modo normal); depois dela (ou no `--auto`), viram **premissas assumidas**
  registradas no artefato e no `adr/`.

### Regras

- **Só Claude Code no 1º corte.** `.claude/agents/*.md` é lido nativamente por Claude Code, Cursor e
  Copilot (VS Code); Gemini precisaria de arquivo próprio (`.gemini/agents/`) — fazer ao cobrir Gemini.
- ⚠️ **Editar um agente em disco não recarrega na sessão ativa** — reinicie a sessão (ou crie via `/agents`).

### Adicionando um Novo Agente

1. Crie a persona em `AGENTS/SHARED/{papel}.md` (seguindo o contrato acima).
2. Crie o adapter em `CLAUDE/AGENTS/{papel}.md` (frontmatter + "leia `AGENTS/SHARED/{papel}.md`" + notas Claude).
3. Instale em `.claude/agents/` (copie o adapter) no repositório/cliente.
4. Documente na tabela do `README.md`.

---

## Maps

### Estrutura de um Map

Cada projeto em `MAPS/` deve ter:

```
MAPS/{slug}/
  {slug}-map.json      ← configuração estruturada (obrigatório)
  {slug}-context.md    ← contexto em prosa (obrigatório)
  epic/         ← Épicos / pacotes de features (/epic-workflow)
  prd/          ← PRDs de features
  plan/         ← PLANs de execução
  e2e/          ← Relatórios e evidências de teste E2E (/test-e2e)
  adr/          ← Architectural Decision Records
```

`{slug}` é o nome da pasta do projeto (mesmo valor usado em `MAPS/{slug}/` e
no `.ai-project`) — sempre minúsculo, com hífen, sem acento (ex: `copa-draft`,
`gestao-usuarios`). Todo arquivo dentro do map carrega esse prefixo para ficar
único e identificável quando o repositório é aberto como vault do Obsidian
(sem isso, cada projeto teria um `context.md`/`map.json` de nome idêntico,
impossível de diferenciar na busca rápida ou no grafo).

### Schema do map.json

Siga o template em `MAPS/_template/map.json` (ao copiar, renomear para
`{slug}-map.json`). Campos obrigatórios:
- `project.name`, `project.description`, `project.status`
- `repositories` com ao menos um entry com `path`, `branch` e `contexts`
- `stack` com ao menos `backend` ou `frontend`

> 🔴 **Um entry de `repositories` = um `.git`, não uma pasta.** Um projeto com `backend/` e
> `frontend/` dentro de **um** clone é **um** repo — não dois. Declarar duas entradas para um
> monorepo quebra em silêncio: os paths existem, então uma checagem de pasta passa, mas
> `git -C {path} fetch` falha; e as skills passam a achar que precisam coordenar merge entre repos
> que na verdade são o mesmo. **Sinal claro de erro:** duas entradas com a **mesma** `url`.
> Na dúvida: `git -C {path} rev-parse --git-dir` — se falhar, não é um repo.
>
> Um monorepo com múltiplas stacks declara **uma** entrada, com `contexts` cobrindo todas elas e
> `boilerplate: ""` (o campo aponta um boilerplate só; um monorepo tem mais de um). A separação
> interna (`backend/`, `frontend/`) é descrita no `{slug}-context.md`, seção de estrutura de pastas.

`docs.epic` e `epic` são **opcionais**, usados pelo `/epic-workflow`. Maps criados antes dessa skill
não os têm — a skill **cria a pasta e acrescenta o campo** ao encontrar sua ausência, e registra a
migração no relatório. Não é preciso migrar nada à mão.

`epic.hot-files` é **opcional**: lista de globs de arquivos de **registro** — pontos que quase toda
feature toca por acréscimo (DI, rotas, `Program.cs`, schema). O `/epic-workflow` usa para decidir o
que **não** serializa: duas features que colidem apenas em hot-file rodam em paralelo mesmo assim, e
o custo de um eventual conflito trivial já está coberto pelo guardrail de re-execução.

```jsonc
"epic": {
  "hot-files": ["backend/src/Program.cs", "backend/**/DependencyInjection*.cs", "frontend/src/routes.tsx"]
}
```

Sem o campo, a skill usa uma lista default curta e conservadora, e registra como premissa. **Errar para mais é caro:**
listar um arquivo de domínio como hot-file faz duas features editarem regra de negócio no mesmo
lugar em paralelo — o conflito deixa de ser trivial e vira retrabalho de feature inteira. Na dúvida,
não liste.

`environments.local` é **opcional**, mas obrigatório para usar a skill `/test-e2e` — declara como
subir o ambiente local, seja via Docker, nativo (`dotnet run`, `npm run dev`, ...) ou híbrido:
- `mode`: `docker` | `hybrid` | `native` — indica se `compose-path` sozinho já sobe tudo, se é uma
  mistura de compose + processos nativos, ou se não há Docker no projeto.
- `compose-path`: caminho do `docker-compose.yml`, presente quando `mode` é `docker` ou `hybrid`.
- `processes`: comandos nativos adicionais (ex.: dev server de frontend, API sem Docker). Cada
  entrada tem `name`, `cwd` (relativo à raiz do worktree), `up-command`, `background` (`true` quando
  o comando não retorna sozinho — ex. dev server — e precisa ir para background com o PID
  rastreado para poder ser encerrado depois) e `down-command` (vazio = só mata o processo pelo PID).
- `services`: URL + `healthcheck` de cada serviço acessível do host, para o polling de prontidão.
  O `healthcheck` não precisa ser um endpoint dedicado — qualquer path que responda 2xx serve.
- `seed-command`, `teardown-command`: comandos livres, vazios se não aplicável.
- `test-users`: usuários de teste, sempre com a senha referenciada por `password-env`, **nunca**
  literal. Projetos sem login fixo (ex.: guest login) deixam a lista vazia e descrevem o mecanismo
  em prosa no `{slug}-context.md`.

### Nomenclatura de Documentos

Todos os nomes são `kebab-case` minúsculo, prefixados com `{slug}` do projeto.

| Tipo | Padrão | Exemplo (`slug = gestao-usuarios`) |
|------|--------|---------|
| Map | `{slug}-map.json` | `gestao-usuarios-map.json` |
| Context | `{slug}-context.md` | `gestao-usuarios-context.md` |
| Épico | `{slug}-epic-NNN-nome-do-epico.md` | `gestao-usuarios-epic-001-portal-de-acesso.md` |
| PRD | `{slug}-prd-NNN-id-nome-da-feature.md` | `gestao-usuarios-prd-001-tbd-cadastro-de-usuario.md` |
| PLAN | `{slug}-plan-NNN-nome-da-feature.md` (mesmo NNN do PRD) | `gestao-usuarios-plan-001-cadastro-de-usuario.md` |
| E2E Report | `{slug}-e2e-NNN-nome-da-feature.md` (mesmo NNN do PRD/PLAN) | `gestao-usuarios-e2e-001-cadastro-de-usuario.md` |
| ADR | `{slug}-adr-NNN-titulo-da-decisao.md` | `gestao-usuarios-adr-001-escolha-orm.md` |

`id` no PRD é o número do ticket externo (Azure DevOps/Jira) ou `tbd` se não
houver. `NNN` é sempre zero-padded a 3 dígitos, exceto no MVP inicial gerado
pelo `/start-project` (`000001`, zero-padded a 6 dígitos — ver `start-project.md`).

O **épico tem sequência própria** (`epic/` tem sua própria contagem, independente de `prd/`). Os
PRDs gerados por um épico **não** herdam o número dele: cada um pega o próximo `NNN` livre da pasta
`prd/`, como qualquer outra feature. O vínculo épico ↔ PRDs vive **dentro** do arquivo do épico
(tabela de features com os paths), não na numeração — um épico pode gerar os PRDs 007 a 011 sem que
os nomes digam isso.

**Exceção — PLAN de reconciliação:** `{slug}-plan-NNN-reconciliacao-epic-{nome}.md` é o único PLAN
**sem PRD**. Ele nasce do review de integração de um épico (`/epic-workflow` § 6.2), onde a base é o
relatório do `tech-lead` mais os PRDs das features envolvidas — não há um PRD só de onde herdar
número. Ele pega o próximo `NNN` livre da pasta **`plan/`**, não da `prd/`. É a única quebra da
regra "mesmo NNN do PRD" da tabela acima.

> ⚠️ **Numeração em paralelo:** o `/epic-workflow` dispara N `product-manager` ao mesmo tempo na
> FASE 1. Os números dos PRDs precisam ser **reservados pelo orquestrador antes** de disparar —
> dois PMs paralelos que calculem "o próximo NNN livre" sozinhos escolhem o mesmo.

---

## Git Worktree (Isolamento entre Orquestradores)

**Regra obrigatória:** toda skill que faz `checkout` de uma branch ou executa a aplicação a partir
do código no disco (`/implementar`, `/test-e2e`) **nunca opera no clone principal**
(`repositories.{repo}.path`). Sempre cria ou reutiliza um `git worktree` dedicado à branch.

### Por quê

Duas sessões de orquestrador podem estar ativas no mesmo projeto ao mesmo tempo (duas rodadas de
`/feature-workflow`, ou um `/implementar` rodando enquanto um `/test-e2e` testa outra branch). Se
ambas fizerem `git checkout` no mesmo diretório, uma pisa no working tree da outra — a branch troca
por trás, ou mudanças não commitadas se misturam entre os dois processos. Um `git worktree` por
branch elimina essa classe de colisão: cada branch vive em seu próprio diretório, e o próprio Git
recusa dar 2 worktrees para a mesma branch (`fatal: branch already checked out`), servindo como
trava natural contra dois orquestradores disputando a mesma branch.

### Convenção de path

```
{repositories.{repo}.worktrees-path ou "{path}-worktrees/"}/{branch-slug}
```

`branch-slug` é a branch com `/` trocado por `-` (ex.: `feature/nome-da-feature` →
`feature-nome-da-feature`). `worktrees-path` é **opcional** em `map.json` — se ausente, usa o padrão
`{path}-worktrees/` (irmão do clone principal, fora do repositório em si).

### Hierarquia de branches

| Nível | Branch | Sai de | Volta para | Quem cria |
|-------|--------|--------|-----------|-----------|
| Épico | `epic/{nome}` | `origin/{repo.branch}` | — (PR manual) | `/epic-workflow` |
| Feature | `feature/{x}` | `epic/{nome}` **ou** `origin/{repo.branch}` | branch do épico, ou PR | `/epic-workflow` ou `/feature-workflow` |
| Etapa | `feature/{x}--etapa-{N}` | branch da feature | branch da feature | `/feature-workflow` |
| Correção | `fix/{nome}-{n}` | `epic/{nome}` | branch do épico | `/epic-workflow` (review de integração) |
| Planejamento | *(nenhuma — `--detach`)* | `origin/{repo.branch}` | — (só leitura) | `/epic-workflow` |

Cada nível vive em **worktree próprio**. Fora de um épico, `feature/{x}` sai direto da branch base
do repo — a branch de épico só existe quando o `/epic-workflow` está conduzindo.

**Multi-repo:** os nomes de branch se repetem **em cada repo** que o épico/feature toca
(`epic/portal` existe no `backend` e no `frontend`, evoluindo em paralelo). **Não existe merge
atômico entre repos** — a atomicidade é a **suíte de testes integrados**, que roda os comandos de
todos os repos e é o que pega backend e frontend fora de sincronia.

**Worktree de planejamento (`--detach`):** árvore só-leitura, sem branch, criada quando N agentes
precisam **ler** o código ao mesmo tempo (`/epic-workflow` Passo 0.5, antes da FASE 0). Sem ela, N agentes rodando
`checkout`/`pull` no mesmo clone colidem no `index.lock` — ou, pior e silencioso, um move o HEAD
enquanto o outro explora.

**Por que branches efêmeras no paralelismo:** o Git recusa dois worktrees na mesma branch
(`fatal: branch already checked out`). Rodar N agentes em paralelo **exige** N branches distintas —
a trava do Git é o que impede dois orquestradores de disputarem a mesma branch, e é por isso que o
paralelismo é feito de branches efêmeras em vez de um diretório compartilhado.

### Regras

- O clone principal (`repositories.{repo}.path`) só recebe `git fetch` — **nunca `git checkout`**.

### "Atualizar antes de começar" continua sendo obrigatório — quem faz isso é o `fetch`

Esta regra **não** proíbe partir de código atualizado. Ela proíbe **trocar o working tree** de um
diretório compartilhado. São coisas diferentes, e é fácil confundir:

| | O que faz | Precisamos? |
|---|---|---|
| `git fetch origin` | traz **todos** os commits novos para `origin/{branch}` | ✅ **sim** — é a atualização |
| `git checkout {branch}` | move o working tree do clone principal | ❌ não — e quebra a sessão vizinha |
| `git pull` | fetch + move o ref **local** `{branch}` e o working tree | ❌ não — nada lê o ref local |

O padrão correto é **`fetch` + sair de `origin/{repo.branch}`**:

```bash
git -C {repo.path} fetch origin
git -C {repo.path} worktree add "{worktree.path}" -b feature/x origin/{repo.branch}
```

Isso é **mais** confiável que `checkout` + `pull`, não menos: não depende de o ref local estar em
dia nem de o `pull` ter dado fast-forward limpo. O clone principal vira um espelho do remoto e uma
base de onde se cria worktree — e nunca mais alguém pisa no working tree dele.

> ⚠️ **A armadilha:** `worktree add -b nova-branch` **sem start-point** sai do **HEAD do clone
> principal** — a branch que por acaso estiver com checkout lá, possivelmente velha ou alheia. O
> `fetch` não salva, porque esse comando não olha para `origin/`. **Sempre** passe
> `origin/{repo.branch}` explicitamente ao criar branch nova.
- Antes de criar um worktree novo, checar se já existe um para a branch (`git worktree list`) e
  **reutilizá-lo** — não recriar a cada execução.
- Se o Git recusar a criação (`branch already checked out at ...`), **não forçar**: informar ao dev
  que outra sessão está usando a branch agora e parar.
  - **Exceção nos fluxos autônomos:** essa regra pressupõe um dev na sala para decidir. O
    `/epic-workflow` roda sem canal humano e pode encontrar um worktree órfão **que ele mesmo
    deixou** (feature bloqueada numa execução anterior). Ali a regra é: se o worktree órfão é
    reconhecidamente dele e não há sessão viva, remover e seguir; se aponta para outro lugar, marcar
    a feature como bloqueada e seguir — nunca travar o épico inteiro por lixo próprio.
    Ver `epic-workflow.md` § Branches e worktrees órfãos.

### O que é automático e o que não é

| Operação | Automático? |
|---|---|
| `push`, criação de PR | ❌ **Nunca** — o humano decide, sempre |
| Merge na branch **base** do repo (`develop`/`main`) | ❌ **Nunca** |
| Merge de branch **efêmera de etapa** → branch da feature | ✅ Sim (fecha a onda — `/feature-workflow` § 3.4) |
| Merge de branch de **feature** → branch do **épico** | ✅ Sim (fecha a onda — `/epic-workflow` § 5.3) |
| `worktree remove` + `branch -d` de **efêmera já mesclada** | ✅ Sim (limpeza de onda) |
| `worktree remove` de branch **não mesclada** (bloqueada/descartada) | ✅ Sim — mas **preserve a branch**: ela é a evidência do que foi tentado |
| `worktree remove` de branch de **feature/épico que o humano criou** | ❌ Não — o dev decide |

O princípio real não é "worktree nunca some sozinho": é **nada sai do controle do humano sem que ele
peça** (push/PR/base) e **nada que ainda tem valor é destruído** (branch não mesclada). Branches
efêmeras internas a um ciclo são um detalhe de implementação do orquestrador que as criou — quem
cria, limpa. Sem isso, um épico de 5 features deixaria dezenas de worktrees para o dev varrer na mão.
- Skills que só leem (`git diff` sem checkout, ex. `/code-review`) **não precisam** de worktree —
  comparar duas referências não altera o working tree do clone principal.

---

## Boilerplates

Boilerplates ficam em `BOILERPLATES/BACK/` e `BOILERPLATES/FRONT/`.

O nome da pasta deve coincidir com o valor do campo `boilerplate` em `map.json` para que as skills possam localizá-los automaticamente.

Cada boilerplate deve conter um `README.md` explicando:
- O que é o boilerplate
- Como usar
- Variáveis/placeholders que precisam ser substituídos

---

## Adicionando um Novo Projeto

1. Copie `MAPS/_template/` para `MAPS/{slug}/`
2. Renomeie `map.json` → `{slug}-map.json` e `context.md` → `{slug}-context.md`
3. Preencha `{slug}-map.json` com as informações do projeto
4. Preencha `{slug}-context.md` com arquitetura, padrões e glossário
5. Crie o arquivo `.ai-project` na raiz de cada repositório do projeto apontando para `MAPS/{slug}`

---

## Adicionando uma Nova Skill

1. Crie a lógica central em `SKILLS/SHARED/nome-skill.md`
2. Crie o adapter em `CLAUDE/SKILLS/nome-skill/SKILL.md`
3. Crie o adapter em `GEMINI/SKILLS/nome-skill/SKILL.md`
4. Crie o adapter em `COPILOT/SKILLS/nome-skill/SKILL.md`
5. Crie o adapter em `CURSOR/SKILLS/nome-skill/SKILL.md`
6. Documente na tabela em `README.md`

### Exceção: skills orquestradoras são Claude-only no 1º corte

`/feature-workflow` e `/epic-workflow` têm **apenas** o adapter Claude, de propósito: elas delegam a
subagents, e isso depende da tool `Agent` e de `.claude/agents/` — mecânica que hoje só existe no
Claude Code (a regra "só Claude Code no 1º corte" do § Agentes cobre os **agentes**; esta cláusula
estende às skills que dependem deles). Um adapter Gemini/Copilot/Cursor de orquestrador seria uma
promessa que a ferramenta não cumpre.

Skills que **não** delegam (`/spec`, `/planejar`, `/implementar`, `/code-review`, `/test-e2e`,
`/setup-project`, `/start-project`) seguem a regra dos 4 adapters normalmente.
