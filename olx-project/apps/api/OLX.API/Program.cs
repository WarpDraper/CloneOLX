using Microsoft.AspNetCore.HttpOverrides;
using Olx.BLL.Exstensions;
using Olx.BLL.Hubs;
using Olx.DAL.Exstension;
using OLX.API.Extensions;
using OLX.API.Middlewares;

// Точка входу API: налаштовує сервіси, middleware та запускає веб-додаток.
var builder = WebApplication.CreateBuilder(args);

// Реєструємо підключення до бази даних, бізнес-логіку та API-специфічні сервіси.
builder.Services.AddOlxDbContext(builder.Configuration);
builder.Services.AddOlxBLLServices(builder.Configuration);
builder.Services.AddOlxApiConfigurations(builder.Configuration);

// Додаємо Swagger, API explorer та SignalR для документування й реального часу.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Logging.AddConsole();

// Allowed frontend origins come from configuration so each environment (local dev, Render,
// production) can set its own without a rebuild. Set via the AllowedCorsOrigins env var as a
// comma-separated list, e.g. "https://my-frontend.onrender.com,http://localhost:5173".
var allowedOrigins = (builder.Configuration["AllowedCorsOrigins"] ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); 
    });
});

// Render (and most PaaS proxies) terminate TLS at the edge and forward plain HTTP to the
// container, passing the original scheme/host in X-Forwarded-*. Without this the app thinks
// every request is http://, which breaks Secure cookies and absolute URL generation.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // The proxy is Render's, not in a known subnet — clearing these is required for the
    // headers to be honoured at all.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});


var app = builder.Build();

app.UseForwardedHeaders();

// HTTPS redirect is handled by Render's edge; enabling it in-container behind the proxy is a
// no-op at best, so keep it for local/self-hosted runs only.
if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

// Включаємо Swagger UI та статичні файли, а також підтримку культур.
app.UseSwagger();
app.UseSwaggerUI();
app.AddStaticFiles();
app.AddCultures();
//app.UseCookiePolicy(new CookiePolicyOptions
//{
//    MinimumSameSitePolicy = SameSiteMode.Strict,
//    HttpOnly = HttpOnlyPolicy.Always,
//    Secure = CookieSecurePolicy.Always,
//});

app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.SetMaxRequestBodySize();

// Мапимо SignalR-хаб і контролери, а потім застосовуємо міграції та seed-дані.
app.MapHub<MessageHub>("/hub");
app.MapControllers();
app.DataBaseMigrate();

// Seeding failures must never take down the host — log and continue so the API stays
// reachable (e.g. with a partially/un-seeded DB) instead of the whole process crashing on boot.
try
{
    await app.SeedDataAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"[DbSeeder] Seeding failed, continuing startup without complete seed data: {ex}");
}

await app.RunAsync();
