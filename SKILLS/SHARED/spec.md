# Skill: Spec (Criar PRD)

## Descrição
Cria PRD (Product Requirements Document) para uma nova feature ou correção.
Coleta informações, consulta documentação do projeto, identifica repositórios afetados,
analisa código existente e gera PRD completo com critérios de aceitação e cenários de teste.

---

## Regras Fundamentais

### O Que o PRD NÃO DEVE Conter

O PRD é uma especificação de negócio, NÃO um guia de implementação.

❌ **NÃO DEVE conter:**
- Código de implementação
- Detalhes de sintaxe
- Nomes de variáveis específicas
- Estruturas de código (classes, métodos)

✅ **DEVE conter:**
- Especificações de negócio
- Critérios de aceite claros (formato BDD: Dado/Quando/Então/E)
- Regras de validação
- Fluxos de dados
- Estrutura de alto nível (componentes, entidades, integrações)

**Foco:** O PRD responde **"O QUÊ"** precisa ser feito, NÃO **"COMO"** implementar.

---

## Princípios do Spec-Driven Development

1. **Especificação antes de código**: PRD completo antes de implementar
2. **Critérios mensuráveis**: Cada critério deve ser testável
3. **Independência**: Cada etapa pode ser executada separadamente
4. **Rastreabilidade**: Código deve referenciar PRD
5. **Documentação viva**: PRD é a fonte da verdade

---

## Processo

### Passo 0: Carregar Contexto do Projeto

**0.1. Identificar projeto ativo**

Verificar se existe `.ai-project` na raiz do repositório atual:
- Se existir: ler o caminho do map (ex: `MAPS/project`)
- Se não existir: perguntar ao dev `Qual projeto estamos trabalhando? (ex: projeto-1, projeto-2)`

**0.2. Ler `map.json`**

Carregar o arquivo `{AI_FLOW_ROOT}/{map-path}/map.json` e extrair:
- `project`: nome, descrição
- `stack`: tecnologias de backend/frontend
- `architecture`: padrão e estilo
- `repositories`: todos os repos com seus `contexts` e `path`
- `tooling`: ferramenta de gestão de projetos (Azure DevOps, Jira, etc.)
- `docs.prd`: caminho para salvar PRDs

**0.3. Carregar documentação do projeto**

Usar Glob para listar e ler **todos** os arquivos `.md` das pastas:
- `{AI_FLOW_ROOT}/{map-path}/docs/business/` — domínio de negócio, módulos, glossário
- `{AI_FLOW_ROOT}/{map-path}/docs/architecture/` — arquitetura, padrões e estrutura

Ler cada arquivo encontrado antes de prosseguir. Não pular nenhum.

---

### Passo 1: Escolher Modo de Coleta de Informações

Perguntar ao dev:

```
📋 Vou criar o PRD. Como você quer fornecer as informações?

Opção A) Manual — você responde 4 perguntas sobre a feature

Opção B) Via {tooling.type} — você fornece o ID do item e eu busco automaticamente
         (disponível se o projeto tiver integração configurada em map.tooling)

Qual opção você prefere?
```

Se o projeto não tiver `tooling` configurado no `map.json`, oferecer apenas a Opção A.

---

### Passo 1A: Modo Manual

```
📋 Modo Manual — Preciso das seguintes informações:

1️⃣ DESCRIÇÃO DA FEATURE:
   [O que você quer implementar?]

2️⃣ COMO ERA (Comportamento Atual):
   [Como o sistema funciona hoje?]

3️⃣ COMO DEVE SER (Comportamento Esperado):
   [Como deve funcionar após a mudança?]

4️⃣ CONTEXTO ADICIONAL (Opcional):
   [Motivação, impacto, informações extras]

5️⃣ ID DO ITEM (Opcional):
   [Número do ticket/story no sistema de gestão, se houver]
```

Após receber as respostas, ir para **Passo 2**.

---

### Passo 1B: Modo Integração (ex: Azure DevOps, Jira)

Solicitar o ID do item de trabalho e buscá-lo via ferramenta disponível (MCP, API ou plugin).

Campos importantes a extrair:
- Título
- Descrição
- Critérios de aceitação
- Tags / labels
- Estado
- Responsável

Após buscar, apresentar os dados ao dev e perguntar se há informações adicionais não presentes no item.

Mapear para o PRD:
- **Descrição da Feature** = Título + Descrição
- **Como Era / Como Deve Ser** = Inferir da Descrição
- **Contexto Adicional** = Critérios de aceitação + Tags
- **ID do Item** = ID do ticket

