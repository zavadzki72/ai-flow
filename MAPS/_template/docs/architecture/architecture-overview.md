# Arquitetura: NOME_DO_PROJETO

## Padrão e Stack

**Padrão:** [ex: Clean Architecture, MVC, Hexagonal]
**Stack Backend:** [tecnologias principais]
**Stack Frontend:** [tecnologias principais]
**Padrões adicionais:** [ex: CQS, Repository Pattern, Event-Driven]

---

## Camadas

| Projeto/Módulo | Responsabilidade |
|----------------|-----------------|
| `Camada1` | Descrição |
| `Camada2` | Descrição |

---

## Estrutura de Pastas

```
NOME_REPO/
  src/
    Camada1/
    Camada2/
  tests/
    Camada1.Test/
```

---

## Ordem Natural de Implementação

Para features, seguir a ordem por camada:

1. **[Camada de Domínio]** — entidades, enums, value objects
2. **[Camada de Persistência]** — configurações de banco, repositórios, migrations
3. **[Camada de Negócio]** — handlers, services, validadores
4. **[Camada de API/Interface]** — controllers, endpoints, autorização
5. **[Integrações]** — serviços externos (se aplicável)
6. **[Testes]** — unitários e de integração por camada
