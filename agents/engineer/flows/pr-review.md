# 🔄 Flow: PR Review

## Objetivo

Conduzir uma revisão completa de Pull Request de forma estruturada, cobrindo todos os aspectos relevantes em ordem de prioridade.

---

## Ativação

Acionado quando o usuário diz: "revisa esse PR", "faz o review", "o que você acha desse PR"

---

## Etapas do Flow

### Etapa 1 — Entendimento do Contexto

Antes de revisar qualquer código, responda:

- Qual é o objetivo do PR? (feature, bugfix, refactor, hotfix)
- Existe uma issue/ticket associado?
- Há alguma área de risco conhecida? (payment, auth, data migration)
- Qual é o nível de urgência? (hotfix crítico vs feature planejada)

**Ação:** Se essas informações não estiverem na descrição do PR, pergunte ao usuário antes de continuar.

---

### Etapa 2 — Análise do Escopo

Mapeie o que está sendo alterado:

```
📁 Arquivos alterados: X
➕ Linhas adicionadas: X
➖ Linhas removidas: X
🔧 Tipo: [ ] Feature [ ] Bugfix [ ] Refactor [ ] Config [ ] Tests
🎯 Componentes afetados: [liste aqui]
```

Identifique imediatamente **red flags de escopo:**
- PR muito grande (>400 linhas sem ser gerado)? → Sugira dividir
- Mistura de mudanças não relacionadas? → Aponte
- Inclui arquivos que não deveriam estar no PR? → Aponte

---

### Etapa 3 — Review Técnico

Execute a skill `skills/code-review.md` com foco em:

**Prioridade 1 — Bloqueantes**
- Bugs lógicos óbvios
- Vulnerabilidades de segurança
- Breaking changes não declarados
- Migrações de banco sem rollback
- Dados sensíveis expostos

**Prioridade 2 — Importantes**
- Performance problemática (N+1, falta de índice)
- Tratamento de erro inadequado
- Código difícil de manter
- Falta de testes para lógica crítica

**Prioridade 3 — Sugestões**
- Melhorias de legibilidade
- Oportunidades de simplificação
- Cobertura de teste adicional

---

### Etapa 4 — Verificação de Testes

```
[ ] Testes foram adicionados para o comportamento novo?
[ ] Testes existentes foram atualizados se necessário?
[ ] Casos de erro e edge cases estão cobertos?
[ ] Os testes são legíveis e bem nomeados?
```

Se testes estão ausentes para código crítico → **bloqueante**
Se testes estão ausentes para código simples → **sugestão**

---

### Etapa 5 — Checklist de Deploy

Para cada PR, verifique:

```
[ ] Há migrações de banco? Foram testadas com rollback?
[ ] Há mudanças de configuração/variáveis de ambiente?
[ ] Feature flags necessárias?
[ ] Há impacto em outros serviços/consumers?
[ ] O PR pode ser revertido facilmente se necessário?
[ ] Documentação precisa ser atualizada?
```

---

### Etapa 6 — Veredicto Final

Conclua com um dos três vereditos:

```
✅ APROVADO
Está pronto para merge. [Opcionalmente: mencione sugestões não bloqueantes]

🟡 APROVADO COM SUGESTÕES
Pode mergear, mas recomendo endereçar: [liste os pontos]

🔴 MUDANÇAS NECESSÁRIAS
Não deve ser mergeado até resolver: [liste os bloqueantes]
```

---

## Formato de Saída do Review

```markdown
## PR Review: [Título ou descrição]

### Contexto
[O que esse PR faz, em 1-2 frases]

### Escopo
[Resumo dos arquivos e tipo de mudança]

### 🔴 Bloqueantes
[Liste ou "Nenhum"]

### 🟡 Importantes  
[Liste ou "Nenhum"]

### 🟢 Sugestões
[Liste ou "Nenhum"]

### Testes
[Avaliação da cobertura]

### Checklist de Deploy
[Itens relevantes marcados]

### Veredicto
[✅ / 🟡 / 🔴 com justificativa]
```