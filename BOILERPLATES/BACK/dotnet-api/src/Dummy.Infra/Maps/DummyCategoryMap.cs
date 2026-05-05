using Dummy.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dummy.Infra.Maps;

/// <summary>
/// Mapeamento da DummyCategory.
/// Padrões:
/// - Enum salvo como int (HasConversion&lt;int&gt;)
/// - Code é unique index
/// - Relação 1:N com DummyItems com OnDelete.Restrict (não cascateia delete)
/// </summary>
public class DummyCategoryMap : MapBase<DummyCategory>
{
    public override void Configure(EntityTypeBuilder<DummyCategory> builder)
    {
        base.Configure(builder);

        builder.ToTable("DummyCategories");

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Code)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.Description)
            .HasMaxLength(1000);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.HasMany(x => x.Items)
            .WithOne(x => x.Category)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.Name);
    }
}
