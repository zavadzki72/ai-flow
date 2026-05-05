using Dummy.Application.Dtos.Core;
using Dummy.Domain.Enums;

namespace Dummy.Application.Commands.Categories.CreateDummyCategory;

/// <summary>
/// Command de criação de DummyCategory.
/// Padrões obrigatórios (ver docs/architecture/commands-queries-patterns):
/// - record que herda RequestBase&lt;TResponse&gt;
/// - Propriedades nullable + { get; init; }
/// - Enums recebidos como enum (não string)
/// - Listas não nullable, inicializadas com = []
/// - NUNCA usar required, NUNCA usar set
/// </summary>
public record CreateDummyCategoryCommand : RequestBase<Guid>
{
    public string? Name { get; init; }

    public string? Code { get; init; }

    public string? Description { get; init; }

    public DummyStatus? Status { get; init; }

    public override bool IsValid()
    {
        ValidationResult = new CreateDummyCategoryCommandValidator().Validate(this);
        return ValidationResult.IsValid;
    }
}
