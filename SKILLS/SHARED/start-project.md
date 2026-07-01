# Skill: Start Project (Zero ao MVP_000001 Rodando)

## Descrição

Orquestrador end-to-end para iniciar um projeto **do zero**: parte da ideia bruta,
conduz uma conversa de descoberta, recorta um MVP_000001 enxuto, faz brainstorm
de arquitetura e modelo de dados junto com o dev, registra o projeto no ai-flow,
faz o bootstrap físico (boilerplate + git) e gera o primeiro PRD e PLAN prontos
para `/implementar`.

Esta skill é um **orquestrador**: ela reusa a lógica das skills
[[setup-project]], [[spec]] e [[planejar]] (lendo seus arquivos em `SKILLS/SHARED/`)
em vez de duplicar conteúdo. Sempre que esta skill referencia "siga o processo de
`SKILLS/SHARED/X.md`", significa carregar aquele arquivo e executar seus passos
no contexto desta conversa contínua.

---

## O Que Esta Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Conduz conversa de descoberta sobre a ideia (problema, usuário, valor, stack)
- Ajuda o dev a recortar um MVP_000001 enxuto e end-to-end
- Alerta quando o MVP parece grande e oferece slicing (sem limite duro)
- Lista boilerplates disponíveis em `BOILERPLATES/BACK` e `BOILERPLATES/FRONT` e pergunta interativamente qual usar
- Cria estrutura local mínima quando nenhum boilerplate serve
- Faz brainstorm de arquitetura (padrão, camadas, trade-offs) junto com o dev, propondo um rascunho primeiro
- Deriva um modelo de dados inicial (entidades, campos, relações) a partir dos fluxos do MVP
- Levanta integrações externas e restrições não-funcionais (dados sensíveis, escala, autenticação) relevantes pro MVP
- Registra o projeto no ai-flow invocando o processo de `SKILLS/SHARED/setup-project.md`
- Faz `git init` no(s) repositório(s) local(is) (com confirmação)
- Roda `restore/install` da stack escolhida (com confirmação)
- Gera o PRD_000001_MVP invocando o processo de `SKILLS/SHARED/spec.md`
- Gera o PLAN_000001_MVP invocando o processo de `SKILLS/SHARED/planejar.md`
- Entrega o projeto pronto para `/implementar ETAPA 1`

### ❌ NÃO FAZ:
- ❌ Implementar código da feature → use `/implementar`
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
  8. PRD e PLAN do MVP_000001

É de propósito mais devagar que um formulário rápido — o objetivo é sair
com arquitetura, dados e integrações bem pensados, pra não virar retrabalho
lá na frente.

Ao final, você roda /implementar ETAPA 1 e vê a v0.1 funcionando.
Vamos?
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

- Se > 5 fluxos OU envolve integrações externas complexas: alertar:

```
⚠️ Esse MVP parece grande pro 000001 (estimo X dias de implementação).

Sugestões pra fatiar:
  Opção A) MVP_000001 = só [fluxo 1 + 2]; o resto vira MVP_000002
  Opção B) Manter como está — você decide
  Opção C) Outro recorte que você prefira

Como prefere seguir?
```

Sem limite duro — se o dev escolher "manter como está", seguir adiante.

**Capturar ideias futuras:**

Tudo que o dev mencionou e ficou de fora deve ser anotado para virar `MVP_000002+`
como nota em `context.md` (seção "Roadmap / MVPs Futuros") no Passo 6.

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
em `context.md`: "Sem persistência — estado vive no cliente."

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
- Nomear entidades e campos em inglês (convenção do map.json/código), mas discutir em português.
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

Capturar as respostas — elas viram a seção de restrições do `context.md` e
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
`MAPS/{slug}/`, `map.json`, `context.md`, pastas `prd/plan/adr`, `.ai-project`).

**Acréscimo ao context.md gerado:**

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

> Capturado durante /start-project. Cada item pode virar um PRD/PLAN futuro.

- MVP_000002: [descrição do que ficou de fora 1]
- MVP_000003: [descrição do que ficou de fora 2]
```

Nenhuma seção do `context.md` deve sobrar como "A preencher" ao final deste
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

Se sim: `git init` + criar commit inicial vazio? Padrão: NÃO criar commit
automático — o `/implementar` vai gerar o primeiro commit com conteúdo real
na ETAPA 1.

#### 7.6. Restore/Install (confirmação)

Detectar tipo do projeto pelos arquivos do boilerplate (ou ausência) e perguntar:

```
📦 Quer que eu rode {comando} pra instalar dependências agora? (s/n)
  • dotnet: dotnet restore
  • node: npm install / yarn install / pnpm install (perguntar qual)
  • python: pip install -r requirements.txt
