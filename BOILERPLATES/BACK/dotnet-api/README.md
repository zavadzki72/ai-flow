# dotnet-api Boilerplate

Boilerplate de Web API .NET 10 com Clean Architecture + CQRS. Este documento descreve **os padrões obrigatórios** que o código já implementa. Toda nova feature deve seguir estas regras — se algo não couber em nenhuma delas, abra um ADR antes de divergir.

---

## O que está aqui dentro

API HTTP com:

- **Clean Architecture** em 4 camadas (Domain → Application → Infra → WebApi).
- **CQRS** via MediatR (Commands escrevem, Queries leem; nunca se cruzam).
- **Dual DbContext** (write tracking habilitado, read-only com NoTracking forçado).
- **Notification Pattern** para erros de negócio esperados (sem lançar exception).
- **Envelope `DataActionResult<T>`** padronizado em todas as respostas.
- **FluentValidation** apenas para regras estruturais (porta de entrada).
- **PostgreSQL** + EF Core 10 com Code-First migrations.
- **JWT Bearer** genérico (Authority/Audience configuráveis).
- **Serilog** (Console + File rotativo).
- **Swagger** com Bearer + OAuth2 Authorization Code.
- **Health Checks** Kubernetes-friendly.
- Exemplo end-to-end com 2 entidades + FK (`DummyCategory` 1:N `DummyItem`).
- Suite de testes unitários (xUnit + NSubstitute + EF InMemory).

---

## Estrutura em camadas

```
src/
├── Dummy.Domain          → entidades, enums, contratos. Sem dependências externas.
├── Dummy.Application     → commands, queries, handlers, DTOs, validators, behaviors.
├── Dummy.Infra           → DbContexts, mapeamentos, migrations, UnitOfWork, extensions de IQueryable.
├── Dummy.WebApi          → controllers, middlewares, configurations DI, Program.cs.
└── Dummy.UnitTests       → xUnit + NSubstitute + EF InMemory.
```

**Regra de dependências (uma única seta):**

```
WebApi  ──►  Application  ──►  Infra  ──►  Domain
                  │                          ▲
                  └──────────────────────────┘
```

`Domain` não depende de NADA. `Infra` referencia apenas `Domain`. `Application` referencia `Domain` e `Infra`. `WebApi` referencia tudo.

---

## CQRS — separação read/write

| | Commands | Queries |
|---|---|---|
| **Verbo HTTP** | POST / PUT / DELETE | GET |
| **DbContext** | `DummyContext` (tracking) | `DummyReadOnlyContext` (NoTracking; lança exception em SaveChanges) |
| **Retorno típico** | `Guid` (Id criado) ou `Unit` (sem retorno) | `T`, `List<T>` ou `PaginatedResponse<T>` |
| **Pode escrever?** | Sim | NUNCA |
| **Resposta de sucesso** | `204 NoContent` ou `200 OK` com Id | `200 OK` com payload |

A separação de contextos é em código, não em infraestrutura — ambos apontam para o mesmo Postgres. O `ReadOnlyContext` lança `InvalidOperationException` em `SaveChanges` para falhar rápido se alguém tentar escrever pelo lado errado.

---

## Padrão de Entidades

### Construtor protegido + construtor público

```csharp
public class DummyCategory : EntityBase
{
    // 1) Construtor PROTEGIDO sem parâmetros — para o EF Core
    protected DummyCategory() : base()
    {
        Name = string.Empty;
        Code = string.Empty;
    }

    // 2) Construtor PÚBLICO com parâmetros — única forma de criar no domínio
    public DummyCategory(string name, string code, string? description, DummyStatus status) : base()
    {
        Name = name;
        Code = code;
        Description = description;
        Status = status;
    }
    // ...
}
```

**Regras:**
- O construtor público garante que entidades nascem em estado válido. Não existe `new DummyCategory()` em código de produção.
- `EntityBase` cuida de `Id` (`Guid.NewGuid()`), `CreatedAt` e `UpdatedAt` automaticamente.
- Construtor de entidade FILHA recebe a entidade PAI completa, **não apenas o Id**:
  ```csharp
  public DummyItem(DummyCategory category, ...) : base()
  {
      CategoryId = category.Id;   // FK derivada
      Category = category;        // navigation property
  }
  ```
  Isso obriga o handler a buscar a Category antes (validando que ela existe) em vez de aceitar um Guid solto que pode não corresponder a nada.

