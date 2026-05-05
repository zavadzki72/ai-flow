using Dummy.Application.Dtos.Categories;
using Dummy.Application.Dtos.Core;
using Dummy.Domain.Enums;

namespace Dummy.Application.Queries.Categories.GetDummyCategories;

/// <summary>
/// Query NÃO PAGINADA — retorna lista completa de categorias.
/// Padrões de filtros:
/// - Listas para filtros multi-valor (NÃO nullable, inicializadas com [])
/// - Single-value como nullable (Status?)
/// - Strings de busca como nullable
/// </summary>
public record GetDummyCategoriesQuery : RequestBase<List<DummyCategoryResponse>>
{
    /// <summary>Filtro multi-valor por status. Lista vazia = sem filtro.</summary>
    public List<DummyStatus> Statuses { get; init; } = [];

    /// <summary>Busca textual em Name (LIKE %term%). Null/vazio = sem filtro.</summary>
    public string? Search { get; init; }

    public override bool IsValid()
    {
        ValidationResult = new GetDummyCategoriesQueryValidator().Validate(this);
        return ValidationResult.IsValid;
    }
}
