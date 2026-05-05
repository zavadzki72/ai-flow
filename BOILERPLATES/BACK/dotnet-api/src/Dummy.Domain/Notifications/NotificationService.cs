namespace Dummy.Domain.Notifications;

/// <summary>
/// Implementação Scoped do INotificationService.
/// Lifetime Scoped é crítico: notifications são por-request.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly List<Notification> _notifications = [];

    public void Notify(string key, string message, string? details = null)
    {
        _notifications.Add(new Notification(key, message, details));
    }

    public void Notify(Notification notification)
    {
        _notifications.Add(notification);
    }

    public List<Notification> GetAllNotifications() => _notifications;

    public bool HasNotifications() => _notifications.Count != 0;
}
