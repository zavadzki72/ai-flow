# Skill: Test E2E

## Descrição
Sobe o ambiente completo do projeto localmente (Docker, nativo ou híbrido, conforme
`environments.local.mode` do projeto), simula um usuário humano navegando pela feature recém-
implementada via automação de browser, valida os critérios de aceitação do PRD e os fluxos
adjacentes que podem ter sido impactados, e gera um relatório estruturado com evidências
(screenshots) de tudo que foi testado.

---

## Pré-requisito

Esta skill depende de um **MCP de automação de browser** (ex: Playwright MCP) configurado no
cliente de IA. Se as ferramentas correspondentes não estiverem disponíveis, informar o dev e
interromper **antes** de subir qualquer ambiente (Passo 0.4).

---

## Processo

### Passo 0: Carregar Contexto do Projeto

**0.1. Identificar projeto ativo**

Verificar se existe `.ai-project` na raiz do repositório atual:
- Se existir: ler o caminho do map (ex: `MAPS/project`)
- Se não existir: perguntar ao dev `Qual projeto estamos trabalhando? (ex: projeto-1, projeto-2)`

**0.2. Ler `{slug}-map.json`**

Extrair:
- `repositories`: paths locais e branches
- `environments.local`: como subir o ambiente (compose, serviços, healthchecks, seed, usuários de teste)
- `docs.prd`, `docs.plan` e `docs.e2e`: caminhos dos documentos

**0.3. Carregar documentação do projeto**

Liste e leia **todos** os arquivos `.md` de:
- `{AI_FLOW_ROOT}/{map-path}/docs/architecture/` — rotas, telas e fluxos principais da aplicação
- `{slug}-context.md`, seção `## Ambiente Local E2E` (ou `## Comandos`, se a seção dedicada não existir) — como o dev sobe o projeto manualmente

**0.4. Verificar pré-requisitos (configure-and-run)**

- `map.environments.local` está preenchido? **Se não, configure-o você mesmo — não pare.** Derive
  `mode`/`compose-path`/`processes`/`services`/`seed`/`test-users` a partir do `README`, do
  `{slug}-context.md` (§ Comandos / § Ambiente Local E2E) e da inspeção do repo (compose files,
  portas, scripts de dev), tomando o `MAPS/_template/map.json` como forma. **Persista** o bloco no
  `{slug}-map.json` (para os próximos ciclos não reconfigurarem) e registre em `adr/`
  "environments.local inferido — {resumo}".
  - **App sem login programável** (ex.: OAuth social sem senha): a automação não passa da tela do
    provedor. Os cenários que dependem de sessão usam **injeção de sessão** — fixtures no storage do
    app (localStorage/cookie), uma por papel/estado, declaradas nos `test-users` como fixtures em vez
    de `password-env`. Suba **apenas** os serviços necessários aos cenários (não suba LLM/infra pesada
    para validar navegação/UI).
  - Parar aqui **só** faz sentido se o repo não der nenhuma pista de como subir (sem README, sem
    compose, sem script de dev) — aí sim reporte que não há como inferir o ambiente.
- As ferramentas de automação de browser (Playwright MCP / equivalente) estão disponíveis nesta
  sessão? Se **não**, informar e parar — **sem** subir containers à toa. Este é o único pré-requisito
  realmente bloqueante (sem browser não há E2E).

**0.5. Resolver Worktree da Branch (OBRIGATÓRIO)**

Mesma regra do `/implementar` (ver `CONVENTIONS.md` § Git Worktree): o teste E2E precisa do código
real da branch no disco para subir o ambiente, então **nunca roda contra o clone principal**
(`repositories.{repo}.path`) — sempre contra um `git worktree` dedicado à branch.

```bash
# Já existe um worktree para esta branch (ex.: criado pelo /implementar)?
git -C {repo.path} worktree list
```

- **Se já existe** (caso comum — o `/implementar` que terminou o PLAN já criou um): **reutilizar**.
- **Se não existe** (ex.: QA rodando isolado, sem `/implementar` nesta sessão): criar um.
```bash
cd {repo.path}
# Só se houver remote — projeto recém-criado pelo /start-project não tem
git remote get-url origin >/dev/null 2>&1 && git fetch origin
git worktree add "{worktree.path}" {branch}
```
- **Se o Git recusar** (`branch already checked out at ...`): outro processo está usando a branch
  agora — informar o dev e parar, igual ao `/implementar`.

