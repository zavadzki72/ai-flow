# Skill: Epic Workflow (Orquestrador Autônomo de Múltiplas Features)

## Descrição

Orquestra um **conjunto de features** de ponta a ponta, uma altitude acima do `/feature-workflow`.
Parte de um **épico grande** (uma ideia que não cabe num PRD só) ou de um **pacote de features**
(N demandas já recortadas), decompõe, especifica e planeja **todas em paralelo**, monta um **grafo
global** e executa as features em **ondas**, cada uma delegada a um `/feature-workflow` completo
rodando em janela isolada.

Esta skill é o **maestro de épico**. Ela **não reescreve** a lógica de nenhuma skill: a fase de
código é inteira do `/feature-workflow`, e as fases de documento invocam os **modos** que já existem
no `spec.md` e no `planejar.md`.

```
/epic-workflow    (épico  → N features)      ← esta skill
  └─ /feature-workflow  (feature → N etapas)
       └─ /implementar   (etapa → código)
```

### Autonomia

`/epic-workflow` é **sempre autônomo** — não existe modo interativo e não existe flag `--auto`.
Zero perguntas ao humano do início ao fim. Toda dúvida vira **premissa assumida**, registrada no
artefato do épico e no log de decisões (`adr/`).

A única volta ao humano é a **parada por guardrail** (§ Falha isolada e propagação) e o **relatório
final**. Em nenhum cenário há push ou PR automático.

> **Onde esta skill se encaixa:**
> `start-project` = bootstrap zero→MVP (cria o projeto).
> `epic-workflow` = pacote de features / épico grande em projeto **já existente**.
> `feature-workflow` = uma feature. Se a sua demanda cabe num PRD só, **use `/feature-workflow`** —
> esta skill só paga o próprio overhead a partir de ~2 features **que não colidam entre si**
> (ver § Quando o épico não se paga).

---

## Pré-requisitos

- Projeto ativo configurado (`.ai-project` → `MAPS/{projeto}`).
- Agentes instalados: `product-manager`, `arquiteto-senior`, `dev-senior`, `tech-lead` e
  **`engineering-manager`** — este último é quem roda o `/feature-workflow` de cada feature em
  janela própria.
- ⚠️ **O `engineering-manager` precisa da tool de delegação (`Agent`) no frontmatter** — sem ela
  ele não dispara os `dev-senior` e a FASE 3 morre em silêncio. Verificado no Passo 0.4.
- Modos usados nas fases de documento (se faltarem, a fase trava — ver Passo 0.4):
  `spec.md` § Modo Autônomo · § Modo Épico · `planejar.md` § Modo Autônomo · § Modo Épico ·
  § Modo Crítica de Recorte · `feature-workflow.md` § Modo Sub-orquestrado.

---

## Princípios de orquestração

1. **Autonomia total.** Nenhuma pergunta ao humano. Dúvida → premissa registrada.
2. **Validação cruzada no lugar do gate humano.** Como ninguém revisa o recorte do épico, ele é
   validado por **outra persona**: o `product-manager` decompõe, o `arquiteto-senior` critica
   (FASE 0.3). Duas personas se checando substituem o "ok" do humano.
3. **Barreira obrigatória depois do `/planejar`.** Nenhuma linha de código antes de **todos** os
   PLANs existirem — só o PLAN revela `Arquivo(s) Afetado(s)`. Ver § Por que a barreira.
4. **Delegação isolada.** Cada fase roda num subagent com janela própria. Passe **paths**, nunca o
   conteúdo inteiro dos artefatos.
5. **Cada orquestrador é dono da topologia do SEU nível.** O que é **seu**: `fetch`, o worktree de
   planejamento, as branches de épico e de feature, o merge feature→épico e a limpeza delas. O que
   **não** é seu: as branches efêmeras de etapa e os merges etapa→feature — isso é do
   `engineering-manager`, dentro da janela dele, e você não interfere.
   A regra que importa: **ninguém toca a topologia de um nível que não é o seu**, e **nenhum agente
   roda `checkout`/`pull` no clone principal** — o working tree dele nunca muda. (`fetch` é seu;
   `git -C {repo.path} worktree add` é permitido a quem é dono daquele nível, porque não mexe no
   working tree do clone.) É isso que permite disparar N agentes no mesmo repo sem colidir.
6. **Teto de concorrência.** Máx. **3 features por onda** e **6 `dev-senior` somados**, com
   **≤ 3 por feature** (o limite do próprio `/feature-workflow`). Ver § Teto.
7. **Falha isolada não derruba o épico** — mas **muda o grafo**. Uma feature bloqueada marca as
   dependentes como puladas, **transitivamente**, e as ondas seguintes são **recalculadas**. Ver
   § Falha isolada.
8. **Isolamento de working tree (OBRIGATÓRIO).** Ver `CONVENTIONS.md` § Git Worktree.
9. **Sem push automático.** Nem no fim, nem no meio.
10. **Toda feature termina com status.** Invariante checado antes do relatório (Passo 7.1) — uma
    feature sem status é bug do orquestrador, não uma omissão aceitável.

### Por que a barreira

Duas features que tocam o mesmo arquivo em paralelo colidem no merge do épico. O guardrail de
conflito do `/feature-workflow` é "descarta e reimplementa" — a nível de **etapa** isso é barato; a
nível de **feature inteira** é caríssimo. Como `Arquivo(s) Afetado(s)` só existe depois que o PLAN
foi escrito, o grafo global **não pode** ser montado antes da FASE 2 fechar.

A barreira custa pouco: as FASES 1 e 2 **não escrevem código** (só documentos) e rodam todas as
features em paralelo. O que ela segura é só o início da FASE 3.

> ⚠️ **"Não escrevem código" ≠ "não tocam o disco".** O `planejar.md` normal roda `checkout`/`pull`
> no clone principal. Por isso a FASE 2 invoca o **§ Modo Épico** do `planejar.md`, que proíbe git e
> manda explorar no **worktree de planejamento** que o orquestrador cria no Passo 0.5. Sem isso, N
> arquitetos paralelos colidem no `index.lock` — ou, pior e silencioso, o `pull` de um move o HEAD
> enquanto o outro explora, e a pegada de arquivos sai errada. O épico inteiro decide o paralelismo
> com base nesses paths.

