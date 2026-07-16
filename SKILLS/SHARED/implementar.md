# Skill: Implementar (Executar Etapa do Plano)

## Descrição
Implementa uma etapa específica do plano de execução (baby step).
Verifica dependências, prepara ambiente, analisa código existente, implementa seguindo
os padrões do projeto, roda build e testes, faz commit e atualiza o PLAN.

---

## Modo Orquestrado (invocado pelo `/feature-workflow`)

Quando o prompt de invocação indicar **modo orquestrado**, o processo abaixo muda nestes pontos
(o restante segue igual):

1. **Zero perguntas/confirmações.** PLAN, ETAPA, branch e branch base vêm no prompt — não pedir
   nem confirmar nada (pula as confirmações dos Passos 2.4, 3.3, 5.1 e 7). Se faltar informação
   essencial, **retorne ao orquestrador** informando o que falta, em vez de perguntar.
2. **Branch e worktree dados — não os crie.** A branch (possivelmente **efêmera de etapa**, ex.:
   `feature/x--etapa-3`) e o worktree dela **já foram preparados pelo orquestrador** (ver
   `feature-workflow.md` § 3.2); ambos vêm no prompt. **Pule a criação no Passo 3** e vá direto
   trabalhar em `{worktree.path}`.
   **Por quê:** quem monta a onda é quem sabe quais etapas rodam em paralelo — a topologia é do
   nível dele, não do seu. Dois devs criando worktree ao mesmo tempo no mesmo repo é colisão
   desnecessária. Se o worktree informado **não existir**, isso é anomalia: **retorne ao
   orquestrador** em vez de criá-lo.
3. **Não atualizar o PLAN** quando o orquestrador indicar que ele consolida (execução paralela —
   dois devs não podem editar o mesmo arquivo). Pule o Passo 8 e devolva as **Observações da
   Implementação** no resumo final.
4. **Resumo estruturado no retorno:** arquivos alterados, resultado de build/testes, hash do
   commit, branch usada e Observações da Implementação (Nota de Handoff).
5. **Working tree sujo** (Passo 3.5) num worktree efêmero recém-criado é anomalia: não pergunte —
   retorne ao orquestrador como bloqueio.

---

## Processo

### Passo 0: Carregar Contexto do Projeto

**0.1. Identificar projeto ativo**

Verificar se existe `.ai-project` na raiz do repositório atual:
- Se existir: ler o caminho do map (ex: `MAPS/project`)
- Se não existir: perguntar ao dev `Qual projeto estamos trabalhando? (ex: projeto-1, projeto-2)`

**0.2. Ler `{slug}-map.json`**

Carregar `{AI_FLOW_ROOT}/{map-path}/{slug}-map.json` e extrair:
- `repositories`: paths locais, URLs, branches e contexts
- `docs.plan`: caminho onde os PLANs estão salvos

**0.3. Carregar documentação do projeto**

**Ler SEMPRE, primeiro:**
- `{AI_FLOW_ROOT}/{map-path}/{slug}-context.md` — **é a fonte principal**: arquitetura, padrões de
  código, estrutura de pastas e, sobretudo, a seção **`## Comandos`** (`### Build`, `### Testes`) —
  é de lá que saem os comandos que você vai rodar nos Passos 5.4 e 5.5.

**Depois**, usar Glob para listar e ler **todos** os arquivos `.md` de:
- `{AI_FLOW_ROOT}/{map-path}/docs/architecture/` — aprofundamento por tema, **quando existir**

Ler cada arquivo encontrado antes de escrever qualquer linha de código. Não pular nenhum.

> 🔴 **`docs/architecture/` é opcional e na maioria dos projetos está vazio.** O `{slug}-context.md`
> é obrigatório em todo map (ver `CONVENTIONS.md` § Maps) — nunca o pule esperando achar a mesma
> informação em `docs/`. Onde os dois falarem do mesmo assunto, **`docs/architecture/` é o mais
> específico e vence**; onde só o context.md falar, ele é a verdade.
>
> **Sem comando de build você não conclui a etapa.** Não achou nem no context.md nem em `docs/`:
> em modo interativo, **pergunte ao dev**; em modo orquestrado, **retorne ao orquestrador** — não
> adivinhe o comando nem pule o build.

