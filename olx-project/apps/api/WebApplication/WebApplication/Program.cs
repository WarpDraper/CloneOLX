using AuthBLL.EmailService;
using BLL.AuthService;
using BLL.JwtToken;
using DAL.Context;
using DAL.Repository;
using DAL.UnitOfWork;
using Domain;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OLXCLONE.Configuration.Role;
using OLXCLONE.Middleware;
using System.Text;
using TaskerDAL.UnitOfWork;
using WebApplication25.Configuration.Mapping;

var builder = global::Microsoft.AspNetCore.Builder.WebApplication.CreateBuilder(args);

// ==========================================
// 1. ПІДКЛЮЧЕННЯ БАЗИ, КОНТРОЛЕРІВ ТА IDENTITY
// ==========================================
builder.Services.AddControllersWithViews();
builder.Services.AddControllers();

builder.Services.AddDbContext<ApplicationContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
//options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<AppUser, AppRole>(options =>
{
    options.Password.RequiredLength = 6;
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;

    // LOCKOUT CONFIGURATION для захисту від brute-force
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User Settings
    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedEmail = false;
})
.AddEntityFrameworkStores<ApplicationContext>()
.AddDefaultTokenProviders();

// ==========================================
// 2. АВТОРИЗАЦІЯ (JWT + Cookies)
// ==========================================
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["JWTSettings:key"]!))
    };
})
.AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
{
    options.LoginPath = "/Authorize/login";
});

// ==========================================
// 3. ВЛАСНІ СЕРВІСИ
// ==========================================
builder.Services.AddTransient<ITokenService, TokenService>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuthService, AuthService>();

// Нові сервіси
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddHttpClient<BLL.RecaptchaService.IRecaptchaService, BLL.RecaptchaService.RecaptchaService>();
builder.Services.AddScoped<BLL.PrivacyService.IPrivacyService, BLL.PrivacyService.PrivacyService>();
builder.Services.AddScoped<BLL.NotificationService.INotificationService, BLL.NotificationService.NotificationService>();
builder.Services.AddScoped<BLL.AdminService.IAdminService, BLL.AdminService.AdminService>();

builder.Services.AddAutoMapper(x => x.AddProfile<MappingProfile>());
var emailSet = builder.Configuration.GetSection("EmailSettings").Get<EmailSettings>();
builder.Services.AddSingleton(emailSet);
builder.Services.AddTransient<IEmailService, EmailSender>();

// ==========================================
// 4. SWAGGER (НАЛАШТУВАННЯ)
// ==========================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Налаштування кнопки Authorize
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type=ReferenceType.SecurityScheme,
                    Id="Bearer"
                }
            },
            new string[]{}
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});


var app = builder.Build();

WebApplication25.Configuration.Mapping.ServiceLocator.ServiceProviderPublic = app.Services;

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var roleManager = services.GetRequiredService<RoleManager<AppRole>>();
        await DbInitializer.SeedAsync(userManager, roleManager);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Помилка при створенні ролей");
    }
}
app.MapStaticAssets();
app.UseStaticFiles();
app.UseMiddleware<ExceptionMiddleware>();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Document}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();