### Mutabilidade

| Quando usar | Onde |
|---|---|
| `{ get; init; }` | Propriedade que NUNCA muda após criada (Code, FK, Id, CreatedAt). |
| `{ get; private set; }` | Propriedade alterável apenas via método de domínio (Name, Status, Description). |
| `{ get; set; }` | **Proibido** em entidades. Permitido apenas em DTOs de binding ASP.NET. |

### Métodos de domínio

Mudanças de estado SEMPRE via método nomeado, nunca via setter público:

```csharp
public void Update(string name, string? description, DummyStatus status)
{
    Name = name;
    Description = description;
    Status = status;

    Update(); // chama o método do EntityBase que atualiza UpdatedAt
}
```

### Ordem dos membros

1. Construtores (protected primeiro, depois public)
2. Propriedades
3. Métodos de domínio

---

## Padrão de Enums

```csharp
public enum DummyStatus
{
    [Display(Name = "Active")]
    [Description("Active and available for use")]
    Active = 1,

    [Display(Name = "Inactive")]
    [Description("Inactive but preserved")]
    Inactive = 2,
}
```

**Regras:**
- Valor INT explícito (`= 1`, `= 2`) — não confiar em ordem de declaração.
- `[Display(Name)]` → label curto, exposto na API e na UI.
- `[Description]` → texto longo descritivo, retornado pelo endpoint `:list-all`.
- Persistido como **INT** no banco (`HasConversion<int>()` no Map).
- Serializado como **string Display Name** na API (via `JsonStringEnumConverter` + projeção `enum.GetDisplayName()` nos DTOs de Response).
- Para popular dropdowns no frontend, exponha um endpoint `GET .../<enum-name>:list-all` retornando `List<EnumOptionResponse>` com `{ value, label, name }`.

### Ordenação por Display Name

`QueryableExtensions.ApplySortingAndPagination` detecta propriedades enum e ordena pelo Display Name (alfabético do label) em vez do INT. Implementado em `Dummy.Infra/Builders/EnumOrderExpressionBuilder.cs`.

---

## Padrão de Commands e Queries

**Regra fundamental: Commands e Queries SÃO os DTOs de entrada. Não criar DTOs de Request separados.**

### Command

```csharp
public record CreateDummyCategoryCommand : RequestBase<Guid>
{
    public string? Name { get; init; }              // ✅ nullable + init
    public string? Code { get; init; }              // ✅ nullable + init
    public string? Description { get; init; }       // ✅ opcional → nullable
    public DummyStatus? Status { get; init; }       // ✅ enum como enum, não string

    public override bool IsValid()
    {
        ValidationResult = new CreateDummyCategoryCommandValidator().Validate(this);
        return ValidationResult.IsValid;
    }
}
```

**Regras:**
- É um `record` que herda `RequestBase<TResponse>` (ou `RequestBase` se não retorna nada).
- Propriedades obrigatórias **devem ser nullable** (`string?`, `int?`, `EnumType?`). Sem isso, o validator não consegue validar `NotNull`.
- Todas as propriedades usam `{ get; init; }`. **NUNCA `set`. NUNCA `required`.**
- Listas multi-valor são **NÃO nullable** e inicializadas: `List<Zone> Zones { get; init; } = []`.
- Enums chegam tipados: `DummyStatus?`, não `string?`.
- Implementa `IsValid()` que delega ao validator concreto.

### Query NÃO paginada

```csharp
public record GetDummyCategoriesQuery : RequestBase<List<DummyCategoryResponse>>
{
    public List<DummyStatus> Statuses { get; init; } = [];   // multi-valor → lista não-nullable
    public string? Search { get; init; }                      // single-value opcional → nullable

    public override bool IsValid() { /* ... */ }
}
```

### Query PAGINADA

Herde `PaginatedRequest<T>` em vez de `RequestBase<T>`. Page/Size/Sort são bindados automaticamente do query string com prefixo `_`:

```
GET /api/dummyitems?_page=0&_size=20&_sort=Name ASC,Price DESC&statuses=Active&minPrice=10
```

```csharp
public record GetDummyItemsQuery : PaginatedRequest<PaginatedResponse<DummyItemResponse>>
{
    public List<Guid> CategoryIds { get; init; } = [];
    public List<DummyStatus> Statuses { get; init; } = [];
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public string? Search { get; init; }

    public override bool IsValid() { /* ... */ }
}
```