### Teto

| Features na onda | Devs por feature | Total `dev-senior` |
|---|---|---|
| 1 | 3 | 3 |
| 2 | 3 | 6 |
| 3 | 2 | 6 |

**Nunca mais que 3 por feature** — é o limite declarado do `/feature-workflow`; mandar "6" no prompt
poria o EM em contradição com a própria skill dele. Uma onda de 1 feature usa 3, não 6: o orçamento
"sobrando" não é gastável.

> **O teto conta `dev-senior`, não agentes.** Uma onda de 3 features tem 3 EMs + até 6 devs + até 3
> `tech-lead` na FASE 4 de cada uma ≈ **12 janelas**. O Claude Code **não documenta** limite de
> subagents concorrentes; o teto é auto-imposto e existe para o custo não explodir — dimensione
> sabendo que o número real de agentes é ~2× o número de devs.

### Quando o épico não se paga

A pegada de colisão é por **arquivo**. Em projetos reais, quase toda feature toca os mesmos pontos
de registro (`Program.cs`, `DependencyInjection.cs`, `routes.tsx`, `schema.prisma`). Sem tratamento,
isso degrada o épico para **uma feature por onda** — sequencial, com N barreiras de merge e build, e
**mais caro** que rodar `/feature-workflow` N vezes na mão.

Duas defesas:
1. **Hot-files** (Passo 4.2) — colisão apenas em arquivo de registro **não** serializa.
2. **Aviso honesto** (Passo 7) — se o paralelismo médio ficar **< 1.5 features/onda**, o relatório
   diz que o épico não se pagou e que features futuras deveriam ir de `/feature-workflow`.

---

## Processo

### Passo 0: Carregar Contexto, Ponto de Entrada e Pré-voo

**0.1. Identificar o projeto ativo — sem poder perguntar.**

Ler `.ai-project` na raiz do repositório atual e, com ele, `{slug}-map.json` + `{slug}-context.md`
+ os `docs/` do projeto.

> ⚠️ **As demais skills, aqui, mandam "perguntar ao dev qual projeto".** Você **não pode** — é
> zero-interação. Se `.ai-project` não existir, resolva **nesta ordem** e pare na primeira que der:
> 1. O comando trouxe o slug ou um path dentro de `MAPS/{slug}/` → use esse projeto;
> 2. O diretório atual (ou seu pai) bate com o `path` de algum repo em algum `MAPS/*/map.json` →
>    use aquele projeto e **registre a premissa** ⚠️;
> 3. **Exatamente um** projeto em `MAPS/` tem `project.status: active` e um repo cujo path existe →
>    use, registrando a premissa ⚠️;
> 4. Nada disso → ⛔ **PARE**. Reporte que não há `.ai-project` e liste os projetos candidatos.
>
> **Nunca** escolha "o mais provável" entre dois candidatos: um épico no projeto errado escreve
> código em branch errada, em repositório errado. Parar é barato; isso não é.
> Ao usar 1-3, **crie o `.ai-project`** apontando para o projeto resolvido e diga no relatório —
> assim a próxima execução não repete a inferência.

**0.2. Classificar a entrada** — sem perguntar:

| O comando trouxe | Modo | O que acontece |
|---|---|---|
| Uma ideia grande em texto | **Épico** | FASE 0 decompõe em N features |
| Uma lista de N demandas / tickets | **Pacote** | FASE 0 só normaliza e ordena — não decompõe |
| Paths de PRDs já existentes | **Pacote** | Pula a FASE 1 dessas features |
| Paths de PLANs já existentes | **Pacote** | Pula FASE 1 e 2 dessas features |
| Um path de épico já existente | **Retomada** | § Retomada |

Ambíguo → assumir **Épico** (o caminho conservador, que decompõe e valida) e registrar a premissa.

**0.3. Resolver paths, repos e nome:**
- `NNN` = próximo sequencial de `{map.docs.epic}`; `nome-do-epico` = kebab-case da demanda.
- **`docs.epic` ausente no map** (todos os projetos criados antes desta skill): **crie** a pasta
  `epic/`, acrescente `"epic": "epic/"` em `docs` do `{slug}-map.json` e registre no relatório que o
  map foi migrado. Não pare por isso.
- **`worktrees-path` de cada repo:** use `{repo.worktrees-path}` se preenchido; senão o padrão
  `{repo.path}-worktrees` (`CONVENTIONS.md` § Git Worktree). O campo é **opcional e vem vazio no
  template** — usá-lo cru resolveria para `/epic-{nome}`, na raiz do filesystem.

**0.4. Pré-voo — pare aqui se faltar (não descubra no meio do épico):**
- [ ] Agente `engineering-manager` instalado **e com `Agent` no `tools:`** → sem isso, FASE 3 morre
- [ ] Agentes `product-manager`, `arquiteto-senior`, `tech-lead` instalados
- [ ] **Todos** os modos existem — um `grep` por cabeçalho, não de olho:
      `spec.md` § Modo Autônomo · § Modo Épico · `planejar.md` § Modo Autônomo · § Modo Épico ·
      § Reconciliação · § Modo Crítica de Recorte · `feature-workflow.md` § Modo Sub-orquestrado.
      Sem os do `spec.md`, o PM devolve perguntas para um orquestrador sem canal humano e **toda**
      feature acaba bloqueada na FASE 1; sem o do `feature-workflow.md`, a FASE 3 quebra; sem
      § Reconciliação, a FASE 4 não consegue corrigir nada (e você só descobriria lá)
- [ ] Templates do `spec.md` e do `planejar.md` têm a seção **HANDOFF** — os checklists das FASES 1
      e 2 a exigem; sem ela **todo** PRD/PLAN reprova e o épico morre na validação
