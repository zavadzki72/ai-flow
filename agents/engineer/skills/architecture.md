# 🏛️ Skill: Architecture

## Objetivo

Apoiar decisões de arquitetura com raciocínio claro, trade-offs explícitos e recomendações pragmáticas. Arquitetura não é sobre usar o padrão mais sofisticado — é sobre escolher a solução certa para o problema atual, com os recursos disponíveis.

---

## Processo de Análise Arquitetural

### 1. Entendimento do Problema

Antes de qualquer recomendação, entenda:

- **Escala:** Quantos usuários? Qual volume de dados? Qual frequência de operações?
- **Time:** Quantos devs? Qual nível de experiência com o stack?
- **Prazo:** É um MVP ou um sistema maduro?
- **Criticidade:** Qual o impacto de uma falha?
- **Evolução:** Quais são as mudanças prováveis nos próximos 6-12 meses?

### 2. Mapeamento de Forças

Identifique as forças em tensão:
- Simplicidade vs Flexibilidade
- Performance vs Manutenibilidade
- Consistência vs Disponibilidade
- Build vs Buy
- Acoplamento vs Autonomia

### 3. Opções e Trade-offs

Para cada decisão relevante, apresente:
- Ao menos 2 opções viáveis
- Pros e contras objetivos de cada uma
- Em qual contexto cada uma faz mais sentido

### 4. Recomendação

Dê uma recomendação clara com justificativa. Não fique em cima do muro.

---

## Patterns Comuns e Quando Usar

### Layered / N-Tier
**Usar quando:** Aplicação CRUD tradicional, time pequeno, domínio simples
**Evitar quando:** Lógica de negócio complexa, múltiplos bounded contexts

### Clean Architecture / Hexagonal
**Usar quando:** Domínio rico, necessidade de testabilidade, múltiplos adaptadores
**Evitar quando:** CRUD simples — é over-engineering

### CQRS
**Usar quando:** Leituras e escritas têm requisitos muito diferentes, alta escala de leitura
**Evitar quando:** Domínio simples — a complexidade adicional raramente compensa

### Event-Driven
**Usar quando:** Desacoplamento entre serviços, processamento assíncrono, auditoria
**Evitar quando:** Fluxos síncronos simples — adiciona complexidade operacional significativa

### Microserviços
**Usar quando:** Times independentes, domínios bem definidos, necessidade de escala independente
**Evitar quando:** Time pequeno, domínio não mapeado — comece com monolito modular

### Monolito Modular
**Usar quando:** Estágio inicial, time pequeno, domínio ainda sendo descoberto
**Vantagem:** Pode evoluir para microserviços quando fizer sentido real

---

## Estrutura de uma Boa Decisão Arquitetural (ADR)

Quando documentar uma decisão, use este formato:

```markdown
## ADR-XXX: [Título]

**Status:** Proposta / Aceita / Depreciada

**Contexto**
[O problema que estamos resolvendo e as forças em jogo]

**Decisão**
[O que decidimos fazer]

**Consequências**
✅ [O que fica melhor]
⚠️ [O que fica mais difícil ou o que abrimos mão]

**Alternativas consideradas**
[O que foi descartado e por quê]
```

---

## Princípios Guia

1. **YAGNI:** Não construa o que você não precisa agora
2. **KISS:** A solução mais simples que resolve o problema é a melhor
3. **Adie decisões reversíveis:** Deixe opções em aberto quando possível
4. **Tome logo decisões irreversíveis:** Banco de dados, linguagem, modelo de dados core
5. **Otimize para mudança:** O código vai mudar — arquitete para facilitar isso
6. **Coupling explícito > Coupling implícito:** Dependências visíveis são gerenciáveis

---

## Checklist de Review Arquitetural

- [ ] O problema está bem definido antes de propor solução
- [ ] Foram consideradas pelo menos 2 opções
- [ ] Os trade-offs estão explícitos
- [ ] A solução está adequada ao tamanho do problema (não over-engineered)
- [ ] Os pontos de extensão estão identificados
- [ ] Os riscos técnicos estão mapeados
- [ ] A equipe consegue manter o que está sendo proposto