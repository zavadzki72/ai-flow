using Dummy.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dummy.Infra.Maps;

/// <summary>
/// Mapeamento da DummyItem (entidade filha).
/// Decimal mapeado explicitamente para decimal(18,2) — evita warnings do EF
/// e padroniza precisão financeira.
/// </summary>
public class DummyItemMap : MapBase<DummyItem>
{
    public override void Configure(EntityTypeBuilder<DummyItem> builder)
    {
        base.Configure(builder);

        builder.ToTable("DummyItems");

        builder.Property(x => x.CategoryId)
            .IsRequired();

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Code)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.Description)
            .HasMaxLength(1000);

        builder.Property(x => x.Priority)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(x => x.Price)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.HasOne(x => x.Category)
            .WithMany(x => x.Items)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.Priority);
        builder.HasIndex(x => x.CategoryId);
    }
}
