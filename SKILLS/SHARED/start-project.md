# Skill: Start Project (Zero ao MVP_000001 Rodando)

## Descrição

Orquestrador end-to-end para iniciar um projeto **do zero**: parte da ideia bruta,
conduz uma conversa de descoberta, recorta o escopo inicial, faz brainstorm
de arquitetura e modelo de dados junto com o dev, registra o projeto no ai-flow,
faz o bootstrap físico (boilerplate + git) e gera os PRDs e PLANs prontos
para `/implementar`.

O escopo sai em um de dois formatos, escolhido pelo dev no Passo 2 (§ Enxuto × Completo):
**enxuto** (1 PRD + 1 PLAN do MVP_000001) ou **completo** (N PRDs + N PLANs, via
`/epic-workflow --so-planejar`). Os Passos 1 a 7 são idênticos nos dois.

Esta skill é um **orquestrador**: ela reusa a lógica das skills
[[setup-project]], [[spec]], [[planejar]] e [[epic-workflow]] (lendo seus arquivos em `SKILLS/SHARED/`)
em vez de duplicar conteúdo. Sempre que esta skill referencia "siga o processo de
`SKILLS/SHARED/X.md`", significa carregar aquele arquivo e executar seus passos
no contexto desta conversa contínua.

---

## O Que Esta Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Conduz conversa de descoberta sobre a ideia (problema, usuário, valor, stack)
- Ajuda o dev a recortar um MVP_000001 enxuto e end-to-end
- Quando o recorte não cabe num PRD só, oferece os dois formatos de saída (§ Enxuto × Completo):
  fatiar num MVP_000001 menor, ou planejar tudo de uma vez via `/epic-workflow --so-planejar`
- Lista boilerplates disponíveis em `BOILERPLATES/BACK` e `BOILERPLATES/FRONT` e pergunta interativamente qual usar
- Cria estrutura local mínima quando nenhum boilerplate serve
- Faz brainstorm de arquitetura (padrão, camadas, trade-offs) junto com o dev, propondo um rascunho primeiro
- Deriva um modelo de dados inicial (entidades, campos, relações) a partir dos fluxos do MVP
- Levanta integrações externas e restrições não-funcionais (dados sensíveis, escala, autenticação) relevantes pro MVP
- Registra o projeto no ai-flow invocando o processo de `SKILLS/SHARED/setup-project.md`
- Faz `git init` no(s) repositório(s) local(is) (com confirmação)
- Roda `restore/install` da stack escolhida (com confirmação)
- **Enxuto:** gera o {slug}-prd-000001-mvp e o {slug}-plan-000001-mvp invocando os processos de
  `SKILLS/SHARED/spec.md` e `SKILLS/SHARED/planejar.md`
- **Completo:** gera N PRDs + N PLANs + grafo de dependências invocando `SKILLS/SHARED/epic-workflow.md --so-planejar`
- Entrega o projeto pronto para `/implementar` — nos dois caminhos

### ❌ NÃO FAZ:
- ❌ Implementar código da feature → use `/implementar`
- ❌ **Sair escrevendo código no caminho completo** — o épico roda com `--so-planejar` e para nos artefatos. Esta skill entrega planos para o dev revisar, nunca N features implementadas num projeto sem padrão estabelecido
- ❌ Criar repositórios remotos (GitHub/Azure DevOps) → manual ou skill futura
- ❌ Configurar MCPs → use `/setup-mcp-*`
- ❌ Forçar limite de tamanho do MVP — apenas alerta. O dev decide
- ❌ Substituir um ADR formal para decisões complexas de arquitetura — define só o suficiente pra começar bem; decisões grandes viram ADR depois (`MAPS/{slug}/adr/`)
- ❌ Modelar o schema de banco em nível de produção (índices, migrations detalhadas) — o modelo de dados aqui é um rascunho validado, refinado depois no `/planejar`/implementação

---

## Princípios

1. **Conversacional, não rígido.** Os blocos são pontos de checagem, não um questionário fechado. Se o dev divagar, capture o que veio e siga.
2. **Reusar, não duplicar.** Sempre que possível, delegar para a lógica das skills existentes via `SKILLS/SHARED/{skill}.md`.
3. **MVP enxuto por design.** Empurrar o dev a cortar pequeno. Se a ideia for grande, oferecer slicing (MVP_000001 menor + MVP_000002+ como notas).
4. **Boilerplate opcional.** Se nenhum servir, segue genérico — não é bloqueio.
5. **Confirmação antes de ações irreversíveis.** `git init`, `npm install`, `dotnet restore` — sempre perguntar antes.
6. **Propor primeiro, ajustar depois.** Em arquitetura, modelo de dados e integrações, a IA sempre chega com um rascunho concreto baseado no que já foi dito — o dev corrige/aprova, não preenche do zero. É mais lento que um formulário vazio, mas é isso que evita retrabalho depois.
7. **Sem pressa nas decisões estruturais.** Esta skill prioriza sair com arquitetura e dados bem definidos em vez de velocidade — problemas aqui custam muito mais caro para corrigir depois de código escrito.
8. **Uma bifurcação, no Passo 2.** Projeto novo cabe em dois formatos — enxuto ou completo (§ Enxuto × Completo). A escolha é do dev e acontece uma vez só; os Passos 3 a 7 são idênticos nos dois.

