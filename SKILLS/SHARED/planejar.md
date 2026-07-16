# Skill: Planejar (Criar Plano de Execução)

## Descrição
Cria plano de execução técnico detalhado (PLAN) baseado em um PRD existente.
Explora o código profundamente, identifica componentes técnicos específicos,
quebra a implementação em baby steps independentes e gera um arquivo PLAN completo.

---

## Modo Autônomo (invocado por um orquestrador)

Quando o prompt indicar **modo autônomo** (`/feature-workflow --auto`, `/epic-workflow`), o processo
muda nestes pontos:

1. **Zero perguntas e zero confirmações.** Pule as confirmações dos Passos 2.3 e 3, e o Passo 5
   (perguntas técnicas) na forma interativa. **Não devolva a lista de dúvidas** — o orquestrador
   autônomo não tem quem responder.
2. **Dúvida técnica: decida.** Você é o arquiteto — escolha a opção mais alinhada ao código
   existente e a `docs/architecture/`, registre em **ADR** e siga. Isso é o seu trabalho, não um
   chute.
3. **Dúvida de negócio: vira premissa.** Registre na seção **Premissas Assumidas** do PLAN (a
   premissa, o motivo, o impacto se errada), marcada com ⚠️ — e **não** invente regra de negócio
   que o PRD não trouxe: escolha o comportamento mais conservador.
4. **A faixa de ADR vem no prompt quando houver.** Um orquestrador que dispara vários arquitetos em
   paralelo **reserva** os números antes e passa uma **faixa** (ex.: "seus ADRs são 012 a 016").
   Use os números dela, em ordem, e **nunca conte a pasta** — dois arquitetos simultâneos que contem
   escolhem o mesmo número e um sobrescreve o ADR do outro. **Estourou a faixa?** Não conte a pasta:
   **retorne ao orquestrador** pedindo mais números.
5. **Os Passos 8 e 9 viram o resumo de retorno.** Não há dev na sala para validar o plano; devolva o
   resumo estruturado ao orquestrador. O **HARD STOP continua valendo**: não implemente nada.

---

## Modo Épico (invocado pelo `/epic-workflow`)

Vale tudo do § Modo Autônomo, **mais**:

1. **🔴 NÃO rode git. Pule o Passo 3 inteiro.** O orquestrador já fez `fetch` e já criou um
   **worktree de planejamento** — o path vem no prompt. Explore o código **lá**.
   **Por quê:** o `/epic-workflow` dispara N arquitetos **ao mesmo tempo**. Se cada um rodar
   `checkout`/`pull` no clone principal, eles colidem no `index.lock` — ou, pior e silencioso, o
   `pull` de um move o HEAD enquanto o outro explora, e os `Arquivo(s) Afetado(s)` saem calculados
   sobre uma árvore inconsistente. O épico inteiro decide o paralelismo com base nesses paths.
   Isso também é o que `CONVENTIONS.md` § Git Worktree já manda: **o clone principal nunca recebe
   `checkout`**.
2. **Você não está sozinho.** O prompt lista as **outras features do épico** (nome + escopo curto).
   Você não vê o trabalho dos outros arquitetos e eles não veem o seu. Consequências práticas:
   - Se o seu PLAN **assume** algo que outra feature constrói, declare no campo **Dependências** da
     etapa e registre em ADR. Não presuma que ela vai existir.
   - Se o seu PLAN precisa de um helper genérico que **outra feature provavelmente também precisa**,
     não invente um nome novo: procure primeiro no código; não achando, registre em ADR que você o
     está criando, com o path exato.
3. **`Arquivo(s) Afetado(s)` com path relativo à raiz do repo e prefixado pelo alias do repo**
   (ex.: `backend/src/Domain/User.cs`). O épico compara esses paths **entre features de repos
   diferentes** para detectar colisão — sem o prefixo, `src/index.ts` do frontend colide falsamente
   com o do backend e o épico serializa à toa.
4. **Preencha o campo `**Épico**` na § Informações** com o path do artefato do épico (vem no
   prompt). É o que liga este PLAN ao épico para quem lê de fora — sem ele, o PLAN vira uma feature
   avulsa indistinguível das outras, e o dashboard não consegue agrupar as N features do épico nem
   dizer em que onda esta está. Fora do Modo Épico, **omita a linha inteira** (não escreva "N/A").

