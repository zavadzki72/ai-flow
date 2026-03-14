# Skill: Code Review

## Descrição
Revisa código implementado validando aderência ao PLAN e ao PRD, verificando padrões do projeto,
code smells, segurança e performance. Gera relatório estruturado com 3 níveis de severidade
(🔴 crítico / 🟡 importante / 🟢 nice-to-have) e opcionalmente cria Pull Request.

---

## Processo

### Passo 0: Carregar Contexto do Projeto

**0.1. Identificar projeto ativo**

Verificar se existe `.ai-project` na raiz do repositório atual:
- Se existir: ler o caminho do map (ex: `MAPS/project`)
- Se não existir: perguntar ao dev `Qual projeto estamos trabalhando? (ex: projeto-1, projeto-2)`

**0.2. Ler `map.json`**

Extrair:
- `repositories`: paths locais e branches
- `tooling`: ferramenta de gestão de projetos (para criação de PR)
- `docs.prd` e `docs.plan`: caminhos dos documentos

**0.3. Carregar documentação do projeto**

Usar Glob para listar e ler **todos** os arquivos `.md` das pastas:
- `{AI_FLOW_ROOT}/{map-path}/docs/architecture/` — padrões, anti-patterns e convenções de teste
- `{AI_FLOW_ROOT}/{map-path}/docs/code-review/` — checklist específico do projeto

Ler cada arquivo encontrado antes de prosseguir. Não pular nenhum.

---

### Passo 1: Coletar PRD, PLAN e Branch

```
Para fazer o code review completo, preciso de:

1️⃣ PRD: caminho do arquivo
   Exemplo: {map.docs.prd}/001_TBD_Nome_Feature.md

2️⃣ PLAN: caminho do arquivo
   Exemplo: {map.docs.plan}/PLAN_001_Nome_Feature.md

3️⃣ BRANCH: qual branch foi implementada?
   Exemplo: feature/nome-da-feature

4️⃣ BRANCH BASE (opcional): branch base para comparar
   Padrão: {repo.branch} (develop)
```

---

### Passo 2: Verificar PLAN

Ler o arquivo PLAN e validar:

- [ ] Status geral está atualizado (✅ Concluído ou 🔄 Em Progresso)?
- [ ] Progresso (X/N) reflete corretamente as etapas concluídas?
- [ ] Cada etapa ✅ Concluída tem data de conclusão preenchida?
- [ ] Barra de progresso (%) está consistente com as etapas?

Se encontrar inconsistências:
```
⚠️ PLAN não está atualizado corretamente!

Problemas:
- [Problema 1]
- [Problema 2]

Recomendação: atualizar PLAN antes do merge.
O review prosseguirá marcando o PLAN como "Aprovado com Ressalvas".
```

---

### Passo 3: Verificar Aderência ao PRD

**3.1.** Ler o PRD e extrair: critérios de aceitação, regras de negócio, requisitos funcionais, especificações técnicas.

**3.2.** Para cada critério de aceitação verificar:
- Está implementado? Em qual arquivo/método?
- Está coberto por testes? Quais?

**3.3.** Para cada regra de negócio verificar:
- Está implementada? Como (padrão de erro do projeto)?
- Está testada?

**3.4.** Verificar especificações técnicas:
- Entidades com campos corretos (tipos, constraints)?
- Commands/Queries/Services criados conforme especificado?
- DTOs com campos corretos?
- Autorização/permissões configuradas (seção de autorização do PRD)?
- Validações implementadas?
- Integrações externas conforme PRD?

**3.5.** Resultado:
```
📋 Aderência ao PRD:
- Critérios de Aceitação: X/Y atendidos
- Regras de Negócio: X/Y implementadas
- Especificações Técnicas: X/Y implementadas

Status: ✅ PRD 100% atendido / ⚠️ Parcialmente atendido / ❌ Não atendido
```

---

### Passo 4: Identificar Arquivos Alterados

```bash
cd {repo.path}

# Arquivos alterados em relação à branch base
git diff {repo.branch}..{feature-branch} --name-only

# Diff completo para análise
git diff {repo.branch}..{feature-branch}
```

Informar ao dev:
```
📁 Arquivos para review:
- X arquivos de produção (src/)
- Y arquivos de teste (tests/)

Prosseguir com análise?
```

---

