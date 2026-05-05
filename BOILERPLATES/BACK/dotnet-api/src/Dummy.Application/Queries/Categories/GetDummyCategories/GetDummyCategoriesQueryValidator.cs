using FluentValidation;

namespace Dummy.Application.Queries.Categories.GetDummyCategories;

public class GetDummyCategoriesQueryValidator : AbstractValidator<GetDummyCategoriesQuery>
{
    public GetDummyCategoriesQueryValidator()
    {
        RuleForEach(x => x.Statuses)
            .IsInEnum()
            .When(x => x.Statuses.Count > 0);

        RuleFor(x => x.Search)
            .MaximumLength(200);
    }
}