### § Reconciliação (sub-caso do Modo Épico)

O review de integração de um épico acha incoerências **entre** features (duas implementações do
mesmo conceito, contratos divergentes) e pede um **PLAN de reconciliação**. Aqui:

- **A base não é um PRD único** — é o **relatório do `tech-lead`** (o escopo) mais os **PRDs das
  features envolvidas** (a intenção original de cada lado). Eles vêm no prompt e **satisfazem o
  Passo 1**; não pare pedindo "o PRD".
- **Explore o worktree da branch `fix/`** que veio no prompt, não o de planejamento: o código a
  reconciliar é o do **épico já mergeado**, e a árvore de planejamento aponta para a branch base,
  onde nada disso existe ainda.
- **Decidir qual implementação sobrevive é seu** — é a decisão mais importante do PLAN. Registre em
  ADR (com a faixa do prompt) *o que morre, o que fica e por quê*; quem lê o épico depois precisa
  entender por que uma das duas features "perdeu".
- **PLAN curto e cirúrgico:** o escopo é o 🔴, não a refatoração que você faria se pudesse. Nome:
  `{slug}-plan-NNN-reconciliacao-epic-{nome}.md`, com o `NNN` que veio no prompt.

---

## Modo Crítica de Recorte (invocado pelo `/epic-workflow` FASE 0)

Modo **read-only**: você **não escreve PLAN nem ADR**. Sua entrega é um **veredito sobre o recorte
de um épico em features**, produzido pelo `product-manager`. É esta crítica que substitui a
aprovação humana do recorte — leve a sério: tudo abaixo dela (N PRDs, N PLANs, N features de código)
herda o erro que você deixar passar.

**O HARD STOP do Passo 8 não se aplica** — aqui não há PLAN a salvar. Você lê, critica e devolve.

**Entrega:** `✅ aprovado` ou `❌ reprovado` + a lista de gaps concretos (qual feature, o quê,
como corrigir). Checklist:

- [ ] **Toda feature entrega valor sozinha** — nenhuma é "só a camada X" (recorte por camada
      técnica é o erro mais comum e o mais caro: força dependência total e serializa o épico)
- [ ] **Grafo de dependências sem ciclo**
- [ ] **Nenhuma dependência é desnecessária** — questione cada uma; "faz sentido depois" não é
      dependência, é preferência de ordem, e cada uma custa uma onda
- [ ] **Nenhuma feature é grande demais para um PRD só** — se for, aponte como subdividir
- [ ] **Migration / mudança irreversível isolada** numa feature `Isolada: Sim`
- [ ] **Sem sobreposição** — duas features não implementam o mesmo conceito
- [ ] **Ordem geral respeita a arquitetura** do projeto (dados/domínio antes de interface)

Use o código real e `docs/architecture/` para criticar — não critique no abstrato. Se uma feature
"independente" na verdade depende de uma entidade que outra cria, você é quem tem que ver isso.

---

## Processo

### Passo 0: Carregar Contexto do Projeto

**0.1. Identificar projeto ativo**

Verificar se existe `.ai-project` na raiz do repositório atual:
- Se existir: ler o caminho do map (ex: `MAPS/project`)
- Se não existir: perguntar ao dev `Qual projeto estamos trabalhando? (ex: projeto-1, projeto-2)`

**0.2. Ler `{slug}-map.json`**

Carregar `{AI_FLOW_ROOT}/{map-path}/{slug}-map.json` e extrair:
- `repositories`: paths locais, branches e contexts de cada repo
- `architecture`: padrão e estilo
- `docs.prd`: caminho onde os PRDs ficam salvos
- `docs.plan`: caminho onde os PLANs devem ser salvos

**0.3. Carregar documentação do projeto**

**Ler SEMPRE, primeiro:**
- `{AI_FLOW_ROOT}/{map-path}/{slug}-context.md` — **é a fonte principal**: arquitetura, padrões,
  estrutura de pastas, modelo de dados, glossário e a seção **`## Comandos`** (build e testes, que
  vão para o campo *Comandos Úteis* e os critérios de aceitação de cada etapa).

