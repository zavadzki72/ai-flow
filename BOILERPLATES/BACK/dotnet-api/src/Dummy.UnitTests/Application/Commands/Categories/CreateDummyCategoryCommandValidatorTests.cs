using Dummy.Application.Commands.Categories.CreateDummyCategory;
using Dummy.Domain.Enums;
using FluentValidation.TestHelper;

namespace Dummy.UnitTests.Application.Commands.Categories;

/// <summary>
/// Testa SOMENTE o validator (porta de entrada).
/// Regras de negócio (duplicidade, FK exists) são testadas no handler test.
/// </summary>
public class CreateDummyCategoryCommandValidatorTests
{
    private readonly CreateDummyCategoryCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_ShouldNotHaveErrors()
    {
        //ARRANGE
        var command = new CreateDummyCategoryCommand
        {
            Name = "Beverages",
            Code = "BEV-001",
            Description = "Drinks",
            Status = DummyStatus.Active
        };

        //ACTION
        var result = _validator.TestValidate(command);

        //ASSERT
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_NameEmpty_ShouldHaveValidationError()
    {
        //ARRANGE
        var command = new CreateDummyCategoryCommand
        {
            Name = "",
            Code = "BEV-001",
            Status = DummyStatus.Active
        };

        //ACTION
        var result = _validator.TestValidate(command);

        //ASSERT
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Validate_CodeTooLong_ShouldHaveValidationError()
    {
        //ARRANGE
        var command = new CreateDummyCategoryCommand
        {
            Name = "Name",
            Code = new string('A', 21),
            Status = DummyStatus.Active
        };

        //ACTION
        var result = _validator.TestValidate(command);

        //ASSERT
        result.ShouldHaveValidationErrorFor(x => x.Code);
    }

    [Fact]
    public void Validate_StatusNull_ShouldHaveValidationError()
    {
        //ARRANGE
        var command = new CreateDummyCategoryCommand
        {
            Name = "Name",
            Code = "C-1",
            Status = null
        };

        //ACTION
        var result = _validator.TestValidate(command);

        //ASSERT
        result.ShouldHaveValidationErrorFor(x => x.Status);
    }
}