- [ ] Cada repo do `map.repositories` **é um repositório git de verdade** —
      `git -C {repo.path} rev-parse --git-dir`, não um `ls` na pasta. Um map pode declarar
      `projeto/api` e `projeto/web` como dois repos quando o `.git` está só na raiz (`projeto/`) e
      aqueles são pastas: a pasta existe, o `fetch` falha, e você só descobriria na FASE 2

Faltou algo → **PARE** e reporte exatamente o quê. Não tente compensar rodando a fase você mesmo.

**0.5. Criar o worktree de planejamento — antes de qualquer agente ler código.**

Para **cada repo** em `map.repositories` que o épico pode tocar:
```bash
git -C {repo.path} fetch origin
git -C {repo.path} worktree add "{worktrees}/planning-epic-{nome}" --detach origin/{repo.branch}
```
(`{worktrees}` = `{repo.worktrees-path}` ou `{repo.path}-worktrees`.)

`--detach` de propósito: árvore **só de leitura**, sem branch — N agentes leem juntos, ninguém
commita, nada fica preso. Reutilize se já existir; **remova no Passo 7.3**.

**Nasce aqui, no Passo 0**, porque **todo** agente das FASES 0 a 2 lê código: o crítico do recorte
(1.3 — `planejar.md` § Modo Crítica de Recorte manda criticar contra o código real), os PMs (2.1 —
`spec.md` Passo 3.3) e os arquitetos (3.1). Este `fetch` é o **primeiro do épico**: sem ele, o
primeiro agente a rodar leria o clone principal num estado arbitrariamente velho. Todas as fases
usam o **mesmo** worktree.

---

### Passo 1: FASE 0 — Decomposição e Validação Cruzada

**1.1. Decompor.** Delegar ao `product-manager` em **`spec.md` § Modo Épico**, passando a demanda +
os paths do map/context + a lista de repos disponíveis. Ele devolve o recorte no formato daquele
modo (nome, valor, escopo, fora-do-escopo, dependências, complexidade, `Isolada`).

**Multi-repo:** o recorte declara, por feature, **quais repos ela toca** (aliases de
`map.repositories`). Uma feature full-stack toca dois — isso é normal e não é motivo para dividi-la
por camada.

**1.2. Modo pacote:** pular 1.1. Normalizar as demandas no formato acima e inferir dependências e
repos (cada inferência é premissa).

**1.3. ✅ Validação cruzada — substitui o gate humano.** Delegar ao `arquiteto-senior` em
**`planejar.md` § Modo Crítica de Recorte** (read-only), passando o recorte **e os paths dos
worktrees de planejamento** (0.5) — ele critica contra o código real, e é lá que ele o lê. Devolve
✅ aprovado / ❌ reprovado + gaps, aplicando o checklist daquele modo.

Reprovou → re-invocar o `product-manager` com **exatamente os gaps** (máx. **2** re-invocações).
Persistiu → ⛔ **parada do épico** — um recorte que o arquiteto rejeita contamina tudo abaixo.

**1.4.** Gerar o artefato do épico em `{map.docs.epic}/{slug}-epic-NNN-nome-do-epico.md` (template
abaixo) e registrar em `adr/`.

---

### Passo 2: FASE 1 — `/spec` de todas as features (paralelo)

**2.0. Reservar os nomes de arquivo — ANTES de disparar qualquer PM.**

**(a) Nomes de PRD.** Reserva só é reserva se materializar no disco:
1. Para **cada feature que ainda não tem PRD** — no modo Pacote, features que já vieram com path de
   PRD **pulam a FASE 1 inteira** e não recebem placeholder; criar um seria fabricar o lixo
   `🔒 Reservado` órfão que a 2.2 e a Retomada mandam limpar;
2. Na ordem, calcule o próximo `NNN` livre de `{map.docs.prd}`;
3. **Crie o arquivo placeholder** (`{slug}-prd-NNN-id-nome.md`, com uma linha
   `> 🔒 Reservado pelo épico NNN — em escrita`);
4. Passe o **filename completo** no prompt de cada PM, com "use este nome, **não calcule** o número".

**Por quê:** o `spec.md` manda o PM "verificar o último PRD na pasta". Dois PMs paralelos veem o
mesmo último e escolhem o **mesmo** número — o segundo `Write` destrói o PRD do primeiro em
silêncio. O placeholder também protege contra um dev criando PRD manualmente durante o épico.

**(b) Faixas de ADR.** `adr/` tem numeração sequencial idêntica e N arquitetos escrevem nele ao
mesmo tempo na FASE 2 (mais você, em 1.4). Sem reserva, colisão garantida a partir de 2 features.
Frase não basta — **procedimento**:

1. Conte o último `NNN` de `{map.docs.adr}`;
2. Reserve **uma faixa de 5 números por feature** (o § Modo Épico do `planejar.md` já manda o
   arquiteto registrar ADR para *helper genérico* **e** para *dependência assumida* — duas no
   mínimo; 5 dá folga sem exigir adivinhação);
3. Passe a **faixa** no prompt do arquiteto (ex.: "seus ADRs são 012 a 016"), não um nome único;
4. Se ele estourar a faixa, ele **retorna** pedindo mais — nunca conta a pasta. **Atenda:** reserve
   a próxima faixa livre e re-invoque com ela. Isso **não** consome guardrail (não é falha; é o
   protocolo funcionando) e **não** conta como uma das 2 re-invocações da validação.

**2.1.** Disparar **um `product-manager` por feature, todos simultaneamente**, em **`spec.md` §
Modo Autônomo**. Cada um recebe: path do épico, o recorte da sua feature, **o filename reservado**,
os repos que ela toca e os **paths dos worktrees de planejamento** (0.5) — é lá que ele explora
código, nunca no clone principal.

**2.2. ✅ Validação de cada PRD.** Aplique o checklist de `feature-workflow.md` § 1.2 (FASE 1) —
**não o reescreva aqui**; a unidade é a mesma (um PRD) e uma segunda cópia diverge na primeira
edição. Um item **a mais**, específico do épico:
- [ ] O escopo do PRD **bate com o recorte da FASE 0** — o PM não pode expandir a feature sozinho