**Depois**, liste e leia **todos** os arquivos `.md` de:
- `{AI_FLOW_ROOT}/{map-path}/docs/architecture/` — aprofundamento por tema, **quando existir**

Ler cada arquivo encontrado antes de prosseguir. Não pular nenhum.

> 🔴 **`docs/architecture/` é opcional e na maioria dos projetos está vazio.** O `{slug}-context.md`
> é obrigatório em todo map — nunca o pule esperando achar a mesma informação em `docs/`. Onde os
> dois falarem do mesmo assunto, **`docs/architecture/` vence** (é o mais específico); onde só o
> context.md falar, ele é a verdade. Um PLAN cujos critérios de aceitação dizem "build sem erros"
> sem que ninguém saiba **qual** é o comando de build é um PLAN que o Dev não consegue executar.

---

### Passo 1: Solicitar PRD

**OBRIGATÓRIO:** Dev precisa informar o PRD.

```
📋 Vou criar o plano de execução técnico.

🔴 OBRIGATÓRIO: Qual PRD devo usar como base?

Informe o caminho do arquivo ou apenas o nome/número:
Exemplo: {map.docs.prd}/{slug}-prd-001-tbd-nome-da-feature.md
```

Se o PRD não for informado:
```
❌ PRD não informado. Por favor, execute /spec primeiro para criar o PRD,
ou informe o caminho: /planejar {map.docs.prd}/{slug}-prd-001-nome-da-feature.md
```

---

### Passo 2: Ler e Validar PRD

**2.1.** Verificar se o arquivo existe. Se não existir, informar e pedir o caminho correto.

**2.2.** Extrair do PRD:
- Repositório(s) afetado(s)
- Domínio(s) de negócio
- Requisitos funcionais e não funcionais
- Componentes impactados por camada
- Critérios de aceitação
- Permissões/roles de autorização
- Migrations necessárias
- Integrações afetadas

**2.3.** Apresentar resumo e confirmar:
```
✅ PRD Carregado: [Nome da Feature]

📊 Resumo:
- Repositório(s): [repos do PRD]
- Domínio(s): [domínios]
- Requisitos Funcionais: N
- Componentes Impactados: [por camada]
- Critérios de Aceitação: N
- Migrations: Sim/Não
- Integrações: [lista ou "nenhuma"]

Prosseguir com planejamento técnico?
```

---

### Passo 3: Verificar e Atualizar Repositório(s)

Para cada repositório afetado (identificado no PRD, confirmado via `map.repositories`):

```bash
REPO_PATH="{repo.path}"

if [ -d "$REPO_PATH" ]; then
  cd "$REPO_PATH"
  git checkout {repo.branch}
  # Só se houver remote — projeto recém-criado pelo /start-project não tem
  if git remote get-url origin >/dev/null 2>&1; then
    git fetch origin
    git pull origin {repo.branch}
  fi
else
  echo "Repositório não encontrado em $REPO_PATH"
  echo "Clone com: git clone {repo.url}"
fi
```

> **Repo sem `origin` não é erro.** O `/start-project` faz `git init` local e **não** cria
> repositório remoto — num projeto recém-criado, `git fetch origin` e `git pull` falham com
> `'origin' does not appear to be a git repository`, e a fase morre aqui. Sem remote, a base local
> **é** a versão mais recente: siga com ela. Mesma regra em `implementar.md` (Passo 3.2) e
> `epic-workflow.md` § Repo sem remote.


Informar ao dev ao concluir:
```
✅ Repositório(s) prontos para planejamento
📁 {repo.name}: {repo.path} — branch {repo.branch} atualizada
```

---

### Passo 4: Exploração Técnica Profunda

**Objetivo:** entender a estrutura técnica real do código antes de planejar.

**4.1. Mapear estrutura do projeto**

Explorar as camadas conforme definidas em `docs/architecture/`:
- Listar pastas das camadas principais
- Identificar estrutura de Commands/Queries ou equivalente
- Verificar entidades de domínio relacionadas ao PRD
- Ver últimas migrations ou equivalente (se aplicável)

