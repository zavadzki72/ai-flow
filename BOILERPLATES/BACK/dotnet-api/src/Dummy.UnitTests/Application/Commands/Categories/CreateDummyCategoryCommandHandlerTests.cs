using Dummy.Application.Commands.Categories.CreateDummyCategory;
using Dummy.Domain.Enums;
using Dummy.Domain.Models;
using Dummy.Domain.Notifications;
using Dummy.Infra.Contexts;
using Dummy.UnitTests.Factories;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace Dummy.UnitTests.Application.Commands.Categories;

/// <summary>
/// Testa o handler. Cobertura:
/// 1. Path feliz: cria categoria, retorna Id, NÃO notifica
/// 2. Caminho de erro: code duplicado, NOTIFICA e retorna Guid.Empty (sem persistir)
/// </summary>
public class CreateDummyCategoryCommandHandlerTests
{
    private readonly DummyContext _writeCtx;
    private readonly INotificationService _notifications;
    private readonly CreateDummyCategoryCommandHandler _handler;

    public CreateDummyCategoryCommandHandlerTests()
    {
        _writeCtx = DummyDbContextFactory.CreateWriteContext();
        _notifications = Substitute.For<INotificationService>();
        _handler = new CreateDummyCategoryCommandHandler(_writeCtx, _notifications, NullLogger<CreateDummyCategoryCommandHandler>.Instance);
    }

    [Fact]
    public async Task Handle_WithValidCommand_ShouldPersistAndReturnId()
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
        var id = await _handler.Handle(command, CancellationToken.None);

        //ASSERT
        Assert.NotEqual(Guid.Empty, id);
        Assert.Single(_writeCtx.DummyCategories);
        _notifications.DidNotReceive().Notify(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>());
    }

    [Fact]
    public async Task Handle_WithDuplicateCode_ShouldNotifyAndReturnEmptyGuid()
    {
        //ARRANGE
        _writeCtx.DummyCategories.Add(new DummyCategory("Existing", "DUP-1", null, DummyStatus.Active));
        await _writeCtx.SaveChangesAsync();

        var command = new CreateDummyCategoryCommand
        {
            Name = "Other",
            Code = "DUP-1",
            Status = DummyStatus.Active
        };

        //ACTION
        var id = await _handler.Handle(command, CancellationToken.None);

        //ASSERT
        Assert.Equal(Guid.Empty, id);
        _notifications.Received(1).Notify(
            NotificationKey.DuplicateRecord,
            Arg.Is<string>(s => s.Contains("DUP-1")),
            Arg.Any<string?>());
        Assert.Single(_writeCtx.DummyCategories);
    }
}
