using Microsoft.OpenApi;

namespace Dummy.WebApi.Configurations;

/// <summary>
/// Swagger com:
/// - Bearer (JWT manual: cole "Bearer {token}" no header Authorization)
/// - OAuth2 Authorization Code (placeholder genérico — preencha as URLs no appsettings)
///
/// Em Microsoft.OpenApi 2.x (Swashbuckle 10.x) os tipos vivem no namespace raiz
/// Microsoft.OpenApi (não mais em Microsoft.OpenApi.Models) e o registro do
/// security requirement usa OpenApiSecuritySchemeReference.
/// </summary>
public static class SwaggerConfiguration
{
    private const string BearerScheme = "bearer";
    private const string OAuth2Scheme = "oauth2";

    public static void ConfigureSwagger(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Dummy API",
                Version = "v1",
                Description = "Dummy boilerplate API"
            });

            c.CustomOperationIds(e =>
                $"{e.ActionDescriptor.RouteValues["controller"]}_{e.HttpMethod}_{e.ActionDescriptor.RouteValues["action"]}");

            var authUrl = configuration["Jwt:OAuth2:AuthorizationUrl"];
            var tokenUrl = configuration["Jwt:OAuth2:TokenUrl"];
            var hasOAuth2 = !string.IsNullOrEmpty(authUrl) && !string.IsNullOrEmpty(tokenUrl);

            if (hasOAuth2)
            {
                c.AddSecurityDefinition(OAuth2Scheme, new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.OAuth2,
                    Flows = new OpenApiOAuthFlows
                    {
                        AuthorizationCode = new OpenApiOAuthFlow
                        {
                            AuthorizationUrl = new Uri(authUrl!),
                            TokenUrl = new Uri(tokenUrl!),
                            Scopes = new Dictionary<string, string> { { "openid", "openid" } }
                        }
                    },
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Scheme = BearerScheme
                });
            }

            c.AddSecurityDefinition(BearerScheme, new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = BearerScheme,
                BearerFormat = "JWT",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Description = "Paste your JWT token here. Format: 'Bearer {token}'"
            });

            c.AddSecurityRequirement(doc =>
            {
                var requirement = new OpenApiSecurityRequirement
                {
                    { new OpenApiSecuritySchemeReference(BearerScheme, doc), [] }
                };

                if (hasOAuth2)
                {
                    requirement.Add(new OpenApiSecuritySchemeReference(OAuth2Scheme, doc), []);
                }

                return requirement;
            });
        });
    }

    public static void ConfigureSwaggerUI(this IApplicationBuilder app)
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Dummy API");
        });
    }
}