---

## § Enxuto × Completo — os dois formatos de saída

Os Passos 1 a 7 (descoberta → stack → arquitetura → integrações → registro no ai-flow →
bootstrap físico) servem aos dois caminhos **igualmente**. Só os Passos 8 e 9 bifurcam:

```
Passos 1-7   descoberta → stack → arquitetura → bootstrap → MAPS/{slug} + commit inicial
      │
      ├─ ENXUTO    → /spec + /planejar       → 1 PRD + 1 PLAN (MVP_000001)
      └─ COMPLETO  → /epic-workflow --so-planejar → N PRDs + N PLANs + grafo de dependências
```

| | **Enxuto** | **Completo** |
|---|---|---|
| Quando | O "momento mágico" cabe em ≤ 5 fluxos | O recorte mínimo já passa disso, ou o dev quer o mapa inteiro antes de codar |
| Saída | `prd/000001-mvp` + `plan/000001-mvp` | N PRDs + N PLANs + grafo de ondas |
| Resto do escopo | `## Roadmap / MVPs Futuros` no context.md | Já virou PRD/PLAN |
| Custo | Baixo — minutos | Alto — N features × (PRD + PLAN) |
| Próximo passo | `/implementar ETAPA 1` | Escolher por onde atacar, ou `/epic-workflow {path}` pra implementar tudo |

**Por que `--so-planejar` e não o épico completo:** `/start-project` termina entregando um plano
para o dev revisar, nunca código pronto. Um épico full rodando ao final de um `/start-project`
escreveria as N features inteiras num projeto que não tem uma linha de código nem um padrão
estabelecido — é o cenário que o próprio Passo 10 desaconselha. `--so-planejar`
(`epic-workflow.md § --so-planejar`) para exatamente na fronteira certa: planeja tudo, não coda nada.

**A escolha não é irreversível.** Enxuto → completo depois: o roadmap do context.md já é um pacote
de features, entrada direta do `/epic-workflow`. Completo → enxuto: os PRDs existem, basta
implementar um só via `/feature-workflow {plan-path}`.

---

## Processo

### Passo 0: Apresentação

Exibir ao dev:

```
🚀 Start Project — do zero ao MVP_000001 rodando

Vou te guiar do "tenho uma ideia" até um PLAN pronto pra implementar.
A conversa tem 8 etapas:

  1. Descoberta da ideia
  2. Recorte do MVP_000001
  3. Stack e boilerplate
  4. Arquitetura e modelo de dados
  5. Integrações e restrições não-funcionais
  6. Registro no ai-flow (cria MAPS/{slug}/)
  7. Bootstrap físico (cria pasta local, git init)
  8. PRD e PLAN — do MVP_000001, ou de todas as features (você escolhe na 2)

É de propósito mais devagar que um formulário rápido — o objetivo é sair
com arquitetura, dados e integrações bem pensados, pra não virar retrabalho
lá na frente.

Ao final, você roda /implementar e vê a v0.1 funcionando. Vamos?
```

---

### Passo 1: Descoberta da Ideia

Conduzir uma conversa curta — não despejar todas as perguntas de uma vez.
Coletar de forma incremental:

```
💡 BLOCO 1 — A Ideia

Me conta:

1. Em uma frase, o que é o projeto?
   [ex: "App que ajuda freelancers a controlar horas faturáveis"]

2. Qual problema ele resolve, e para quem?
   [ex: "Freelancers perdem horas faturáveis por não tracear em tempo real"]

3. Qual o "momento mágico" — o que o usuário precisa fazer/ver
   pra entender o valor do produto?
   [ex: "Logar, criar um projeto, dar start no timer, ver o valor crescendo"]

4. Tem alguma restrição conhecida?
   [ex: "Precisa rodar no celular", "Não quero usar X tecnologia", "vazio"]
```

Capturar tudo. Não validar ainda — só ouvir.

Se o dev responder de forma vaga, fazer 1 pergunta de acompanhamento focada
no "momento mágico" — esse é o ponto que define o MVP.

---

### Passo 2: Recorte do MVP_000001

Com base no "momento mágico", propor o recorte:

```
🎯 BLOCO 2 — MVP_000001

Pelo que entendi, o "momento mágico" é:
  → [reformular o que o dev disse]

Proponho que o MVP_000001 contenha apenas o fluxo end-to-end mínimo
que prova esse momento. Algo como:

  • [Etapa A — ex: cadastro/login simples]
  • [Etapa B — ex: criar projeto]
  • [Etapa C — ex: start/stop timer]
  • [Etapa D — ex: ver valor acumulado]

Tudo que NÃO está nesse fluxo (ex: relatórios, integração com bancos,
notificações) fica registrado como MVP_000002+ pra depois.

Isso faz sentido? Quer adicionar/tirar algo?
```

**Detecção de tamanho:**

Após o dev confirmar o recorte, **contar** mentalmente o número de fluxos.