A partir daqui, **todas as operações de disco/docker rodam em `{worktree.path}`**.

---

### Passo 1: Coletar PRD, PLAN e Branch

```
Para rodar o teste E2E completo, preciso de:

1️⃣ PRD: caminho do arquivo
   Exemplo: {map.docs.prd}/{slug}-prd-001-tbd-nome-da-feature.md

2️⃣ PLAN: caminho do arquivo
   Exemplo: {map.docs.plan}/{slug}-plan-001-nome-da-feature.md

3️⃣ BRANCH: qual branch foi implementada?
   Exemplo: feature/nome-da-feature

4️⃣ BRANCH BASE (opcional): branch base para comparar
   Padrão: {repo.branch} (develop)
```

**Verificar status do PLAN:**
- Se todas as etapas estão ✅ Concluídas: seguir normalmente.
- Se há etapas pendentes:
```
⚠️ O PLAN ainda tem etapas pendentes (X/N concluídas).

Testar apenas o que já foi implementado pode gerar falsos negativos
(fluxo incompleto reportado como bug).

Prosseguir mesmo assim, testando só o que está pronto? (s/n)
```

---

### Passo 2: Analisar Escopo e Impacto

**2.1.** Ler o PRD e extrair os **critérios de aceitação** — cada um vira um cenário de teste primário.

**2.2.** Identificar arquivos alterados na branch:
```bash
cd {repo.path}
git diff {repo.branch}..{feature-branch} --name-only
```

**2.3.** Cruzar os arquivos alterados com `repositories.*.contexts` e `docs/architecture/` para mapear
**fluxos adjacentes potencialmente impactados** — não apenas o que o PRD pede.

Exemplo: a mudança tocou o serviço de autenticação → mesmo que não esteja no PRD, incluir login,
logout e expiração de sessão como cenários de impacto.

**2.4.** Resultado:
```
📋 Escopo de Teste:
- Critérios do PRD: X cenários
- Fluxos de impacto identificados: Y cenários

[lista dos cenários, um por linha, marcados como PRD ou IMPACTO]
```

---

### Passo 3: Gerar e Confirmar Plano de Teste

Apresentar o plano completo ao dev **antes de subir qualquer ambiente**:

```
🧪 Plano de Teste E2E — [Nome da Feature]

PRD (critérios de aceitação):
1. [Cenário 1] — [passos resumidos]
2. [Cenário 2] — [passos resumidos]

IMPACTO (fluxos adjacentes ao que mudou):
3. [Cenário 3] — [por que entrou no escopo]

Prosseguir com este plano? (s / editar / cancelar)
```

Não seguir para o Passo 4 sem confirmação — evita rodar (e derrubar) ambiente para o escopo errado.

---

### Passo 4: Subir Ambiente Local

Ler `environments.local.mode` e agir conforme o que estiver preenchido — os dois blocos abaixo não
são mutuamente exclusivos (`mode: hybrid` usa os dois).

**4.1. Se `compose-path` estiver definido** (`mode: docker` ou `hybrid`):
```bash
cd {worktree.path}
docker compose -f {environments.local.compose-path} up -d
```

**4.2. Para cada entrada de `environments.local.processes`** (`mode: hybrid` ou `native`):

Se `background: true` (comando não retorna sozinho — ex.: dev server), rodar em background e
**guardar o PID**, necessário para derrubar no Passo 7:
```bash
cd {worktree.path}/{processo.cwd}
nohup {processo.up-command} > /tmp/{slug}-e2e-{processo.name}.log 2>&1 &
echo $! > /tmp/{slug}-e2e-{processo.name}.pid
```
Se `background: false`, rodar o comando normalmente (ele mesmo retorna quando termina de subir).

**4.3. Aguardar healthcheck** de cada serviço em `environments.local.services.*.healthcheck`
(polling com timeout — padrão 60s por serviço; qualquer resposta 2xx conta, não precisa ser um
endpoint de health dedicado). Se algum serviço não sobe dentro do timeout, reportar como
**bloqueador de ambiente**, derrubar o que subiu (Passo 7) e interromper.