### Passo 5: Consultar Padrões do Projeto

Antes de analisar o código, reler:
- `docs/architecture/` — padrões obrigatórios e anti-patterns proibidos
- `docs/architecture/` — frameworks, convenção de nomenclatura, cobertura esperada
- `docs/code-review/` — checklist específico do projeto

---

### Passo 6: Análise do Código

#### 6.1. Checklist do Projeto

Aplicar todos os itens de `docs/code-review/`.

Este checklist contém os critérios específicos da stack e arquitetura do projeto — itens que o contexto do projeto define como obrigatórios ou proibidos.

#### 6.2. SOLID Principles (universal)

- [ ] **SRP**: cada classe tem uma única razão para mudar?
- [ ] **OCP**: código extensível sem modificar existente?
- [ ] **LSP**: subtipos substituem base sem quebrar comportamento?
- [ ] **ISP**: interfaces pequenas e específicas?
- [ ] **DIP**: dependências em abstrações (interfaces), não em concretas?

#### 6.3. Segurança (universal)

- [ ] Inputs validados e sanitizados?
- [ ] Sem credenciais hardcoded (senhas, tokens, API keys)?
- [ ] Secrets em variáveis de ambiente ou cofre (Key Vault, Secrets Manager, etc.)?
- [ ] Proteção contra injection (queries parametrizadas)?
- [ ] Autorização/autenticação correta nos endpoints protegidos?
- [ ] Dados sensíveis não logados (emails, tokens, dados pessoais)?

#### 6.4. Performance (universal)

- [ ] Sem N+1 queries (carregar dados relacionados de forma eficiente)?
- [ ] Operações I/O assíncronas?
- [ ] Paginação em listagens grandes?
- [ ] Sem loops com operações de banco dentro?
- [ ] Queries de leitura sem rastrear mudanças (se aplicável ao ORM usado)?

#### 6.5. Code Smells (universal)

**Bloaters:**
- Métodos longos (> 30 linhas) — sugerir extração
- Classes grandes (> 300 linhas) — sugerir quebra
- Lista de parâmetros longa (> 3-4) — sugerir objeto de parâmetros
- Primitive Obsession — tipos primitivos onde deveriam existir Value Objects

**Object-Orientation Abusers:**
- Switch/if-else encadeados — considerar polimorfismo
- Entidade anêmica — entidade sem comportamento, lógica fora da entidade

**Dispensables:**
- Código duplicado — sugerir extração para método/classe comum
- Código morto — nunca chamado, sugerir remoção
- Comentários óbvios — código deve ser autoexplicativo
- Generalidade especulativa (YAGNI) — código para futuros hipotéticos

**Couplers:**
- Feature Envy — método usa mais dados de outra classe
- Law of Demeter — `a.GetB().GetC()` — encapsular melhor
- Acoplamento com implementação concreta — usar interfaces

#### 6.6. Análise de Qualidade (padrão Sonar)

- [ ] Complexidade ciclomática alta (> 10)?
- [ ] Duplicação de código (> 5%)?
- [ ] Métodos muito longos (> 50 linhas)?
- [ ] Classes muito grandes (> 500 linhas)?
- [ ] Muitos parâmetros (> 4)?
- [ ] Nesting profundo (> 3 níveis)?
- [ ] Potenciais null reference sem verificação?
- [ ] Resource leaks (streams, conexões não fechados)?
- [ ] Lógica incorreta (condições sempre true/false, código inalcançável)?

#### 6.7. Testes

Verificar usando `docs/architecture/`:
- [ ] Convenção de nomenclatura seguida?
- [ ] Estrutura Arrange/Act/Assert presente e clara?
- [ ] Frameworks corretos utilizados?
- [ ] Happy path coberto?
- [ ] Cenários de erro e edge cases cobertos?
- [ ] Cobertura de código adequada (conforme threshold em `docs/architecture/`)?
- [ ] Testes independentes entre si?
- [ ] Mocks configurados corretamente (sem over-mocking)?

---

### Passo 7: Oportunidades de Refatoração

Identificar melhorias que **não são bloqueantes** mas agregariam valor:

Para cada oportunidade:
- Arquivo e linha
- Benefício esperado
- Código atual vs código sugerido
- Justificativa (SRP / DRY / YAGNI / legibilidade / etc.)

---

### Passo 8: Critérios de Aprovação

