namespace Dummy.Application.Dtos.Core;

/// <summary>
/// DTO para endpoints :list-all de enums.
/// Permite que o frontend monte dropdowns sem hardcode de valores.
/// </summary>
public record EnumOptionResponse
{
    /// <summary>Valor INT armazenado no banco.</summary>
    public required int Value { get; init; }

    /// <summary>Display Name (curto). Ex: "Active", "$Mio".</summary>
    public required string Label { get; init; }

    /// <summary>Description (longo). Ex: "Active and available for use". Null se não houver.</summary>
    public string? Name { get; init; }
}