**Importante:** `Page` é base 0 (primeira página = 0). `Size` máximo é 100 (validado no `PaginatedRequestValidator`).

### Validator — apenas porta de entrada

```csharp
public class CreateDummyCategoryCommandValidator : AbstractValidator<CreateDummyCategoryCommand>
{
    public CreateDummyCategoryCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Status).NotNull().IsInEnum();
    }
}
```

**O que vai no validator:**
- `NotNull`, `NotEmpty`, `NotEqual(Guid.Empty)`
- `MaximumLength`, `MinimumLength`
- `GreaterThan`, `LessThan`, `InclusiveBetween`
- `IsInEnum()` para enums
- `EmailAddress`, regex simples

**O que NÃO vai no validator:**
- Verificação de duplicidade no banco
- Verificação se FK existe (`CategoryId` → `Category` existe?)
- Qualquer regra que dependa de I/O
- Qualquer regra que dependa de outra entidade

Tudo isso vai no Handler.

### Para queries paginadas, inclua o validator base

```csharp
public class GetDummyItemsQueryValidator : AbstractValidator<GetDummyItemsQuery>
{
    public GetDummyItemsQueryValidator()
    {
        Include(new PaginatedRequestValidator<GetDummyItemsQuery>()); // valida Page/Size
        // + regras específicas
    }
}
```

### Command Handler

```csharp
public class CreateDummyCategoryCommandHandler : IRequestHandler<CreateDummyCategoryCommand, Guid>
{
    private readonly DummyContext _context;
    private readonly INotificationService _notifications;
    private readonly ILogger<CreateDummyCategoryCommandHandler> _logger;

    public async Task<Guid> Handle(CreateDummyCategoryCommand request, CancellationToken ct)
    {
        // 1. Regras de negócio que dependem do banco
        if (!await ComplexValidations(request, ct)) return Guid.Empty;

        // 2. Construir entidade via construtor de domínio
        var category = new DummyCategory(request.Name!, request.Code!, request.Description, request.Status!.Value);

        // 3. Persistir
        _context.DummyCategories.Add(category);
        await _context.SaveChangesAsync(ct);

        // 4. Retornar o que for útil
        return category.Id;
    }

    private async Task<bool> ComplexValidations(CreateDummyCategoryCommand request, CancellationToken ct)
    {
        var codeExists = await _context.DummyCategories.AnyAsync(x => x.Code == request.Code, ct);
        if (codeExists)
        {
            _notifications.Notify(NotificationKey.DuplicateRecord, $"Code '{request.Code}' already exists");
            return false;
        }
        return true;
    }
}
```

**Padrões obrigatórios:**
- Implementa `IRequestHandler<TCommand, TResult>` (MediatR oficial).
- Recebe `DummyContext` (write) — Commands escrevem.
- Recebe `INotificationService` para reportar erros de negócio.
- Recebe `ILogger<THandler>` para logging.
- Método privado `ComplexValidations` para regras que dependem do banco — retorna `bool`.
- Métodos privados de conversão `Command → Entidade`.
- Em vez de `throw`, chame `_notifications.Notify(...)` e retorne. O `ControllerBase` traduz isso em 400/404/409.

### Query Handler

```csharp
public class GetDummyItemsQueryHandler : IRequestHandler<GetDummyItemsQuery, PaginatedResponse<DummyItemResponse>>
{
    private readonly DummyReadOnlyContext _context;

    public async Task<PaginatedResponse<DummyItemResponse>> Handle(GetDummyItemsQuery request, CancellationToken ct)
    {
        // 1. Query base
        var query = _context.DummyItems.Include(x => x.Category).AsQueryable();

        // 2. Filtros condicionais (método privado)
        query = ApplyFilters(query, request);

        // 3. Total ANTES de paginar
        var totalItems = await query.CountAsync(ct);

        // 4. Sort + pagina + projeta para DTO
        var items = await query
            .ApplySortingAndPagination(request.Sort, request.Page, request.Size)
            .Select(x => new DummyItemResponse { /* ... */ })
            .ToListAsync(ct);

        // 5. Encapsula em PaginatedResponse
        return new PaginatedResponse<DummyItemResponse>(items, request.Page, totalItems, request.Size);
    }

    private static IQueryable<DummyItem> ApplyFilters(IQueryable<DummyItem> query, GetDummyItemsQuery request)
    {
        query = query.WhereIf(request.Statuses.Count > 0, x => request.Statuses.Contains(x.Status));
        query = query.WhereIf(request.MinPrice.HasValue, x => x.Price >= request.MinPrice!.Value);
        // ...
        return query;
    }
}
```

