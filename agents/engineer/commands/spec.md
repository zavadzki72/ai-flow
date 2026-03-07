# 📋 Comando: /spec

## Objetivo

Conduzir uma entrevista estruturada com o dev para capturar **todos** os requisitos de uma feature e gerar um PRD (Product Requirements Document) salvo em `docs/prd/`.

---

## ⚠️ Regra Fundamental

**O agent NUNCA deve deduzir, assumir ou inferir nada.**

Se uma informação não foi explicitamente fornecida pelo dev, o agent **obrigatoriamente** deve perguntar antes de prosseguir. Cada campo do PRD deve ser preenchido com informação real do dev, nunca com "provavelmente", "assumindo que" ou valores padrão silenciosos.

---

## Ativação

```
/spec
/spec "descrição rápida da feature"
/spec <número do card Azure> (ex: /spec 1042)
/spec <URL do work item Azure>
```

---

## Etapa 0 — Identificar a Fonte

### Se o dev passou um número ou URL de card Azure:

→ Consulte `integrations/azure/work-items.md` para buscar o Work Item.
→ Apresente o título e descrição encontrados.
→ Pergunte: **"Encontrei o card [título]. Vou usar isso como ponto de partida. Posso prosseguir com as perguntas?"**
→ Mesmo com o card em mãos, **execute todas as perguntas abaixo** — o card é apenas contexto inicial, não substitui a entrevista.

### Se o dev passou uma descrição ou digitou `/spec` sem argumentos:

→ Pergunte imediatamente: **"Descreva a feature que você quer especificar:"**
→ Use a resposta como ponto de partida para as perguntas abaixo.

---

## Etapa 1 — Entrevista de Requisitos

Faça **uma pergunta por vez**. Aguarde a resposta antes de fazer a próxima. Não agrupe perguntas.

### Bloco A: Contexto e Objetivo

```
1. Qual é o nome desta feature?

2. Qual problema de negócio ela resolve? (Descreva o problema, não a solução)

3. Quem são os usuários afetados por essa feature? (personas, roles, times)

4. Qual é o critério de sucesso? Como vamos saber que essa feature funcionou?

5. Existe alguma data limite ou dependência de negócio que precisamos respeitar?
```

### Bloco B: Escopo Funcional

```
6. Descreva o fluxo principal (happy path) da feature passo a passo.

7. Quais são os fluxos alternativos ou variações do fluxo principal?

8. O que essa feature explicitamente NÃO deve fazer? (out of scope)

9. Existem regras de negócio específicas que precisam ser respeitadas?
   (ex: limites, validações, permissões, cálculos)

10. Quais são os estados possíveis dessa feature?
    (ex: ativo/inativo, pendente/aprovado/rejeitado)
```

### Bloco C: Integração e Dados

```
11. Essa feature precisa integrar com algum sistema externo ou interno?
    (ex: APIs, serviços, filas, banco de dados específico)

12. Quais dados essa feature lê? De onde vêm?

13. Quais dados essa feature cria ou modifica? Onde são persistidos?

14. Existem requisitos de performance? (ex: "deve responder em < 500ms",
    "deve suportar X usuários simultâneos")
```

### Bloco D: Segurança e Permissões

```
15. Quem pode acessar essa feature? Existe controle de acesso por role/perfil?

16. Existe algum dado sensível envolvido? (PII, financeiro, credenciais)

17. Existem requisitos de auditoria ou rastreabilidade?
    (ex: "deve logar quem fez o quê e quando")
```

### Bloco E: UX e Interface

```
18. Essa feature tem interface de usuário? Se sim, existe algum wireframe,
    mockup ou referência visual?

19. Existe alguma mensagem de erro ou feedback específico que o usuário
    deve receber em cada cenário?
```

### Bloco F: Testes e Critérios de Aceite

```
20. Quais são os critérios de aceite? (Formate como: DADO / QUANDO / ENTÃO)

21. Existe algum cenário de teste específico que você já tem em mente?

22. Como será testada em produção? Existe um plano de validação pós-deploy?
```

### Bloco G: Dependências e Riscos

```
23. Essa feature depende de outra feature ou task que ainda não foi concluída?

24. Quais são os principais riscos técnicos que você já identifica?

25. Existe alguma decisão técnica que ainda precisa ser tomada?
```

---

## Etapa 2 — Confirmação e Revisão

Após todas as respostas, apresente um resumo:

```
## Resumo da Entrevista

**Feature:** [nome]
**Problema:** [problema de negócio]
**Usuários:** [personas]
**Escopo:** [o que faz e o que não faz]
**Critérios de aceite:** [lista]
**Riscos identificados:** [lista]

---
Está correto? Há algo que queira adicionar, corrigir ou detalhar antes de gerar o PRD?
```

Aguarde confirmação explícita antes de gerar o PRD.

---

## Etapa 3 — Geração do PRD

Após confirmação, gere o arquivo seguindo o template em `skills/prd-template.md`.

### Nome do arquivo:
```
docs/prd/PRD-[YYYY-MM-DD]-[slug-da-feature].md

Exemplos:
docs/prd/PRD-2024-03-15-bulk-order-cancellation.md
docs/prd/PRD-2024-03-15-azure-1042-user-export.md
```

### Ação final:
1. Salve o arquivo em `docs/prd/`
2. Exiba o caminho do arquivo gerado
3. Exiba o conteúdo completo para revisão
4. Pergunte: **"PRD gerado. Deseja ajustar algo antes de prosseguir para o /planejar?"**

---

## Integração Azure (opcional)

Se o dev forneceu um card Azure e a integração estiver configurada:
- Após gerar o PRD, pergunte: **"Deseja atualizar o Work Item #[número] com o link para este PRD?"**
- Se sim, consulte `integrations/azure/work-items.md` para fazer o update.