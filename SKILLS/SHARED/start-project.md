# Skill: Start Project (Zero ao MVP_000001 Rodando)

## Descrição

Orquestrador end-to-end para iniciar um projeto **do zero**: parte da ideia bruta,
conduz uma conversa de descoberta, recorta um MVP_000001 enxuto, registra o projeto
no ai-flow, faz o bootstrap físico (boilerplate + git) e gera o primeiro PRD e PLAN
prontos para `/implementar`.

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

---

## Princípios

1. **Conversacional, não rígido.** Os blocos são pontos de checagem, não um questionário fechado. Se o dev divagar, capture o que veio e siga.
2. **Reusar, não duplicar.** Sempre que possível, delegar para a lógica das skills existentes via `SKILLS/SHARED/{skill}.md`.
3. **MVP enxuto por design.** Empurrar o dev a cortar pequeno. Se a ideia for grande, oferecer slicing (MVP_000001 menor + MVP_000002+ como notas).
4. **Boilerplate opcional.** Se nenhum servir, segue genérico — não é bloqueio.
5. **Confirmação antes de ações irreversíveis.** `git init`, `npm install`, `dotnet restore` — sempre perguntar antes.

---

## Processo

### Passo 0: Apresentação

Exibir ao dev:

```
🚀 Start Project — do zero ao MVP_000001 rodando

Vou te guiar do "tenho uma ideia" até um PLAN pronto pra implementar.
A conversa tem 6 etapas:

  1. Descoberta da ideia
  2. Recorte do MVP_000001
  3. Stack e boilerplate
  4. Registro no ai-flow (cria MAPS/{slug}/)
  5. Bootstrap físico (cria pasta local, git init)
  6. PRD e PLAN do MVP_000001

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
como nota em `context.md` (seção "Roadmap / MVPs Futuros") no Passo 5.

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

### Passo 4: Registro no ai-flow

**Delegar para `SKILLS/SHARED/setup-project.md`.**

Como já temos as respostas do Passo 1 e 3, **pular os blocos perguntados** do
`setup-project` quando a informação já estiver disponível. Os blocos do
`setup-project` mapeiam assim:

| Bloco do setup-project | Origem nesta skill |
|------------------------|--------------------|
| Bloco 1 (Projeto) | Passo 1 (ideia, descrição) — perguntar apenas: team, status |
| Bloco 2 (Stack) | Passo 3.1 (já temos) |
| Bloco 3 (Arquitetura) | Perguntar agora, ou deixar vazio para preencher depois |
| Bloco 4 (Repositórios) | Passo 3.3 (já temos) |
| Bloco 5 (Tooling) | Perguntar agora — type/workitems/repos |
| Bloco 6 (Contexto) | Preencher automaticamente com o que veio do Passo 1-2 |

Confirmar resumo e executar o Passo 8 do `setup-project.md` (criar
`MAPS/{slug}/`, `map.json`, `context.md`, pastas `prd/plan/adr`, `.ai-project`).

**Acréscimo ao context.md gerado:**

Adicionar uma seção `## Roadmap / MVPs Futuros` com as ideias que ficaram de
fora no Passo 2:

```markdown
## Roadmap / MVPs Futuros

> Capturado durante /start-project. Cada item pode virar um PRD/PLAN futuro.

- MVP_000002: [descrição do que ficou de fora 1]
- MVP_000003: [descrição do que ficou de fora 2]
```

---

### Passo 5: Bootstrap Físico

Para cada repositório definido no Passo 3.3:

#### 5.1. Verificar se o path local já existe

Se já existe e **não está vazio**: avisar e perguntar:
```
⚠️ {path} já existe e tem conteúdo.

  Opção A) Pular este repo (você cuida do bootstrap manualmente)
  Opção B) Usar mesmo assim (eu vou apenas criar .ai-project e seguir)
  Opção C) Cancelar /start-project

Como prefere?
```

#### 5.2. Criar a pasta (se não existir)

#### 5.3. Aplicar boilerplate (se escolhido)

- Copiar **recursivamente** o conteúdo de `BOILERPLATES/{BACK|FRONT}/{nome}/`
  para o path local do repo.
