using Dummy.Application.Dtos.Core;
using Dummy.Domain.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dummy.WebApi.Controllers;

/// <summary>
/// ControllerBase comum a todos os controllers.
/// Centraliza a conversão de Notifications → HTTP response (BadRequest/Unauthorized/NotFound).
///
/// Convenção: TODOS os controllers herdam dele e usam ProcessResponse(...) ao retornar.
/// Isso garante o envelope DataActionResult em todas as respostas — sucesso ou erro.
/// </summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public abstract class DummyControllerBase : ControllerBase
{
    private readonly INotificationService _notifications;

    protected DummyControllerBase(INotificationService notifications)
    {
        _notifications = notifications;
    }

    /// <summary>
    /// Para Commands sem retorno tipado.
    /// Sucesso → 204 NoContent. Notifications presentes → 400/401/404 com mensagens.
    /// </summary>
    protected IActionResult ProcessResponse()
    {
        if (!_notifications.HasNotifications())
        {
            return NoContent();
        }

        var (status, problems) = ResolveStatusAndProblems();
        return StatusCode(status, new DataActionResult(problems));
    }

    /// <summary>
    /// Para Queries e Commands com dados.
    /// Sucesso → 200 OK com data. Notifications presentes → 400/401/404 com mensagens.
    /// </summary>
    protected IActionResult ProcessResponse<T>(T data)
    {
        if (!_notifications.HasNotifications())
        {
            return Ok(new DataActionResult<T>(data, []));
        }

        var (status, problems) = ResolveStatusAndProblems();
        return StatusCode(status, new DataActionResult<T>(problems));
    }

    private (int Status, List<ProblemDetails> Problems) ResolveStatusAndProblems()
    {
        var problems = _notifications.GetAllNotifications()
            .Select(n => new ProblemDetails { Title = n.Key, Detail = n.Message })
            .ToList();

        if (problems.Any(p => p.Title == NotificationKey.Unauthorized))
            return (StatusCodes.Status401Unauthorized, problems);

        if (problems.Any(p => p.Title == NotificationKey.NotFound))
            return (StatusCodes.Status404NotFound, problems);

        return problems.Any(p => p.Title == NotificationKey.Conflict || p.Title == NotificationKey.DuplicateRecord) 
            ? (StatusCodes.Status409Conflict, problems) 
            : (StatusCodes.Status400BadRequest, problems);
    }
}