```

Se o boilerplate não tiver manifestos, pular este passo.

#### 7.7. Reportar resultado do bootstrap

```
🏗️ Bootstrap concluído:

  ✅ {repo-1}/  ({boilerplate ou genérico})
     ├─ git inicializado
     └─ dependências instaladas

  ✅ {repo-2}/  ...
```

---

### Passo 8: Gerar PRD_000001_MVP

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

Arquivo gerado: `MAPS/{slug}/prd/PRD_000001_MVP.md`

Executar o processo completo de `spec.md` (incluindo critérios de aceitação BDD,
fluxos de dados, etc.) mas evitar redundância de perguntas que já foram feitas.

---

### Passo 9: Gerar PLAN_000001_MVP

**Delegar para `SKILLS/SHARED/planejar.md`.**

- PRD base: `MAPS/{slug}/prd/PRD_000001_MVP.md` (do Passo 8)
- Repositórios: já criados e prontos no Passo 7
- Arquitetura e modelo de dados: já definidos no Passo 4 — usar como insumo direto

Executar o processo completo de `planejar.md`:
- Passo 4 (Exploração técnica) — em projeto novo, a "exploração" é leve: a arquitetura e o modelo de dados já vêm prontos do Passo 4 desta skill; só confirma a estrutura física do boilerplate/bootstrap
- Passo 6 (Baby steps) — quebrar o MVP em etapas pequenas
- Passo 7 (Gerar arquivo) — salvar como `MAPS/{slug}/plan/PLAN_000001_MVP.md`

**HARD STOP do `planejar.md` se aplica aqui também:** ao final, NÃO implementar.

---

### Passo 10: Entrega Final

```
🎉 Projeto "{nome}" pronto pra começar!

📁 Estrutura ai-flow:
   MAPS/{slug}/
   ├── map.json
   ├── context.md       (arquitetura, modelo de dados, integrações,
   │                      restrições não-funcionais e roadmap já preenchidos)
   ├── prd/PRD_000001_MVP.md
   ├── plan/PLAN_000001_MVP.md
   ├── adr/
   └── ...

🏗️ Repositórios físicos:
   ✅ {repo-1-path}  ({boilerplate ou genérico}, git ✓, deps ✓)
   ✅ {repo-2-path}  ...

📋 MVP_000001 — Resumo:
   • {N} etapas no PLAN
   • Estimativa: {complexidade do PLAN}
   • Critérios: {N} cenários de aceitação

🚀 Próximo passo:
   /implementar ETAPA 1

📝 Quando o MVP_000001 estiver rodando:
   • Use /spec pra criar o PRD do próximo incremento (MVP_000002 já está em context.md)
   • Use /planejar pra gerar o PLAN
```

---

## Regras

- **Reusar lógica via `SKILLS/SHARED/`.** Não duplicar processos do `setup-project`, `spec` ou `planejar` — referenciar e executar.
- **Não criar repositório remoto.** Apenas `git init` local. Push manual ou skill futura.
- **Confirmar antes de comandos pesados.** `restore`, `install`, `git init` sempre passam por confirmação.
- **MVP_000001 é uma convenção desta skill.** Numeração `000001` zero-padded é exclusiva do MVP inicial; PRDs/PLANs futuros usam a numeração regular do projeto (`001`, `002`...).
- **Roadmap em context.md.** Ideias que ficaram de fora do MVP_000001 viram bullets em `## Roadmap / MVPs Futuros` no `context.md`, não PRDs vazios.
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
   ↓ (Passo 2 — recorte do MVP_000001 + alerta de tamanho)
Lista de fluxos mínimos + roadmap futuro
   ↓ (Passo 3 — stack + boilerplate interativo)
Stack + repos definidos
   ↓ (Passo 4 — brainstorm de arquitetura + modelo de dados)
Padrão/camadas + entidades/tabelas definidos
   ↓ (Passo 5 — integrações + restrições não-funcionais + glossário)
Integrações, NFRs e termos de domínio capturados
   ↓ (Passo 6 — delega para setup-project.md)
MAPS/{slug}/ criado + .ai-project (context.md já rico, sem placeholders)
   ↓ (Passo 7 — bootstrap físico)
Pastas locais + boilerplate + git init + deps
   ↓ (Passo 8 — delega para spec.md)
PRD_000001_MVP.md
   ↓ (Passo 9 — delega para planejar.md)
PLAN_000001_MVP.md
   ↓ (Passo 10 — entrega)
"/implementar ETAPA 1"
```
