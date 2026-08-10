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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173") 
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); 
    });
});


var app = builder.Build();

// Увімкнути HTTPS редирект і глобальний обробник винятків перед обробкою запитів.
app.UseHttpsRedirection();
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
