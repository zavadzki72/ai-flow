namespace Dummy.WebApi.Configurations;

/// <summary>
/// CORS aberto por default. Em produção, ajustar AllowedOrigins via overrides na pipeline.
/// </summary>
public static class CorsConfiguration
{
    private const string PolicyName = "DefaultCors";

    public static void ConfigureCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, b =>
            {
                b.AllowAnyOrigin()
                 .AllowAnyMethod()
                 .AllowAnyHeader();
            });
        });
    }

    public static void UseCorsConfiguration(this IApplicationBuilder app)
    {
        app.UseCors(PolicyName);
    }
}