---

### Passo 1: Solicitar PLAN e ETAPA

**OBRIGATÓRIO:** Dev precisa informar o PLAN e a ETAPA.

```
🚀 Vou implementar uma etapa do plano.

🔴 OBRIGATÓRIO: Informe o PLAN e a ETAPA:

Formato:
/implementar {map.docs.plan}/{slug}-plan-001-nome-da-feature.md ETAPA 1

Ou apenas:
/implementar ETAPA 1
(se o PLAN já foi mencionado nesta conversa)
```

Se não informado:
```
❌ PLAN ou ETAPA não informados.

Por favor, use:
/implementar {map.docs.plan}/{slug}-plan-001-nome.md ETAPA 1
```

---

### Passo 2: Ler e Validar PLAN

**2.1.** Verificar se o arquivo existe. Se não existir, informar e sugerir `/planejar`.

**2.2. Extrair da ETAPA:**
- Número e objetivo da etapa
- Repositório(s) afetado(s)
- Arquivos a criar ou modificar (com caminhos completos)
- O que implementar (descrição técnica)
- Testes necessários (com nomes no padrão definido em `docs/architecture/`)
- Critérios de aceitação
- Dependências de outras etapas

**2.3. Verificar dependências:**

```
🔍 Verificando dependências da ETAPA N...

- ETAPA 1: ✅ Concluída
- ETAPA 2: ✅ Concluída

✅ Todas as dependências atendidas. Pode prosseguir!
```

Se dependências não atendidas:
```
⚠️ ETAPA N depende de:
- ETAPA 1: ❌ Pendente

Implemente as etapas anteriores primeiro.
Use: /implementar ETAPA 1
```

**2.4. Apresentar resumo e confirmar:**
```
✅ PLAN Carregado: {slug}-plan-001-nome-da-feature

📋 ETAPA N: [Nome da etapa]

Resumo:
- Status Atual: ⏳ Pendente
- Objetivo: [objetivo]
- Repositório(s): [repos]
- Arquivos: X
- Testes: Y
- Dependências: Nenhuma / ETAPA X

Prosseguir com implementação?
```

---

### Passo 3: Preparar Ambiente (Git Worktree — OBRIGATÓRIO)

**Por quê:** duas sessões de orquestrador podem estar ativas no mesmo projeto ao mesmo tempo (duas
rodadas de `/feature-workflow`, ou este `/implementar` rodando enquanto um `/test-e2e` testa outra
branch). Se ambas fizerem `git checkout` no mesmo diretório, uma pisa no working tree da outra.
**Cada branch trabalhada vive em seu próprio `git worktree` — nunca no clone principal.** Ver
`CONVENTIONS.md` § Git Worktree para a regra completa.

**3.1. Identificar repositório**

Cruzar o(s) repositório(s) do PLAN com `map.repositories` para obter `path` e, se definido,
`worktrees-path` (senão usar o padrão `{path}-worktrees/`).

**3.2. Atualizar o clone principal (fetch apenas — nunca checkout aqui)**

```bash
# Só se houver remote — projeto recém-criado pelo /start-project não tem
git -C {repo.path} remote get-url origin >/dev/null 2>&1 && git -C {repo.path} fetch origin
```

> **`git fetch origin` num repo sem remote falha** (`'origin' does not appear to be a git
> repository`). O `/start-project` faz `git init` local e **não cria repositório remoto** — então
> nem todo projeto tem `origin`. Ausência de remote **não é erro**: siga com a base local.

**3.3. Definir branch**

```
🌿 Qual branch usar?

1. Usar branch existente (já criou para esta feature?)
2. Criar nova branch

Informe o nome: (ex: feature/nome-da-feature)
```

**3.4. Criar ou reutilizar o worktree**

