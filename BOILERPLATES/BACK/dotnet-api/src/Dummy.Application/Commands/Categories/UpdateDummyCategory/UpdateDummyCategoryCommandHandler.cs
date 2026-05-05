using Dummy.Domain.Notifications;
using Dummy.Infra.Contexts;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Dummy.Application.Commands.Categories.UpdateDummyCategory;

public class UpdateDummyCategoryCommandHandler : IRequestHandler<UpdateDummyCategoryCommand, Unit>
{
    private readonly DummyContext _context;
    private readonly INotificationService _notifications;
    private readonly ILogger<UpdateDummyCategoryCommandHandler> _logger;

    public UpdateDummyCategoryCommandHandler(
        DummyContext context,
        INotificationService notifications,
        ILogger<UpdateDummyCategoryCommandHandler> logger)
    {
        _context = context;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<Unit> Handle(UpdateDummyCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await _context.DummyCategories
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (category is null)
        {
            _notifications.Notify(NotificationKey.NotFound, $"Category {request.Id} not found");
            return Unit.Value;
        }

        category.Update(
            name: request.Name!,
            description: request.Description,
            status: request.Status!.Value);

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Updated DummyCategory {Id}", category.Id);

        return Unit.Value;
    }
}
