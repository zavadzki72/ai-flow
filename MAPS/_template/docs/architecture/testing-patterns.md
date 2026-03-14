# Padrões de Teste

## Frameworks e Ferramentas

- **Framework de testes:** [ex: xUnit, Jest, Vitest]
- **Mocks:** [ex: NSubstitute, Moq, Vitest mocks]
- **Dados de teste:** [ex: Bogus, Faker]
- **Mutation testing:** [ex: Stryker]

---

## Convenção de Nomenclatura

Padrão: `Given_{Contexto}_When_{Acao}_Should_{Resultado}`

```
Given_ValidInput_When_Handle_Should_CreateEntity
Given_InvalidInput_When_Handle_Should_ReturnError
Given_UnauthorizedUser_When_Endpoint_Should_ReturnForbidden
```

---

## Estrutura de Testes

```
// Arrange
[preparar dados e mocks]

// Act
[executar a ação]

// Assert
[verificar resultado]
```

---

## Cobertura Esperada

- **Mínimo:** [ex: 70%]
- **Recomendado:** [ex: 80%]
- **Obrigatório para merge:** [ex: build sem falhas + cobertura mínima]

---

## O Que Testar

- ✅ Toda lógica de negócio (handlers, services, domain)
- ✅ Happy path
- ✅ Cenários de erro e validação
- ✅ Edge cases relevantes
- ✅ Autorização (usuário sem permissão deve retornar erro adequado)