**Padrões obrigatórios:**
- Implementa `IRequestHandler<TQuery, TResponse>`.
- Recebe `DummyReadOnlyContext` (NoTracking) — Queries não escrevem.
- Método privado `ApplyFilters` que recebe `IQueryable<T>` e retorna `IQueryable<T>` filtrado.
- Use `WhereIf` (extension) em vez de `if (cond) query = query.Where(...)`.
- Para filtros de listas: `request.List.Count > 0` na condição + `request.List.Contains(x.Field)` no predicate.
- **Projete DIRETO para o DTO** com `Select()`. Não materialize a entidade primeiro.

---

## Padrão de DTOs de Response

```csharp
public record DummyCategoryResponse
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required string Code { get; init; }
    public string? Description { get; init; }
    public required string Status { get; init; }   // Display Name do enum, não o INT
    public int ItemsCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
```

**Regras:**
- SEMPRE `record`. Nunca `class`.
- `{ get; init; }` como default.
- `required` para propriedades obrigatórias não-nullable.
- `{ get; private set; }` para propriedades calculadas no construtor (ex: `TotalPages` em `PaginatedResponse`).
- `set` proibido (exceções raras como binding).
- Enums saem como **string Display Name**, não INT.
- Quando há lógica de inicialização (cálculos), use construtor — não initializer:

```csharp
public record PaginatedResponse<TData> : PaginatedResponse where TData : class
{
    public PaginatedResponse(List<TData> data, int currentPage, int totalItems, int sizePage)
    {
        Data = data;
        CurrentPage = currentPage;
        TotalItems = totalItems;
        TotalPages = sizePage > 0 ? (int)Math.Ceiling((double)totalItems / sizePage) : 0;
    }

    public List<TData> Data { get; private set; }
}
```

---

## Notification Pattern

Erros de NEGÓCIO esperados (categoria não existe, code duplicado, sem permissão para essa zona, etc.) **não são exceptions**. Eles são `Notification` adicionadas ao `INotificationService`.

### No Handler

```csharp
if (codeExists)
{
    _notifications.Notify(NotificationKey.DuplicateRecord, $"Code '{request.Code}' already exists");
    return Guid.Empty;  // ou default(T), ou simplesmente "return;"
}
```

### Chaves padronizadas (`NotificationKey`)

| Chave | Status HTTP | Quando usar |
|---|---|---|
| `ValidationError` | 400 | FluentValidation falhou (preenchido automaticamente pelo `ValidationBehavior`). |
| `DuplicateRecord` / `Conflict` | 409 | Tentativa de criar algo que já existe, ou conflito de versão. |
| `NotFound` | 404 | Entidade requisitada não existe. |
| `Unauthorized` | 401 | Permissão negada (use 403 se precisar de "logado mas sem permissão"). |
| `RequestHandler` / `Database` / `Exception` | 400 (default) | Genéricas. Prefira chaves mais específicas. |

### No ControllerBase

`ProcessResponse()` lê o `INotificationService`:
- Sem notifications → 200 OK / 204 NoContent.
- Com notification de `Unauthorized` → 401.
- Com notification de `NotFound` → 404.
- Com `DuplicateRecord` ou `Conflict` → 409.
- Demais → 400 BadRequest.

Tudo dentro do envelope `DataActionResult`.

### Exceptions ainda existem — mas para o quê?

Exceptions ficam reservadas para **falhas reais** (timeout de DB, bug não tratado, NullReferenceException). O `ErrorHandlingMiddleware` captura essas e responde:
- `DbUpdateException` com `PostgresException` → mapeia SQLState (`23505` → 409 duplicate, `23503` → 400 FK violation, etc.).
- Qualquer outra → 500 Internal Server Error (com `ex.Message` em Development, mensagem genérica em Production).

**Nunca lance exception para validar negócio.** Use Notification.

---

## Envelope de Resposta — `DataActionResult<T>`

**Toda** resposta da API tem o mesmo formato:

```json
// Sucesso
{
  "data": { ... ou [...] },
  "messages": null
}

// Erro (validação, regra de negócio, etc.)
{
  "data": null,
  "messages": [
    { "title": "DUPLICATE_RECORD", "detail": "Code 'X' already exists" }
  ]
}
```