- Substituir placeholders comuns se houver (ex: `{{PROJECT_NAME}}` → nome do projeto).

#### 5.4. Estrutura genérica (se nenhum boilerplate)

Criar:
```
{repo-path}/
  README.md          (com nome do projeto + descrição da ideia do Passo 1)
  .gitignore         (genérico — node_modules, bin, obj, .env)
  src/               (pasta vazia com .gitkeep)
```

#### 5.5. `git init`

Perguntar antes:
```
🔧 Inicializar git em {repo-path}? (s/n)
```

Se sim: `git init` + criar commit inicial vazio? Padrão: NÃO criar commit
automático — o `/implementar` vai gerar o primeiro commit com conteúdo real
na ETAPA 1.

#### 5.6. Restore/Install (confirmação)

Detectar tipo do projeto pelos arquivos do boilerplate (ou ausência) e perguntar:

```
📦 Quer que eu rode {comando} pra instalar dependências agora? (s/n)
  • dotnet: dotnet restore
  • node: npm install / yarn install / pnpm install (perguntar qual)
  • python: pip install -r requirements.txt
```

Se o boilerplate não tiver manifestos, pular este passo.

#### 5.7. Reportar resultado do bootstrap

```
🏗️ Bootstrap concluído:

  ✅ {repo-1}/  ({boilerplate ou genérico})
     ├─ git inicializado
     └─ dependências instaladas

  ✅ {repo-2}/  ...
```

---

### Passo 6: Gerar PRD_000001_MVP

**Delegar para `SKILLS/SHARED/spec.md` em modo "MVP guiado".**

Como já temos toda a descrição do MVP do Passo 2, **alimentar o spec
diretamente** sem repassar pelos blocos de coleta:

- Feature: "MVP_000001 — Fluxo end-to-end mínimo"
- Descrição: o "momento mágico" do Passo 1
- Critérios de aceitação: derivar de cada fluxo do Passo 2 (cadastro, criar X, ver Y, etc.)
- Repositório(s) afetado(s): todos os do Passo 3.3

Numeração: usar `000001` (zero-padded a 6 dígitos para indicar que é o primeiro
MVP — convenção desta skill). Os PRDs futuros (criados via `/spec`) podem
seguir a numeração regular do projeto.

Arquivo gerado: `MAPS/{slug}/prd/PRD_000001_MVP.md`

Executar o processo completo de `spec.md` (incluindo critérios de aceitação BDD,
fluxos de dados, etc.) mas evitar redundância de perguntas que já foram feitas.

---

### Passo 7: Gerar PLAN_000001_MVP

**Delegar para `SKILLS/SHARED/planejar.md`.**

- PRD base: `MAPS/{slug}/prd/PRD_000001_MVP.md` (do Passo 6)
- Repositórios: já criados e prontos no Passo 5

Executar o processo completo de `planejar.md`:
- Passo 4 (Exploração técnica) — em projeto novo, a "exploração" é leve: apenas confirma a estrutura do boilerplate
- Passo 6 (Baby steps) — quebrar o MVP em etapas pequenas
- Passo 7 (Gerar arquivo) — salvar como `MAPS/{slug}/plan/PLAN_000001_MVP.md`

**HARD STOP do `planejar.md` se aplica aqui também:** ao final, NÃO implementar.

---

### Passo 8: Entrega Final

```
🎉 Projeto "{nome}" pronto pra começar!

📁 Estrutura ai-flow:
   MAPS/{slug}/
   ├── map.json
   ├── context.md       (com roadmap dos MVPs futuros)
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
   ↓ (Passo 4 — delega para setup-project.md)
MAPS/{slug}/ criado + .ai-project
   ↓ (Passo 5 — bootstrap físico)
Pastas locais + boilerplate + git init + deps
   ↓ (Passo 6 — delega para spec.md)
PRD_000001_MVP.md
   ↓ (Passo 7 — delega para planejar.md)
PLAN_000001_MVP.md
   ↓ (Passo 8 — entrega)
"/implementar ETAPA 1"
```
