using Dummy.Domain.Models;
using Dummy.Domain.Notifications;
using Dummy.Infra.Contexts;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Dummy.Application.Commands.Categories.CreateDummyCategory;

/// <summary>
/// Handler de Command. Responsabilidades:
/// 1. Regras de negócio complexas (duplicatas, FK exists) — usa _writeContext para query/escrita
/// 2. Conversão Command → Entidade via construtor de domínio
/// 3. Notificar via INotificationService em vez de lançar exception
/// 4. Persistir e retornar o que for útil (Id no Create, void no Update)
/// </summary>
public class CreateDummyCategoryCommandHandler : IRequestHandler<CreateDummyCategoryCommand, Guid>
{
    private readonly DummyContext _context;
    private readonly INotificationService _notifications;
    private readonly ILogger<CreateDummyCategoryCommandHandler> _logger;

    public CreateDummyCategoryCommandHandler(
        DummyContext context,
        INotificationService notifications,
        ILogger<CreateDummyCategoryCommandHandler> logger)
    {
        _context = context;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<Guid> Handle(CreateDummyCategoryCommand request, CancellationToken cancellationToken)
    {
        if (!await ComplexValidations(request, cancellationToken))
        {
            return Guid.Empty;
        }

        var category = new DummyCategory(
            name: request.Name!,
            code: request.Code!,
            description: request.Description,
            status: request.Status!.Value);

        _context.DummyCategories.Add(category);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created DummyCategory {Code} ({Id})", category.Code, category.Id);

        return category.Id;
    }

    private async Task<bool> ComplexValidations(CreateDummyCategoryCommand request, CancellationToken ct)
    {
        var codeExists = await _context.DummyCategories
            .AnyAsync(x => x.Code == request.Code, ct);

        if (!codeExists) 
            return true;
        
        _notifications.Notify(NotificationKey.DuplicateRecord, $"Category with code '{request.Code}' already exists");
        return false;
    }
}
