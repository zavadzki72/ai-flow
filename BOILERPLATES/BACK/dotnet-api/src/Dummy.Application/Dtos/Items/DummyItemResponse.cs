namespace Dummy.Application.Dtos.Items;

/// <summary>
/// DTO de Response para DummyItem. Inclui dados denormalizados da Category pai
/// (CategoryName, CategoryCode) para evitar joins extras no frontend.
/// </summary>
public record DummyItemResponse
{
    public required Guid Id { get; init; }

    public required Guid CategoryId { get; init; }

    public required string CategoryName { get; init; }

    public required string CategoryCode { get; init; }

    public required string Name { get; init; }

    public required string Code { get; init; }

    public string? Description { get; init; }

    /// <summary>Priority como Display Name (ex: "High").</summary>
    public required string Priority { get; init; }

    public decimal Price { get; init; }

    /// <summary>Status como Display Name.</summary>
    public required string Status { get; init; }

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }
}
