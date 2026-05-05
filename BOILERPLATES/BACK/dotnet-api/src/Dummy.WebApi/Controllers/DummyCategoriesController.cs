using Dummy.Application.Commands.Categories.CreateDummyCategory;
using Dummy.Application.Commands.Categories.UpdateDummyCategory;
using Dummy.Application.Dtos.Categories;
using Dummy.Application.Dtos.Core;
using Dummy.Application.Queries.Categories.GetDummyCategories;
using Dummy.Application.Queries.Categories.GetDummyCategoryById;
using Dummy.Application.Utils;
using Dummy.Domain.Enums;
using Dummy.Domain.Notifications;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dummy.WebApi.Controllers;

/// <summary>
/// Controller das Categorias. Padrão recomendado:
/// - Path REST clássico para CRUD: GET, GET {id}, POST, PUT {id}
/// - Path com custom verb (':') para operações específicas: GET .../status:list-all
/// - SEMPRE retorna via ProcessResponse() para manter envelope DataActionResult
/// </summary>
public class DummyCategoriesController : DummyControllerBase
{
    private readonly IMediator _mediator;

    public DummyCategoriesController(IMediator mediator, INotificationService notifications) : base(notifications)
    {
        _mediator = mediator;
    }

    /// <summary>Lista categorias com filtros opcionais.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get([FromQuery] GetDummyCategoriesQuery query, CancellationToken ct)
    {
        var result = await _mediator.Send(query, ct);
        return ProcessResponse(result);
    }

    /// <summary>Busca categoria por id.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetDummyCategoryByIdQuery { Id = id }, ct);
        return ProcessResponse(result);
    }

    /// <summary>Cria uma nova categoria.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDummyCategoryCommand command, CancellationToken ct)
    {
        var id = await _mediator.Send(command, ct);
        return ProcessResponse(id);
    }

    /// <summary>Atualiza uma categoria existente.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDummyCategoryCommand command, CancellationToken ct)
    {
        await _mediator.Send(command with { Id = id }, ct);
        return ProcessResponse();
    }

    /// <summary>
    /// Endpoint de listagem do enum DummyStatus.
    /// Padrão recomendado para qualquer enum exposto ao frontend (popula dropdowns).
    /// </summary>
    [HttpGet("status:list-all")]
    [AllowAnonymous]
    public IActionResult ListStatusOptions()
    {
        var result = Enum.GetValues<DummyStatus>()
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
