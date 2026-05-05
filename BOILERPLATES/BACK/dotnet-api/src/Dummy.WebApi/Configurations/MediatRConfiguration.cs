using Dummy.Application.Behaviors;
using Dummy.Application.Commands.Categories.CreateDummyCategory;
using MediatR;

namespace Dummy.WebApi.Configurations;

/// <summary>
/// Registra MediatR (lib oficial) escaneando o assembly da camada Application
/// e adiciona o ValidationBehavior como pipeline behavior global.
/// </summary>
public static class MediatRConfiguration
{
    public static void AddMediatRConfiguration(this IServiceCollection services)
    {
        var applicationAssembly = typeof(CreateDummyCategoryCommandHandler).Assembly;

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(applicationAssembly);
        });

        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
    }
}
