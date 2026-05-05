using Dummy.Infra.Contexts;
using Microsoft.EntityFrameworkCore;

namespace Dummy.WebApi.Configurations;

/// <summary>
/// Registra os dois DbContexts (write e read-only) apontando para a mesma connection string.
/// O ReadOnlyContext força NoTracking via UseQueryTrackingBehavior.
/// </summary>
public static class EntityFrameworkConfiguration
{
    public static void AddEf(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<DummyContext>(opt =>
            opt.UseNpgsql(connectionString));

        services.AddDbContext<DummyReadOnlyContext>(opt =>
            opt.UseNpgsql(connectionString)
               .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));
    }
}
