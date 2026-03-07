# 🐛 Flow: Bug Fix

## Objetivo

Investigar e corrigir um bug de forma sistemática, garantindo que a causa raiz seja resolvida e que o problema não regresse.

---

## Ativação

Acionado quando o usuário diz: "corrigir bug", "investigar problema", "isso não funciona", "tem um erro"

---

## Etapas do Flow

### Etapa 1 — Coleta de Evidências

Não toque no código ainda. Primeiro, colete:

```
🐛 Comportamento atual:
[Descreva exatamente o que está acontecendo]

✅ Comportamento esperado:
[Descreva o que deveria acontecer]

📋 Stack trace / mensagem de erro:
[Cole aqui, completa]

📝 Logs relevantes:
[Antes, durante e depois do erro se disponível]

🔄 Passos para reproduzir:
1.
2.
3.

⏰ Quando começou:
[ ] Sempre existiu  [ ] Após deploy  [ ] Aleatório  [ ] Após: ___

🌍 Ambiente:
[ ] Dev  [ ] Staging  [ ] Produção  [ ] Todos
```

Se qualquer informação crítica estiver faltando, **pergunte antes de continuar**.

---

### Etapa 2 — Reprodução

Antes de analisar o código:

- Consigo reproduzir o bug localmente?
- Se não reproduz em dev: o que é diferente? (dados, config, escala, SO)
- Qual é o input mínimo que reproduce o problema?
- O bug é determinístico ou intermitente?

**Um bug que não pode ser reproduzido não pode ser corrigido com confiança.**

---

### Etapa 3 — Análise da Causa Raiz

Execute a skill `skills/debugging.md` com foco em:

**Técnica dos 5 Porquês:**
```
Sintoma: [o erro visível]
Por quê? → [causa imediata]
Por quê? → [causa da causa]
Por quê? → [mais fundo]
Por quê? → [mais fundo ainda]
Causa raiz: [o problema real]
```

**Hipóteses a investigar (em ordem de probabilidade):**
1. [Hipótese mais provável]
2. [Segunda hipótese]
3. [Hipótese alternativa]

Para cada hipótese: como vou confirmar ou descartar?

---

### Etapa 4 — Correção

Com a causa raiz identificada:

**Verifique antes de corrigir:**
- A correção resolve a causa raiz, não apenas o sintoma?
- Essa mudança pode quebrar outra coisa? (análise de impacto)
- Existe o mesmo bug em outros lugares do código?
- A correção precisa de migração de dados?

**Implemente a correção seguindo `skills/code-generation.md`**

---

### Etapa 5 — Teste da Correção

```
[ ] O bug original não reproduz mais
[ ] Os testes existentes continuam passando
[ ] Um teste de regressão foi adicionado para esse bug específico
[ ] Edge cases relacionados foram testados
[ ] Testado no ambiente onde o bug foi reportado
```

**Template de teste de regressão:**
```
// Garante que o bug [descrição] não retorna
// Issue: #[número]
[Método]_[CenárioEspecíficoDooBug]_[ResultadoEsperado]
```

---

### Etapa 6 — Análise de Impacto

Antes de fechar:

```
[ ] O mesmo bug existe em outros lugares do código?
[ ] Dados em produção foram corrompidos e precisam de correção?
[ ] Outros sistemas dependentes foram afetados?
[ ] A causa raiz indica um problema sistêmico maior?
[ ] Existe um padrão de desenvolvimento que previniria esse tipo de bug?
```

---

### Etapa 7 — Entrega

```markdown
## Bug Fix: [Descrição curta]

### Causa Raiz
[Explicação clara e objetiva do que estava errado e por quê]

### Correção
[O que foi mudado e por quê essa abordagem]

### Arquivos modificados
- `path/to/file.ext` — [descrição da mudança]

### Como verificar
[Passos para confirmar que o bug está resolvido]

### Teste de regressão adicionado
[Nome do teste e o que ele valida]

### Impacto
[O que mais pode ter sido afetado, ações tomadas ou necessárias]
```