**No controller, sempre via `ProcessResponse(...)`:**

```csharp
[HttpPost]
public async Task<IActionResult> Create([FromBody] CreateDummyCategoryCommand command, CancellationToken ct)
{
    var id = await _mediator.Send(command, ct);
    return ProcessResponse(id);   // ✅ encapsula em DataActionResult automaticamente
}
```

**Nunca:** `return Ok(id)`, `return BadRequest(error)`, `throw new HttpException(...)`. Sempre `ProcessResponse`.

---

## Pipeline MediatR

Toda requisição passa pelo `ValidationBehavior<TRequest, TResponse>` antes do handler:

```
Controller → mediator.Send(request)
              ↓
          ValidationBehavior.Handle()
              ↓
          request.IsValid() ?
              ├─ false → notifica + retorna default (handler NÃO executa)
              └─ true  → next() → Handler.Handle()
```

Registro automático em `MediatRConfiguration`:

```csharp
services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(applicationAssembly));
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
```

Para adicionar um behavior novo (logging, performance metrics, transação, cache), implemente `IPipelineBehavior<TRequest, TResponse>` e registre na mesma configuração.

---

## Mapeamento EF Core

Cada entidade tem um `Map` em `Dummy.Infra/Maps/`:

```csharp
public class DummyCategoryMap : MapBase<DummyCategory>
{
    public override void Configure(EntityTypeBuilder<DummyCategory> builder)
    {
        base.Configure(builder);  // PK + audit fields

        builder.ToTable("DummyCategories");
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Status).IsRequired().HasConversion<int>();  // enum como INT

        builder.HasMany(x => x.Items)
               .WithOne(x => x.Category)
               .HasForeignKey(x => x.CategoryId)
               .OnDelete(DeleteBehavior.Restrict);  // não cascateia delete

        builder.HasIndex(x => x.Code).IsUnique();
    }
}
```

**Regras:**
- Herde de `MapBase<T>` para herdar configuração de `Id`/`CreatedAt`/`UpdatedAt`.
- Enums sempre `HasConversion<int>()`.
- `OnDelete(DeleteBehavior.Restrict)` para FKs — apague filhos explicitamente, nunca via cascade.
- Decimal financeiro: `HasColumnType("decimal(18,2)")`.
- Unique constraints: `HasIndex(...).IsUnique()` (NÃO uses `[Index]` attribute).

`OnModelCreating` no DbContext aplica todos os Maps via reflexão:

```csharp
modelBuilder.ApplyConfigurationsFromAssembly(typeof(DummyContext).Assembly);
```

---

## Migrations

```bash
# Adicionar nova migration
dotnet ef migrations add NomeDaMigration -p src/Dummy.Infra -s src/Dummy.WebApi

# Rodar migrations contra o banco
dotnet ef database update -p src/Dummy.Infra -s src/Dummy.WebApi

# Reverter última
dotnet ef migrations remove -p src/Dummy.Infra -s src/Dummy.WebApi
```

**Em Development**, o `Program.cs` aplica migrations automaticamente no startup. Em Production isso é responsabilidade do pipeline de deploy.

---

## Controllers

```csharp
public class DummyCategoriesController : DummyControllerBase
{
    private readonly IMediator _mediator;

    public DummyCategoriesController(IMediator mediator, INotificationService notifications) : base(notifications)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] GetDummyCategoriesQuery query, CancellationToken ct)
    {
        var result = await _mediator.Send(query, ct);
        return ProcessResponse(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDummyCategoryCommand command, CancellationToken ct)
    {
        var id = await _mediator.Send(command, ct);
        return ProcessResponse(id);
    }
}
```

**Padrões obrigatórios:**
- Herda `DummyControllerBase` (já marcado `[ApiController]`, `[Authorize]`, `[Route("api/[controller]")]`).
- Construtor recebe `IMediator` e `INotificationService` — esse último é passado para a base.
- Action é fina: apenas `mediator.Send(...)` + `ProcessResponse(...)`. Sem lógica.
- Use `[AllowAnonymous]` em endpoints públicos (sobrescreve o `[Authorize]` da base).
- Para custom verbs use `:`:
  ```csharp
  [HttpGet("status:list-all")]   // → GET /api/dummycategories/status:list-all
  ```

---

## Autenticação

JWT Bearer genérico configurado em `JwtAuthenticationConfiguration`. Configure via `appsettings.json`:

