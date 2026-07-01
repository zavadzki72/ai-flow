# Lente: .NET / C#

Conhecimento idiomático **genérico** de .NET/C# para apoiar o `dev-senior`.

> ⚠️ **Precedência:** o `docs/architecture/` **DO PROJETO** sempre vence esta lente.
> Esta lente é genérica da linguagem; o `docs/architecture/` é a verdade específica do projeto.
> Em conflito, siga o projeto.

## Idiomas e boas práticas

- **Assíncrono ponta a ponta:** propague `CancellationToken` em TODA operação de I/O (DB, HTTP,
  arquivo) e honre-o. Nunca `.Result`/`.Wait()`/`.GetAwaiter().GetResult()` — sync-over-async causa
  deadlock e starvation do thread-pool. Em bibliotecas use `ConfigureAwait(false)`; em ASP.NET Core não é necessário.
- **EF Core:** leitura com `AsNoTracking()`; **projete direto para o DTO com `Select()`** (traz só as
  colunas usadas); combata N+1 com `Include`/projeção; enumere a query uma única vez
  (`ToListAsync`/`AnyAsync`/`CountAsync`). `IQueryable` compõe no servidor — não force `.ToList()` cedo e continue filtrando em memória.
- **`record` para DTOs/value objects** (igualdade por valor + `with`), `class` só quando há identidade/estado
  mutável. `init` para set-once, `required` para obrigatório; `{ get; private set; }` em entidade (mudança via método nomeado, nunca setter público).
- **Nullable reference types** habilitado e warnings como erro. Não silencie com `!` — corrija a
  origem. Guard clauses no topo: `ArgumentNullException.ThrowIfNull(x)`, `ArgumentException.ThrowIfNullOrWhiteSpace(s)`.
- **DI por abstração e lifetime correto:** `DbContext`/unit-of-work são `Scoped`; nunca injete um
  `Scoped` num `Singleton` (captive dependency). `HttpClient` sempre via `IHttpClientFactory`, jamais `new HttpClient()` em loop (socket exhaustion).
- **Erro de negócio esperado** (duplicado, não encontrado, sem permissão) é retorno explícito
  (Result/Notification/`OneOf`), não exception. Exception é para o excepcional. Ao relançar, `throw;` (preserva stack), nunca `throw ex;`.
- **Pattern matching moderno** (switch expressions, property/relational/list patterns) no lugar de cadeias `if/else` e casts manuais.
- **`decimal` para dinheiro** — nunca `double`/`float`. `DateTimeOffset`/`DateTime.UtcNow` para
  instantes, nunca `DateTime.Now`. Injete tempo via `TimeProvider` para testabilidade.
- **Libere recursos deterministicamente:** `using var`/`await using`. Prefira `IAsyncEnumerable<T>` + `await foreach` para streaming.
- **Coleções/strings:** `Any()` em vez de `Count() > 0`; conheça `First`/`Single`/`FirstOrDefault`/`SingleOrDefault`;
  comparação com `StringComparison` explícito (`Ordinal`/`OrdinalIgnoreCase` para chaves); `StringBuilder`/interpolação em loop.
- **`sealed` por padrão** em classes não projetadas para herança; prefira composição a herança profunda.
- **Config/segredos via `IOptions<T>`** com POCO validado (`ValidateOnStart`). `System.Text.Json` como default; enums como string (`JsonStringEnumConverter`).

## Armadilhas comuns

- Deadlock/starvation por sync-over-async (`.Result`, `.Wait()`).
- `async void` fora de event handler: exceção não observável, derruba o processo, não testável. Use `async Task`.
- N+1 no EF Core: acessar navigation property fora da query (ou lazy loading). Resolva com `Include`/projeção.
- `DbContext` não é thread-safe: instância em `Task`s paralelas (ou capturada além do escopo `Scoped`) lança "second operation started".
- Enumerar `IEnumerable`/`IQueryable` mais de uma vez: re-executa (round-trips extras); cuidado com deferred execution segurando um `DbContext` já disposto.
- `FromSqlRaw`/`ExecuteSqlRaw` com string interpolada = SQL injection. Use `FromSqlInterpolated`/parâmetros.
- Struct mutável em coleção (muda a cópia, não o original) e boxing silencioso.
- Sobrescrever `Equals` sem `GetHashCode`, ou usar entidade mutável como chave de `Dictionary`/`HashSet`. `record` resolve.

## Testes

- xUnit + FluentAssertions + NSubstitute/Moq (ou o que o `docs/architecture/` definir); Arrange/Act/Assert; nome `[Metodo]_[Cenario]_Should[Esperado]`.
- Testes async retornam `Task` (nunca `async void`). Exceções assíncronas com `await Assert.ThrowsAsync<T>(...)`.
- EF Core InMemory NÃO valida constraints/unique nem traduz SQL real — para query complexa/integridade use SQLite in-memory ou Testcontainers.
- Mock apenas as fronteiras (I/O, relógio, aleatoriedade — injete `TimeProvider`). Teste comportamento observável; sem over-mocking.
- `[Theory]` + `[InlineData]`/`[MemberData]` para casos parametrizados; cubra happy path + erros + edge (null, vazio, limite).
- Isolamento entre testes (contexto/dados próprios); sem estado estático compartilhado que crie flakiness.

## Segurança

- SQL injection: sempre parâmetros / `FromSqlInterpolated` / LINQ tipado.
- Segredos fora do código: User Secrets em dev, cofre/variáveis de ambiente em prod. Connection strings/API keys nunca hardcoded.
- Senha com KDF forte (PBKDF2/BCrypt/Argon2) + salt; comparação timing-safe (`CryptographicOperations.FixedTimeEquals`). Nunca MD5/SHA cru.
- Autorização explícita na borda (`[Authorize]`, policies/roles); proteja contra over-posting usando DTO de entrada — nunca bind direto na entidade.
- Não logar/serializar PII (CPF, token, senha); controle o que sai no DTO de resposta.

## Nomenclatura e estrutura

- `PascalCase` para tipos/métodos/props públicas; `camelCase` para locais; `_camelCase` para campos
  privados; interfaces com `I`. Sufixo `Async` em métodos async (exceto convenções de framework).
- Um tipo público por arquivo (nome = tipo); namespaces espelham pastas (file-scoped). Não junte Command + Validator + Handler no mesmo arquivo.
- Sufixos por papel conforme o projeto (`Command`/`Query`/`Handler`/`Validator`/`Response`). Siga o `docs/architecture/` quando ele especificar.

## Anti-patterns a evitar

- Entidade anêmica: dados sem comportamento, setters públicos, regra vazando pro service.
- `async void` (fora de event handler) e sync-over-async.
- Service Locator / `new` de dependência no handler em vez de injeção; `new HttpClient()` em vez de `IHttpClientFactory`.
- God class/método (>~30 linhas / >~300 linhas); cadeias longas de `if/switch` sobre tipo/enum onde cabe polimorfismo/pattern matching.
- `catch (Exception)` que engole o erro; `throw ex;` que apaga o stack. Exception como fluxo normal.
- Primitive obsession (`string`/`Guid` cru carregando semântica de CPF/e-mail/Money); strings mágicas onde cabe enum.
- Reinventar o que o framework dá (paginação/validação/serialização ad-hoc; `Newtonsoft` por inércia quando `System.Text.Json` resolve).