Após processar, ir para **Passo 2**.

---

### Passo 2: Consultar Documentação do Projeto

Com a documentação já carregada no Passo 0, consultar as seções relevantes para a feature:

- `docs/business/` — módulos, regras de negócio, glossário
- `docs/architecture/` — camadas e padrões

Consultar PRDs anteriores na pasta `{map.docs.prd}` como referência de formato (se existirem).

**Nota:** Se necessário, reler arquivos específicos de `docs/` para detalhes da feature.

---

### Passo 3: Identificar Repositórios Afetados

**3.1. Identificar repositório(s)**

Usar as palavras-chave da feature para cruzar com o campo `contexts` de cada repositório em `map.repositories`.

Informar ao dev quais repos foram identificados e confirmar:

```
🔍 Analisando palavras-chave: [palavras da feature]

Repositório(s) identificado(s):
- {repo.name} ({repo.path}): [motivo]

Está correto?
```

**3.2. Atualizar repositório(s)**

Para cada repositório afetado:

```bash
REPO_PATH="{repo.path}"

if [ -d "$REPO_PATH" ]; then
  cd "$REPO_PATH"
  git fetch origin
  git checkout {repo.branch}
  git pull origin {repo.branch}
else
  echo "Repositório não encontrado em $REPO_PATH"
  echo "Clone usando: git clone {repo.url}"
fi
```

**3.3. Analisar código existente**

Explorar estrutura relevante para a feature:
- Entidades / modelos de domínio relacionados
- Handlers / controllers / serviços existentes no mesmo domínio
- Últimas migrations ou equivalente (se aplicável)

Apresentar resumo ao dev:
```
📊 Estrutura identificada:
- Domínio afetado: [domínio]
- Componentes existentes relacionados: [lista]
- Última migration/schema change: [se aplicável]
```

---

### Passo 4: Fazer Perguntas de Clarificação

Com base no contexto do projeto (docs/ carregados no Passo 0) e no código analisado, fazer perguntas **contextualizadas** (máximo 5) sobre:

- Regras de negócio não claras
- Comportamento em cenários de exceção
- Impacto em fluxos existentes
- Validações necessárias
- Permissões/roles para executar a ação
- Impacto em integrações externas
- Retrocompatibilidade

**IMPORTANTE:** Não assuma nada. Pergunte até ter clareza total.

---

### Passo 5: Análise Técnica

#### 5.1. Impacto
Quais componentes serão alterados? (por repositório e camada, usando a arquitetura de `docs/architecture/`)

#### 5.2. Complexidade
Estimar baseado em:
- Número de componentes e repositórios impactados
- Necessidade de migração de schema
- Alterações em fluxos críticos
- Risco de regressão

Classificar como:
- 🟢 **Baixa**: 1 repo, poucos componentes, sem schema change, sem fluxo crítico
- 🟡 **Média**: 1-2 repos, vários componentes, schema change simples
- 🔴 **Alta**: 2+ repos, muitos componentes, schema change complexo, fluxo crítico alterado

#### 5.3. Riscos
- ⚠️ Quebra de funcionalidades existentes?
- ⚠️ Impacto em dados existentes (mudanças destrutivas)?
- ⚠️ Alteração de contratos (APIs, eventos, filas)?
- ⚠️ Performance?

#### 5.4. Dependências
- 🔗 Outras features/PRDs relacionados
- 🔗 Sistemas externos (conforme `docs/business/`)
- 🔗 Mudanças em infra ou configuração

#### 5.5. Schema / Migrations (se aplicável)
- Nova tabela ou estrutura?
- Alteração em existente?
- Impacto em dados existentes?
- Reversível?

#### 5.6. Integrações (se aplicável)
Verificar impacto nos serviços listados em `docs/business/`.

---

### Passo 6: Gerar PRD

Determinar caminho e nome do arquivo:
- Pasta: `{map.docs.prd}` (relativo à pasta do map do projeto)
- Nomenclatura: `PRD_NNN_ID_Nome_Feature.md`
  - NNN = próximo número sequencial (verificar último PRD na pasta)
  - ID = número do ticket (ou TBD se não houver)
  - Nome_Feature = nome descritivo em PascalCase

Usar o template abaixo, preenchendo as seções com base nas informações coletadas e na análise técnica.

---

### Template do PRD