#### ✅ APROVADO
- Todos os critérios do PRD atendidos
- PLAN atualizado corretamente
- Sem anti-patterns proibidos (ver `docs/code-review/`)
- Sem issues de segurança
- Cobertura de testes dentro do threshold definido em `docs/architecture/`
- Build sem erros
- Sem code smells graves

#### ⚠️ APROVADO COM RESSALVAS
- Critérios do PRD atendidos
- Sem issues críticos
- Issues menores identificados (não bloqueantes)
- Cobertura levemente abaixo do threshold (mas não crítica)
- Sugestões de melhoria identificadas

#### ❌ REQUER ALTERAÇÕES
Qualquer um dos bloqueadores abaixo impede o merge:
- Anti-patterns proibidos listados em `docs/code-review/`
- Issues de segurança (credenciais expostas, injection, dados sensíveis logados)
- Critérios do PRD não atendidos
- Bugs que causam comportamento incorreto
- Cobertura de testes abaixo do mínimo definido em `docs/architecture/`
- Autorização incorreta ou ausente em endpoints protegidos
- N+1 queries com impacto significativo de performance
- Mudanças de schema com risco de perda de dados
- Build com erros

---

### Passo 9: Relatório

Gerar relatório no formato abaixo:

```markdown
# CODE REVIEW — [Nome da Feature]

## RESUMO EXECUTIVO

**Status Geral**: ✅ APROVADO / ⚠️ APROVADO COM RESSALVAS / ❌ REQUER ALTERAÇÕES

**Métricas:**
- Aderência ao PRD: X% (Y/Z critérios)
- Qualidade de Código: X/10
- Cobertura de Testes: X%
- Issues Críticos: X 🔴
- Issues Importantes: X 🟡
- Sugestões: X 🟢

**Resumo:**
[O que foi implementado, principais achados, decisão final]

---

## PONTOS POSITIVOS

- [Boas práticas aplicadas]
- [Padrões seguidos corretamente]

---

## VERIFICAÇÃO DO PLAN

**PLAN**: {map.docs.plan}/PLAN_NNN_Nome.md
- **Status**: ✅ Atualizado / ⚠️ Parcial / ❌ Desatualizado
- **Progresso**: X/N etapas (%)
- [Lista de etapas com status]

---

## ADERÊNCIA AO PRD

**PRD**: {map.docs.prd}/NNN_ID_Nome.md

### Critérios de Aceitação
**Critério 1: [Nome]**
- [x] ✅ Implementado: `arquivo:linha`
- [x] ✅ Testado: `[NomeDoTeste]`

### Regras de Negócio
**RN01: [Nome]**
- [x] ✅ Implementada: `Classe.Método`
- [x] ✅ Testada: `[NomeDoTeste]`

### Especificações Técnicas
- [x] ✅ Entidades conforme PRD
- [x] ✅ Serviços/handlers criados
- [x] ✅ Autorização configurada
- [x] ✅ Validações implementadas

**Status**: ✅ PRD 100% atendido

---

## 🔴 ISSUES CRÍTICOS (BLOQUEANTES)

### Issue 1: [Nome]
**Arquivo**: `caminho/arquivo:linha`
**Severidade**: 🔴 Crítico
**Categoria**: Anti-pattern / Segurança / Bug / Performance

**Descrição**: [Explicação clara do problema]
**Impacto**: [Por que é crítico]

**Solução**:
```
// ❌ Atual
[trecho problemático]

