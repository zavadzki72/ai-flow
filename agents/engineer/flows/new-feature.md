# ✨ Flow: Nova Feature

## Objetivo

Guiar a implementação de uma nova funcionalidade de forma estruturada, desde o entendimento do requisito até o código production-ready com testes.

---

## Ativação

Acionado quando o usuário diz: "nova feature", "implementar feature", "preciso criar", "quero adicionar"

---

## Etapas do Flow

### Etapa 1 — Entendimento do Requisito

Antes de escrever qualquer código, garanta clareza total:

**Perguntas obrigatórias (se não respondidas):**
- O que essa feature deve fazer? (comportamento principal)
- Quem vai usar? (usuário final, sistema externo, interno)
- Quais são os casos de borda? (inputs inválidos, estado vazio, erros)
- O que está fora do escopo? (o que essa feature explicitamente não faz)
- Existe alguma restrição técnica? (performance, compatibilidade, segurança)

**Critérios de aceite — formalize antes de implementar:**
```
DADO [contexto inicial]
QUANDO [ação ou evento]
ENTÃO [resultado esperado]
```

Exemplo:
```
DADO um usuário autenticado com plano Pro
QUANDO ele faz upload de um arquivo > 100MB
ENTÃO o sistema deve rejeitar com mensagem "Limite de 100MB excedido"
```

---

### Etapa 2 — Design da Solução

Antes de implementar, planeje em voz alta:

```
### Abordagem proposta
[Descrição em 2-3 parágrafos de como vai funcionar]

### Componentes afetados
- [Novo arquivo/classe X — responsabilidade Y]
- [Arquivo existente Z — mudança W]

### Decisões de design
- [Decisão 1]: [Escolha feita] porque [razão]. Alternativa descartada: [por quê]

### Riscos e dependências
- [O que pode dar errado]
- [O que depende de outra equipe/serviço]
```

Valide o design com o usuário antes de prosseguir para implementação.

---

### Etapa 3 — Implementação

Execute a skill `skills/code-generation.md` seguindo:

**Ordem sugerida de implementação:**
1. Tipos e interfaces (contratos)
2. Lógica de domínio / core (sem dependências externas)
3. Infraestrutura (banco, APIs externas)
4. Interface de entrada (controller, handler, command)
5. Testes

**Checklist durante implementação:**
- [ ] Segue os padrões do contexto ativo (`context/`)
- [ ] Tratamento de erros está completo
- [ ] Sem hardcode de valores que deveriam ser config
- [ ] Sem dados sensíveis em log

---

### Etapa 4 — Testes

Para cada feature, implemente:

```
[ ] Happy path — o fluxo principal funcionando
[ ] Casos de erro esperados — inputs inválidos, not found, unauthorized
[ ] Edge cases — valores limite, coleções vazias, null/nil
[ ] Integração — se houver interação com banco ou serviço externo
```

Naming dos testes:
```
[Método/Componente]_[Cenário]_[ResultadoEsperado]

Exemplos:
- UploadFile_WhenFileTooLarge_ShouldReturn422
- CalculateDiscount_WithPromoCode_ShouldApplyTenPercent
- GetUser_WhenNotFound_ShouldReturnNull
```

---

### Etapa 5 — Checklist de Entrega

Antes de considerar a feature pronta:

```
[ ] Todos os critérios de aceite estão cobertos
[ ] Testes passando
[ ] Sem warnings de lint/compiler
[ ] Code review próprio feito (releia como reviewer)
[ ] Documentação atualizada (se API pública, README, etc.)
[ ] Variáveis de ambiente documentadas
[ ] Feature flag necessária? (para features grandes ou de risco)
[ ] Plano de rollback existe?
```

---

### Etapa 6 — Entrega

Entregue o resultado organizado:

```markdown
## Feature: [Nome]

### O que foi implementado
[Descrição do que foi feito]

### Arquivos criados/modificados
- `path/to/file.ext` — [o que mudou]

### Como testar
[Passos para validar manualmente]

### Como executar os testes
[Comando]

### O que ficou de fora (próximos passos)
[Escopo conscientemente excluído]
```