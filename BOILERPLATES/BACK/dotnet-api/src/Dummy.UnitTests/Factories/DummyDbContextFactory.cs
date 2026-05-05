using Dummy.Infra.Contexts;
using Microsoft.EntityFrameworkCore;

namespace Dummy.UnitTests.Factories;

/// <summary>
/// Cria DbContexts in-memory isolados por teste (cada chamada usa um Guid único).
/// O par Read+Write compartilha o MESMO banco em memória — dados gravados via Write
/// ficam visíveis no Read.
/// </summary>
public static class DummyDbContextFactory
{
    public static DummyContext CreateWriteContext()
    {
        var options = new DbContextOptionsBuilder<DummyContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new DummyContext(options);
    }

    public static (DummyContext Write, DummyReadOnlyContext Read) CreateReadWriteContexts()
    {
        var databaseName = Guid.NewGuid().ToString();

        var writeOptions = new DbContextOptionsBuilder<DummyContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        var readOptions = new DbContextOptionsBuilder<DummyReadOnlyContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return (new DummyContext(writeOptions), new InMemoryDummyReadOnlyContext(readOptions));
    }

    /// <summary>
    /// Subclasse interna usada APENAS em testes.
    /// O ReadOnlyContext de produção bloqueia SaveChanges; em testes precisamos do mesmo
    /// comportamento de leitura sem o bloqueio que atrapalharia o EF InMemory provider.
    /// </summary>
    internal class InMemoryDummyReadOnlyContext : DummyReadOnlyContext
    {
        public InMemoryDummyReadOnlyContext(DbContextOptions<DummyReadOnlyContext> options) : base(options) { }
    }
}
