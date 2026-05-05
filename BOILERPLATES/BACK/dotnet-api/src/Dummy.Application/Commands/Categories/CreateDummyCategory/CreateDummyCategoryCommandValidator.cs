using FluentValidation;

namespace Dummy.Application.Commands.Categories.CreateDummyCategory;

/// <summary>
/// Validator de PORTA DE ENTRADA. Apenas regras estruturais:
/// NotNull, NotEmpty, MaxLength, IsInEnum, Range.
///
/// Regras de negócio (duplicidade, FK existence, etc.) ficam no Handler.
/// </summary>
public class CreateDummyCategoryCommandValidator : AbstractValidator<CreateDummyCategoryCommand>
{
    public CreateDummyCategoryCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Code)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(x => x.Description)
            .MaximumLength(1000);

        RuleFor(x => x.Status)
            .NotNull()
            .IsInEnum();
    }
}