```markdown
# PRD: [Nome da Feature]

**Sequência**: NNN
**Ticket**: #ID ou TBD
**Versão**: 1
**Data**: YYYY-MM-DD
**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO

**Metadados:**
- **Prioridade**: Alta / Média / Baixa
- **Complexidade**: 🟢 Baixa / 🟡 Média / 🔴 Alta
- **Repositório(s)**: [listar apenas os afetados, com base em map.repositories]
- **Domínio(s)**: [domínios de negócio afetados, com base em docs/]

---

## 1. VISÃO GERAL

### 1.1. Contexto
[Por que essa feature é necessária? Qual problema resolve? Situação atual.]

### 1.2. Objetivo
[O que queremos alcançar? Situação desejada após a implementação.]

---

## 2. CRITÉRIOS DE ACEITAÇÃO

### Critério 1 — [Nome Descritivo]
**Dado** [contexto inicial]
**Quando** [ação executada]
**Então** [resultado esperado]
**E** [condições adicionais, se houver]

### Critério 2 — [Nome Descritivo]
**Dado** [contexto inicial]
**Quando** [ação executada]
**Então** [resultado esperado]

---

## 3. ESCOPO TÉCNICO

### 3.1. Componentes a Alterar
[Arquivos/módulos que serão MODIFICADOS — listar por repositório e camada (conforme docs/architecture/)]

### 3.2. Componentes Novos
[Arquivos/módulos que serão CRIADOS — listar por repositório e camada]

### 3.3. Componentes Reutilizados
[Arquivos/módulos que serão usados SEM alteração]

### 3.4. Fluxo de Dados
[Descrição textual do fluxo de dados da feature]

```
1. [Passo 1]
2. [Passo 2]
...
```

---

## 4. ESPECIFICAÇÕES TÉCNICAS

### 4.1. Entidades / Modelos
[Alterações em entidades de domínio — especificar campos, tipos, constraints. SEM código.]

### 4.2. Comandos / Queries / DTOs
[Novos ou alterados — especificar campos e tipos. SEM código.]

### 4.3. Handlers / Services
[Lógica de negócio — descrever responsabilidades SEM código.]

### 4.4. Persistência
[Métodos de acesso a dados — descrever operações SEM código.]

### 4.5. Validações
[Regras de validação em formato de especificação.]

### 4.6. Autorização
[Perfis/roles que podem executar cada ação — conforme docs/architecture/]

---

## 5. REGRAS DE NEGÓCIO

- **RN01**: [Regra de negócio 1]
- **RN02**: [Regra de negócio 2]

---

## 6. REQUISITOS FUNCIONAIS

- **RF01**: [Requisito funcional 1]
- **RF02**: [Requisito funcional 2]

---

## 7. REQUISITOS NÃO FUNCIONAIS

- **RNF01**: [Performance, segurança, etc.]

---

## 8. SCHEMA / MIGRATIONS (se aplicável)

**Migration necessária?** ☐ Sim ☐ Não

**Se SIM:**
[Descrever as mudanças em linguagem natural — NÃO escrever SQL literal]

**Impacto em dados existentes?** [Sim/Não — descrever]
**Reversível?** [Sim/Não]

---

## 9. INTEGRAÇÕES (se aplicável)

### 9.1. Sistemas Externos Afetados
[Listar serviços de docs/business/ que serão impactados]

- [ ] [Serviço 1]: [finalidade da alteração]
- [ ] [Serviço 2]: [finalidade da alteração]

### 9.2. Alterações em Contratos
[Mudanças em APIs, eventos, filas, webhooks]

**Breaking change?** [Sim/Não — justificar]

---

## 10. TRATAMENTO DE ERROS

### CE01 — [Nome do Cenário de Erro]
- **Situação**: [Quando ocorre]
- **Tratamento**: [Como deve ser tratado]
- **Mensagem**: [Mensagem para usuário/log]

---

## 11. CASOS DE USO

### UC01: [Nome do Caso de Uso Principal]

**Ator:** [Perfil do usuário / sistema]

**Pré-condições:**
- [Condição 1]

**Fluxo Principal:**
1. [Passo 1]
2. [Passo 2]
3. [Resultado]

**Fluxos Alternativos:**
- **FA01 — [Exceção]:** [Como tratar]

---

## 12. CENÁRIOS DE TESTE

### Cenário 1: [Happy Path]
**Dado** [contexto]
**Quando** [ação]
**Então** [resultado]

### Cenário 2: [Validação / Erro]
**Dado** [contexto]
**Quando** [ação]
**Então** [resultado]

---

## 13. DEFINIÇÃO DE PRONTO

- [ ] Código implementado seguindo padrões do time (ver docs/architecture/)
- [ ] Testes criados e passando (ver docs/architecture/)
- [ ] Migration criada e testada (se aplicável)
- [ ] Autorização por perfil configurada corretamente
- [ ] Integrações externas validadas (se aplicável)
- [ ] Code review realizado
- [ ] Build passando na branch principal
- [ ] PRD atendido 100%

---

## 14. REFERÊNCIAS

- [Documentação de negócio: docs/business/]
- [Documentação de arquitetura: docs/architecture/]
- [PRDs relacionados, se houver]
- [Ticket/story: link ou ID]

---

## 15. OBSERVAÇÕES

[Notas adicionais, decisões, pontos de atenção identificados na análise técnica]

**Riscos Identificados:**
- ⚠️ [Risco 1]

**Dependências:**
- 🔗 [Dependência 1]

---

## 16. HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| YYYY-MM-DD | 1 | [Nome/IA] | Versão inicial |

---

**Próximo Passo:** Execute `/planejar` para criar o plano de execução detalhado.
```

