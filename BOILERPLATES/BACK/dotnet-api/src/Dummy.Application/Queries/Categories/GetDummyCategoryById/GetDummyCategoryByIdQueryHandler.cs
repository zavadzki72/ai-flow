using Dummy.Application.Dtos.Categories;
using Dummy.Application.Utils;
using Dummy.Domain.Notifications;
using Dummy.Infra.Contexts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Dummy.Application.Queries.Categories.GetDummyCategoryById;

/// <summary>
/// Query handler usa SEMPRE o ReadOnlyContext (NoTracking → mais performance, sem risco de tracking acidental).
/// Projeção direta para o DTO (sem materializar a entidade primeiro).
/// </summary>
public class GetDummyCategoryByIdQueryHandler : IRequestHandler<GetDummyCategoryByIdQuery, DummyCategoryResponse?>
{
    private readonly DummyReadOnlyContext _context;
    private readonly INotificationService _notifications;

    public GetDummyCategoryByIdQueryHandler(DummyReadOnlyContext context, INotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    public async Task<DummyCategoryResponse?> Handle(GetDummyCategoryByIdQuery request, CancellationToken cancellationToken)
    {
        var response = await _context.DummyCategories
            .Where(x => x.Id == request.Id)
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
            .FirstOrDefaultAsync(cancellationToken);

        if (response is null)
        {
            _notifications.Notify(NotificationKey.NotFound, $"Category {request.Id} not found");
            return null;
        }

        return response;
    }
}
