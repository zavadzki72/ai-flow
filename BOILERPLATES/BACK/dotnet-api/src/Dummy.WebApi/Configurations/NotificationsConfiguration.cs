using Dummy.Domain.Notifications;

namespace Dummy.WebApi.Configurations;

/// <summary>
/// Lifetime Scoped é OBRIGATÓRIO: notifications são por-request.
/// Registrar como Singleton causaria vazamento entre requests.
/// </summary>
public static class NotificationsConfiguration
{
    public static void AddNotificationsConfiguration(this IServiceCollection services)
    {
        services.AddScoped<INotificationService, NotificationService>();
    }
}
