using Dummy.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Dummy.Infra.Maps;

/// <summary>
/// Configuração base para todas as entidades EntityBase.
/// Concentra mapeamento de Id (PK) + audit fields (CreatedAt, UpdatedAt).
/// Subclasses chamam base.Configure(builder) e adicionam seus próprios mapeamentos.
/// </summary>
public abstract class MapBase<T> : IEntityTypeConfiguration<T> where T : EntityBase
{
    public virtual void Configure(EntityTypeBuilder<T> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired();
    }
}
