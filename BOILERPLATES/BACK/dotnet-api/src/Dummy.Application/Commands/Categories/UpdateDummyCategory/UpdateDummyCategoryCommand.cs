using Dummy.Application.Dtos.Core;
using Dummy.Domain.Enums;
using MediatR;
using System.Text.Json.Serialization;

namespace Dummy.Application.Commands.Categories.UpdateDummyCategory;

/// <summary>
/// Command de atualização. Retorna Unit (sucesso = NoContent, falha = notifications).
///
/// Id vem do path parameter — usa [JsonIgnore] para não vir do body e
/// é preenchido pelo controller via with-expression.
/// </summary>
public record UpdateDummyCategoryCommand : RequestBase
{
    [JsonIgnore]
    public Guid Id { get; init; }

    public string? Name { get; init; }

    public string? Description { get; init; }

    public DummyStatus? Status { get; init; }

    public override bool IsValid()
    {
        ValidationResult = new UpdateDummyCategoryCommandValidator().Validate(this);
        return ValidationResult.IsValid;
    }
}