Calcular `{worktree.path} = {worktrees-path}/{branch-slug}` (branch com `/` trocado por `-`).

```bash
# Já existe um worktree para esta branch (retomando trabalho)?
git -C {repo.path} worktree list

# Se não existe — branch já existe localmente:
git -C {repo.path} worktree add "{worktree.path}" {branch}

# Se não existe — branch só existe no remoto:
git -C {repo.path} worktree add "{worktree.path}" -b {branch} origin/{branch}

# Se não existe — branch NOVA, projeto COM remote: a partir de origin/{repo.branch}
git -C {repo.path} worktree add "{worktree.path}" -b {branch} origin/{repo.branch}

# Se não existe — branch NOVA, projeto SEM remote (ex.: recém-criado): base local
git -C {repo.path} worktree add "{worktree.path}" -b {branch} {repo.branch}
```

> 🔴 **O start-point da branch nova é obrigatório — nunca omita.**
> `worktree add -b {branch}` **sem** start-point sai do **HEAD do clone principal**, que é a branch
> que por acaso estiver com checkout lá: uma `develop` desatualizada, uma feature de outra pessoa,
> um HEAD detached. É silencioso e a feature inteira nasce da base errada. Pior: num repo **sem
> nenhum commit** o Git infere `--orphan` e cria um worktree **sem história** — também em silêncio.
>
> Escolha o start-point pelo que o repo tem:
> - **com remote** → `origin/{repo.branch}`, sempre. O `fetch` do 3.2 acabou de atualizá-lo, e é
>   assim que "partir de código atualizado" acontece **sem** `checkout`/`pull` no clone principal;
> - **sem remote** (`/start-project` faz `git init` local, sem criar repo remoto) →
>   `{repo.branch}` local, que é a única base que existe.
>
> ⚠️ **Repo sem nenhum commit → PARE.** `worktree add` não tem de onde partir. Isso significa que o
> bootstrap não terminou: o `/start-project` (Passo 7.7) deve ter deixado um commit inicial. Avise
> o dev em vez de criar worktree órfão.

**Se o Git recusar** com `branch already checked out at ...`: a branch já está em uso por **outro
worktree/orquestrador rodando agora**. Não force — informe ao dev:
```
⚠️ A branch "{branch}" já está em uso em outro worktree ({path indicado pelo Git}).
Provavelmente outra sessão de /implementar ou /feature-workflow está trabalhando nela agora.

Escolha outra branch ou aguarde a outra sessão terminar.
```

**A partir daqui, todas as operações rodam dentro de `{worktree.path}` — nunca mais em `{repo.path}`.**

**3.5. Verificar working tree**

```bash
cd {worktree.path}
git status --porcelain
```

Se houver arquivos alterados não commitados:
```
⚠️ Existem alterações não commitadas!

Arquivos alterados:
[lista]

Opções:
1. Commit — commitar o que está pendente
2. Stash — salvar temporariamente (git stash)
3. Continuar assim mesmo (não recomendado)

Qual opção?
```

Aguardar resposta e executar a ação escolhida.

**3.6. Confirmar ambiente:**
```
✅ Ambiente Preparado!

📁 Worktree: {worktree.path}
🌿 Branch: {branch}
📊 Status: working tree clean

Pronto para implementar ETAPA N!
```

---

### Passo 4: Análise do Código Existente

**IMPORTANTE:** Ler código antes de escrever. A IA deve replicar o estilo e os padrões já existentes no projeto.

**4.1. Reler padrões obrigatórios**

Consultar as seções de `docs/architecture/` relevantes para o tipo de mudança desta etapa:
- Se criar/modificar lógica de negócio → `docs/architecture/`
- Se criar testes → `docs/architecture/`
- Se criar/modificar UI → `docs/architecture/`

**4.2. Encontrar e ler código similar**

Buscar arquivos do mesmo tipo e domínio para entender o padrão exato adotado no projeto:

```bash
# Adaptar o padrão de busca conforme a stack (docs/architecture/)
# Exemplos genéricos — sempre dentro do worktree, nunca do clone principal:
find {worktree.path} -name "*{Tipo}*" -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/.git/*"
```

