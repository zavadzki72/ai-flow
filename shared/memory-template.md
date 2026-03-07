# 🧠 Memory Template — Contexto entre Sessões

Use este arquivo para registrar decisões, padrões e contexto acumulado sobre o projeto. Copie e adapte para cada projeto.

> **Como usar:** Crie um arquivo `AI_MEMORY.md` na raiz do seu projeto e preencha as seções relevantes. O agent lerá este arquivo ao iniciar para ter contexto do projeto.

---

## Projeto

```
Nome: [Nome do projeto]
Repositório: [URL]
Stack principal: [ex: .NET 8 + React 18 + PostgreSQL]
Ambiente de dev: [ex: Docker Compose / Local / Devcontainer]
```

---

## Arquitetura

```
Padrão: [ex: Clean Architecture / Layered / MVC]
Estrutura de pastas: [breve descrição ou referência]
Autenticação: [ex: JWT via IdentityServer / Supabase Auth]
Banco de dados: [ex: PostgreSQL 15 via EF Core, migrations com Flyway]
Cache: [ex: Redis para sessão e rate limiting]
Fila/Eventos: [ex: RabbitMQ para procesamento assíncrono]
```

---

## Decisões de Arquitetura (ADRs)

Registre decisões importantes e o raciocínio por trás delas:

```
ADR-001: [Título]
Decisão: [O que foi decidido]
Motivo: [Por quê]
Alternativas descartadas: [O que foi considerado e descartado]
Data: [YYYY-MM-DD]

---

ADR-002: ...
```

---

## Padrões do Projeto

Padrões específicos deste projeto que o agent deve seguir:

```
### Naming específico do domínio
- [ex: Entidades de pagamento seguem prefixo "Pmt" por convenção legada]

### Padrões de erro
- [ex: Todos os erros retornam ProblemDetails (RFC 7807)]

### Autenticação
- [ex: Claims do JWT: userId, tenantId, roles]

### Testes
- [ex: Usamos TestContainers para testes de integração]
- [ex: Nomenclatura: Should_[resultado]_When_[condição]]

### Outros
- [qualquer outro padrão relevante]
```

---

## Contexto de Negócio

Glossário e conceitos de domínio relevantes:

```
[Termo]: [Definição no contexto deste sistema]
[Termo]: [Definição]
...
```

Exemplo:
```
Order: Pedido confirmado pelo cliente, com items e payment associados
Cart: Estado temporário pré-checkout, não persistido no banco principal
Tenant: Empresa cliente no modelo multi-tenant
```

---

## Dívidas Técnicas Conhecidas

```
- [ ] [Descrição] — [Impacto] — [Owner/Issue]
- [ ] ...
```

---

## Contexto da Sessão Atual

Atualize a cada sessão relevante:

```
Data: [YYYY-MM-DD]
O que foi trabalhado: [Breve descrição]
Decisões tomadas: [Liste aqui]
Próximos passos: [O que ficou pendente]
```

---

## Anotações Livres

Espaço para contexto que não se encaixa nas categorias acima:

```
[Escreva aqui]
```