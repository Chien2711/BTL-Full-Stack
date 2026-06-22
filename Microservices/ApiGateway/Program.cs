using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);
var ocelotConfig = builder.Configuration["OcelotConfig"] ?? "ocelot.json";
var radminServicesConfig = builder.Configuration["RadminServicesConfig"] ?? "radmin-services.json";
var runtimeOcelotConfig = PrepareOcelotConfig(ocelotConfig, radminServicesConfig);
builder.Configuration.AddJsonFile(runtimeOcelotConfig, optional: false, reloadOnChange: true);

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "ProjectHub.Shared.Secret.Key.For.Student.Microservices.2026!";
var issuer = builder.Configuration["Jwt:Issuer"] ?? "ProjectHub";
var audience = builder.Configuration["Jwt:Audience"] ?? "ProjectHub.Client";

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var key = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });
});
builder.Services.AddOcelot(builder.Configuration);

var app = builder.Build();
app.UseCors();
app.Use(async (context, next) =>
{
    if (context.Request.Path.Equals("/health", StringComparison.OrdinalIgnoreCase))
    {
        await context.Response.WriteAsJsonAsync(new { service = "ApiGateway", status = "ok" });
        return;
    }

    await next();
});
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    var publicPath = path.StartsWith("/api/auth/login", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/api/auth/register", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
        || path.StartsWith("/health", StringComparison.OrdinalIgnoreCase);

    if (!publicPath && context.User.Identity?.IsAuthenticated != true)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsJsonAsync(new { error = "Gateway rejected unauthenticated request" });
        return;
    }

    await next();
});

await app.UseOcelot();
app.Run();

static string PrepareOcelotConfig(string ocelotConfig, string radminServicesConfig)
{
    if (!File.Exists(radminServicesConfig))
    {
        return ocelotConfig;
    }

    var root = JsonNode.Parse(File.ReadAllText(ocelotConfig))?.AsObject()
        ?? throw new InvalidOperationException($"Cannot parse Ocelot config: {ocelotConfig}");
    var deployment = JsonNode.Parse(File.ReadAllText(radminServicesConfig))?.AsObject()
        ?? throw new InvalidOperationException($"Cannot parse Radmin service config: {radminServicesConfig}");
    var services = deployment["Services"]?.AsObject();
    if (services is null)
    {
        return ocelotConfig;
    }

    foreach (var route in root["Routes"]?.AsArray() ?? [])
    {
        if (route is not JsonObject routeObject) continue;
        var upstream = routeObject["UpstreamPathTemplate"]?.GetValue<string>() ?? "";
        var serviceKey = ResolveServiceKey(upstream);
        if (serviceKey is null || services[serviceKey] is not JsonObject target) continue;

        var host = target["Host"]?.GetValue<string>();
        var port = target["Port"]?.GetValue<int?>() ?? 0;
        if (string.IsNullOrWhiteSpace(host) || port <= 0) continue;

        routeObject["DownstreamHostAndPorts"] = new JsonArray
        {
            new JsonObject
            {
                ["Host"] = host,
                ["Port"] = port
            }
        };
    }

    var gatewayPublicBaseUrl = deployment["GatewayPublicBaseUrl"]?.GetValue<string>();
    if (!string.IsNullOrWhiteSpace(gatewayPublicBaseUrl))
    {
        root["GlobalConfiguration"] ??= new JsonObject();
        root["GlobalConfiguration"]!["BaseUrl"] = gatewayPublicBaseUrl;
    }

    var runtimePath = Path.Combine(AppContext.BaseDirectory, "ocelot.runtime.json");
    File.WriteAllText(runtimePath, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    return runtimePath;
}

static string? ResolveServiceKey(string upstreamPath)
{
    if (upstreamPath.Contains("/api/auth", StringComparison.OrdinalIgnoreCase)
        || upstreamPath.Contains("/api/users", StringComparison.OrdinalIgnoreCase)
        || upstreamPath.Contains("/api/notifications", StringComparison.OrdinalIgnoreCase)
        || upstreamPath.Contains("/api/activity-logs", StringComparison.OrdinalIgnoreCase)
        || upstreamPath.Contains("/comments", StringComparison.OrdinalIgnoreCase))
    {
        return "NotifyService";
    }

    if (upstreamPath.Contains("/api/projects", StringComparison.OrdinalIgnoreCase))
    {
        return "ProjectService";
    }

    if (upstreamPath.Contains("/api/tasks", StringComparison.OrdinalIgnoreCase))
    {
        return "TaskService";
    }

    return null;
}
