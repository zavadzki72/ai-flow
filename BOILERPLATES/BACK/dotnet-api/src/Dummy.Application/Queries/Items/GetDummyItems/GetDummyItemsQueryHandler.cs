using Dummy.Application.Dtos.Core;
using Dummy.Application.Dtos.Items;
using Dummy.Application.Utils;
using Dummy.Domain.Models;
using Dummy.Infra.Contexts;
using Dummy.Infra.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Dummy.Application.Queries.Items.GetDummyItems;

/// <summary>
/// Handler de Query paginada. Fluxo recomendado:
/// 1. Construir IQueryable base
/// 2. ApplyFilters (método privado)
/// 3. Capturar TotalItems via Count() (antes de paginar)
/// 4. ApplySortingAndPagination (extension)
/// 5. Projetar para DTO e materializar
/// 6. Encapsular em PaginatedResponse
/// </summary>
public class GetDummyItemsQueryHandler : IRequestHandler<GetDummyItemsQuery, PaginatedResponse<DummyItemResponse>>
{
    private readonly DummyReadOnlyContext _context;

    public GetDummyItemsQueryHandler(DummyReadOnlyContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResponse<DummyItemResponse>> Handle(GetDummyItemsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.DummyItems
            .Include(x => x.Category)
            .AsQueryable();

        query = ApplyFilters(query, request);

        var totalItems = await query.CountAsync(cancellationToken);

        var items = await query
            .ApplySortingAndPagination(request.Sort, request.Page, request.Size)
            .Select(x => new DummyItemResponse
            {
                Id = x.Id,
                CategoryId = x.CategoryId,
                CategoryName = x.Category!.Name,
                CategoryCode = x.Category.Code,
                Name = x.Name,
                Code = x.Code,
                Description = x.Description,
                Priority = x.Priority.GetDisplayName(),
                Price = x.Price,
                Status = x.Status.GetDisplayName(),
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return new PaginatedResponse<DummyItemResponse>(items, request.Page, totalItems, request.Size);
    }

    private static IQueryable<DummyItem> ApplyFilters(IQueryable<DummyItem> query, GetDummyItemsQuery request)
    {
        query = query.WhereIf(
            request.CategoryIds.Count > 0,
            x => request.CategoryIds.Contains(x.CategoryId));

        query = query.WhereIf(
            request.Statuses.Count > 0,
            x => request.Statuses.Contains(x.Status));

        query = query.WhereIf(
            request.Priorities.Count > 0,
            x => request.Priorities.Contains(x.Priority));

        query = query.WhereIf(
            request.MinPrice.HasValue,
            x => x.Price >= request.MinPrice!.Value);

        query = query.WhereIf(
            request.MaxPrice.HasValue,
            x => x.Price <= request.MaxPrice!.Value);

        query = query.WhereIf(
            !string.IsNullOrWhiteSpace(request.Search),
            x => EF.Functions.ILike(x.Name, $"%{request.Search}%"));

        return query;
    }
}
