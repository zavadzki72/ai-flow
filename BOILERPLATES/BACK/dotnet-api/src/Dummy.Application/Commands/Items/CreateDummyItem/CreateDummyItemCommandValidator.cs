using FluentValidation;

namespace Dummy.Application.Commands.Items.CreateDummyItem;

public class CreateDummyItemCommandValidator : AbstractValidator<CreateDummyItemCommand>
{
    public CreateDummyItemCommandValidator()
    {
        RuleFor(x => x.CategoryId)
            .NotNull()
            .NotEqual(Guid.Empty);

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Code)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(x => x.Description)
            .MaximumLength(1000);

        RuleFor(x => x.Priority)
            .NotNull()
            .IsInEnum();

        RuleFor(x => x.Price)
            .NotNull()
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.Status)
            .NotNull()
            .IsInEnum();
    }
}