**4.2. Identificar componentes relacionados à feature**

Baseado no domínio do PRD, buscar arquivos relevantes por padrão de nome:
```bash
# Adaptar padrão conforme a stack (ver docs/architecture/)
# Exemplos genéricos:
find . -name "*{Dominio}*" -not -path "*/bin/*" -not -path "*/obj/*"
find . -name "*{Entidade}*" -not -path "*/bin/*" -not -path "*/obj/*"
```

**4.3. Ler arquivos críticos**

Ler arquivos identificados para entender:
- Estrutura de entidades / modelos de domínio
- Padrão de handlers/services existentes no mesmo domínio
- Configurações de persistência
- Padrão de controllers/endpoints
- Padrão de testes existentes (para replicar o estilo)
- Migrations/scripts recentes

**4.4. Consultar padrões obrigatórios**

Ler as arquivos de `docs/architecture/` antes de planejar as etapas.

Apresentar resumo do que foi encontrado:
```
📊 Análise Técnica:
- Domínio afetado: [domínio]
- Componentes existentes relacionados: [lista com paths]
- Última migration/schema change: [nome ou "nenhuma"]
- Padrão identificado: [padrão encontrado no código]
```

---

### Passo 5: Perguntas Técnicas ao Dev

Com base na exploração, fazer perguntas técnicas específicas **(máximo 10)**:

```
🔍 Análise concluída. Algumas questões técnicas antes de planejar:

1️⃣ [Pergunta sobre nomenclatura ou campo específico identificado no código]

2️⃣ [Pergunta sobre autorização/roles — baseada nos padrões já existentes]

3️⃣ [Pergunta sobre tratamento de erros — baseada no padrão já adotado no projeto]

4️⃣ [Pergunta sobre migration — nome sugerido, nullable, impacto em dados]

5️⃣ [Pergunta sobre integração — se algum serviço externo deve ser acionado]
```

Basear as perguntas no código real encontrado, não em suposições.

**Execução como Agente:** quando esta skill roda dentro de um **agente isolado** (persona
`arquiteto-senior` — hoje só no Claude Code), a janela **não** tem tool de pergunta estruturada (lá,
`AskUserQuestion`) — nem se ela estiver listada no frontmatter. O que fazer depende de **quem te
invocou ter canal com o humano**:

| Quem invoca | Canal humano? | O que fazer com a dúvida |
|---|---|---|
| Dev, na sessão principal | sim | Pergunte normalmente, inline |
| `/feature-workflow` (modo normal) | só na rodada inicial | **ask-upfront**: reúna todas as dúvidas e **retorne a lista estruturada** ao orquestrador, que leva ao humano (ou consulta o `product-manager` para regra de negócio) e te re-invoca |
| `/feature-workflow --auto` · `/epic-workflow` | **não** | **§ Modo Autônomo**: dúvida técnica você **decide** + ADR; dúvida de negócio vira **premissa** ⚠️. **Nunca** devolva a lista |

---

### Passo 6: Quebrar em Baby Steps

Com base nas respostas e no código analisado, dividir a implementação em etapas pequenas e independentes.

**Princípios dos baby steps:**
- ✅ Cada etapa deve ser implementável em < 1 hora
- ✅ Cada etapa tem critérios de aceitação claros e verificáveis
- ✅ Cada etapa inclui seus próprios testes
- ✅ Build + testes devem passar ao fim de cada etapa
- ✅ Etapas devem ser independentes quando possível
- ✅ Seguir a ordem natural de implementação da arquitetura (conforme `docs/architecture/`)
  - Regra geral: dados/domínio primeiro, API/interface por último
  - Exemplo típico: Domain → Persistência → Lógica de Negócio → API → Integrações
- ✅ **Dependências explícitas e mínimas** — o campo `Dependências` forma o grafo que permite ao
  `/feature-workflow` executar etapas independentes **em paralelo (ondas)**; dependência
  desnecessária serializa o fluxo à toa
