using Dummy.Application.Dtos.Core;
using Dummy.Domain.Enums;

namespace Dummy.Application.Commands.Items.CreateDummyItem;

/// <summary>
/// Command de criação de DummyItem (item filho com FK para Category).
/// CategoryId é obrigatório — handler valida que a Category existe.
/// </summary>
public record CreateDummyItemCommand : RequestBase<Guid>
{
    public Guid? CategoryId { get; init; }

    public string? Name { get; init; }

    public string? Code { get; init; }

    public string? Description { get; init; }

    public DummyPriority? Priority { get; init; }

    public decimal? Price { get; init; }

    public DummyStatus? Status { get; init; }

    public override bool IsValid()
    {
        ValidationResult = new CreateDummyItemCommandValidator().Validate(this);
        return ValidationResult.IsValid;
    }
}