- Se ≤ 5 fluxos e sem integração externa complexa: caminho **enxuto**, seguir sem alertar.
- Se > 5 fluxos OU envolve integrações externas complexas: o recorte não cabe num PRD só.
  Não force o fatiamento nem siga em frente calado — ofereça os **dois caminhos** (§ Enxuto × Completo):

```
⚠️ Esse recorte tem {X} fluxos — grande demais pra um PRD/PLAN só
   (estimo {N} dias de implementação).

Dois caminhos, os dois válidos:

  A) ENXUTO — corta agora, entrega antes
     MVP_000001 = só [fluxo 1 + 2] (o "momento mágico" nu).
     O resto vira roadmap e você decide depois.
     → 1 PRD + 1 PLAN, /implementar ETAPA 1 hoje ainda.

  B) COMPLETO — mantém o escopo, planeja tudo antes de codar
     As {X} features viram {X} PRDs + {X} PLANs, com dependências mapeadas.
     Nada é implementado — você olha o plano inteiro e decide o que atacar.
     → /epic-workflow --so-planejar

  C) Outro recorte que você prefira

Como prefere seguir?
```

A escolha define o Passo 8/9. Registre-a — ela é a única bifurcação desta skill.

**Regra:** só ofereça (B) quando o recorte de fato passar do limite. Num MVP de 3 fluxos, o épico
é overhead puro — pergunta desnecessária que empurra o dev pro caminho caro.

**Capturar ideias futuras:**

Tudo que o dev mencionou e ficou de fora **do que vai ser planejado agora** deve ser anotado para
virar `MVP_000002+` como nota em `{slug}-context.md` (seção "Roadmap / MVPs Futuros") no Passo 6.

O que é "fora" depende do caminho escolhido:

- **Enxuto** — fora = tudo que não está nos fluxos do MVP_000001. É o caso comum, e a lista costuma
  ser longa.
- **Completo** — as features do escopo viram PRD/PLAN no Passo 8, então **não** vão pro roadmap
  (senão o mesmo item aparece duas vezes, como plano e como ideia). Vai pro roadmap só o que o dev
  citou e ficou fora até do escopo completo — muitas vezes nada, e aí a seção sai com
  "Sem itens — o escopo inicial está inteiro em `prd/`."

---

### Passo 3: Stack e Boilerplate

#### 3.1. Stack

```
⚙️ BLOCO 3 — Stack

1. Backend (tecnologias separadas por vírgula, ou "ajuda decidir"):
   [ex: dotnet8, postgresql, ou vazio se for front-only]

2. Frontend (tecnologias separadas por vírgula, ou "ajuda decidir"):
   [ex: react, typescript, ou vazio se for back-only]

3. Infra/Deploy (opcional):
   [ex: azure, vercel, docker — deixe vazio se ainda não decidiu]
```

Se o dev responder "ajuda decidir" em qualquer campo:
- Propor 1-2 opções **baseadas no problema e nas restrições do Passo 1**
- Explicar trade-off em 1-2 linhas
- Esperar a escolha do dev

#### 3.2. Boilerplate (interativo)

Listar os boilerplates disponíveis lendo as pastas:
- `BOILERPLATES/BACK/`
- `BOILERPLATES/FRONT/`

Apresentar:

```
📦 Boilerplates disponíveis

Backend:
  • dotnet-api      — API .NET com estrutura padrão
  • dotnet-worker   — Worker service .NET
  • (nenhum)        — começar com estrutura genérica

Frontend:
  • react           — SPA React + TypeScript
  • angular         — Angular padrão
  • (nenhum)        — começar com estrutura genérica

Qual usar pra cada repo que vamos criar?
```

Se o dev escolher "(nenhum)", a skill cria uma estrutura mínima no bootstrap
(README.md, .gitignore, pasta `src/`) sem copiar conteúdo de boilerplate.

#### 3.3. Definição dos Repositórios

Com base no que foi escolhido, propor os repositórios:

```
🗂️ Estrutura de repositórios proposta:

  • backend  → C:/Projetos/{slug}/backend   (boilerplate: {x})
  • frontend → C:/Projetos/{slug}/frontend  (boilerplate: {y})

Está bom? Quer mudar paths, alias ou número de repos?
```

Permitir 1 repo só (monorepo, só front, só back) ou múltiplos.
Capturar para cada repo: alias, path local, boilerplate (ou nenhum), branch padrão.

---

### Passo 4: Arquitetura e Modelo de Dados

Este é o passo central do brainstorm técnico. A IA **sempre propõe primeiro** —
nunca abre com um campo vazio pro dev preencher. Use tudo que já foi capturado
(ideia, momento mágico, fluxos do MVP, stack) para chegar com um rascunho concreto.

#### 4.1. Arquitetura

Propor um padrão arquitetural compatível com a stack e o tamanho do MVP,
explicando o porquê em poucas linhas:

