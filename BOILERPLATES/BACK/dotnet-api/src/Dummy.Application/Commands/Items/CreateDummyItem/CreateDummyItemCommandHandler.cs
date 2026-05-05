using Dummy.Domain.Models;
using Dummy.Domain.Notifications;
using Dummy.Infra.Contexts;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Dummy.Application.Commands.Items.CreateDummyItem;

/// <summary>
/// Handler que demonstra criação de entidade COM FK.
/// Importante: o construtor de DummyItem recebe a entidade Category COMPLETA
/// (não apenas o Id) — isso força a validação de existência no handler.
/// </summary>
public class CreateDummyItemCommandHandler : IRequestHandler<CreateDummyItemCommand, Guid>
{
    private readonly DummyContext _context;
    private readonly INotificationService _notifications;
    private readonly ILogger<CreateDummyItemCommandHandler> _logger;

    public CreateDummyItemCommandHandler(
        DummyContext context,
        INotificationService notifications,
        ILogger<CreateDummyItemCommandHandler> logger)
    {
        _context = context;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<Guid> Handle(CreateDummyItemCommand request, CancellationToken cancellationToken)
    {
        var category = await _context.DummyCategories
            .FirstOrDefaultAsync(x => x.Id == request.CategoryId, cancellationToken);

        if (category is null)
        {
            _notifications.Notify(NotificationKey.NotFound, $"Category {request.CategoryId} not found");
            return Guid.Empty;
        }

        var codeExists = await _context.DummyItems
            .AnyAsync(x => x.Code == request.Code, cancellationToken);

        if (codeExists)
        {
            _notifications.Notify(NotificationKey.DuplicateRecord, $"Item with code '{request.Code}' already exists");
            return Guid.Empty;
        }

        var item = new DummyItem(
            category: category,
            name: request.Name!,
            code: request.Code!,
            description: request.Description,
            priority: request.Priority!.Value,
            price: request.Price!.Value,
            status: request.Status!.Value);

        _context.DummyItems.Add(item);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created DummyItem {Code} ({Id}) under Category {CategoryId}", item.Code, item.Id, category.Id);

        return item.Id;
    }
}
