# 🔷 Contexto: C# / .NET

## Stack Assumida

- .NET 10+ (LTS)
- C# 14+
- .NET Core para APIs
- Entity Framework Core para acesso a dados
- xUnit + FluentAssertions + Moq para testes

---

## Convenções de Código

### Naming
```csharp
// Classes, métodos, propriedades públicas: PascalCase
public class OrderService { }
public void ProcessPayment() { }
public string CustomerName { get; set; }

// Variáveis locais e parâmetros: camelCase
var totalAmount = 0m;
void Calculate(int itemCount) { }

// Campos privados: _camelCase
private readonly IOrderRepository _orderRepository;

// Interfaces: prefixo I
public interface IOrderRepository { }

// Constantes: PascalCase
public const int MaxRetryAttempts = 3;
```

### Estrutura de Projeto (Clean Architecture)
```
src/
├── Domain/              # Entidades, Value Objects, interfaces de repositório
├── Application/         # Use cases, DTOs, interfaces de serviço, handlers
├── Infrastructure/      # EF Core, repositórios concretos, serviços externos
└── Api/                 # Controllers, middlewares, configuração DI
tests/
├── Domain.Tests/
├── Application.Tests/
└── Integration.Tests/
```

---

## Padrões Preferidos

### Injeção de Dependência
```csharp
// ✅ Correto: injetar por construtor, readonly
public class OrderService
{
    private readonly IOrderRepository _repo;
    private readonly ILogger<OrderService> _logger;

    public OrderService(IOrderRepository repo, ILogger<OrderService> logger)
    {
        _repo = repo;
        _logger = logger;
    }
}

// ❌ Evitar: service locator, propriedades mutáveis para DI
```

### Async/Await
```csharp
// ✅ Sempre async até o final — não misture sync/async
public async Task<Order> GetOrderAsync(Guid id, CancellationToken ct = default)
{
    return await _repo.GetByIdAsync(id, ct);
}

// ❌ Evitar: .Result, .Wait() — causam deadlock
var order = _repo.GetByIdAsync(id).Result; // NUNCA
```

### Tratamento de Erros
```csharp
// ✅ Exceções de domínio específicas
public class OrderNotFoundException : Exception
{
    public OrderNotFoundException(Guid orderId)
        : base($"Order {orderId} not found.") { }
}

// ✅ Result pattern para erros esperados (opcional, mas recomendado)
public record Result<T>(T? Value, string? Error, bool IsSuccess);

// ✅ Global exception handler no middleware
app.UseExceptionHandler("/error");
```

### Records para DTOs
```csharp
// ✅ Records são imutáveis por padrão — ideais para DTOs
public record CreateOrderRequest(Guid CustomerId, List<OrderItemDto> Items);
public record OrderResponse(Guid Id, string Status, decimal Total);
```

### Nullable Reference Types
```csharp
// ✅ Habilite em todo projeto novo
<Nullable>enable</Nullable>

// ✅ Seja explícito sobre nullabilidade
public string? MiddleName { get; set; }   // pode ser null
public string FirstName { get; set; }     // nunca null
```

---

## Entity Framework Core

```csharp
// ✅ Sempre use AsNoTracking() para queries de leitura
var orders = await _context.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == customerId)
    .ToListAsync(ct);

// ✅ Inclua relacionamentos explicitamente
var order = await _context.Orders
    .Include(o => o.Items)
    .ThenInclude(i => i.Product)
    .FirstOrDefaultAsync(o => o.Id == id, ct);

// ✅ Projeções para evitar over-fetching
var names = await _context.Customers
    .Select(c => new { c.Id, c.Name })
    .ToListAsync(ct);

// ❌ Evitar: lazy loading em produção (causa N+1 silencioso)
```

---

## Testes

```csharp
// ✅ Nome: Método_Cenário_ResultadoEsperado
[Fact]
public async Task ProcessOrder_WhenStockIsInsufficient_ShouldThrowInsufficientStockException()
{
    // Arrange
    var order = new OrderBuilder().WithItem("SKU-001", quantity: 100).Build();
    _stockServiceMock.Setup(s => s.GetAvailableAsync("SKU-001")).ReturnsAsync(5);

    // Act
    var act = async () => await _sut.ProcessAsync(order);

    // Assert
    await act.Should().ThrowAsync<InsufficientStockException>();
}
```

---

## Anti-patterns a Evitar

| Anti-pattern | Por quê evitar | Alternativa |
|---|---|---|
| `async void` | Exceções não capturáveis | `async Task` |
| `.Result` / `.Wait()` | Deadlock em ASP.NET | `await` |
| `catch (Exception e) { }` | Silencia erros | Trate ou relance |
| `DateTime.Now` | Não testável | Injete `IDateTime` ou `TimeProvider` |
| `static` para estado | Dificulta testes e DI | Injete como serviço |
| Lógica no Controller | Viola SRP | Mova para Application layer |
| `string` para IDs | Sem type safety | Use `Guid` ou typed IDs |