```
🏛️ BLOCO 4 — Arquitetura (proposta)

Pelo que vimos até aqui ({resumo curto: stack + escala esperada}),
sugiro:

  • Padrão: {ex: "Monolito modular" / "Clean Architecture simplificada" / "SPA sem build"}
  • Estilo: {ex: "REST" / "CQS" / "state-machine"}

  Por quê: {1-3 linhas de trade-off — ex: "seu MVP tem poucos fluxos e é
  um dev só; monolito modular evita overhead de coordenar múltiplos serviços
  sem fechar a porta pra separar depois"}

  Camadas/pastas sugeridas:
    {repo-alias}/
      src/
        {camada 1}/   → {responsabilidade}
        {camada 2}/   → {responsabilidade}
      tests/

Faz sentido? Quer simplificar, mudar o padrão ou ajustar as camadas?
```

Regras para a proposta:
- Se um boilerplate foi escolhido no Passo 3, **derivar a estrutura de pastas do próprio boilerplate** (ler o conteúdo de `BOILERPLATES/{BACK|FRONT}/{nome}/`) em vez de inventar uma nova — só ajustar nomes de camada ao domínio.
- Se nenhum boilerplate foi escolhido, propor uma estrutura mínima coerente com o padrão sugerido.
- Se o dev discordar do padrão, perguntar o que ele prefere e ajustar — nunca insistir.
- Não aprofundar em ADR completo aqui — só o suficiente para orientar a implementação do MVP. Decisões grandes/controversas: sugerir registrar como ADR futuro (`MAPS/{slug}/adr/`).

#### 4.2. Modelo de Dados

**Pular esta seção inteiramente se o MVP não tiver persistência** (ex: SPA
100% client-side, sem backend/DB na stack do Passo 3). Nesse caso, registrar
em `{slug}-context.md`: "Sem persistência — estado vive no cliente."

Caso contrário, derivar entidades candidatas a partir de cada fluxo do
MVP (Passo 2) e propor um rascunho de schema:

```
🗄️ BLOCO 4.2 — Modelo de Dados (rascunho)

Com base nos fluxos do MVP, essas parecem ser as entidades principais:

  ### {Entidade1} (ex: User)
  | Campo | Tipo | Observação |
  |-------|------|------------|
  | id | uuid/int | PK |
  | {campo} | {tipo} | {ex: unique, nullable, default} |

  ### {Entidade2} (ex: Project)
  | Campo | Tipo | Observação |
  |-------|------|------------|
  | id | uuid/int | PK |
  | {campo} | {tipo} | |
  | {entidade1}_id | FK | {relação: N:1 com Entidade1} |

  Relações:
    • {Entidade1} 1—N {Entidade2}
    • {outras relações relevantes}

Bate com o que você imagina? Quer renomear campos, adicionar/remover
entidades ou mudar alguma relação?
```

Regras:
- Nomear entidades e campos em inglês (convenção do {slug}-map.json/código), mas discutir em português.
- Incluir apenas os campos necessários para os fluxos do MVP_000001 — o que sobrou pro roadmap (Passo 2) não precisa de modelagem agora.
- Se o dev não souber responder algum detalhe técnico (tipo de dado, se é 1:N ou N:N), a IA decide e explica o porquê em 1 linha — não travar esperando uma resposta técnica que o dev não tem.
- Perguntar explicitamente sobre dados sensíveis aqui (ex: senha, CPF, dados de pagamento) — se houver, marcar o campo com uma nota `(sensível)` para reaproveitar no Passo 5.

---

### Passo 5: Integrações e Restrições Não-Funcionais

#### 5.1. Integrações externas

Perguntar objetivamente, já com sugestões baseadas na stack e nos fluxos do MVP:

```
🔌 BLOCO 5.1 — Integrações Externas

Pelos fluxos do MVP, meu palpite é que você vai precisar de:

  • {serviço sugerido, ex: "Auth: Google OAuth"} — {por quê}
  • {serviço sugerido, ex: "Email transacional"} — {por quê, ou "não precisa pro MVP_000001"}

Tem mais alguma integração externa necessária (pagamento, storage de
arquivos, API de terceiros)? Ou algum desses eu chutei errado?
```

Se o dev não souber qual serviço específico usar, aplicar o mesmo padrão de
"ajuda decidir" do Passo 3: propor 1-2 opções com trade-off em 1-2 linhas.

#### 5.2. Restrições não-funcionais

Perguntar em bloco único, mantendo curto — não é uma auditoria exaustiva:

```
⚠️ BLOCO 5.2 — Restrições Não-Funcionais

1. Algum dado sensível envolvido (senha, documento, pagamento, saúde)?
   [Se sim no Passo 4.2, já reaproveitar aqui — só confirmar]

2. Expectativa de uso: uso pessoal/poucos usuários, ou precisa aguentar
   escala desde o início?

3. Precisa de autenticação/autorização com múltiplos perfis de acesso,
   ou é um usuário só/sem login?

4. Alguma exigência de disponibilidade, offline-first ou multi-idioma
   que já se sabe de cara?
```

Capturar as respostas — elas viram a seção de restrições do `{slug}-context.md` e
informam os critérios de aceitação não-funcionais do PRD (Passo 8).

#### 5.3. Glossário

