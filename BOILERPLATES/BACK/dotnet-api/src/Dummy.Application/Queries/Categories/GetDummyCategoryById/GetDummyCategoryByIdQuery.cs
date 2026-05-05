using Dummy.Application.Dtos.Categories;
using Dummy.Application.Dtos.Core;

namespace Dummy.Application.Queries.Categories.GetDummyCategoryById;

/// <summary>
/// Query simples de busca por Id. Demonstra que Queries também herdam RequestBase&lt;T&gt;.
/// Resposta nullable: null = NotFound (handler notifica e retorna null).
/// </summary>
public record GetDummyCategoryByIdQuery : RequestBase<DummyCategoryResponse?>
{
    public Guid? Id { get; init; }

    public override bool IsValid()
    {
        ValidationResult = new GetDummyCategoryByIdQueryValidator().Validate(this);
        return ValidationResult.IsValid;
    }
}
