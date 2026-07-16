# ai-flow

Repositório central de configurações, skills e contexto para uso de IA no dia a dia de desenvolvimento.

---

## Estrutura

```
ai-flow/
  SKILLS/{nome}/SKILL.md  A skill: uma por pasta, lida por todos os clientes
  SKILLS/SHARED/          O processo de cada skill (agnóstico de provider)
  AGENTS/SHARED/          Personas por papel + lenses/ de linguagem (→ .claude/agents/)
  AGENTS/DESIGN.md        Por que a camada de agentes é assim (registro de decisão)
  MCP/{provider}/         Guias de setup de MCP, agnósticos de cliente (+ README.md e CLIENTS.md)
  BOILERPLATES/
    BACK/                 Boilerplates de backend (dotnet-api, dotnet-worker, ...)
    FRONT/                Boilerplates de frontend (react, angular, ...)
  MAPS/
    _template/            Template para novos projetos
  ORCHESTRATOR/           Dashboard local de acompanhamento dos workflows
  PRESENTATIONS/          Material de palestra
  CONVENTIONS.md          Como escrever skills, maps e boilerplates
  README.md               Este arquivo
```

---

## Como Funciona

### 1. Skills

As skills são instruções para a IA executar tarefas padronizadas (code review, implementação, planejamento, etc.).

Cada skill são **dois arquivos, sem adapter por ferramenta**:
- **`SKILLS/{nome}/SKILL.md`:** a porta de entrada — frontmatter, triggers, invariantes e como resolver
  o ambiente. É o que o cliente carrega.
- **`SKILLS/SHARED/{nome}.md`:** o processo completo, sem contexto de projeto embutido.

O `SKILL.md` segue o padrão aberto **Agent Skills** (`agentskills.io`) — criado pela Anthropic e
liberado como spec aberta, hoje lido nativamente por **Claude Code, Cursor, Gemini CLI, GitHub
Copilot e VS Code**, entre outros. Por isso um arquivo só serve todos os clientes: o vocabulário de
tool que os adapters traduziam à mão, o modelo resolve em runtime.

**Instalação:** symlink de arquivo para `.claude/skills/{nome}/SKILL.md` no repositório (ou
`~/.claude/skills/` para todos), e **reinicie a sessão** — o registro é snapshot de startup.

```bash
mkdir -p {repo}/.claude/skills/{nome}
ln -sf {ai-flow}/SKILLS/{nome}/SKILL.md {repo}/.claude/skills/{nome}/SKILL.md
```

### 2. Maps

O map é o "appsettings" de cada projeto, em `MAPS/{slug}/`. Contém:
- **`{slug}-map.json`:** config estruturada — repos, stack, paths, boilerplates, links para docs
- **`{slug}-context.md`:** prosa rica — arquitetura, padrões, glossário, integrações

Os arquivos levam o slug do projeto no nome (não apenas `map.json`/`context.md`) porque o
repositório também funciona como vault do Obsidian — sem o prefixo, todo projeto teria um
arquivo de nome idêntico, impossível de diferenciar na busca rápida ou no grafo.

As skills **nunca** têm contexto de projeto embutido. Elas leem o map do projeto ativo antes de agir.

> **Este repositório é público e contém a *ferramenta*; os maps são *dados* e moram fora dele.**
> Só o `MAPS/_template/` é versionado aqui. Os maps reais vivem no repo privado **`ai-flow-maps`**,
> ligados em `MAPS/{slug}` por symlink — os paths continuam idênticos, então `.ai-project`, skills e
> docs não mudam nada. Ver § Trabalhando em mais de uma máquina.

### 3. Projeto Ativo

Para que as skills saibam em qual projeto você está trabalhando, crie um arquivo `.ai-project` na raiz do repositório:

```
# .ai-project
MAPS/{slug}
```

Ex.: `MAPS/copa-draft`. É o slug do projeto — não o literal `project`.
Se o arquivo não existir, a skill vai perguntar qual projeto usar.

### 4. Trabalhando em mais de uma máquina

Clone os dois repositórios **lado a lado** e rode o script de ligação:

```bash
git clone https://github.com/zavadzki72/ai-flow.git
git clone https://github.com/zavadzki72/ai-flow-maps.git   # privado — pede login

cd ai-flow && ./scripts/install.sh
```