Revisar tudo que foi discutido (Passos 1, 2 e 4) e extrair os termos de
domínio específicos do projeto:

```
📖 BLOCO 5.3 — Glossário (rascunho)

Esses termos apareceram e parecem específicos do seu domínio:

  • {termo}: {definição inferida da conversa}
  • {termo}: {definição inferida da conversa}

Algum eu defini errado, ou falta algum termo importante?
```

Se não surgiu nenhum termo de domínio específico (app genérico o bastante),
pular este bloco sem perguntar.

---

### Passo 6: Registro no ai-flow

**Delegar para `SKILLS/SHARED/setup-project.md`.**

Como já temos as respostas do Passo 1 e 3, **pular os blocos perguntados** do
`setup-project` quando a informação já estiver disponível. Os blocos do
`setup-project` mapeiam assim:

| Bloco do setup-project | Origem nesta skill |
|------------------------|--------------------|
| Bloco 1 (Projeto) | Passo 1 (ideia, descrição) — perguntar apenas: team, status |
| Bloco 2 (Stack) | Passo 3.1 (já temos) |
| Bloco 3 (Arquitetura) | Passo 4.1 (já temos) |
| Bloco 4 (Repositórios) | Passo 3.3 (já temos) |
| Bloco 5 (Tooling) | Perguntar agora — type/workitems/repos |
| Bloco 6 (Contexto) | Preencher automaticamente com o que veio do Passo 1-2 |

Confirmar resumo e executar o Passo 8 do `setup-project.md` (criar
`MAPS/{slug}/`, `{slug}-map.json` — **copiado do `MAPS/_template/map.json`**, com `docs.epic` e
`epic.hot-files` já presentes —, `{slug}-context.md`, as pastas de `docs` e o `.ai-project`).

**Acréscimo ao {slug}-context.md gerado:**

O template padrão do `setup-project.md` deixa várias seções como
"A preencher" — como já temos conteúdo real vindo do brainstorm (Passos 4 e 5),
substituir os placeholders dessas seções em vez de deixá-los vazios:

- **`## Arquitetura`** — substituir o "A preencher: detalhe as camadas..."
  pelo raciocínio e trade-offs discutidos no Passo 4.1, e `### Estrutura de
  Pastas` pela árvore de camadas acordada com o dev.
- **`## Modelo de Dados`** (nova seção, inserir logo após `## Arquitetura`) —
  as entidades/tabelas/relações do Passo 4.2. Se o MVP não tem persistência,
  registrar explicitamente "Sem persistência — estado vive no cliente." em
  vez de omitir a seção.
- **`## Integrações e Dependências Externas`** — preencher a tabela
  Serviço/Finalidade/Ambiente com o que saiu do Passo 5.1.
- **`## Glossário`** — preencher com os termos do Passo 5.3, se houver.
- Adicionar uma seção `## Restrições Não-Funcionais` (nova, após `## Glossário`)
  com as respostas do Passo 5.2 (dados sensíveis, escala esperada, auth,
  disponibilidade/offline/idioma).
- Adicionar uma seção `## Roadmap / MVPs Futuros` com as ideias que ficaram de
  fora no Passo 2:

```markdown
## Roadmap / MVPs Futuros

> Capturado durante /start-project. Cada item pode virar um PRD/PLAN futuro —
> um a um (`/spec` → `/planejar`), ou vários de uma vez: esta lista é um
> **pacote de features já recortado**, que é a entrada do `/epic-workflow`.

- MVP_000002: [descrição do que ficou de fora 1]
- MVP_000003: [descrição do que ficou de fora 2]
```

Escrever cada item como **uma feature que entrega valor sozinha** (não "o resto do backend"): é
esse recorte que o `/epic-workflow` vai consumir depois, e ele reprova recorte por camada técnica.

Nenhuma seção do `{slug}-context.md` deve sobrar como "A preencher" ao final deste
passo, exceto `## Padrões Backend` / `## Padrões Frontend` (esses só ganham
conteúdo real conforme o código é escrito — natural ficarem abertos aqui).

---

### Passo 7: Bootstrap Físico

Para cada repositório definido no Passo 3.3:

#### 7.1. Verificar se o path local já existe

Se já existe e **não está vazio**: avisar e perguntar:
```
⚠️ {path} já existe e tem conteúdo.

  Opção A) Pular este repo (você cuida do bootstrap manualmente)
  Opção B) Usar mesmo assim (eu vou apenas criar .ai-project e seguir)
  Opção C) Cancelar /start-project

Como prefere?
```

#### 7.2. Criar a pasta (se não existir)

#### 7.3. Aplicar boilerplate (se escolhido)

- Copiar **recursivamente** o conteúdo de `BOILERPLATES/{BACK|FRONT}/{nome}/`
  para o path local do repo.
- Substituir placeholders comuns se houver (ex: `{{PROJECT_NAME}}` → nome do projeto).

#### 7.4. Estrutura genérica (se nenhum boilerplate)

Criar:
```
{repo-path}/
  README.md          (com nome do projeto + descrição da ideia do Passo 1)
  .gitignore         (genérico — node_modules, bin, obj, .env)
  src/               (pasta vazia com .gitkeep)
```

