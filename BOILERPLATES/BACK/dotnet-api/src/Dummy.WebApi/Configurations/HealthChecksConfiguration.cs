using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Dummy.WebApi.Configurations;

/// <summary>
/// Health checks padrão Kubernetes:
///   /health/live        → liveness probe (sem dependências)
///   /health/ready       → readiness probe (Postgres conectável)
///   /health/dependencies → status detalhado de cada dependência externa
/// </summary>
public static class HealthChecksConfiguration
{
    private static class Tags
    {
        public const string Ready = "ready";
        public const string Dependencies = "dependencies";
    }

    private static class Endpoints
    {
        public const string Live = "/health/live";
        public const string Ready = "/health/ready";
        public const string Dependencies = "/health/dependencies";
    }

    public static IHealthChecksBuilder AddHealthChecksConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        return services
            .AddHealthChecks()
            .AddNpgSql(
                connectionString: configuration.GetConnectionString("DefaultConnection")!,
                name: "postgresql",
                failureStatus: HealthStatus.Unhealthy,
                tags: [Tags.Ready, Tags.Dependencies]);
    }

    public static void MapHealthChecksConfiguration(this WebApplication app)
    {
        app.MapHealthChecks(Endpoints.Live, new HealthCheckOptions
        {
            Predicate = _ => false
        });

        app.MapHealthChecks(Endpoints.Ready, new HealthCheckOptions
        {
            Predicate = hc => hc.Tags.Contains(Tags.Ready)
        });

        app.MapHealthChecks(Endpoints.Dependencies, new HealthCheckOptions
        {
            Predicate = hc => hc.Tags.Contains(Tags.Dependencies)
        });
    }
}