Reprovou → re-invocar aquele PM com os gaps (máx. **2**). Persistiu → **feature ⛔ Bloqueada**
(§ Falha isolada). Placeholder de PRD que sobrou: apague — arquivo `🔒 Reservado` órfão confunde a
retomada e o próximo `/spec` manual.

---

### Passo 3: FASE 2 — `/planejar` de todas as features (paralelo)

**3.1.** Disparar **um `arquiteto-senior` por feature, todos simultaneamente**, em **`planejar.md` §
Modo Épico**. Cada um recebe: path do PRD, path do épico, **paths dos worktrees de planejamento**
(0.5 — os mesmos das FASES 0 e 1), **nome + escopo curto das outras features do épico**, os aliases
de repo que a feature dele toca, e a **faixa de ADR reservada** (2.0b).

> O § Modo Épico do `planejar.md` é o que garante que ele **não rode git** e que os
> `Arquivo(s) Afetado(s)` saiam **prefixados pelo alias do repo** — os dois pilares da FASE 4.

**3.2. ✅ Validação de cada PLAN.** Aplique o checklist de `feature-workflow.md` § 2.2 (FASE 2) —
**não o reescreva aqui**. Itens **a mais**, específicos do épico:
- [ ] `Arquivo(s) Afetado(s)` **prefixados pelo alias do repo** (sem isso a FASE 4 apura errado)
- [ ] Os repos tocados batem com os declarados no recorte

Reprovou → re-invocar (máx. **2**). Persistiu → **feature ⛔ Bloqueada**.

---

### Passo 4: ⛔ BARREIRA — Grafo Global do Épico

**Só executa quando TODAS as features passaram (ou foram bloqueadas) na FASE 2.** Cálculo puro, sem
agente.

**4.1. Pegada de cada feature** = união dos `Arquivo(s) Afetado(s)` de todas as etapas do PLAN dela,
**com o prefixo de repo**. Sem prefixo, `src/index.ts` do frontend e do backend passam por iguais.

**4.2. Classificar colisões.** Interseção entre duas pegadas → separar as features em ondas
diferentes, **exceto** quando a interseção contém **apenas hot-files**.

**Hot-files** são pontos de registro que quase toda feature toca **por acréscimo** (DI, rotas, o
`Program.cs`, o schema). Fonte, em ordem:
1. `map.epic.hot-files` (lista de globs), se existir;
2. senão, os defaults **conservadores**: `**/Program.cs`, `**/Startup.cs`,
   `**/DependencyInjection*.cs`, `**/routes.*`, `**/schema.prisma`;
3. registre como premissa ⚠️ qual lista foi usada.

> **Por que os defaults são curtos.** Errar para mais é caro: marcar um arquivo de domínio como
> hot-file faz duas features editarem regra de negócio no mesmo lugar em paralelo, e aí o conflito
> deixa de ser trivial. E os defaults valem **exatamente quando ninguém configurou** — o caso em que
> menos se sabe sobre o projeto. Por isso ficam fora deles coisas como `**/index.ts` (barrel em
> metade dos projetos, implementação na outra), `**/App.tsx` e `**/package.json` (conflito de
> dependências não é acréscimo trivial). Quem conhece o projeto declara em `map.epic.hot-files`;
> na ausência, o custo do erro recai sobre a serialização, que é lenta — não sobre o merge, que é
> retrabalho.

Colisão só em hot-file → **rodam em paralelo**. O risco é um conflito de merge trivial no
fechamento da onda, e o custo dele já está coberto pelo guardrail de re-execução (5.3.2). Colisão em
**qualquer arquivo de domínio** → serializam, sem exceção.

Registre **todas** as colisões (e a classificação de cada uma) no artefato — é o que explica por que
o épico não é mais paralelo do que é.

**4.3. Preparar a branch de integração — em CADA repo tocado pelo épico:**
```bash
git -C {repo.path} worktree add "{worktrees}/epic-{nome}" -b epic/{nome} origin/{repo.branch}
```
Se a **branch** já existe (retomada), sem `-b`:
`git -C {repo.path} worktree add "{worktrees}/epic-{nome}" epic/{nome}`.
Se o **worktree** já existe, reutilize. Se o Git recusar com `branch already checked out`, veja
§ Branches e worktrees órfãos.

> **Multi-repo:** o épico tem **uma branch `epic/{nome}` por repo**, evoluindo em paralelo. Não
> existe merge atômico entre repos — a atomicidade do épico é a **suíte de testes integrados**
> (5.3.3), que roda os comandos de todos os repos e é o que detecta backend e frontend fora de
> sincronia.

**4.4.** Registrar o plano no artefato e em `adr/`.

---

### Passo 5: FASE 3 — Ondas de features (LOOP)

> 🔴 **Isto é um loop, não uma sequência congelada.** As ondas são **recalculadas a cada iteração**,
> a partir do estado real. Congelar o grafo no Passo 4 e só executar seria o bug do § Falha isolada:
> uma feature bloqueada na onda 1 deixaria a onda 2 construir sobre um épico sem o código dela, o
> build integrado quebraria de forma incorrigível, e o épico inteiro abortaria — exatamente o que o
> princípio 7 promete que não acontece.

**Repita até não sobrar feature ⏳ Pendente:**

**5.0. Calcular a PRÓXIMA onda (só ela) a partir do estado atual:**
1. **Propagar bloqueio, transitivamente** (§ Falha isolada) antes de qualquer coisa;
2. Candidatas = features ⏳ Pendente cujas dependências estão **todas ✅ Concluída**;
3. Nenhuma candidata e ainda há ⏳ Pendente → bug de estado: marque as restantes ⏭️ Pulada com o
   motivo e saia do loop (nunca fique girando);
4. Descartar candidatas que colidem (4.2) com outra já escolhida para esta onda — desce para a
   próxima iteração;
5. Feature **`Isolada: Sim`** roda **sozinha**;
6. Aplicar o teto (§ Teto): máx. 3 features; devs por feature = 3 (1-2 features) ou 2 (3 features).