#### 7.5. `git init`

Perguntar antes:
```
🔧 Inicializar git em {repo-path}? (s/n)
```

Se sim: `git init`, e criar a branch base com o nome declarado no map
(`git branch -M {repo.branch}` — ex.: `develop`), para não nascer em `master`
quando o projeto usa outro nome.

#### 7.6. Restore/Install (confirmação)

Detectar tipo do projeto pelos arquivos do boilerplate (ou ausência) e perguntar:

```
📦 Quer que eu rode {comando} pra instalar dependências agora? (s/n)
  • dotnet: dotnet restore
  • node: npm install / yarn install / pnpm install (perguntar qual)
  • python: pip install -r requirements.txt
```

Se o boilerplate não tiver manifestos, pular este passo.

#### 7.7. Commit inicial (OBRIGATÓRIO)

Depois do boilerplate e do restore/install, commitar o scaffold:

```bash
cd {repo-path}
git add .            # o .gitignore do boilerplate já exclui node_modules/bin/obj
git commit -m "chore: bootstrap {nome-do-projeto}"
```

> 🔴 **Não é opcional, e não é gosto pessoal — é pré-requisito técnico.**
> `CONVENTIONS.md` § Git Worktree torna o worktree **obrigatório** para toda skill que escreve
> código, e **`git worktree add` exige pelo menos um commit**: num repo recém-`init`ado o Git
> ou recusa (`invalid reference`) ou infere `--orphan` e cria um worktree sem história — os dois
> caminhos quebram a ETAPA 1.
> Sem este commit, o `/implementar ETAPA 1` que este skill sugere no Passo 10 **não roda**.

Verificar antes de seguir:
```bash
git -C {repo-path} log --oneline -1    # tem que devolver o commit; se falhar, o bootstrap não terminou
```

Se o dev recusou o `git init` no 7.5, pular — e **avisar no Passo 10** que o `/implementar` vai
precisar de um repo com pelo menos um commit.

#### 7.8. Reportar resultado do bootstrap

```
🏗️ Bootstrap concluído:

  ✅ {repo-1}/  ({boilerplate ou genérico})
     ├─ git inicializado (branch {repo.branch})
     ├─ dependências instaladas
     └─ commit inicial: {hash} "chore: bootstrap {projeto}"

  ✅ {repo-2}/  ...
```

---

### Passo 8: Gerar os artefatos — bifurca conforme o Passo 2

> Este é o ponto onde os dois caminhos da § Enxuto × Completo se separam. Use a escolha que o dev
> fez no Passo 2 — **não pergunte de novo**.
>
> - **Enxuto** → 8A e Passo 9 (`/spec` + `/planejar`, 1 PRD + 1 PLAN).
> - **Completo** → **8B, e o Passo 9 não roda** (o `/epic-workflow --so-planejar` já produz os PLANs).

---

#### Passo 8B: Caminho COMPLETO — delegar para `/epic-workflow --so-planejar`

**Delegar para `SKILLS/SHARED/epic-workflow.md` com a flag `--so-planejar`**
(§ `--so-planejar` daquele arquivo: roda as FASES 0-2, monta o grafo, para antes do código).

A entrada é um **pacote de features** — o recorte que o dev confirmou no Passo 2 —, não um épico
a decompor: as features já estão separadas e nomeadas. Passar como insumo, para o épico não
redescobrir o que esta conversa já resolveu:

- **As features do Passo 2** — uma linha por fluxo, cada uma entregando valor sozinha
- **Slug e map** — `MAPS/{slug}/` já existe (Passo 6), com `{slug}-context.md` já rico
- **Arquitetura e modelo de dados** — Passo 4, já no context.md
- **Integrações e NFRs** — Passo 5, já no context.md
- **Repositórios** — Passo 3.3, já criados, com commit inicial (Passo 7.7)

Numeração: os PRDs seguem a numeração regular do projeto (`000001`, `000002`, …). **Não** use o
sufixo `-mvp` aqui — ele é a convenção do caminho enxuto, e no completo não há um MVP único.

**Aviso obrigatório ao épico — o projeto está vazio.** A exploração técnica do `planejar.md`
(Passo 4) pressupõe código existente para descobrir padrões; aqui só existe o boilerplate. Diga ao
épico, explicitamente, que a fonte de verdade de arquitetura, camadas e modelo de dados é o
`{slug}-context.md` (Passos 4 e 5 desta skill) — sem isso os N arquitetos exploram um `src/` vazio
e cada um inventa um padrão diferente para a sua feature.

O `--so-planejar` é autônomo: ele não vai perguntar nada ao dev, e o que faltar vira **PREMISSA
ASSUMIDA** registrada nos PRDs. Avise antes de disparar:

```
📋 Vou planejar as {X} features de uma vez (PRD + PLAN de cada, com as dependências
   mapeadas). Isso roda sozinho e leva alguns minutos — o que faltar de informação
   vira "premissa assumida" anotada no PRD, pra você revisar depois.

   Nada é implementado. Ao final você vê o plano inteiro e decide por onde começar.
```

