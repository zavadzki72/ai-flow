using Dummy.Application.Dtos.Categories;
using Dummy.Application.Utils;
using Dummy.Domain.Models;
using Dummy.Infra.Contexts;
using Dummy.Infra.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Dummy.Application.Queries.Categories.GetDummyCategories;

/// <summary>
/// Query handler com filtros condicionais (WhereIf).
/// Padrão recomendado: ApplyFilters como método privado para legibilidade.
/// </summary>
public class GetDummyCategoriesQueryHandler : IRequestHandler<GetDummyCategoriesQuery, List<DummyCategoryResponse>>
{
    private readonly DummyReadOnlyContext _context;

    public GetDummyCategoriesQueryHandler(DummyReadOnlyContext context)
    {
        _context = context;
    }

    public async Task<List<DummyCategoryResponse>> Handle(GetDummyCategoriesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.DummyCategories.AsQueryable();

        query = ApplyFilters(query, request);

        return await query
            .OrderBy(x => x.Name)
            .Select(x => new DummyCategoryResponse
            {
                Id = x.Id,
                Name = x.Name,
                Code = x.Code,
                Description = x.Description,
                Status = x.Status.GetDisplayName(),
                ItemsCount = x.Items.Count,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    private static IQueryable<DummyCategory> ApplyFilters(IQueryable<DummyCategory> query, GetDummyCategoriesQuery request)
    {
        query = query.WhereIf(
            request.Statuses.Count > 0,
            x => request.Statuses.Contains(x.Status));

        query = query.WhereIf(
            !string.IsNullOrWhiteSpace(request.Search),
            x => EF.Functions.ILike(x.Name, $"%{request.Search}%"));

        return query;
    }
}
