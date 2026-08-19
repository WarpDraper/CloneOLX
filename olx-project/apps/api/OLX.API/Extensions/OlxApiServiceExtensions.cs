using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.FileProviders;
using OLX.API.Helpers.CustomJsonConverters;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.OpenApi.Models;
using System.Reflection;
using Microsoft.AspNetCore.Identity;
using Olx.BLL.Helpers.Options;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.AspNetCore.Localization;
using OLX.API.Filters;
using Olx.BLL.Helpers;


namespace OLX.API.Extensions
{
    public static class OlxApiServiceExtensions
    {
        /// <summary>
        /// Налаштування контроллерів,JWT,Swagger,CORS
        /// </summary>
        /// <param name="services"></param>
        /// <param name="configuration"></param>
        public static void AddOlxApiConfigurations(this IServiceCollection services,IConfiguration configuration)
        {
            // Raises the multipart form parsing limit above the 10 MB single-image cap (see
            // FileTypes.MaxImageFileSizeBytes) so a request carrying several images at once
            // (advert creation, category icon + any future multi-file admin forms) doesn't get
            // rejected by ASP.NET Core's form parser before FluentValidation ever runs.
            services.Configure<FormOptions>(options =>
            {
                options.MultipartBodyLengthLimit = 60 * 1024 * 1024; // 60 MB
            });

            services.AddScoped<FluentValidationActionFilter>();
            services.AddControllers(options =>
            {
                // Validates any bound action argument that has a registered FluentValidation
                // IValidator<T> before the action runs, short-circuiting invalid requests with a
                // formatted 400 instead of letting them reach the controller/service layer. This
                // complements (does not replace) the explicit validator.ValidateAndThrow(...)
                // calls already inside the services, which remain the safety net for any code
                // path that builds/validates models outside the MVC pipeline (e.g. DbSeeder).
                options.Filters.Add<FluentValidationActionFilter>();
            }).AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new FlexibleDateTimeConverter());
                options.JsonSerializerOptions.Converters.Add(new FlexibleDoubleConverter());
            });

            var jwtOpts = configuration.GetSection(nameof(JwtOptions)).Get<JwtOptions>()!;

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            }).AddJwtBearer(cfg =>
            {
                cfg.RequireHttpsMetadata = false;
                cfg.SaveToken = true;
                cfg.IncludeErrorDetails = true;
                cfg.TokenValidationParameters = new TokenValidationParameters()
                {
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOpts.Key)),
                    ValidateAudience = false,
                    ValidateIssuer = true,
                    ValidateLifetime = true,
                    ValidIssuer = jwtOpts.Issuer,
                    ValidateIssuerSigningKey = true,
                    NameClaimType = ClaimTypes.NameIdentifier,
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
                cfg.Events = new JwtBearerEvents
                {
                    OnMessageReceived = (context) => {
                        var accessToken = context.Request.Query["access_token"];

                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });
  
            services.Configure<DataProtectionTokenProviderOptions>(options =>
            {
                options.TokenLifespan = TimeSpan.FromMinutes(Double.Parse(configuration["TokenLifespanMinutes"]!)); // Термін дії токенів для відновлення та підтвердження
            });

            var assemblyName = Assembly.GetExecutingAssembly().GetName().Name;
            services.AddSwaggerGen(setup =>
            {
                var fileDoc = Path.Combine(AppContext.BaseDirectory, $"{assemblyName}.xml");
                setup.IncludeXmlComments(fileDoc);
                // Include 'SecurityScheme' to use JWT Authentication
                var jwtSecurityScheme = new OpenApiSecurityScheme
                {
                    BearerFormat = "JWT",
                    Name = "JWT Authentication",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = JwtBearerDefaults.AuthenticationScheme,
                    Description = "Put **_ONLY_** your JWT Bearer token on textbox below!",

                    Reference = new OpenApiReference
                    {
                        Id = JwtBearerDefaults.AuthenticationScheme,
                        Type = ReferenceType.SecurityScheme
                    }
                };

                setup.AddSecurityDefinition(jwtSecurityScheme.Reference.Id, jwtSecurityScheme);
                setup.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    { jwtSecurityScheme, Array.Empty<string>() }
                });
            });

            // Allowed origins come from configuration (AllowedCorsOrigins, comma-separated) so each
            // environment (local dev, Render, production) can set its own without a rebuild.
            var allowedOrigins = (configuration["AllowedCorsOrigins"] ?? "http://localhost:5173")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend",
                builder =>
                {
                    builder.WithOrigins(allowedOrigins)
                           .AllowAnyHeader()
                           .AllowAnyMethod()
                           .AllowCredentials();
                });
            });
        }

        /// <summary>
        /// Named <see cref="HttpClient"/>s for every third-party API this backend calls
        /// (Nova Poshta address data, Google OAuth userinfo, Google reCAPTCHA verification, and
        /// arbitrary image hosts for "save advert image from URL"), each wrapped in the standard
        /// Polly v8 resilience pipeline (retry with jittered exponential backoff, a per-attempt
        /// timeout, a total-request timeout and a circuit breaker). Previously these services
        /// called `new HttpClient()` directly, which both leaks sockets under load and has zero
        /// retry/timeout behaviour — a single slow or flaky external call could hang a request
        /// or exhaust the machine's sockets.
        /// </summary>
        public static void AddOlxHttpClients(this IServiceCollection services)
        {
            // Nova Poshta is called in bulk (paged) from UpdateNewPostData/the seeder, so it gets
            // a slightly longer total timeout and more retry attempts than the others.
            services.AddHttpClient(HttpClients.NewPost, client =>
            {
                client.Timeout = Timeout.InfiniteTimeSpan; // total timeout is governed by the resilience pipeline below
            }).AddStandardResilienceHandler(options =>
            {
                options.Retry.MaxRetryAttempts = 4;
                options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(15);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(60);
                options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
            });

            services.AddHttpClient(HttpClients.GoogleAuth, client =>
            {
                client.Timeout = Timeout.InfiniteTimeSpan;
            }).AddStandardResilienceHandler(options =>
            {
                options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(20);
            });

            services.AddHttpClient(HttpClients.Recaptcha, client =>
            {
                client.Timeout = Timeout.InfiniteTimeSpan;
            }).AddStandardResilienceHandler(options =>
            {
                options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(20);
            });

            // User/admin-supplied image URLs: kept resilient but with tighter timeouts since this
            // runs inline in a request handling an image upload.
            services.AddHttpClient(HttpClients.ImageDownload, client =>
            {
                client.Timeout = Timeout.InfiniteTimeSpan;
            }).AddStandardResilienceHandler(options =>
            {
                options.Retry.MaxRetryAttempts = 2;
                options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(20);
            });

            // Google Gemini (generateContent): called inline from the "Заповнити з AI" button
            // while the user waits, so kept to a couple of retries and a bounded total timeout
            // rather than the longer NewPost-style budget.
            services.AddHttpClient(HttpClients.Gemini, client =>
            {
                client.Timeout = Timeout.InfiniteTimeSpan; // total timeout is governed by the resilience pipeline below
            }).AddStandardResilienceHandler(options =>
            {
                options.Retry.MaxRetryAttempts = 2;
                options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(20);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
                // CircuitBreaker.SamplingDuration must be at least double the AttemptTimeout
                // (defaults to 30s, which is < 2x20s and fails options validation on startup).
                options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(40);
            });
        }

        /// <summary>
        /// Створення папки для файлів та шлях до файлів
        /// </summary>
        /// <param name="app"></param>
        public static void AddStaticFiles(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var serviceProvider = scope.ServiceProvider;
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();

            string imagesDir = Path.Combine(Directory.GetCurrentDirectory(), configuration["ImagesDir"]!);
            string imagesPath = Path.Combine(Directory.GetCurrentDirectory(), configuration["ServerImagePath"]!);
           
            if (!Directory.Exists(imagesDir))
            {
                Directory.CreateDirectory(imagesDir);
            }
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(imagesDir),
                RequestPath = imagesPath
            });

        }

        public static void AddCultures(this WebApplication app)
        {
            var supportedCultures = new[] { "en-US", "uk-UA" };
            var localizationOptions = new RequestLocalizationOptions()
                .SetDefaultCulture("en-US")
                .AddSupportedCultures(supportedCultures)
                .AddSupportedUICultures(supportedCultures);
            localizationOptions.RequestCultureProviders.Insert(0, new CustomRequestCultureProvider(async context =>
            {
                var userLang = context.Request.Headers.AcceptLanguage.ToString();
                if (userLang != null &&
                    (userLang.StartsWith("ru", StringComparison.OrdinalIgnoreCase) ||
                    userLang.StartsWith("uk", StringComparison.OrdinalIgnoreCase)))
                {
                    return new ProviderCultureResult("uk-UA");
                }
                return new ProviderCultureResult("en-US");

            }));
            app.UseRequestLocalization(localizationOptions);
        }

        public static void SetMaxRequestBodySize(this WebApplication app)
        {
            app.UseWhen(context =>
             context.Request.Path.StartsWithSegments("/api/Backup/upload") ||
             context.Request.Path.StartsWithSegments("/api/Backup/add"),
             appBuilder =>
             {
                 appBuilder.Use((context, next) =>
                 {
                     var bodySizeFeature = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
                     if (bodySizeFeature is not null)
                     {
                         bodySizeFeature.MaxRequestBodySize = 200 * 1024 * 1024;
                     }
                     return next();
                 });
             });

        }
    }
}