**5.1. Preparar as branches da onda.** Para cada feature, **em cada repo que ela toca**, a partir do
HEAD atual de `epic/{nome}` **daquele repo**:
```bash
git -C {repo.path} worktree add "{worktrees}/feature-{x}" -b feature/{x} epic/{nome}
```
Branch/worktree já existe (retomada, ou tentativa anterior descartada) → § Branches e worktrees órfãos.

**5.2. Disparar os `engineering-manager` da onda EM PARALELO** — um por feature. Cada um recebe:
- path do **PLAN** (ponto de entrada — o `/feature-workflow` resolve que isso é "comece na FASE 3"),
  path do **PRD** e path do **épico**
- **branch da feature**, **branch base** (`epic/{nome}`) e **os worktrees por repo**
- **teto de `dev-senior`** (≤ 3)
- **modo sub-orquestrado** (`feature-workflow.md` § Modo Sub-orquestrado)

**5.3. Fechar a onda (barreira — só depois que TODOS os EMs retornarem):**

1. **Merge**, por repo, na ordem das features: `git merge --no-ff` dentro do worktree do épico
   daquele repo;
2. **Conflito** → NÃO resolver na mão:
   - `git merge --abort`;
   - **resetar o PLAN da feature** — as etapas estão ✅ com hashes de commits que vão deixar de
     existir. Sem isso, o EM re-invocado lê tudo ✅, **não faz nada** e devolve "concluída" sobre uma
     branch vazia. Marque as etapas de volta a ⏳ Pendente e limpe os hashes;
   - descartar a branch e o worktree da feature (§ Branches e worktrees órfãos);
   - re-invocar o EM sobre o épico atualizado. Máx. **1** re-execução. Conflitou de novo → feature
     ⛔ **Bloqueada**, o épico **segue**;
3. **Build + testes integrados** — os comandos de **todos os repos** tocados pela onda
   (`docs/architecture/`). Falhou → re-invocar o EM responsável com o erro (máx. **2**). Persistiu →
   ⛔ **parada do épico**: a branch de integração está quebrada e as ondas seguintes sairiam de uma
   base podre. **Antes de parar**, cheque se a causa é uma dependência bloqueada (§ Falha isolada) —
   se for, é bug de propagação seu, não do código;
4. **Limpeza** das features mescladas: `git worktree remove` + `git branch -d`, em cada repo;
5. **Atualizar o artefato do épico** (você, nunca o EM): status das features, progresso, log da
   onda, premissas devolvidas.

**5.4.** Volte a 5.0. **Nunca** duas ondas ao mesmo tempo.

---

### Passo 6: FASE 4 — Review de integração

**6.1.** Delegar ao **`tech-lead`** (read-only): path do épico, paths de todos os PRDs/PLANs, e as
branches `epic/{nome}` de cada repo contra `{repo.branch}`.

Cada feature já foi revisada dentro do seu `/feature-workflow`. O foco aqui é o que **só aparece com
tudo junto**:
- Contradição entre features (duas implementações do mesmo conceito, contratos divergentes)
- Duplicação de features planejadas em paralelo (o helper que virou dois — ver § Limite conhecido)
- Premissas de uma feature que outra quebrou
- **Coerência entre repos** (contrato que o backend expõe × o que o frontend consome)
- Coerência do entregue contra a **decomposição da FASE 0**

**6.2. ✅ Fechamento:**
- **✅ / ⚠️** → épico concluído.
- **❌** → **correção como micro-feature.** Todo 🔴 do review de integração vira uma
  **feature de reconciliação**, independentemente de ter "culpada" ou não. Não existe atalho de
  disparar `dev-senior` solto: o `implementar.md` § Modo Orquestrado **exige PLAN e ETAPA no
  prompt** e retorna pedindo se faltar — um dev sem PLAN não implementa, por desenho.

  1. **Agrupe** os 🔴 num escopo só (eles costumam ser a mesma incoerência vista de ângulos
     diferentes — "o helper que virou dois" gera 🔴 em duas features e tem **uma** correção);
  2. **Crie** `fix/{nome}-{n}` a partir de `epic/{nome}` — **em cada repo** que a correção toca (um
     🔴 de contrato backend×frontend toca os dois) — com worktree próprio;
  3. **Delegue ao `arquiteto-senior`** em **`planejar.md` § Modo Épico** (§ Reconciliação) para
     escrever `{slug}-plan-NNN-reconciliacao-epic-{nome}.md` — reserve o `NNN` **materializando um
     placeholder** como na 2.0a, mas contando a pasta **`plan/`**, não a `prd/`. É o único PLAN sem
     PRD, e a exceção está registrada em `CONVENTIONS.md` § Nomenclatura. Passe:
     - o **relatório do `tech-lead`** — é a fonte do escopo;
     - os **paths dos PRDs das features envolvidas** — satisfazem o Passo 1 do `planejar.md`
       ("PRD obrigatório"); sem eles o arquiteto **para e devolve pedindo**;
     - o **worktree da `fix/`**, não o de planejamento — o código a reconciliar é o do **épico
       mergeado**, que não existe na árvore de planejamento (ela aponta para a branch base);
     - a faixa de ADR — é ele quem decide *qual* das duas implementações sobrevive, e isso é ADR;
  4. **Delegue ao `engineering-manager`** em modo sub-orquestrado, com esse PLAN, a branch `fix/` e
     seus worktrees. Passe também o **path do épico como PRD** — a FASE 4 do `/feature-workflow`
     pede um; o artefato do épico é o documento de intenção desta correção;
  5. Ao voltar, **você** mergeia a `fix/` no épico (em cada repo) e roda os testes integrados
     (5.3.3);
  6. **Limpe:** `git worktree remove` + `git branch -d` da `fix/` mesclada, em cada repo. Você criou
     no passo 2; a limpeza é sua — mesma regra da 5.3.4.

  > **Nunca** mande o EM escrever direto na `epic/{nome}`: a linha vermelha dele proíbe, e o
  > worktree do épico é **seu** — você está lendo e testando nele, e dois escritores na mesma árvore
  > é a classe de bug que o worktree existe para eliminar. A branch original da feature já foi
  > apagada em 5.3.4; não tente reusá-la.

  🔴 numa feature ⛔ **Bloqueada** → não há o que reconciliar; registre e siga.
  Depois, re-invocar o `tech-lead`. Máx. **2 ciclos**; persistiu ❌ → ⛔ parada por guardrail.

