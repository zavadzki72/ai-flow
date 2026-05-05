namespace Dummy.Application.Dtos.Categories;

/// <summary>
/// DTO de Response — record imutável.
/// Padrões obrigatórios:
/// - record (NUNCA classe)
/// - { get; init; } como default
/// - required para campos obrigatórios não-nullable
/// - Enums serializados como string (Display Name)
/// </summary>
public record DummyCategoryResponse
{
    public required Guid Id { get; init; }

    public required string Name { get; init; }

    public required string Code { get; init; }

    public string? Description { get; init; }

    /// <summary>Status como Display Name (ex: "Active").</summary>
    public required string Status { get; init; }

    public int ItemsCount { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }
}
