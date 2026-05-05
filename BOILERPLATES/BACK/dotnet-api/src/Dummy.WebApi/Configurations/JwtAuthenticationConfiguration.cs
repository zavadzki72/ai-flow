using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Dummy.WebApi.Configurations;

/// <summary>
/// JWT Bearer genérico. Configuração via appsettings:
///
/// "Jwt": {
///   "Authority": "https://your-issuer/",
///   "Audience":  "your-api-audience",
///   "RequireHttpsMetadata": true
/// }
///
/// Authority = issuer do token (Keycloak, Auth0, IdentityServer, Cognito, etc.).
/// O middleware busca o JWKS em {Authority}/.well-known/openid-configuration.
/// </summary>
public static class JwtAuthenticationConfiguration
{
    public static void AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var authority = configuration["Jwt:Authority"];
        var audience = configuration["Jwt:Audience"];
        var requireHttps = configuration.GetValue<bool?>("Jwt:RequireHttpsMetadata") ?? true;

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.Audience = audience;
                options.RequireHttpsMetadata = requireHttps;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = !string.IsNullOrEmpty(authority),
                    ValidateAudience = !string.IsNullOrEmpty(audience),
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ClockSkew = TimeSpan.FromSeconds(30)
                };
            });

        services.AddAuthorization();
    }
}