---

### Passo 7: Atualizar Item no Sistema de Gestão (se aplicável)

Se o projeto tiver `tooling` configurado em `map.json` e um ID de item foi fornecido:

1. Adicionar comentário no item com:
   - Caminho do PRD gerado
   - Resumo: complexidade, repositórios, domínios afetados
   - Próximo passo sugerido (`/planejar`)

2. Adicionar tag/label `prd-criado` (se suportado pela ferramenta)

---

### Passo 8: Apresentar Resultado

```
✅ PRD Criado com Sucesso!

📄 Arquivo: {map.docs.prd}/NNN_ID_Nome_Feature.md

📊 Resumo da Análise Técnica:
- Complexidade: 🟢/🟡/🔴
- Prioridade: Alta/Média/Baixa
- Repositório(s): [repos afetados]
- Domínio(s): [domínios afetados]

📖 Documentação consultada:
- [lista dos docs lidos]

🔍 Análise:
- Impacto: [resumo por camada]
- Schema/Migrations: Sim/Não
- Integrações: [serviços afetados ou "nenhuma"]
- Breaking Changes: Sim/Não

⚠️ Riscos:
- [lista]

🚀 Próximo Passo: /planejar
```

---

## Checklist de Qualidade do PRD

Antes de entregar, verificar:

### Completude
- [ ] Critérios de aceitação claros e testáveis (BDD)
- [ ] Regras de negócio completas
- [ ] Componentes impactados listados por repositório
- [ ] Tratamento de erros especificado
- [ ] Cenários de teste definidos
- [ ] Definição de Pronto completa
- [ ] Roles de autorização definidas

### Clareza
- [ ] PRD compreensível sem explicação adicional
- [ ] Sem ambiguidades
- [ ] Terminologia consistente
- [ ] Visão Geral (Contexto + Objetivo) está clara

### Separação de Concerns
- [ ] Sem código de implementação
- [ ] Sem detalhes de sintaxe
- [ ] Foca em "O QUÊ", não em "COMO"

### Análise Técnica
- [ ] Impacto analisado por camada e repositório
- [ ] Complexidade estimada
- [ ] Riscos identificados
- [ ] Dependências mapeadas
- [ ] Migrations analisadas (se aplicável)
- [ ] Integrações analisadas (se aplicável)

### Rastreabilidade
- [ ] Número de ticket presente (ou TBD)
- [ ] Referências à documentação corretas
- [ ] Histórico iniciado
- [ ] Status definido

---

## O Que Este Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Carrega contexto do projeto a partir do `map.json` e `docs/`
- Coleta informações via perguntas manuais ou integração com ferramenta de gestão
- Identifica repositórios afetados usando os `contexts` do `map.json`
- Atualiza repositórios e analisa código existente
- Faz perguntas contextualizadas baseadas no código e no contexto do projeto
- Realiza análise técnica estruturada (impacto, complexidade, riscos, dependências)
- Gera PRD completo com critérios BDD, escopo técnico e definição de pronto
- Atualiza item no sistema de gestão (se configurado)

### ❌ NÃO FAZ:
- ❌ Criar plano de execução com baby steps → use `/planejar`
- ❌ Explorar código para identificar arquivos exatos de implementação → use `/planejar`
- ❌ Implementar código → use `/implementar`
- ❌ Incluir código no PRD (foca em "O QUÊ", não "COMO")