**Ler os arquivos encontrados** para entender:
- Como o tipo de arquivo em questão é estruturado no projeto
- Convenções de nomenclatura reais (não apenas as documentadas)
- Como as dependências são injetadas
- Como erros são tratados
- Como os testes são estruturados

**4.3. Verificar estrutura de arquivos**

Consultar `docs/architecture/` para confirmar onde colocar cada arquivo novo.

---

### Passo 5: Implementar Step-by-Step

**5.1. Explicar o que será feito**

```
💡 Vou implementar esta etapa nos seguintes passos:

1. Ler arquivo(s) atual(is)
2. Implementar as mudanças descritas no PLAN
3. Criar testes (padrão: docs/architecture/)
4. Rodar build
5. Rodar testes
6. Code review interno
7. Commit
8. Atualizar PLAN

Tudo certo para começar?
```

**5.2. Implementar código**

- Usar `Read` para ler arquivos antes de editar — **nunca editar sem ler antes**
- Usar `Edit` para modificações pontuais em arquivos existentes
- Usar `Write` apenas para arquivos novos
- Seguir **rigorosamente** os padrões lidos em `docs/architecture/` / `#padroes-frontend`
- Implementar exatamente o que está descrito no PLAN — sem adicionar complexidade não solicitada

**5.3. Criar testes**

Seguir a convenção de nomenclatura de `docs/architecture/`.
Usar os frameworks definidos em `docs/architecture/`.
Estrutura padrão: Arrange / Act / Assert.

**5.4. Rodar build**

Usar o comando de build de `docs/architecture/`:

```
✅ Build succeeded — 0 erros, 0 warnings
```

Se falhar:
```
❌ Build failed!

Erros:
[arquivo:linha — descrição do erro]

Corrigindo...
```

Analisar, corrigir e rodar novamente. Se não conseguir corrigir, explicar ao dev e pedir orientação.

**5.5. Rodar testes**

Usar os comandos de teste de `docs/architecture/`:

```
✅ Tests: X/X passed — 0 failed
```

Se falhar:
```
❌ Tests failed!

Testes com falha:
- [NomeDoTeste]: [mensagem de erro]

Analisando causa...
```

Corrigir se for óbvio (erro no teste ou no código implementado). Se não for possível, pedir orientação.

**5.6. Mostrar resultado ao dev**

```
✅ Implementação concluída!

Arquivos alterados:
1. {path}/{Arquivo} — [descrição do que foi feito]
2. {path}/{ArquivoDeTeste} — X testes criados:
   ✅ [NomeDoTeste1]
   ✅ [NomeDoTeste2]

Resultados:
✅ Build: Success
✅ Testes: X/X passed

Quer ver o diff? (git diff)
```

---

### Passo 6: Code Review Interno

Antes do commit, verificar os itens críticos dos padrões do projeto:

```
🔍 Code Review Interno

[Baseado em docs/architecture/]

✅ Padrão de estrutura de arquivos seguido?
✅ Convenções de nomenclatura seguidas?
✅ Tratamento de erros conforme o padrão do projeto?
✅ Sem anti-patterns listados em docs/architecture/?
✅ Async/await correto (se aplicável)?
✅ Autorização configurada (se aplicável)?
✅ Testes: convenção de nomenclatura correta?
✅ Build: sem erros?
✅ Testes: todos passando?

[Resultado: sem issues críticos / Issues encontrados: ...]
```

Se encontrar issues críticos, corrigir antes de prosseguir.

---

### Passo 7: Commit

```
💾 Pronto para commitar a ETAPA N?

Mensagem sugerida:
"feat: [descrição curta no imperativo]

- [detalhe 1]
- [detalhe 2]
- [testes criados]

Refs: ETAPA N — {slug}-plan-NNN-nome-da-feature"

Confirmar commit? (s/n)
```

Se confirmado:

