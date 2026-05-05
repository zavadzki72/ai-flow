using Dummy.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Dummy.Infra.Contexts;

/// <summary>
/// DbContext de ESCRITA. Tracking habilitado.
/// Usado por Command Handlers para CRUD.
///
/// Mantém uma separação proposital com DummyReadOnlyContext: queries usam o read-only
/// para garantir NoTracking e evitar erros de tracking acidental em projeções complexas.
/// </summary>
public class DummyContext : DbContext
{
    public DummyContext(DbContextOptions<DummyContext> options) : base(options)
    {
    }

    public DbSet<DummyCategory> DummyCategories { get; set; }
    public DbSet<DummyItem> DummyItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DummyContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
