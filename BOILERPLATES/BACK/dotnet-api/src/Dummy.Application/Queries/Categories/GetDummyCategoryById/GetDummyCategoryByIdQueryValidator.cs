using FluentValidation;

namespace Dummy.Application.Queries.Categories.GetDummyCategoryById;

public class GetDummyCategoryByIdQueryValidator : AbstractValidator<GetDummyCategoryByIdQuery>
{
    public GetDummyCategoryByIdQueryValidator()
    {
        RuleFor(x => x.Id)
            .NotNull()
            .NotEqual(Guid.Empty);
    }
}
