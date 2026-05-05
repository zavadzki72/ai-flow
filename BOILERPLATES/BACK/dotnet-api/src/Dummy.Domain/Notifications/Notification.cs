using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace Dummy.Domain.Notifications;

/// <summary>
/// Representa uma notificação de domínio (erro de negócio, validação, etc.).
/// Diferente de uma exception: representa um fluxo esperado, e é coletada pelo
/// INotificationService durante o request scope.
/// </summary>
public class Notification
{
    public Notification(string key, string message, string? details = null)
    {
        Key = key;
        Message = message;
        Details = details;
    }

    /// <summary>Identificador/código do erro.</summary>
    public string Key { get; init; }

    /// <summary>Mensagem descritiva.</summary>
    public string Message { get; init; }

    /// <summary>Detalhes opcionais.</summary>
    public string? Details { get; init; }

    public override string ToString() => $"{Key}: {Message}, Details: {Details}";
}

/// <summary>
/// Chaves padronizadas para Notifications. Usar constantes evita duplicação de strings
/// e dá um vocabulário comum entre handlers, controllers e clientes da API.
/// </summary>
public static class NotificationKey
{
    public static readonly string Database = "DATABASE_NOTIFICATION";
    public static readonly string Exception = "EXCEPTION";
    public static readonly string Request = "REQUEST_NOTIFICATION";
    public static readonly string RequestHandler = "REQUEST_HANDLER_NOTIFICATION";
    public static readonly string Unauthorized = "UNAUTHORIZED";
    public static readonly string ValidationError = "VALIDATION_ERROR";
    public static readonly string NotFound = "NOT_FOUND";
    public static readonly string Conflict = "CONFLICT";
    public static readonly string DuplicateRecord = "DUPLICATE_RECORD";
}

/// <summary>
/// Conversão de Notifications para o formato RFC 7807 (ProblemDetails).
/// </summary>
public static class NotificationExtensions
{
    public static List<ProblemDetails> ToProblemDetails(this List<Notification> notifications, HttpStatusCode status)
    {
        return [.. notifications.Select(x => new ProblemDetails
        {
            Type = x.Key,
            Title = x.Message,
            Detail = x.Details,
            Status = (int)status
        })];
    }
}
