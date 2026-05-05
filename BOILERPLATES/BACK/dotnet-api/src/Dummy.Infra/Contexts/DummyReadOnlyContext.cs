using Dummy.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Dummy.Infra.Contexts;

/// <summary>
/// DbContext de LEITURA. NoTracking habilitado por default.
/// SaveChanges/SaveChangesAsync lançam exception — segurança contra escrita acidental.
///
/// Usado por Query Handlers. Aponta para a mesma connection string que DummyContext
/// (não é uma réplica física — é apenas uma garantia em código).
/// </summary>
public class DummyReadOnlyContext : DbContext
{
    public DummyReadOnlyContext(DbContextOptions<DummyReadOnlyContext> options) : base(options)
    {
    }

    public DbSet<DummyCategory> DummyCategories { get; set; }
    public DbSet<DummyItem> DummyItems { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
        }
        base.OnConfiguring(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DummyReadOnlyContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override int SaveChanges() =>
        throw new InvalidOperationException("This context is read-only. Use DummyContext for write operations.");

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        throw new InvalidOperationException("This context is read-only. Use DummyContext for write operations.");
}
