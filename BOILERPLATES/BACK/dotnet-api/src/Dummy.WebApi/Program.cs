using Dummy.Infra.Contexts;
using Dummy.WebApi.Configurations;
using Dummy.WebApi.Middlewares;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, loggerConfiguration) =>
{
    loggerConfiguration
        .MinimumLevel.Information()
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithEnvironmentName()
        .Enrich.WithProcessId()
        .Enrich.WithThreadId()
        .WriteTo.Console();
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

builder.Services.ConfigureCors();
builder.Services.AddEf(builder.Configuration);
builder.Services.AddMediatRConfiguration();
builder.Services.AddNotificationsConfiguration();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.ConfigureSwagger(builder.Configuration);
builder.Services.ConfigureApi();
builder.Services.AddHealthChecksConfiguration(builder.Configuration);

var app = builder.Build();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var ctx = scope.ServiceProvider.GetRequiredService<DummyContext>();
    await ctx.Database.MigrateAsync();
}

if (!app.Environment.IsProduction())
{
    app.ConfigureSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCorsConfiguration();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<ErrorHandlingMiddleware>();

app.MapControllers();
app.MapHealthChecksConfiguration();

await app.RunAsync();
