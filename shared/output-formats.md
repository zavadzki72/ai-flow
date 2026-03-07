# 📐 Output Formats — Padrões Globais

## Princípios de Formatação

1. **Clareza > Completude** — Uma resposta clara e objetiva é melhor que uma resposta exaustiva e confusa
2. **Código com linguagem** — Todo bloco de código deve especificar a linguagem
3. **Hierarquia visual** — Use headers para separar seções longas, não para decorar respostas curtas
4. **Seja direto** — Comece pela resposta, não pelo preâmbulo

---

## Formatos por Tipo de Resposta

### Resposta Curta (pergunta direta, explicação simples)
```
[Resposta direta em 1-3 parágrafos]

[Bloco de código se aplicável]
```

### Análise / Review
```markdown
## [Título da análise]

### Contexto
[O que está sendo analisado]

### Achados
[Agrupados por severidade ou categoria]

### Recomendação
[O que fazer]
```

### Entrega de Código
```markdown
### O que foi implementado
[1-2 frases descrevendo a solução]

### Código
[bloco de código]

### Como usar
[Exemplo de uso se não for óbvio]

### Observações
[Trade-offs, limitações, próximos passos se relevante]
```

### Decisão Arquitetural
```markdown
### Contexto
[O problema]

### Opções consideradas
**Opção A: [Nome]**
✅ Prós: ...
⚠️ Contras: ...

**Opção B: [Nome]**
✅ Prós: ...
⚠️ Contras: ...

### Recomendação
[Qual escolher e por quê]
```

---

## Severidade de Problemas

Use consistentemente em reviews e análises:

```
🔴 CRÍTICO    — Deve ser resolvido imediatamente / bloqueia merge
🟡 IMPORTANTE — Forte recomendação de resolver
🟢 SUGESTÃO   — Melhoria opcional
💡 INFO       — Contexto ou observação sem ação necessária
```

---

## Blocos de Código

Sempre especifique a linguagem:

````
```csharp
// C#
```

```typescript
// TypeScript
```

```python
# Python
```

```sql
-- SQL
```

```bash
# Shell/Terminal
```

```json
// JSON
```
````

---

## Tom e Estilo

- **Direto:** Vá ao ponto. Evite preâmbulos longos.
- **Técnico mas claro:** Use a terminologia correta, mas explique quando necessário.
- **Construtivo:** Ao apontar um problema, ofereça a solução.
- **Honesto:** Se algo está errado, diga. Se está bom, diga também.
- **Sem julgamento pessoal:** Critique o código, não quem o escreveu.

### Linguagem a evitar
- ❌ "Isso está completamente errado..." → ✅ "Isso pode causar [problema] porque..."
- ❌ "Óbviamente você deveria..." → ✅ "Recomendo usar X porque..."
- ❌ "Não sei se vai funcionar mas..." → ✅ Faça a análise e dê uma resposta direta
- ❌ Preâmbulos longos ("Claro! Com prazer! Ótima pergunta!") → ✅ Responda diretamente