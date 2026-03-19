# Skill: Planejar (Criar Plano de Execução)

## Descrição
Cria plano de execução técnico detalhado (PLAN) baseado em um PRD existente.
Explora o código profundamente, identifica componentes técnicos específicos,
quebra a implementação em baby steps independentes e gera um arquivo PLAN completo.

---

## Processo

### Passo 0: Carregar Contexto do Projeto

**0.1. Identificar projeto ativo**

Verificar se existe `.ai-project` na raiz do repositório atual:
- Se existir: ler o caminho do map (ex: `MAPS/project`)
- Se não existir: perguntar ao dev `Qual projeto estamos trabalhando? (ex: projeto-1, projeto-2)`

**0.2. Ler `map.json`**

Carregar `{AI_FLOW_ROOT}/{map-path}/map.json` e extrair:
- `repositories`: paths locais, branches e contexts de cada repo
- `architecture`: padrão e estilo
- `docs.prd`: caminho onde os PRDs ficam salvos
- `docs.plan`: caminho onde os PLANs devem ser salvos

**0.3. Carregar documentação do projeto**

Usar Glob para listar e ler **todos** os arquivos `.md` da pasta de arquitetura:
- `{AI_FLOW_ROOT}/{map-path}/docs/architecture/` — padrões, estrutura de pastas, ordem de implementação, comandos

Ler cada arquivo encontrado antes de prosseguir. Não pular nenhum.

---

### Passo 1: Solicitar PRD

**OBRIGATÓRIO:** Dev precisa informar o PRD.

```
📋 Vou criar o plano de execução técnico.

🔴 OBRIGATÓRIO: Qual PRD devo usar como base?

Informe o caminho do arquivo ou apenas o nome/número:
Exemplo: {map.docs.prd}/001_TBD_Nome_Feature.md
```

Se o PRD não for informado:
```
❌ PRD não informado. Por favor, execute /spec primeiro para criar o PRD,
ou informe o caminho: /planejar {map.docs.prd}/001_Nome_Feature.md
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
  git fetch origin
  git checkout {repo.branch}
  git pull origin {repo.branch}
else
  echo "Repositório não encontrado em $REPO_PATH"
  echo "Clone com: git clone {repo.url}"
fi
```

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

---

### Passo 7: Gerar Arquivo PLAN

Determinar caminho e nome do arquivo:
- Pasta: `{map.docs.plan}` (relativo à pasta do map do projeto)
- Nomenclatura: `PLAN_NNN_Nome_Feature.md` (usar mesmo número do PRD)

Usar o template abaixo:

---

### Template do PLAN

```markdown
# Plano de Execução: [Nome da Feature]

## Informações
- **PRD Relacionado**: {map.docs.prd}/NNN_ID_Nome_Feature.md
- **Repositório(s)**: [repos afetados]
- **Domínio(s)**: [domínios]
- **Branch Base**: {repo.branch}
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
- `{path}/[Arquivo]` (novo / alterado)

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

## RISCOS E MITIGAÇÕES

### Risco 1: [Nome]
- **Impacto**: Alto / Médio / Baixo
- **Probabilidade**: Alta / Média / Baixa
- **Mitigação**: [Como mitigar]

---

## DOCUMENTAÇÃO DE REFERÊNCIA

- **PRD**: {map.docs.prd}/NNN_ID_Nome_Feature.md
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

**Criado em:** YYYY-MM-DD
**Próximo passo:** `/implementar ETAPA 1`
```

---

### Passo 8: Validar Plano com o Dev — PARAR AQUI

```
✅ Plano de Execução Criado!

📄 Arquivo: {map.docs.plan}/PLAN_NNN_Nome_Feature.md

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
- Carrega contexto do projeto via `map.json` e `docs/`
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
