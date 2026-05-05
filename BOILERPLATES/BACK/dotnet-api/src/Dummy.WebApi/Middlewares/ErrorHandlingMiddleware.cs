using Dummy.Application.Dtos.Core;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Dummy.WebApi.Middlewares;

/// <summary>
/// Middleware global para exceptions NÃO tratadas pelos handlers.
/// Para erros de NEGÓCIO esperados, prefira INotificationService dentro do handler
/// — exceptions ficam reservadas para falhas reais (ex: timeout de DB, bug).
///
/// SQLState do Postgres é mapeado para ProblemDetails específicos quando possível.
/// </summary>
public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error");
            await HandleDatabaseException(context, ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await HandleGenericException(context, ex);
        }
    }

    private static async Task HandleDatabaseException(HttpContext context, DbUpdateException ex)
    {
        var pgEx = ex.InnerException as PostgresException;
        var sqlState = pgEx?.SqlState;

        var problem = sqlState switch
        {
            "23503" => new ProblemDetails
            {
                Title = "Constraint Violation",
                Detail = "Referenced record does not exist",
                Status = 400
            },
            "23505" => new ProblemDetails
            {
                Title = "Duplicate Entry",
                Detail = "A record with this key already exists",
                Status = 409
            },
            "23514" => new ProblemDetails
            {
                Title = "Invalid Data",
                Detail = "Data does not meet validation constraints",
                Status = 400
            },
            _ => new ProblemDetails
            {
                Title = "Database Error",
                Detail = "An error occurred while processing your request",
                Status = 500
            }
        };

        context.Response.StatusCode = problem.Status ?? 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new DataActionResult([problem]));
    }

    private static async Task HandleGenericException(HttpContext context, Exception ex)
    {
        var isDevelopment = context.RequestServices
            .GetRequiredService<IWebHostEnvironment>()
            .IsDevelopment();

        var problem = new ProblemDetails
        {
            Title = "Internal Server Error",
            Detail = isDevelopment ? ex.Message : "An unexpected error occurred. Please try again later.",
            Status = 500
        };

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new DataActionResult([problem]));
    }
}