**4.4. Rodar seed**, se `environments.local.seed-command` estiver definido.

**4.5. Confirmar ao dev:**
```
✅ Ambiente no ar!

- web: {environments.local.services.web.url}
- api: {environments.local.services.api.url}

Iniciando os cenários...
```

---

### Passo 5: Executar Cenários (Browser MCP)

Para cada cenário do Plano de Teste (Passo 3), na ordem:

**5.1.** Navegar até a URL relevante e executar as ações descritas (clicar, preencher, submeter,
navegar entre telas) usando as ferramentas do MCP de browser.

**5.2. Login**, quando necessário: usar `environments.local.test-users`, lendo a senha da
**variável de ambiente referenciada** em `password-env` — nunca literal no map.json ou no relatório.

**5.3.** Validar o resultado esperado (texto visível, elemento presente/ausente, estado da tela,
redirecionamento).

**5.4. Capturar screenshot:**
- Antes e depois da ação principal do cenário
- **Sempre** em caso de falha (evidência do estado exato em que quebrou)

**5.5.** Registrar PASS/FAIL do cenário + referência às evidências.

**5.6. Continuidade:** um cenário falhar **não interrompe os demais** — a suíte roda até o fim para
dar visibilidade completa. Exceção: se a aplicação travar/crashar de forma que impeça continuar
(ex: página em branco persistente, erro 500 generalizado), interromper os cenários restantes,
marcá-los como **não executados (ambiente comprometido)** e seguir para o Passo 7.

---

### Passo 6: Registrar Evidências

Salvar os screenshots em:
```
{map.docs.e2e}/{slug}-e2e-NNN-nome-da-feature/evidence/{numero}-{cenario}-{step}.png
```

Nomeados sequencialmente por cenário e passo, para que o relatório (Passo 8) possa linkar cada
achado à imagem exata.

---

### Passo 7: Derrubar Ambiente

**Sempre executar**, mesmo se o Passo 4 ou o Passo 5 falharem/lançarem erro:

**7.1.** Se `compose-path` foi usado:
```bash
cd {worktree.path}
docker compose -f {environments.local.compose-path} down -v
```
Ou `environments.local.teardown-command`, se definido (tem precedência sobre o comando padrão acima).

**7.2.** Para cada processo backgroundeado no Passo 4.2, rodar `{processo.down-command}` primeiro
(se definido — alguns processos precisam de um shutdown mais gracioso que um `kill` direto) e, em
seguida, matar pelo PID guardado:
```bash
kill $(cat /tmp/{slug}-e2e-{processo.name}.pid) 2>/dev/null
```

Confirmar que as portas foram liberadas antes de seguir para o relatório.

**Nota:** derrubar o ambiente Docker é incondicional; **remover o worktree não é** — mesma regra do
`/implementar` (o dev decide quando, tipicamente depois do merge).

---

### Passo 8: Relatório

Gerar em `{map.docs.e2e}/{slug}-e2e-NNN-nome-da-feature.md`:

```markdown
# TEST E2E — [Nome da Feature]

## RESUMO EXECUTIVO

**Status Geral**: ✅ APROVADO / ⚠️ APROVADO COM RESSALVAS / ❌ REQUER CORREÇÃO

**Métricas:**
- Cenários do PRD: X/Y passaram
- Cenários de Impacto: X/Y passaram
- Bugs Bloqueantes: X 🔴
- Bugs Não-Bloqueantes: X 🟡
- Observações de UX: X 🟢

**Resumo:** [O que foi testado, principais achados, decisão final]

---

## AMBIENTE

- **Subiu:** ✅ / ❌ — [detalhes se falhou]
- **Serviços:** [lista com URLs]
- **Seed:** ✅ Aplicado / — Não aplicável

---

## CENÁRIOS DO PRD

### Cenário 1: [Nome] — ✅ PASS / ❌ FAIL
**Critério de aceitação:** [referência ao PRD]
**Passos executados:** [resumo]
**Evidência:** `evidence/01-cenario1-antes.png`, `evidence/01-cenario1-depois.png`
**Observação:** [se FAIL, o que quebrou e onde]

---

## CENÁRIOS DE IMPACTO (Regressão)

### Cenário N: [Nome] — ✅ PASS / ❌ FAIL
**Por que entrou no escopo:** [arquivo/fluxo alterado que motivou o teste]
**Evidência:** `evidence/0N-cenarioN.png`

---

## 🔴 BUGS BLOQUEANTES

### Bug 1: [Nome]
**Cenário:** [qual cenário revelou]
**Evidência:** `evidence/...png`
**Descrição:** [o que aconteceu vs. o que era esperado]
**Passos para reproduzir:** [1, 2, 3...]

---

## 🟡 BUGS NÃO-BLOQUEANTES

### Bug 1: [Nome]
**Cenário:** [...]
**Evidência:** `evidence/...png`
**Descrição:** [...]

---

## 🟢 OBSERVAÇÕES DE UX

### Observação 1: [Nome]
**Descrição:** [algo que funciona mas poderia ser melhor — não é bug]

---

## DECISÃO FINAL

**Status**: ✅ APROVADO / ⚠️ APROVADO COM RESSALVAS / ❌ REQUER CORREÇÃO

**Justificativa**: [parágrafo]

---

## HANDOFF

- **De / Para**: QA → Dev Sênior (se ❌) / Tech Lead (se ✅/⚠️)
- **Bloqueios (🔴)**: [lista, ou "nenhum"]
- **Recomendações**: [o que endereçar antes do code review / merge]
```