// ✅ Sugerido
[trecho corrigido]
```

---

## 🟡 ISSUES IMPORTANTES (NÃO BLOQUEANTES)

### Issue 1: [Nome]
**Arquivo**: `arquivo:linha`
**Categoria**: Code Smell / Arquitetura / Manutenibilidade

**O que melhorar**: [Descrição]
**Por que é importante**: [Justificativa]
**Sugestão**: [Como implementar]

---

## 🟢 SUGESTÕES NICE-TO-HAVE

### Sugestão 1: [Nome]
**Arquivo**: `arquivo:linha`
**Ideia**: [Melhoria]
**Benefício**: [O que ganha]

---

## ANÁLISE DE TESTES

- **Testes passando**: X/X ✅
- **Cobertura estimada**: X%
- **Convenção de nomenclatura**: ✅ Seguida / ⚠️ Inconsistente
- **Cenários cobertos**: happy path, erros, edge cases
- **Gaps**: [cenários não cobertos que deveriam ser]

---

## ANÁLISE DE SEGURANÇA

- [x] ✅ Inputs validados
- [x] ✅ Sem credenciais hardcoded
- [x] ✅ Autorização correta
- [ ] ⚠️ [Issue se houver]

---

## ANÁLISE DE PERFORMANCE

- [x] ✅ Sem N+1 queries
- [x] ✅ Operações assíncronas
- [ ] ⚠️ [Issue se houver]

---

## MÉTRICAS DE QUALIDADE

| Métrica | Valor | Status | Threshold |
|---------|-------|--------|-----------|
| Complexidade Ciclomática Média | X | ✅/⚠️ | < 10 |
| Linhas por Método (média) | X | ✅/⚠️ | < 30 |
| Duplicação | X% | ✅/⚠️ | < 5% |
| Cobertura de Testes | X% | ✅/⚠️ | > 80% |
| Arquivos Revisados | X | — | — |
| Linhas Adicionadas | +X | — | — |

---

## RECOMENDAÇÕES FINAIS

### Ações Obrigatórias (antes de merge)
1. [Ação crítica com como corrigir]

### Ações Recomendadas (pode ser feito após merge)
1. [Ação importante]

### Melhorias Futuras
1. [Nice-to-have]

---

## DECISÃO FINAL

**Status**: ✅ APROVADO / ⚠️ APROVADO COM RESSALVAS / ❌ REQUER ALTERAÇÕES

**Justificativa**: [Parágrafo explicando a decisão]

**Próximos Passos**: [O que o dev deve fazer]
```

---

### Passo 10: Criar Pull Request (se aprovado)

Se o review for ✅ ou ⚠️, oferecer criação de PR:

```
✅ Code Review Concluído!

Deseja criar a Pull Request agora?
[ ] Sim, criar via integração configurada
[ ] Não, vou criar manualmente
```

**Se sim:**

**Coletar dados automaticamente:**
```bash
cd {repo.path}
git rev-parse --abbrev-ref HEAD   # branch atual
git log {repo.branch}..HEAD --oneline  # commits
git diff {repo.branch}...HEAD --name-only  # arquivos
```

**Gerar título e descrição:**

- Título: com ID do ticket se disponível (máx 70 chars)
- Descrição: resumo, resultados do review, mudanças, testes, referências ao PRD e PLAN

**Criar PR via ferramenta configurada em `map.tooling.project-management`:**
- `type: azure-devops` → usar MCP Azure DevOps (ver adapter Claude/Gemini para tool names)
- `type: github` → usar `gh pr create`
- `type: gitlab` → usar `glab mr create`
- Outros → orientar o dev a criar manualmente

**Vincular ticket/work item** se ID foi fornecido.

Se aprovação for ❌, **não criar PR** — listar o que precisa ser corrigido primeiro.

---

## Boas Práticas do Review

1. **Seja construtivo** — critique o código, não o desenvolvedor
2. **Seja específico** — aponte arquivo e linha exatos (`arquivo:42`)
3. **Explique o "porquê"** — referencie padrões de `docs/`
4. **Sugira soluções** — sempre que possível, mostre como corrigir
5. **Reconheça o bom** — destaque código bem feito
6. **Priorize** — use 🔴 🟡 🟢 para indicar urgência
7. **Base em padrões** — critique com referência à documentação do time, não opinião pessoal

---

## O Que Este Skill FAZ e NÃO FAZ

### ✅ FAZ:
- Carrega contexto via `map.json` e `docs/`
- Verifica PLAN atualizado
- Valida aderência ao PRD (critérios, regras, specs)
- Analisa diff via `git diff`
- Aplica checklist específico do projeto (`docs/code-review/`)
- Verifica SOLID, segurança, performance, code smells (universal)
- Analisa testes conforme `docs/architecture/`
- Gera relatório estruturado (🔴 / 🟡 / 🟢)
- Cria PR via ferramenta configurada em `map.tooling` (se aprovado)

### ❌ NÃO FAZ:
- ❌ Não faz merge automaticamente
- ❌ Não altera código — apenas sugere
- ❌ Não aprova sem análise rigorosa
- ❌ Não cria PR se review for ❌ reprovado