```json
"Jwt": {
  "Authority": "https://your-issuer/",
  "Audience": "your-api-audience",
  "RequireHttpsMetadata": true,
  "OAuth2": {
    "AuthorizationUrl": "https://your-issuer/oauth/authorize",
    "TokenUrl": "https://your-issuer/oauth/token"
  }
}
```

Compatível com Keycloak, Auth0, IdentityServer, Cognito ou qualquer issuer OpenID Connect.

Para autorização baseada em role, anote no controller:

```csharp
[Authorize(Roles = "admin")]
[HttpPost]
public async Task<IActionResult> Create(...) { /* ... */ }
```

---

## Health Checks

| Endpoint | Predicate | Uso |
|---|---|---|
| `GET /health/live` | nada | Liveness probe — só responde "estou vivo" |
| `GET /health/ready` | tag `ready` | Readiness probe — Postgres conectável |
| `GET /health/dependencies` | tag `dependencies` | Status detalhado de dependências externas |

Para adicionar uma dependência (Redis, RabbitMQ, etc.), edite `HealthChecksConfiguration.AddHealthChecksConfiguration` e adicione a tag apropriada.

---

## Logging

Serilog com Console + File rotativo diário (em `logs/dummy-YYYYMMDD.log`, retenção 14 dias). Já enriquecido com MachineName, ThreadId, EnvironmentName.

```csharp
private readonly ILogger<MyHandler> _logger;

_logger.LogInformation("Created {Type} {Id}", type, id);
_logger.LogWarning("Code {Code} not found", code);
_logger.LogError(ex, "Failed to merge {Count} items", count);
```

Para adicionar sinks (Datadog, Seq, Elasticsearch), edite o `builder.Host.UseSerilog(...)` em `Program.cs`.

---

## Testes

```bash
dotnet test
```

### Padrão AAA com comentários explícitos

```csharp
[Fact]
public async Task Handle_WithDuplicateCode_ShouldNotifyAndReturnEmptyGuid()
{
    //ARRANGE
    _writeCtx.DummyCategories.Add(new DummyCategory("Existing", "DUP-1", null, DummyStatus.Active));
    await _writeCtx.SaveChangesAsync();
    var command = new CreateDummyCategoryCommand { Name = "X", Code = "DUP-1", Status = DummyStatus.Active };

    //ACTION
    var id = await _handler.Handle(command, CancellationToken.None);

    //ASSERT
    Assert.Equal(Guid.Empty, id);
    _notifications.Received(1).Notify(NotificationKey.DuplicateRecord, Arg.Any<string>(), Arg.Any<string?>());
}
```

### Convenção de nomenclatura

```
[Method]_[Scenario]_Should[Expected]

✓ Handle_WithValidCommand_ShouldPersistAndReturnId
✓ Validate_NameEmpty_ShouldHaveValidationError
✓ Create_WithValidParameters_ShouldSetAllProperties
```

### O que testar

- Métodos de domínio das entidades.
- Validators (cada `RuleFor`).
- Regras de negócio dos handlers (duplicidade, FK exists).
- `ApplyFilters` dos query handlers (cada filtro isolado).
- `EnumExtensions` (Display Name + Description + parse).

### O que NÃO testar em unitário

- Caminho que depende de SQL real (ex: bulk merge com `SqlComplexOperations`). Cubra em testes de integração.
- O middleware de erro (HTTP-level — testes de integração).
- A configuração de DI (cobertura via teste E2E).

### Banco em memória

```csharp
// Apenas write
var ctx = DummyDbContextFactory.CreateWriteContext();

// Par write+read compartilhando MESMO banco em memória
var (write, read) = DummyDbContextFactory.CreateReadWriteContexts();
```

Cada chamada usa `Guid.NewGuid()` como nome do banco → isolamento total entre testes.

---

## Convenções de nomenclatura

| Tipo | Sufixo | Exemplo |
|---|---|---|
| Command | `Command` | `CreateDummyCategoryCommand` |
| Command Handler | `CommandHandler` | `CreateDummyCategoryCommandHandler` |
| Command Validator | `CommandValidator` | `CreateDummyCategoryCommandValidator` |
| Query | `Query` | `GetDummyItemsQuery` |
| Query Handler | `QueryHandler` | `GetDummyItemsQueryHandler` |
| Query Validator | `QueryValidator` | `GetDummyItemsQueryValidator` |
| DTO de Response | `Response` | `DummyCategoryResponse` |
| Map (EF) | `Map` | `DummyCategoryMap` |
| Extension class | `Extensions` | `QueryableExtensions` |
| Async method | `Async` | `Handle` (MediatR já é assíncrono — não duplique sufixo). Em outros métodos próprios, `FetchAsync`, `ProcessAsync`. |

