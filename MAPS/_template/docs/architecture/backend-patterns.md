# Padrões Backend

## Proibições (leia primeiro)

- ❌ [Anti-pattern 1] — motivo
- ❌ [Anti-pattern 2] — motivo
- ❌ [Anti-pattern 3] — motivo

---

## [Padrão Principal — ex: CQS, CQRS, MVC]

Descreva o padrão principal utilizado no backend:
- Como estruturar commands/queries/handlers (ou controllers/services)
- Como tratar erros e validações
- Como lidar com regras de negócio

```csharp
// Exemplo de código padrão — adaptar para a linguagem do projeto
```

---

## [Padrão de Domínio — ex: Rich Domain Model, Anemic Model]

Descreva como as entidades de domínio são estruturadas:
- Propriedades e encapsulamento
- Factory methods e construtores
- Métodos de negócio

```csharp
// Exemplo
```

---

## [Padrão de Persistência — ex: Repository Pattern]

Descreva como o acesso a dados é organizado:
- Interface no domínio, implementação na infra
- Convenções de nomenclatura

---

## Async/Await

- Sempre assíncrono para operações I/O
- Sempre passar CancellationToken
- Nunca bloquear com `.Result` ou `.Wait()`

---

## Autorização

Descreva as roles/permissões do projeto e como são aplicadas nos endpoints.

---

## Convenções de Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| [Tipo 1] | `{Padrão}` | `Exemplo` |
| [Tipo 2] | `{Padrão}` | `Exemplo` |
