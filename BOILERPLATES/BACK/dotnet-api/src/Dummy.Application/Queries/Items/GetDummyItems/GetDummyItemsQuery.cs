using Dummy.Application.Dtos.Core;
using Dummy.Application.Dtos.Items;
using Dummy.Domain.Enums;

namespace Dummy.Application.Queries.Items.GetDummyItems;

/// <summary>
/// Query PAGINADA — herda PaginatedRequest&lt;T&gt; para ganhar Page/Size/Sort do query string.
/// Resposta vem encapsulada em PaginatedResponse&lt;T&gt; (Data + CurrentPage + TotalItems + TotalPages).
/// </summary>
public record GetDummyItemsQuery : PaginatedRequest<PaginatedResponse<DummyItemResponse>>
{
    public List<Guid> CategoryIds { get; init; } = [];

    public List<DummyStatus> Statuses { get; init; } = [];

    public List<DummyPriority> Priorities { get; init; } = [];

    public decimal? MinPrice { get; init; }

    public decimal? MaxPrice { get; init; }

    public string? Search { get; init; }

    public override bool IsValid()
    {
        ValidationResult = new GetDummyItemsQueryValidator().Validate(this);
        return ValidationResult.IsValid;
    }
}
