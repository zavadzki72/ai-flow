using Dummy.Domain.Interfaces;
using FluentValidation;

namespace Dummy.Application.Behaviors.CoreValidators;

/// <summary>
/// Validator base para qualquer Query que herda PaginatedRequest.
/// Garante limites mínimos para Page (>= 0) e Size (1..100).
/// Use no validator concreto: Include(new PaginatedRequestValidator&lt;MyQuery&gt;());
/// </summary>
public class PaginatedRequestValidator<T> : AbstractValidator<T>
    where T : IPaginatedRequest
{
    public PaginatedRequestValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.Size)
            .GreaterThan(0)
            .LessThanOrEqualTo(100);
    }
}