### Estrutura de pastas para uma feature

```
Dummy.Application/
├── Commands/<Aggregate>/<Feature>/
│   ├── <Feature>Command.cs
│   ├── <Feature>CommandValidator.cs
│   └── <Feature>CommandHandler.cs
├── Queries/<Aggregate>/<Feature>/
│   ├── <Feature>Query.cs
│   ├── <Feature>QueryValidator.cs
│   └── <Feature>QueryHandler.cs
└── Dtos/<Aggregate>/
    └── <Aggregate>Response.cs
```

Um arquivo por classe — não junte command, validator e handler no mesmo arquivo.

---

## Checklist antes de fazer PR

### Para um Command novo
- [ ] É um `record` que herda `RequestBase<T>` ou `RequestBase`.
- [ ] Propriedades nullable + `init`. Nada de `required`, nada de `set`.
- [ ] Listas multi-valor: não-nullable, `= []`.
- [ ] Enums chegam tipados (`MyEnum?`), não como `string?`.
- [ ] `IsValid()` chama o validator concreto.
- [ ] Validator só faz validação estrutural.
- [ ] Handler tem `ComplexValidations` para regras de banco.
- [ ] Handler usa `_notifications.Notify(...)` em vez de `throw`.
- [ ] Handler injeta `ILogger<THandler>` e loga eventos importantes.
- [ ] Handler usa `DummyContext` (write) — não o ReadOnly.

### Para uma Query nova
- [ ] É um `record` que herda `RequestBase<T>` (não paginada) ou `PaginatedRequest<T>` (paginada).
- [ ] Filtros multi-valor: lista não-nullable, `= []`.
- [ ] Filtros single-value opcionais: nullable.
- [ ] Validator paginado: `Include(new PaginatedRequestValidator<TQuery>())`.
- [ ] Handler usa `DummyReadOnlyContext` (NoTracking).
- [ ] Handler tem método privado `ApplyFilters`.
- [ ] Filtros condicionais via `WhereIf` (não `if`).
- [ ] Projeção direta para DTO no `Select(...)`.

### Para uma Entidade nova
- [ ] Herda `EntityBase`.
- [ ] Construtor protegido sem parâmetros (para EF).
- [ ] Construtor público com parâmetros (validação no domínio).
- [ ] Construtor de filho recebe entidade pai completa, não Id.
- [ ] Imutáveis com `init`, mutáveis com `private set`.
- [ ] Mudança de estado via método de domínio (chama `Update()` no fim).
- [ ] Tem um `Map` em `Dummy.Infra/Maps/`.
- [ ] Tem `DbSet<T>` nos dois contextos (DummyContext e DummyReadOnlyContext).
- [ ] Migration gerada e revisada.
- [ ] Testes unitários da entidade (construtor + métodos de domínio).

### Para um Endpoint novo
- [ ] Controller herda `DummyControllerBase`.
- [ ] Action é fina: `_mediator.Send(...)` + `ProcessResponse(...)`.
- [ ] Resposta sempre via `ProcessResponse` (envelope `DataActionResult`).
- [ ] `[Authorize]` ou `[AllowAnonymous]` explícito.
- [ ] Custom verb usando `:` quando aplicável.

---

## Referências cruzadas

- `src/Dummy.Domain/Models/EntityBase.cs` — base de toda entidade.
- `src/Dummy.Application/Dtos/Core/RequestBase.cs` — base de todo Command/Query.
- `src/Dummy.Application/Dtos/Core/DataActionResult.cs` — envelope de toda resposta.
- `src/Dummy.Application/Behaviors/ValidationBehavior.cs` — pipeline que executa `IsValid()`.
- `src/Dummy.Domain/Notifications/Notification.cs` — `NotificationKey` com chaves padronizadas.
- `src/Dummy.WebApi/Controllers/DummyControllerBase.cs` — `ProcessResponse` e mapeamento de status.
- `src/Dummy.Infra/Extensions/QueryableExtensions.cs` — `WhereIf`, `ApplyPagination`, `ApplySortingAndPagination`.