O `install.sh` faz os três passos: instala as **skills** e os **agentes** em `.claude/` (por symlink)
e liga os **maps**. Sem argumento, instala em `../.claude` — o workspace que contém o ai-flow.
Passe `~/.claude` para instalar no nível do usuário, valendo em qualquer projeto:

```bash
./scripts/install.sh ~/.claude
```

**Reinicie a sessão depois** — o registro de skills e agentes é lido no startup.

Se só quiser religar os maps (ex.: depois de criar um projeto novo), rode `./scripts/link-maps.sh`.
Ele cria um symlink **relativo** (`MAPS/{slug} -> ../../ai-flow-maps/{slug}`) por projeto, então
funciona em qualquer máquina desde que os dois repos sejam irmãos. Ele nunca sobrescreve diretório
real — se `MAPS/{slug}` existir de verdade, ele avisa e pula.

Sincronizar entre máquinas = `git pull`/`push` nos dois repos. O que é privado nunca passa pelo público.

**Ao criar um projeto novo:** o `/setup-project` gera o map em `MAPS/{slug}/`. Mova para o repo
privado e religue:

```bash
mv MAPS/{slug} ../ai-flow-maps/{slug} && ./scripts/link-maps.sh
```

---

## Skills Disponíveis

| Skill | Trigger | O que faz |
|-------|---------|-----------|
| `code-review` | `/code-review` | Revisa código validando PLAN, padrões e boas práticas |
| `test-e2e` | `/test-e2e` | Sobe o ambiente local (Docker, nativo ou híbrido), simula um usuário navegando pela feature e gera relatório com evidências (screenshots) |
| `implementar` | `/implementar` | Executa uma etapa do PLAN com branch, código, testes e commit |
| `planejar` | `/planejar` | Cria um PLAN de execução a partir de um PRD |
| `spec` | `/spec` | Gera especificação técnica de uma feature |
| `setup-project` | `/setup-project` | Cria novo projeto no ai-flow ({slug}-map.json, {slug}-context.md, .ai-project) |
| `start-project` | `/start-project` | Orquestrador zero → projeto planejado: descoberta da ideia, recorte, boilerplate, bootstrap físico e os artefatos — **enxuto** (1 PRD + 1 PLAN do MVP_000001) ou **completo** (N PRDs + N PLANs via `/epic-workflow --so-planejar`), à escolha do dev |
| `feature-workflow` | `/feature-workflow [--auto]` | Orquestra o ciclo por feature de forma autônoma (PM → Arquiteto → Dev em ondas paralelas → Tech Lead), com validação objetiva entre artefatos; normal = 1 rodada de perguntas no início, `--auto` = zero interação |
| `epic-workflow` | `/epic-workflow [--so-planejar]` | Orquestra um **pacote de features** ou um **épico que não cabe num PRD só**: decompõe, roda `/spec` e `/planejar` de todas em paralelo, monta o grafo global e executa as features em ondas — cada uma num `/feature-workflow` isolado. Sempre autônomo; `--so-planejar` para nos artefatos (N PRDs + N PLANs + grafo), sem escrever código |

---

## Agentes Disponíveis

Personas por papel que **usam as skills** acima. **Agente ≠ Skill:** a skill é o processo; o agente é
quem o executa (mindset + model + tools + especialização). Cada agente roda em **janela de contexto
isolada** e se comunica por consulta + handoff em arquivo. Detalhes em `AGENTS/DESIGN.md`.

| Agente | Papel | Skill que executa |
|--------|-------|-------------------|
| `product-manager` | Product Manager / Owner | `/spec` |
| `arquiteto-senior` | Arquiteto de Software Sênior | `/planejar` |
| `dev-senior` | Dev Sênior (lê a stack do map + lente de linguagem) | `/implementar` |
| `qa` | QA Engenheiro de Testes E2E (sobe ambiente, navega via MCP de browser) | `/test-e2e` |
| `tech-lead` | Tech Lead (guardião de engenharia, read-only) | `/code-review` |
| `engineering-manager` | Engineering Manager (entrega uma feature inteira; **único papel que delega**) | `/feature-workflow` |

### Os três níveis de orquestração

```
/epic-workflow        épico → N features       ondas de features (máx. 3 · teto de 6 devs somados)
  └─ /feature-workflow    feature → N etapas   ondas de etapas (máx. 3 devs)
       └─ /implementar        etapa → código
```