- ✅ Etapas independentes devem tocar **conjuntos disjuntos de arquivos** sempre que possível —
  o orquestrador usa `Arquivo(s) Afetado(s)` para decidir o que pode rodar junto; duas etapas
  que tocam o mesmo arquivo nunca rodam em paralelo
- ✅ Marcar **`Paralelizável: Não`** em migrations e mudanças irreversíveis — essas etapas rodam
  sozinhas na sua onda

---

### Passo 7: Gerar Arquivo PLAN

Determinar caminho e nome do arquivo:
- Pasta: `{map.docs.plan}` (relativo à pasta do map do projeto)
- Nomenclatura: `{slug}-plan-NNN-nome-da-feature.md` (usar mesmo número do PRD)

Usar o template abaixo:

---

### Template do PLAN

```markdown
# Plano de Execução: [Nome da Feature]

## Informações
- **PRD Relacionado**: {map.docs.prd}/{slug}-prd-NNN-id-nome-da-feature.md
- **Épico**: {map.docs.epic}/{arquivo-do-épico}.md — *(só no § Modo Épico; omita a linha fora dele)*
- **Repositório(s)**: [repos afetados]
- **Domínio(s)**: [domínios]
- **Branch Base**: {repo.branch}
- **Branch da Feature**: `feature/{nome}` — *(a branch que ESTE plano cria; omita se ainda não definida)*
- **Complexidade**: 🟢 Baixa / 🟡 Média / 🔴 Alta
- **Criado em**: YYYY-MM-DD
- **Última atualização**: YYYY-MM-DD

---

## PROGRESSO GERAL

**Status**: ⏳ Não Iniciado
**Progresso**: 0/N etapas concluídas (0%)

```
[⚪⚪⚪⚪⚪⚪] 0%
```

> Este progresso será atualizado automaticamente pelo skill `/implementar`.

---

## VISÃO GERAL

[Resumo explicando o que será implementado, contexto da feature no projeto
e principais componentes afetados por camada]

---

## OBJETIVOS

- [ ] [Objetivo 1]
- [ ] [Objetivo 2]

---

## MAPA DE COMPONENTES IDENTIFICADOS

[Listar componentes por camada conforme a arquitetura do projeto em docs/architecture/]

### [Camada 1 — ex: Domínio]
- `{path}/[Arquivo]` (novo / alterado)

### [Camada 2 — ex: Aplicação/Serviços]
- `{path}/[Arquivo]` (novo / alterado)

### [Camada 3 — ex: Persistência]
- `{path}/[Arquivo]` (novo / alterado)

### [Camada 4 — ex: API/Interface]
- `{path}/[Arquivo]` (novo / alterado)

### Testes
- `{path}/[ArquivoDeTeste]` (novo / alterado)

---

## ESTRATÉGIA DE TESTES

[Convenção de nomenclatura de testes — conforme docs/architecture/]
[Frameworks utilizados — conforme docs/architecture/]

- [ ] [Cenário de teste 1]
- [ ] [Cenário de teste 2 — happy path]
- [ ] [Cenário de teste 3 — erro/exceção]

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: [Descrição objetiva]

**Status:** ⏳ Pendente
**Data de Conclusão:** -

**Objetivo:**
[O que essa etapa entrega e por quê é necessária]

**Complexidade:** 🟢 Baixa / 🟡 Média / 🔴 Alta

**Arquivo(s) Afetado(s):**
- `{repo-alias}/{path-relativo-à-raiz-do-repo}` (novo / alterado)

> Prefixe com o **alias do repo** (a chave em `map.repositories`) sempre que o projeto tiver mais de
> um — ex.: `backend/src/Domain/User.cs`, `frontend/src/routes.tsx`. Os orquestradores comparam
> esses paths **como string** para decidir o que roda em paralelo: sem o prefixo, o `src/index.ts`
> do frontend colide falsamente com o do backend e o fluxo serializa à toa; e dois arquivos
> genuinamente diferentes com o mesmo path relativo passariam por iguais.

**O que implementar:**
[Descrição técnica clara do que deve ser feito — SEM código.
O que a classe/módulo deve fazer, quais campos adicionar, qual lógica aplicar]

**Testes Necessários:**
- [ ] [Cenário de teste 1]
- [ ] [Cenário de teste 2]

**Critérios de Aceitação:**
- [ ] [Critério 1]
- [ ] [Critério 2]
- [ ] Build sem erros (ver docs/architecture/)
- [ ] Testes passando

**Dependências:** Nenhuma

**Paralelizável:** Sim / Não ([se Não, o motivo — ex.: migration, mudança irreversível])

**Comandos Úteis:**
[Ver docs/architecture/ — adaptar para o arquivo/módulo desta etapa]

---

### ETAPA 2: [Descrição objetiva]

**Status:** ⏳ Pendente
**Data de Conclusão:** -

[... mesma estrutura da ETAPA 1 ...]

**Dependências:** ETAPA 1

---

## CHECKLIST FINAL DE VALIDAÇÃO

### Build & Testes
[Conforme docs/architecture/]
- [ ] Build sem erros
- [ ] Todos os testes passando

### Padrões de Código
[Conforme docs/architecture/]
- [ ] [Padrão 1 do projeto]
- [ ] [Padrão 2 do projeto]

### Banco de Dados / Schema (se aplicável)
- [ ] Migration/script testado (aplicar)
- [ ] Rollback testado
- [ ] Sem risco de perda de dados existentes

### Autorização
- [ ] Permissões corretas configuradas
- [ ] Testado com usuário sem permissão (deve retornar erro adequado)

### Integrações (se aplicável)
[Conforme docs/business/]
- [ ] [Integração 1 validada]

### PRD
- [ ] Todos os requisitos funcionais atendidos
- [ ] Todos os critérios de aceitação atendidos

---

## LEGENDA DE STATUS

- ⏳ **Pendente**: Não iniciada
- 🔄 **Em Progresso**: Sendo implementada
- ✅ **Concluída**: Finalizada e testada
- ❌ **Bloqueada**: Com impedimento

---

## PONTOS DE ATENÇÃO

1. **[Ponto crítico 1]**: [Descrição e impacto]

---

## DECISÕES TÉCNICAS

### Decisão 1: [Tema]
- **Opção escolhida**: [Opção]
- **Justificativa**: [Por quê]
- **Alternativas consideradas**: [Alternativas]

---

## PREMISSAS ASSUMIDAS *(omitir a seção se não houve nenhuma)*

> Preenchida em **modo autônomo**, quando não houve canal para perguntar. Nenhum humano validou
> nada aqui. Decisão **técnica** não entra aqui — vai para DECISÕES TÉCNICAS / `adr/`; premissa é o
> que foi **assumido por falta de informação**.

### Negócio ⚠️
- **P01**: [premissa] — **Motivo**: [que informação faltou] — **Impacto se errada**: [o que refazer]

### Técnicas
- **P02**: [premissa] — **Motivo**: [...] — **Impacto se errada**: [...]

---

## RISCOS E MITIGAÇÕES

### Risco 1: [Nome]
- **Impacto**: Alto / Médio / Baixo
- **Probabilidade**: Alta / Média / Baixa
- **Mitigação**: [Como mitigar]

---

## DOCUMENTAÇÃO DE REFERÊNCIA

- **PRD**: {map.docs.prd}/{slug}-prd-NNN-id-nome-da-feature.md
- **Contexto do Projeto**: docs/
- **Arquitetura**: docs/architecture/
- **Padrões**: docs/architecture/
- **Código relacionado**: [paths identificados na análise]

---

## COMANDOS ÚTEIS

[Ver docs/architecture/ para comandos completos da stack do projeto]

---

## INSTRUÇÕES DE ATUALIZAÇÃO

Este arquivo será atualizado automaticamente pelo skill `/implementar` durante a execução.

Após cada etapa concluída:
1. Status da etapa → ✅ Concluída + data de conclusão
2. Progresso geral atualizado (% e barra visual)
3. Checklist de tarefas marcado

---

## OBSERVAÇÕES

1. **Implementar uma etapa por vez** — garantir testes passando antes de avançar
2. **Seguir os padrões do projeto** — ver docs/architecture/
3. **Code review contínuo** — usar `/code-review` após cada etapa

---

---

## HANDOFF

- **De / Para**: Arquiteto Sênior → Dev Sênior
- **Decisões de arquitetura**: [o que foi decidido e por quê — o que o Dev não deve reabrir; ver
  também DECISÕES TÉCNICAS e `adr/`]
- **Premissas assumidas**: [ver PREMISSAS ASSUMIDAS, ou "nenhuma"]
- **Riscos**: [o que pode dar errado na implementação e onde]
- **Dúvidas em aberto**: [o que ficou sem resposta e quem pode respondê-la]
- **O que o próximo papel deve saber**: [padrão do código que precisa ser replicado, armadilha
  conhecida, etapa que parece simples e não é]

---

**Criado em:** YYYY-MM-DD
**Próximo passo:** `/implementar ETAPA 1`
```