**6.3. `/test-e2e` (condicional).** Se `map.environments.local` estiver preenchido **e** houver MCP
de browser, delegar ao `qa` sobre as branches do épico. Faltando qualquer um → **pular sem erro**,
anotando no relatório. Nunca é gate.

---

### Passo 7: Fechamento e Relatório

**7.1. Invariante de fechamento — antes de escrever o relatório:**
- [ ] **Toda** feature do recorte tem exatamente um status: ✅ Concluída, ⛔ Bloqueada ou ⏭️ Pulada
- [ ] O progresso (`N/M`) bate com a contagem real
- [ ] Nenhum worktree do épico ficou órfão sem estar listado no relatório

Feature sem status → **bug de propagação**. Não maquile: marque ⏭️ Pulada com "erro de orquestração"
e **diga isso no relatório**. Um épico que se declara 🎉 concluído omitindo uma feature que ninguém
executou é a pior saída possível — silenciosamente errado é pior que travado.

**7.2. Paralelismo real** = features ✅ ÷ nº de ondas. **< 1.5** → o épico não se pagou; diga no
relatório (§ Quando o épico não se paga).

**7.3. Limpar o worktree de planejamento** (0.5), em cada repo:
```bash
git -C {repo.path} worktree remove "{worktrees}/planning-epic-{nome}"
```
É seu, é `--detach` (não tem branch nem commits a preservar) e não serve para mais nada depois do
review. Deixá-lo faria o 7.1 acusar worktree órfão em **todo** épico. Vale também nas paradas por
guardrail: preserve branches e worktrees de feature (são evidência), **remova** o de planejamento.

---

## Falha isolada e propagação

Uma feature vira ⛔ **Bloqueada** quando: PRD reprovado após 2 re-invocações · PLAN reprovado após 2
· conflito de merge persistente após 1 re-execução · guardrail interno do `/feature-workflow`
estourado · EM não retornou (§ Agente morto).

**A propagação é transitiva.** Uma feature ⏳ Pendente vira ⏭️ **Pulada** se **qualquer** dependência
sua, direta ou indireta, está ⛔ Bloqueada **ou** ⏭️ Pulada. Calcule o **fecho transitivo** — repita
a varredura até nenhum status mudar.

> Sem isso: F1 ⛔ → F2 ⏭️ (direta) → **F3, que depende de F2, não se encaixa em regra nenhuma**: sua
> dependência não está bloqueada (está pulada), e ela nunca "fecha". F3 não entra em onda, não
> recebe status, e some do relatório.

Bloqueio **muda o grafo**: sempre propague **antes** de calcular a próxima onda (5.0.1). As
independentes seguem normalmente.

O épico só **para inteiro** em: recorte reprovado (1.3) · build/testes integrados vermelhos após 2
correções (5.3.3) · review ❌ após 2 ciclos (6.2) · **todas** as features bloqueadas/puladas.

## Reset do PLAN (regra geral)

**Sempre que o código de uma feature deixar de existir, o PLAN dela precisa voltar a refletir isso.**

O PLAN é escrito pelo `/feature-workflow` ao fechar cada onda: etapas ✅ Concluída + hash do commit.
Se a branch some depois disso, o PLAN passa a **mentir** — e a mentira é venenosa porque o EM
re-invocado entra pela FASE 3, lê tudo ✅, **não faz nada** e devolve "feature concluída" sobre uma
branch vazia. Verde perfeito, zero código.

**Regra:** ao descartar/perder a branch de uma feature, **antes** de re-invocar qualquer EM sobre
ela, marque no PLAN as etapas cujos commits não existem mais de volta a ⏳ Pendente e limpe hash e
data. Verifique com `git cat-file -e {hash}` em vez de deduzir.

Aplica-se em **todos** estes pontos, não só onde o bug foi visto primeiro:
- **5.3.2** — branch descartada após conflito de merge;
- **§ Branches e worktrees órfãos** — feature bloqueada cuja branch será recriada;
- **§ Retomada** — feature que rodou parcialmente numa execução anterior: o épico pode ter morrido
  entre o commit e a escrita do estado, e o HEAD do épico pode ter mudado desde então.

## Branches e worktrees órfãos

Feature ⛔ Bloqueada ou descartada por conflito deixa **branch e worktree** para trás — a limpeza da
5.3.4 só cobre as **mescladas**. Idem as efêmeras `feature/{x}--etapa-N` de um EM morto por
guardrail.

**Ao bloquear/descartar uma feature:** remova o **worktree** (`git worktree remove --force` se
preciso) e **preserve a branch** — ela é a evidência do que foi tentado. Liste ambos no relatório.

**`worktree add` recusado.** Trate os dois erros separadamente — eles têm causas diferentes:

| Erro do Git | Causa | O que fazer |
|---|---|---|
| `branch already checked out at {path}` | existe um **worktree** para essa branch | `git worktree list`. Órfão deste épico (path `{worktrees}/feature-{x}`, sem sessão viva) → remova e siga. Aponta para **outro lugar** → outra sessão está usando: feature ⛔ Bloqueada, épico segue |
| `a branch named 'feature/{x}' already exists` | a **branch** existe (sem worktree) — tentativa anterior preservada ou retomada | **Reutilize-a**: `worktree add "{path}" feature/{x}` (sem `-b`). Depois **decida o que fazer com os commits dela** ↓ |

