using FluentValidation;

namespace Dummy.Application.Commands.Categories.UpdateDummyCategory;

public class UpdateDummyCategoryCommandValidator : AbstractValidator<UpdateDummyCategoryCommand>
{
    public UpdateDummyCategoryCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Description)
            .MaximumLength(1000);

        RuleFor(x => x.Status)
            .NotNull()
            .IsInEnum();
    }
}