Ao terminar, pule o Passo 9 e vá direto ao Passo 10.

---

#### Passo 8A: Caminho ENXUTO — gerar {slug}-prd-000001-mvp

**Delegar para `SKILLS/SHARED/spec.md` em modo "MVP guiado".**

Como já temos toda a descrição do MVP do Passo 2, **alimentar o spec
diretamente** sem repassar pelos blocos de coleta:

- Feature: "MVP_000001 — Fluxo end-to-end mínimo"
- Descrição: o "momento mágico" do Passo 1
- Critérios de aceitação: derivar de cada fluxo do Passo 2 (cadastro, criar X, ver Y, etc.)
- Critérios não-funcionais: derivar do Passo 5.2 (dados sensíveis, escala, auth, disponibilidade)
- Repositório(s) afetado(s): todos os do Passo 3.3

Numeração: usar `000001` (zero-padded a 6 dígitos para indicar que é o primeiro
MVP — convenção desta skill). Os PRDs futuros (criados via `/spec`) podem
seguir a numeração regular do projeto.

Arquivo gerado: `MAPS/{slug}/prd/{slug}-prd-000001-mvp.md`

Executar o processo completo de `spec.md` (incluindo critérios de aceitação BDD,
fluxos de dados, etc.) mas evitar redundância de perguntas que já foram feitas.

---

### Passo 9: Gerar {slug}-plan-000001-mvp — **só no caminho ENXUTO**

> No caminho completo, o `--so-planejar` do Passo 8B já gerou os N PLANs. Pule para o Passo 10.

**Delegar para `SKILLS/SHARED/planejar.md`.**

- PRD base: `MAPS/{slug}/prd/{slug}-prd-000001-mvp.md` (do Passo 8A)
- Repositórios: já criados e prontos no Passo 7
- Arquitetura e modelo de dados: já definidos no Passo 4 — usar como insumo direto

Executar o processo completo de `planejar.md`:
- Passo 4 (Exploração técnica) — em projeto novo, a "exploração" é leve: a arquitetura e o modelo de dados já vêm prontos do Passo 4 desta skill; só confirma a estrutura física do boilerplate/bootstrap
- Passo 6 (Baby steps) — quebrar o MVP em etapas pequenas
- Passo 7 (Gerar arquivo) — salvar como `MAPS/{slug}/plan/{slug}-plan-000001-mvp.md`

**HARD STOP do `planejar.md` se aplica aqui também:** ao final, NÃO implementar.

---

### Passo 10: Entrega Final

O relatório muda conforme o caminho do Passo 2.

#### 10A. Caminho ENXUTO

```
🎉 Projeto "{nome}" pronto pra começar!

📁 Estrutura ai-flow:
   MAPS/{slug}/
   ├── {slug}-map.json
   ├── {slug}-context.md       (arquitetura, modelo de dados, integrações,
   │                      restrições não-funcionais e roadmap já preenchidos)
   ├── prd/{slug}-prd-000001-mvp.md
   ├── plan/{slug}-plan-000001-mvp.md
   ├── adr/
   └── ...

🏗️ Repositórios físicos:
   ✅ {repo-1-path}  ({boilerplate ou genérico}, git ✓, deps ✓)
   ✅ {repo-2-path}  ...

📋 MVP_000001 — Resumo:
   • {N} etapas no PLAN
   • Estimativa: {complexidade do PLAN}
   • Critérios: {N} cenários de aceitação

🚀 Próximo passo — escolha o ritmo:

   A) Passo a passo, você no controle de cada etapa:
      /implementar ETAPA 1

   B) De uma vez, orquestrado (PM → Arquiteto → Dev em ondas → Tech Lead):
      /feature-workflow {map.docs.plan}/{slug}-plan-000001-mvp.md
      (o PLAN já está pronto, então ele começa direto na fase de implementação)

   Num projeto novo, (A) costuma valer mais: o código ainda não tem padrão
   estabelecido pro dev replicar, e é a ETAPA 1 que cria esse padrão.

📝 Quando o MVP_000001 estiver rodando, o roadmap vira o próximo ciclo:
   • Uma feature só  → /spec + /planejar, ou /feature-workflow direto da demanda
   • Várias de uma vez → /epic-workflow com os itens do
     `## Roadmap / MVPs Futuros` do {slug}-context.md — eles já são um
     pacote de features recortado, que é exatamente a entrada dele
```

#### 10B. Caminho COMPLETO

O `--so-planejar` já emitiu o **relatório do épico** (features, ondas, premissas assumidas,
paralelismo previsto). **Não repita esses números** — some a eles o que é desta skill:

```
🎉 Projeto "{nome}" registrado e planejado por inteiro!

📁 Estrutura ai-flow:
   MAPS/{slug}/
   ├── {slug}-map.json
   ├── {slug}-context.md       (arquitetura, modelo de dados, integrações
   │                      e restrições não-funcionais já preenchidos)
   ├── epic/{épico}.md         (grafo de dependências + progresso geral)
   ├── prd/  → {X} PRDs
   ├── plan/ → {X} PLANs
   └── adr/

