namespace Dummy.Domain.Notifications;

/// <summary>
/// Acumula notifications no escopo do request.
/// Registrado como Scoped no DI: cada HTTP request tem uma instância isolada.
/// </summary>
public interface INotificationService
{
    /// <summary>Adiciona notification a partir de campos individuais.</summary>
    void Notify(string key, string message, string? details = null);

    /// <summary>Adiciona notification já construída.</summary>
    void Notify(Notification notification);

    /// <summary>Retorna todas as notifications acumuladas neste request.</summary>
    List<Notification> GetAllNotifications();

    /// <summary>True se há ao menos uma notification.</summary>
    bool HasNotifications();
}