```bash
cd {worktree.path}

# Adicionar apenas arquivos desta etapa — nunca git add -A sem verificar
git add {arquivo1} {arquivo2} {arquivoDeTeste}

git commit -m "feat: [descrição curta]

- [detalhe 1]
- [detalhe 2]

Refs: ETAPA N — {slug}-plan-NNN-nome-da-feature"

git status
```

---

### Passo 8: Atualizar PLAN

Editar `{map.docs.plan}/{slug}-plan-NNN-nome-da-feature.md`:

**Marcar etapa como concluída:**
```markdown
### ETAPA N: [Nome da etapa]

**Status:** ✅ Concluída
**Data de Conclusão:** YYYY-MM-DD
**Commit:** [hash curto]

**Observações da Implementação:** *(Nota de Handoff para o Tech Lead)*
- [O que foi implementado]
- [Decisões tomadas]
- [Testes criados e passando]
- [Dúvidas em aberto / o que o Tech Lead precisa saber]
```

**Atualizar progresso geral:**
```markdown
## PROGRESSO GERAL

**Status**: 🟡 Em Progresso
**Progresso**: N/Total etapas concluídas (X%)

[🟢🟢⚪⚪⚪] X%
```

---

### Passo 9: Relatório Final e Próximos Passos

```
🎉 ETAPA N Concluída com Sucesso!

Arquivos Alterados:
✅ {arquivo1} (+X linhas)
✅ {arquivo2} (+Y linhas)

Testes: X/X passando
✅ [NomeDoTeste1]
✅ [NomeDoTeste2]

Qualidade:
✅ Build sem erros
✅ Code review interno: sem issues críticos
✅ Padrões do projeto seguidos

Git:
✅ Commit: [hash]
✅ Branch: {branch}
✅ Status: clean

PLAN Atualizado:
✅ ETAPA N marcada como concluída
✅ Progresso: N/Total (X%)

[🟢🟢⚪⚪⚪] X%

Próximas etapas pendentes:
⏳ ETAPA N+1: [nome]
⏳ ETAPA N+2: [nome]

---

❓ O que quer fazer agora?

1. Continuar → /implementar ETAPA N+1
2. Push intermediário → git push origin {branch}
3. Code review completo → /code-review
4. Parar por aqui — progresso salvo no PLAN
```

---

## Tratamento de Erros

**Build falhou:**
- Analisar erro e corrigir automaticamente se for óbvio (sintaxe, import faltando, etc.)
- Se não conseguir corrigir, explicar claramente ao dev e pedir orientação
- Nunca commitar com build quebrado

**Testes falharam:**
- Mostrar quais testes falharam com a mensagem de erro completa
- Determinar se é bug no código implementado ou no próprio teste
- Corrigir e rodar novamente
- Se não for possível resolver, pedir orientação

**Conflito git:**
- Informar ao dev com detalhes do conflito
- **Nunca tentar resolver conflitos automaticamente**
- Pedir para o dev resolver manualmente

---

## O Que Este Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Carrega contexto via `{slug}-map.json` e `docs/architecture/` antes de escrever código
- Lê PLAN e verifica dependências entre etapas
- Cria ou reutiliza um **git worktree isolado por branch** (nunca checkout no clone principal —
  evita colidir com outro orquestrador trabalhando no mesmo projeto)
- Verifica working tree antes de implementar
- Lê código similar existente para replicar o estilo do projeto
- Implementa exatamente o que está no PLAN, seguindo `docs/architecture/`
- Cria testes conforme `docs/architecture/`
- Roda build e testes — corrige automaticamente se possível
- Faz code review interno baseado nos padrões do projeto
- Commita com arquivos específicos (nunca `git add -A` sem verificar)
- Atualiza PLAN marcando etapa como concluída com progresso visual

### ❌ NÃO FAZ:
- ❌ Push automático — dev decide quando
- ❌ Múltiplas etapas de uma vez
- ❌ Pular dependências entre etapas
- ❌ Fazer merge de branches
- ❌ Resolver conflitos git automaticamente
- ❌ Adicionar código além do que está especificado no PLAN
