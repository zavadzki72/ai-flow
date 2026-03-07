# 📄 Skill: PRD Template

Este é o template oficial para geração de PRDs pelo comando `/spec`.

---

## Template

```markdown
# PRD — [Nome da Feature]

**ID:** PRD-[YYYY-MM-DD]-[slug]
**Data:** [YYYY-MM-DD]
**Status:** Draft | Em Review | Aprovado
**Azure Work Item:** #[número] (se aplicável)
**Autor:** [dev que solicitou]

---

## 1. Contexto e Problema

### Problema de Negócio
[O que está errado ou faltando hoje. Descreva o problema, não a solução.]

### Usuários Afetados
[Quem sente esse problema. Personas, roles, times.]

### Critério de Sucesso
[Como mediremos que essa feature resolveu o problema.]

---

## 2. Solução Proposta

### Descrição
[Descrição concisa do que será construído.]

### O que está NO escopo
- [Item 1]
- [Item 2]

### O que está FORA do escopo
- [Item 1]
- [Item 2]

---

## 3. Fluxos Funcionais

### Fluxo Principal (Happy Path)
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

### Fluxos Alternativos
**Fluxo A: [Nome]**
1. [Passo]

**Fluxo B: [Nome]**
1. [Passo]

### Fluxos de Erro
**Erro: [Nome do cenário]**
- Condição: [quando acontece]
- Resposta: [o que o sistema deve fazer/mostrar]

---

## 4. Regras de Negócio

| ID | Regra | Detalhe |
|----|-------|---------|
| RN-01 | [Nome] | [Descrição completa] |
| RN-02 | [Nome] | [Descrição completa] |

---

## 5. Estados e Transições

```
[Estado A] → [ação] → [Estado B]
[Estado B] → [ação] → [Estado C]
[Estado B] → [ação] → [Estado A]
```

---

## 6. Dados e Integrações

### Dados Lidos
| Campo | Fonte | Descrição |
|-------|-------|-----------|
| [campo] | [tabela/API] | [descrição] |

### Dados Criados/Modificados
| Campo | Destino | Descrição |
|-------|---------|-----------|
| [campo] | [tabela/API] | [descrição] |

### Integrações Externas
| Sistema | Tipo | Finalidade |
|---------|------|------------|
| [nome] | [API/Fila/BD] | [para que serve] |

---

## 7. Requisitos Não Funcionais

| Tipo | Requisito |
|------|-----------|
| Performance | [ex: P95 < 500ms] |
| Disponibilidade | [ex: 99.9%] |
| Concorrência | [ex: suportar 1000 usuários simultâneos] |
| Retenção de dados | [ex: logs por 90 dias] |

---

## 8. Segurança e Permissões

### Controle de Acesso
| Role / Perfil | Pode fazer |
|---------------|------------|
| [role] | [ações permitidas] |
| [role] | [ações permitidas] |

### Dados Sensíveis
[Descreva quais dados sensíveis estão envolvidos e como devem ser tratados.]

### Auditoria
[O que deve ser logado, por quanto tempo, e quem pode consultar.]

---

## 9. UX / Interface

### Referências Visuais
[Links para mockups, wireframes ou screenshots de referência.]

### Mensagens ao Usuário
| Cenário | Mensagem |
|---------|----------|
| [cenário] | "[texto exato da mensagem]" |

---

## 10. Critérios de Aceite

```gherkin
Cenário 1: [Nome]
  DADO [contexto inicial]
  QUANDO [ação ou evento]
  ENTÃO [resultado esperado]

Cenário 2: [Nome]
  DADO [contexto inicial]
  QUANDO [ação ou evento]
  ENTÃO [resultado esperado]
```

---

## 11. Dependências e Riscos

### Dependências
| Dependência | Tipo | Status |
|-------------|------|--------|
| [feature/task/time] | [técnica/negócio/infra] | [pendente/em andamento/concluída] |

### Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| [descrição] | Alta/Média/Baixa | Alto/Médio/Baixo | [como mitigar] |

### Decisões Técnicas Pendentes
- [ ] [Decisão que ainda precisa ser tomada]

---

## 12. Plano de Validação em Produção

[Como será validado após o deploy. Feature flag? Rollout gradual? Monitoramento específico?]

---

## Histórico de Revisões

| Data | Autor | Mudança |
|------|-------|---------|
| [YYYY-MM-DD] | [nome] | Versão inicial |
```