`/feature-workflow` conduz PM → Arquiteto → Dev → Tech Lead de forma **autônoma** (validação
objetiva no lugar de gates humanos; dúvidas viram premissas registradas). As etapas do PLAN rodam em
**ondas paralelas** (branch efêmera + worktree por etapa).

`/epic-workflow` sobe uma altitude: decompõe o épico em features (recorte do PM **criticado pelo
arquiteto** — a validação cruzada substitui o gate humano), roda `/spec` e `/planejar` de todas em
paralelo, e **só depois de todos os PLANs existirem** monta o grafo global (dependências + colisão
real de arquivos) e executa as features em ondas. Cada feature vira um `engineering-manager` rodando
um `/feature-workflow` inteiro em janela própria.

`/epic-workflow --so-planejar` corta o fluxo no grafo: N PRDs, N PLANs e as ondas calculadas, **zero
código**. Serve para revisar o plano inteiro (sobretudo as premissas assumidas) antes de pagar a
implementação, e é por essa porta que o `/start-project` entra quando o dev escolhe o caminho
"completo" — projeto novo não tem padrão pro dev replicar, então ele planeja tudo e deixa a primeira
feature na sua mão. Depois, `/epic-workflow {path-do-épico}` retoma e implementa.

Nenhum dos dois faz push/PR automático — o relatório final só sugere.
`/test-e2e` roda entre `/implementar` (todas as etapas concluídas) e `/code-review` — ainda fora do
`/feature-workflow`, disparado manualmente enquanto a integração ao orquestrador não é feita. No
`/epic-workflow` ele já entra como Passo 6.3 (FASE 4), condicional a `environments.local` + MCP de browser.

> ⚠️ **`Agent` no frontmatter é o que dá poder de delegação.** Só o `engineering-manager` tem — os
> outros papéis são folhas de propósito, e a comunicação entre eles é sempre via broker. Ver
> `CONVENTIONS.md` § Delegação.

**Instalação (Claude Code):** symlink de `AGENTS/SHARED/*.md` para `.claude/agents/` do repositório
(ou `~/.claude/agents/` para todos os projetos) e **reinicie a sessão**.

```bash
mkdir -p {repo}/.claude/agents
ln -sf {ai-flow}/AGENTS/SHARED/{papel}.md {repo}/.claude/agents/{papel}.md
```

> A camada de agentes é **Claude-only**, e por um motivo estrutural: subagent com janela isolada não
> é capability que os outros clientes tenham hoje. Por isso `AGENTS/SHARED/*.md` carrega `tools:` e
> `model:` no frontmatter — vocabulário do Claude Code — e está tudo bem. Revisite quando mudar.

---

## Configurando MCPs

MCPs (Model Context Protocol) conectam a IA a sistemas externos como Azure DevOps, Datadog, etc.
As skills em `MCP/` são agnósticas de cliente e geram configuração para Claude Code, Cursor, Gemini CLI, GitHub Copilot/VS Code ou outro cliente MCP compatível.

| Provider | Skill | Status |
|----------|-------|--------|
| Azure DevOps | `MCP/azure-devops/SKILL.md` | ✅ Disponível |
| SonarQube | `MCP/sonarqube/SKILL.md` | ✅ Disponível |
| Datadog | — | 🔜 Em breve |

Para configurar:
1. Certifique-se de ter o projeto ativo configurado (`.ai-project`)
2. Invoque a skill correspondente: `/setup-mcp-azure-devops`
3. Siga o processo guiado — a skill lê o `{slug}-map.json`, gera uma especificação MCP portável e aplica no cliente escolhido

Consulte `MCP/README.md` e `MCP/CLIENTS.md` para mais detalhes.

---

## Adicionando um Novo Projeto

1. Copie `MAPS/_template/` para `MAPS/{slug}/`
2. Renomeie `map.json` → `{slug}-map.json` e `context.md` → `{slug}-context.md`
3. Preencha os dois arquivos
4. Crie `.ai-project` na raiz de cada repositório do projeto

Consulte `CONVENTIONS.md` para detalhes e regras de nomenclatura.

---

## Adicionando uma Nova Skill

1. Crie a lógica central em `SKILLS/SHARED/nome-skill.md`
2. Crie `SKILLS/nome-skill/SKILL.md` — **um arquivo, para todos os clientes**
3. Instale o symlink e reinicie a sessão
4. Documente na tabela acima

Consulte `CONVENTIONS.md` para o template e regras de escrita.