> 🔴 **A seção HANDOFF é obrigatória** — os orquestradores (`/feature-workflow` § 2.2,
> `/epic-workflow`) **reprovam o PLAN sem ela**, e PLAN reprovado duas vezes bloqueia a feature. Ela
> é o contrato entre papéis: o Dev roda em janela isolada e **não vê** a sua exploração do código —
> o que não estiver escrito aqui (ou no PLAN), ele não saberá que existiu.

---

### Passo 8: Validar Plano com o Dev — PARAR AQUI

```
✅ Plano de Execução Criado!

📄 Arquivo: {map.docs.plan}/{slug}-plan-NNN-nome-da-feature.md

📊 Resumo:
- Total de Etapas: N
- Componentes Afetados: X arquivos
- Repositório(s): [repos]
- Dependências entre etapas: [mapa de deps]
- Cenários de Teste: Y

📋 Etapas:
1. ⏳ [Etapa 1] — [Camada]
2. ⏳ [Etapa 2] — [Camada]
...

⚠️ Riscos Identificados:
- [Risco com mitigação]

💡 Decisões Técnicas:
- [Decisão e justificativa]

❓ Este plano faz sentido para você?
   Alguma etapa precisa ser ajustada?

🚀 Quando quiser iniciar: /implementar ETAPA 1
```

