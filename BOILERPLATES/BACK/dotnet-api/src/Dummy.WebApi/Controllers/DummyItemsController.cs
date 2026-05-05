using Dummy.Application.Commands.Items.CreateDummyItem;
using Dummy.Application.Dtos.Core;
using Dummy.Application.Queries.Items.GetDummyItems;
using Dummy.Application.Utils;
using Dummy.Domain.Enums;
using Dummy.Domain.Notifications;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dummy.WebApi.Controllers;

public class DummyItemsController : DummyControllerBase
{
    private readonly IMediator _mediator;

    public DummyItemsController(IMediator mediator, INotificationService notifications) : base(notifications)
    {
        _mediator = mediator;
    }

    /// <summary>Lista itens paginados (?_page=0&amp;_size=20&amp;_sort=Name ASC).</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get([FromQuery] GetDummyItemsQuery query, CancellationToken ct)
    {
        var result = await _mediator.Send(query, ct);
        return ProcessResponse(result);
    }

    /// <summary>Cria um item vinculado a uma categoria existente.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDummyItemCommand command, CancellationToken ct)
    {
        var id = await _mediator.Send(command, ct);
        return ProcessResponse(id);
    }

    /// <summary>Lista todas as priorities (popula dropdown no frontend).</summary>
    [HttpGet("priority:list-all")]
    [AllowAnonymous]
    public IActionResult ListPriorityOptions()
    {
        var result = Enum.GetValues<DummyPriority>()
            .Select(e => new EnumOptionResponse
            {
                Value = (int)e,
                Label = e.GetDisplayName(),
                Name = e.GetDescription()
            })
            .ToList();

        return ProcessResponse(result);
    }
}