---

### Passo 9: Próximos Passos

```
🧪 Test E2E Concluído!

Status: ✅ / ⚠️ / ❌
Relatório: {map.docs.e2e}/{slug}-e2e-NNN-nome-da-feature.md
Evidências: X screenshots capturados

❓ O que quer fazer agora?

1. [Se ✅/⚠️] Seguir para /code-review
2. [Se ❌] Corrigir bugs → /implementar (nova etapa de correção)
3. Ver relatório completo
4. Parar por aqui — relatório salvo
```

---

## Tratamento de Erros

**Ambiente não sobe (docker compose ou processo nativo falha):**
- Reportar o erro de boot ao dev
- Garantir teardown do que eventualmente subiu parcialmente (containers **e** processos backgroundeados)
- Não prosseguir para os cenários

**Healthcheck nunca fica verde (timeout):**
- Reportar como bloqueador de ambiente
- Derrubar o ambiente (Passo 7)
- Interromper — não é um bug da feature, é um problema de setup a ser investigado manualmente

**MCP de browser indisponível:**
- Verificar **antes** de subir o ambiente (Passo 0.4) — nunca gastar tempo subindo containers
  para descobrir depois que não há como navegar

**Aplicação trava/crasha durante um cenário:**
- Capturar screenshot do estado de erro
- Marcar o cenário como 🔴
- Marcar os cenários restantes como "não executados (ambiente comprometido)"
- Seguir para o teardown e o relatório — nunca insistir tentando reanimar o ambiente sozinho

---

## O Que Este Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Carrega contexto via `{slug}-map.json` (incluindo `environments.local`) e `docs/`
- Verifica pré-requisitos (ambiente configurado, MCP de browser disponível) antes de agir
- Reutiliza ou cria o **git worktree** da branch testada (nunca roda contra o clone principal —
  evita colidir com outro orquestrador trabalhando no mesmo projeto)
- Deriva cenários de teste do PRD (critérios de aceitação) e do diff (impacto/regressão)
- Confirma o Plano de Teste com o dev antes de subir qualquer ambiente
- Sobe o ambiente local — Docker Compose, processos nativos ou os dois — e aguarda healthcheck
- Simula navegação real via MCP de browser, com screenshot em cada passo-chave e em toda falha
- Deriva ambiente **sempre**, mesmo em caso de falha (finally)
- Gera relatório estruturado (🔴/🟡/🟢) com evidências linkadas
- Devolve handoff claro: Dev Sênior (se ❌) ou segue para o code-review (se ✅/⚠️)

### ❌ NÃO FAZ:
- ❌ Não altera código de produção — apenas observa e reporta
- ❌ Não decide sozinho o escopo dos testes — sempre confirma o plano com o dev
- ❌ Não sobe ambiente de CI/staging — só o ambiente **local** declarado no map
- ❌ Não corrige os bugs encontrados — devolve ao Dev Sênior
- ❌ Não faz merge nem cria PR
- ❌ Não deixa containers órfãos — teardown é incondicional
