using Dummy.Application.Dtos.Core;
using Dummy.Domain.Notifications;
using MediatR;

namespace Dummy.Application.Behaviors;

/// <summary>
/// Pipeline behavior do MediatR que executa IsValid() antes do handler.
/// Se inválido: adiciona notifications ao INotificationService e retorna default
/// (handler NÃO executa). O ControllerBase.ProcessResponse converte as notifications
/// em 400 BadRequest para o cliente.
///
/// Registrado em MediatRConfiguration para todos os requests que herdam RequestBase&lt;T&gt;.
/// </summary>
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : RequestBase<TResponse>
{
    private readonly INotificationService _notifications;

    public ValidationBehavior(INotificationService notifications)
    {
        _notifications = notifications;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!request.IsValid())
        {
            foreach (var error in request.ValidationResult?.Errors ?? [])
            {
                _notifications.Notify(NotificationKey.ValidationError, error.ErrorMessage);
            }

            return default!;
        }

        return await next();
    }
}

/// <summary>
/// Variante para Commands que herdam RequestBase (sem tipo de retorno → Unit).
/// </summary>
public class ValidationBehavior<TRequest> : IPipelineBehavior<TRequest, Unit>
    where TRequest : RequestBase
{
    private readonly INotificationService _notifications;

    public ValidationBehavior(INotificationService notifications)
    {
        _notifications = notifications;
    }

    public async Task<Unit> Handle(TRequest request, RequestHandlerDelegate<Unit> next, CancellationToken cancellationToken)
    {
        if (!request.IsValid())
        {
            foreach (var error in request.ValidationResult?.Errors ?? [])
            {
                _notifications.Notify(NotificationKey.ValidationError, error.ErrorMessage);
            }

            return Unit.Value;
        }

        return await next();
    }
}