**Branch preexistente: reusar os commits ou recomeçar?**
- **É descendente do HEAD atual de `epic/{nome}`** (`git merge-base --is-ancestor epic/{nome} feature/{x}`) → o trabalho ainda serve. Reutilize a branch **e o PLAN como está**; o EM retoma pelas etapas ⏳ Pendente.
- **Divergiu** (o épico andou por baixo dela — típico depois de uma onda fechar) → **não rebase**:
  apague a branch (`git branch -D`), recrie a partir do épico atual, e aplique o **§ Reset do PLAN**.
  O trabalho é refeito sobre a base correta. É o mesmo princípio do conflito de merge (5.3.2):
  reimplementar sobre a base certa é mais barato e mais seguro que costurar histórico.

> Isto é uma exceção **explícita** a `CONVENTIONS.md` § Git Worktree ("não forçar, informar ao dev e
> parar"): aquela regra pressupõe um dev na sala. Num fluxo autônomo, parar o épico por lixo que ele
> mesmo deixou seria travar por causa própria. A exceção está registrada nos dois lados.

## Agente morto (sem timeout)

Todos os guardrails deste desenho são **contadores de tentativa** — nenhum é temporal. Um EM que
trava não conta nada e a barreira da 5.3 espera para sempre, segurando os worktrees da onda.

Não há timeout confiável para subagent. Mitigação: se a onda retornar com **algum EM sem resumo
estruturado** (retorno vazio, truncado ou sem hash de commit), trate como **falha**, não como
sucesso — feature ⛔ Bloqueada, e o épico segue. **Nunca** interprete silêncio como verde.

## Retomada

Um path de épico existente no comando (0.2) → **retomar**, não recomeçar:

1. Ler o artefato: status de cada feature, ondas fechadas, premissas, branches.
2. **Pular o que está ✅**: feature com PRD ✅ pula a FASE 1; com PLAN ✅ pula a FASE 2; ✅ Concluída
   sai do loop de ondas.
3. **Reconciliar com o disco — o artefato sempre mente sobre a última onda.** Um épico morre *no
   meio* de uma onda, e o status só é escrito *depois* que ela fecha (5.3.5): uma feature que estava
   rodando ficou registrada ⏳ Pendente, com branch e commits reais no disco. Portanto:
   - `git worktree list` e `git branch --list 'feature/*' 'epic/*' 'fix/*'` em **cada repo**;
   - branch/worktree sem correspondência no artefato → **§ Branches e worktrees órfãos**, que decide
     entre reutilizar os commits ou recriar;
   - **o PLAN é a verdade fina, não o épico.** Feature ⏳ Pendente cujo PLAN tem etapas ✅ = ela
     rodou parcialmente. Aplique o **§ Reset do PLAN** (os hashes podem não existir mais) e deixe o
     EM retomar pelas ⏳ Pendente.
4. **Placeholders de PRD `🔒 Reservado` sem PRD escrito** → a FASE 1 daquela feature não terminou:
   apague o placeholder e re-reserve na 2.0a.
5. **Recalcule o grafo do zero** (Passo 4) — o código no épico mudou desde a última execução, e
   portanto as pegadas e as colisões também.
6. **Reconstrua o worktree de planejamento** (0.5) se ele não existir mais.

> Não existe status 🟡 por feature: uma feature está ⏳, ✅, ⛔ ou ⏭️ — o progresso interno dela vive
> no **PLAN**. É por isso que o passo 3 cruza épico × PLAN × disco em vez de confiar no artefato.

---

## Broker (comunicação entre papéis)

- **Dentro de uma feature** (dev ↔ arquiteto ↔ PM): o **`engineering-manager`** é o broker. Você não
  vê e não interfere.
- **Entre features:** sobe até você. Responda pelo **artefato** de B, que está no disco — não invoque
  o EM de B (ele pode nem estar vivo, ou estar no meio de uma onda).
- **Guardrail:** máx. **2 consultas por dúvida** → vira premissa registrada.
- **Agente → humano:** não existe.

## Premissas (o preço da autonomia total)

Toda premissa é registrada em **três lugares**: (1) no artefato onde nasceu (épico/PRD/PLAN);
(2) numa linha do `adr/`; (3) **destacada no relatório final**.

Premissa de **negócio** é mais perigosa que técnica: a técnica o `arquiteto-senior` resolve com
competência; a de negócio é um chute. **Marque as de negócio com ⚠️** e liste-as primeiro.

## Limite conhecido: arquitetos paralelos não se coordenam

Os N arquitetos da FASE 2 rodam **simultaneamente**. O ADR que um escreve no minuto 5 não existe
quando outro começa no minuto 0 — é um canal de escrita **sem leitor durante a fase**. O § Modo
Épico do `planejar.md` reduz o risco (manda procurar no código antes de criar helper e declarar em
ADR o que cria), mas **não elimina**: dois arquitetos podem criar `EmailSender` e `EmailService` —
conceito igual, arquivos diferentes, **colisão não detectada** (4.2 compara paths), merge limpo, e a
duplicação só aparece na 6.1.

É um custo aceito em troca do paralelismo da FASE 2. Quem paga é o review de integração — por isso a
6.1 lista "o helper que virou dois" explicitamente, e por isso 🔴 entre features tem caminho de
correção próprio (6.2).

---

## Template do artefato do épico

```markdown
# Épico: [Nome do Épico]

**Sequência**: NNN
**Modo de entrada**: Épico decomposto / Pacote de features
**Repositórios**: [aliases tocados]
**Branch de integração**: epic/{nome} (em cada repo acima)
**Criado em**: YYYY-MM-DD · **Última atualização**: YYYY-MM-DD

---

## PROGRESSO GERAL

**Status**: ⏳ Não Iniciado / 🟡 Em Progresso / ✅ Concluído / ⛔ Parado
**Fase atual**: FASE 0 · Decomposição
**Features**: 0/N concluídas (0%) · 0 bloqueadas · 0 puladas

[⚪⚪⚪⚪] 0%

---

## 1. VISÃO DO ÉPICO

[Qual problema o épico resolve. Por que não cabe num PRD só.]

**Não-objetivos:** [o que este épico explicitamente NÃO faz]

---

## 2. RECORTE EM FEATURES

> Validado por: `arquiteto-senior` em YYYY-MM-DD — ✅ aprovado / ⚠️ aprovado após N rodadas

| # | Feature | Valor | Repos | Cplx | Depende de | Isolada | Status |
|---|---------|-------|-------|------|-----------|---------|--------|
| F1 | [nome] | [valor sozinha] | backend | 🟢 | — | Não | ⏳ |
| F2 | [nome] | [...] | backend, frontend | 🟡 | F1 | Não | ⏳ |

### F1 — [nome]
- **Escopo**: [2-3 linhas] · **Fora do escopo**: [...]
- **PRD**: `{path}` — ⏳/✅/⛔ · **PLAN**: `{path}` — ⏳/✅/⛔
- **Branch**: `feature/{x}` · **Worktrees**: [por repo]
- **Pegada**: [união dos Arquivo(s) Afetado(s), com prefixo de repo — preenchido na barreira]

---

## 3. GRAFO E ONDAS

**Colisões** *(por que o épico não é mais paralelo)*:
| Features | Arquivos | Classificação | Efeito |
|---|---|---|---|
| F2 × F4 | `backend/src/Domain/User.cs` | domínio | ondas separadas |
| F1 × F3 | `backend/src/Program.cs` | hot-file | paralelo mesmo assim |

**Hot-files:** [lista usada — do `map.epic.hot-files`, ou os defaults conservadores + premissa ⚠️]

| Onda | Features | Devs/feature | Motivo |
|------|----------|--------------|--------|
| 1 | F1, F3 | 3 | independentes; colidem só em hot-file |

> Ondas são recalculadas a cada iteração — esta tabela é o **histórico do que rodou**, não um plano.

---

## 4. LOG DE ONDAS

### Onda 1 — YYYY-MM-DD
- F1 ✅ — `feature/x` → `epic/{nome}` ({hash} backend, {hash} frontend) · N etapas · review ✅
- F3 ⛔ — bloqueada: [motivo] · branch `feature/f3` preservada · worktree removido
- Build/testes integrados (backend + frontend): ✅

---

## 5. PREMISSAS ASSUMIDAS

> ⚠️ Nenhum humano validou nada disto. Revise antes de publicar.

### Negócio ⚠️
- **P01** *(FASE 0)*: [premissa] — **Motivo**: [...] — **Impacto se errada**: [...]

### Técnicas
- **P02** *(F2 · PLAN)*: [premissa] — **Motivo**: [...]

---

## 6. HANDOFF

- **De / Para**: Epic Workflow → Humano
- **Estado**: [o que está de pé, o que ficou bloqueado, branches preservadas]
- **Decisões**: [ver adr/]
- **Revisar antes de publicar**: [premissas de negócio, features bloqueadas, duplicações do review]
```

---

## Passo Final: Relatório do Épico

```
🎉 Épico concluído (ou ⛔ parado em {fase} — {guardrail}).

Épico:    {path} — "{nome}"
Entrada:  {épico decomposto | pacote de N features}
Repos:    {aliases} — branch epic/{nome} em cada um
Recorte:  {N} features — validado pelo arquiteto em {N} rodada(s)

Features: {N} ✅ · {N} ⛔ bloqueadas · {N} ⏭️ puladas   [soma = total do recorte]
  ✅ F1 [nome] — {N} etapas — review ✅
  ⛔ F3 [nome] — {motivo} — branch feature/f3 preservada
  ⏭️ F4 [nome] — pulada (depende de F3)

Execução: {W} ondas · paralelismo real {X.X} features/onda
Código:   epic/{nome} — {N} commits — build/testes integrados ✅
Review:   {✅/⚠️/❌} integração — {nº 🔴/🟡/🟢} · {N} ciclo(s)
E2E:      {✅ | pulado — environments.local ausente}

⚠️ PREMISSAS DE NEGÓCIO ({N}) — revise antes de publicar:
  - P01: [premissa] (impacto se errada: [...])

{se paralelismo < 1.5:}
📉 O épico não se pagou: {X.X} features/onda — as colisões serializaram quase tudo.
   Para features com este perfil, rodar /feature-workflow uma a uma custa menos.

{se houve migração:}
🔧 `docs.epic` ausente no map — pasta epic/ criada e campo acrescentado.

Sugerido (NÃO executado):
  git push origin epic/{nome}      # em cada repo: {aliases}
  {comando de PR conforme map.tooling}  # epic/{nome} → {repo.branch}
```

---

## O Que Este Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Decompõe um épico em features (ou normaliza um pacote), validando o recorte com uma **segunda
  persona** no lugar do gate humano
- Roda `/spec` e `/planejar` de todas as features em paralelo, invocando os **modos** que existem
  naquelas skills — e criando o worktree de planejamento que torna esse paralelismo seguro
- Reserva nomes de PRD e ADR **materializando placeholders** antes do fan-out
- Monta o grafo cruzando dependências + colisão real de arquivos, **tolerando hot-files**
- **Recalcula as ondas a cada iteração** e propaga bloqueio **transitivamente**
- Trabalha **multi-repo**: uma branch de épico por repo, merge por repo, build integrado em todos
- Isola falhas e garante que **toda feature termina com status**
- Faz um review final **de integração** e avisa quando o épico **não se pagou**

### ❌ NÃO FAZ:
- ❌ Reescrever a lógica de nenhuma skill — as fases invocam **modos** de `spec.md`, `planejar.md` e
  `feature-workflow.md`
- ❌ Perguntar qualquer coisa ao humano (exceto parada por guardrail)
- ❌ Push ou criação de PR — só sugere
- ❌ Começar a FASE 3 antes de **todos** os PLANs existirem
- ❌ Tocar a topologia de outro nível (as efêmeras de etapa são do `engineering-manager`) — nem
  deixar um agente rodar git no **clone principal**
- ❌ Mandar o `engineering-manager` escrever na branch do épico
- ❌ Rodar duas ondas ao mesmo tempo, > 3 features/onda, > 6 devs somados ou > 3 devs por feature
- ❌ Interpretar silêncio ou retorno vazio de um agente como sucesso
- ❌ Substituir o `/feature-workflow` para **uma** feature