> ⛔ **HARD STOP — A SKILL TERMINA AQUI.**
> NÃO executar nenhuma etapa de implementação.
> NÃO criar arquivos de código.
> NÃO modificar código existente.
> Aguardar o dev acionar explicitamente `/implementar ETAPA N`.

---

### Passo 9: Explicar Cada Etapa

Garantir que o dev entende o que será feito em cada etapa:

```
💡 Resumo de cada etapa:

ETAPA 1 — [Descrição]:
[Explicação em linguagem simples do que será feito e por quê essa ordem faz sentido]

ETAPA 2 — [Descrição]:
[Explicação simples]

[... todas as etapas ...]

Alguma etapa ficou confusa ou precisa ser ajustada?
```

---

## O Que Este Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Carrega contexto do projeto via `{slug}-map.json` e `docs/`
- Lê e valida o PRD obrigatório
- Atualiza repositório(s) antes de analisar
- Explora código profundamente por camada
- Consulta padrões do time via `docs/`
- Faz perguntas técnicas contextualizadas (máx 10)
- Identifica componentes técnicos com paths completos
- Quebra em baby steps seguindo a ordem natural da arquitetura
- Define dependências entre etapas
- Gera PLAN em `{map.docs.plan}`
- Explica cada etapa ao dev

### ❌ NÃO FAZ — NUNCA, EM NENHUMA CIRCUNSTÂNCIA:
- ❌ **Implementar código** — mesmo que "o próximo passo natural seja implementar"
- ❌ **Criar arquivos de código** — o PLAN.md é o único arquivo criado por esta skill
- ❌ **Modificar código existente** — zero alterações no repositório além do PLAN.md
- ❌ Criar branches → use `/implementar`
- ❌ Fazer commits → use `/implementar`
- ❌ Rodar testes → use `/implementar`
- ❌ Clonar repositório pela primeira vez (o repo já deve existir)

> A skill termina após salvar o PLAN e apresentar o resumo ao dev (Passo 8).
> O dev precisa acionar explicitamente `/implementar ETAPA N` para iniciar a execução.
