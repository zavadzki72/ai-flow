using Dummy.Application.Behaviors.CoreValidators;
using FluentValidation;

namespace Dummy.Application.Queries.Items.GetDummyItems;

/// <summary>
/// Inclui as regras paginadas (Page/Size) e adiciona regras específicas.
/// </summary>
public class GetDummyItemsQueryValidator : AbstractValidator<GetDummyItemsQuery>
{
    public GetDummyItemsQueryValidator()
    {
        Include(new PaginatedRequestValidator<GetDummyItemsQuery>());

        RuleForEach(x => x.CategoryIds)
            .NotEqual(Guid.Empty)
            .When(x => x.CategoryIds.Count > 0);

        RuleForEach(x => x.Statuses)
            .IsInEnum()
            .When(x => x.Statuses.Count > 0);

        RuleForEach(x => x.Priorities)
            .IsInEnum()
            .When(x => x.Priorities.Count > 0);

        RuleFor(x => x.MinPrice)
            .GreaterThanOrEqualTo(0)
            .When(x => x.MinPrice.HasValue);

        RuleFor(x => x.MaxPrice)
            .GreaterThanOrEqualTo(0)
            .When(x => x.MaxPrice.HasValue);

        RuleFor(x => x)
            .Must(x => !x.MinPrice.HasValue || !x.MaxPrice.HasValue || x.MinPrice <= x.MaxPrice)
            .WithMessage("MinPrice must be less than or equal to MaxPrice");

        RuleFor(x => x.Search)
            .MaximumLength(200);
    }
}
