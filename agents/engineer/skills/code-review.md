# 🔍 Skill: Code Review

## Objetivo

Revisar código com olhar crítico e construtivo, identificando problemas reais e sugerindo melhorias concretas. Não é sobre estilo pessoal — é sobre qualidade, segurança, manutenibilidade e corretude.

---

## Processo de Revisão

Execute sempre nessa ordem:

### 1. Entendimento
- Qual é o propósito desse código?
- O que ele deveria fazer?
- Existe contexto de negócio relevante?

### 2. Corretude
- O código faz o que deveria fazer?
- Existem edge cases não tratados?
- Há condições de corrida ou problemas de concorrência?
- Os tipos e nullability estão corretos?

### 3. Segurança
- Há inputs não sanitizados?
- Existe risco de SQL injection, XSS, IDOR ou outros vetores?
- Dados sensíveis estão expostos em logs ou respostas?
- Autenticação/autorização está correta?

### 4. Performance
- Existem N+1 queries?
- Loops desnecessários ou complexidade acima do esperado?
- Recursos (conexões, streams, memória) são liberados corretamente?
- Caching deveria ser aplicado?

### 5. Manutenibilidade
- O código é legível sem comentários?
- Funções/métodos têm responsabilidade única?
- Existe duplicação que deveria ser abstraída?
- Nomes de variáveis e funções são claros e descritivos?

### 6. Testes
- Existe cobertura de testes adequada?
- Os casos de borda estão testados?
- Os testes são legíveis e bem nomeados?

---

## Formato de Saída

Organize o feedback em categorias de severidade:

```
🔴 CRÍTICO — deve ser corrigido antes de mergear
🟡 IMPORTANTE — forte recomendação de corrigir
🟢 SUGESTÃO — melhoria opcional, mas vale considerar
💡 OBSERVAÇÃO — contexto ou explicação sem ação necessária
```

### Exemplo de feedback:

```
🔴 CRÍTICO — Linha 42
O método `GetUser()` não verifica se o userId pertence ao usuário autenticado.
Isso permite IDOR — qualquer usuário pode acessar dados de outro.

Sugestão:
  var user = await _repo.GetUserAsync(userId);
  if (user.TenantId != currentUser.TenantId)
      throw new ForbiddenException();
```

---

## Regras de Comportamento

- Seja específico: aponte a linha ou bloco exato
- Sempre ofereça uma alternativa quando apontar um problema
- Não critique estilo subjetivo sem embasamento técnico
- Se o código está bom, diga isso claramente
- Separe o que é bloqueante do que é sugestão
- Adapte o tom ao contexto (PR de produção vs experimento rápido)

---

## Checklist Final

Antes de entregar o review, confirme:

- [ ] Verifiquei corretude lógica
- [ ] Verifiquei segurança
- [ ] Verifiquei performance óbvia
- [ ] Verifiquei legibilidade e naming
- [ ] Verifiquei cobertura de testes
- [ ] Classifiquei cada item por severidade
- [ ] Ofereci alternativa para cada crítica