🏗️ Repositórios físicos:
   ✅ {repo-1-path}  ({boilerplate ou genérico}, git ✓, deps ✓)

📋 Status: 📋 Planejado — nenhuma linha de código escrita ainda.

⚠️ Antes de implementar, revise as PREMISSAS ASSUMIDAS dos PRDs.
   O planejamento rodou sozinho: onde faltou informação, ele decidiu por você
   e anotou. Corrigir uma premissa errada agora custa uma edição de PRD; depois
   do código, custa a feature inteira.

🚀 Próximo passo — escolha o ritmo:

   A) Uma feature primeiro, você vendo o padrão nascer:
      /feature-workflow {map.docs.plan}/{plan-da-primeira-feature-da-onda-1}.md
      Recomendado: o código ainda não tem padrão pro dev replicar, e é a
      primeira feature que cria esse padrão. Depois dela, (B) fica seguro.
      (Prefere etapa a etapa? /implementar ETAPA 1 desse mesmo PLAN.)

   B) O épico inteiro, em ondas paralelas:
      /epic-workflow {map.docs.epic}/{épico}.md
      (o grafo já está pronto, então ele retoma direto na implementação)
```

> **Sempre recomende (A) aqui.** Um épico full como primeiro código do projeto significa N devs em
> paralelo replicando um padrão que nenhum arquivo estabeleceu ainda — as ondas convergem para N
> dialetos diferentes, e o tech-lead reprova tudo junto no fim. A primeira feature é barata de
> revisar e é ela que vira a referência das outras.

---

## Regras

- **Reusar lógica via `SKILLS/SHARED/`.** Não duplicar processos do `setup-project`, `spec` ou `planejar` — referenciar e executar.
- **Não criar repositório remoto.** Apenas `git init` local. Push manual ou skill futura.
- **Confirmar antes de comandos pesados.** `restore`, `install`, `git init` sempre passam por confirmação.
- **MVP_000001 é uma convenção desta skill, e do caminho enxuto.** O sufixo `-mvp` só existe quando há um MVP único; no caminho completo os PRDs usam a numeração regular. PRDs/PLANs futuros também.
- **A bifurcação acontece uma vez, no Passo 2.** Registre a escolha e use-a nos Passos 8/9/10 sem perguntar de novo. Se o dev não passou do limite de tamanho, não ofereça o caminho completo.
- **Roadmap em {slug}-context.md.** Ideias que ficaram de fora do MVP_000001 viram bullets em `## Roadmap / MVPs Futuros` no `{slug}-context.md`, não PRDs vazios.
- **Propor antes de perguntar em aberto.** Nos Passos 4 e 5, a IA sempre chega com uma proposta concreta (arquitetura, entidades, integrações) baseada no que já foi dito — nunca um campo vazio. O dev corrige.
- **Modelo de dados é opcional, não pulado por padrão.** Só pular o Passo 4.2 quando o MVP genuinamente não tiver persistência (SPA client-side, sem stack de backend/DB definida no Passo 3).
- **Pular o que já foi perguntado.** Ao delegar para `setup-project`/`spec`/`planejar`, não repetir perguntas cujas respostas já foram capturadas.
- **Nunca sobrescrever sem confirmação.** Se `MAPS/{slug}/` ou path de repo já existir com conteúdo, parar e perguntar.

---

## Fluxo Resumido

```
Ideia bruta
   ↓ (Passo 1 — descoberta)
"Momento mágico"
   ↓ (Passo 2 — recorte + escolha enxuto × completo)
Lista de fluxos + caminho escolhido + roadmap futuro
   ↓ (Passo 3 — stack + boilerplate interativo)
Stack + repos definidos
   ↓ (Passo 4 — brainstorm de arquitetura + modelo de dados)
Padrão/camadas + entidades/tabelas definidos
   ↓ (Passo 5 — integrações + restrições não-funcionais + glossário)
Integrações, NFRs e termos de domínio capturados
   ↓ (Passo 6 — delega para setup-project.md)
MAPS/{slug}/ criado + .ai-project ({slug}-context.md já rico, sem placeholders)
   ↓ (Passo 7 — bootstrap físico)
Pastas locais + boilerplate + git init + deps + commit inicial
   │
   ├─ ENXUTO ─────────────────────────────┐   ├─ COMPLETO ──────────────────────────┐
   │  ↓ (Passo 8A — delega para spec.md)  │   │  ↓ (Passo 8B — delega para          │
   │  {slug}-prd-000001-mvp.md            │   │     epic-workflow.md --so-planejar) │
   │  ↓ (Passo 9 — delega p/ planejar.md) │   │  {X} PRDs + {X} PLANs + grafo       │
   │  {slug}-plan-000001-mvp.md           │   │  (Passo 9 não roda)                 │
   │  ↓ (Passo 10A — entrega)             │   │  ↓ (Passo 10B — entrega)            │
   │  "/implementar ETAPA 1"              │   │  "/feature-workflow {plan da onda 1}"│
   └──────────────────────────────────────┘   └─────────────────────────────────────┘
```
