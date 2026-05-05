using Dummy.Domain.Interfaces;
using Dummy.Infra.Patterns;

namespace Dummy.WebApi.Configurations;

/// <summary>
/// Configurações genéricas que não merecem arquivo próprio:
/// IUnitOfWork → UnitOfWork (Scoped, mesmo lifetime do DbContext que ele encapsula).
/// </summary>
public static class GeneralConfiguration
{
    public static void ConfigureApi(this IServiceCollection services)
    {
        services.AddScoped<IUnitOfWork, UnitOfWork>();
    }
}
