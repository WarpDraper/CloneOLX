using FluentValidation;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NETCore.MailKit.Extensions;
using NETCore.MailKit.Infrastructure.Internal;
using Olx.BLL.Exceptions;
using Olx.BLL.Helpers.Options;
using Olx.BLL.Interfaces;
using Olx.BLL.Resources;
using Olx.BLL.Services;
using Olx.BLL.Services.BackgroundServices;
using System.Net;


namespace Olx.BLL.Exstensions
{
    public static class OlxBLLServiceExtensions
    {
        public static void AddOlxBLLServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddAutoMapper(cfg => cfg.AddMaps(typeof(AccountService).Assembly));
            services.AddValidatorsFromAssemblyContaining<AccountService>();
            services.AddScoped<IImageService, ImageService>();
            services.AddScoped<IJwtService, JwtService>();
            services.AddScoped<IAccountService, AccountService>();
            services.AddScoped<IFilterValueService, FilterValueService>();
            services.AddScoped<IFilterService, FilterService>();
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<IAdvertService, AdvertService>();
            services.AddScoped<IOrderService, OrderService>();
            services.AddScoped<IChatService, ChatService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IAdminMessageService, AdminMessageService>();
            services.AddScoped<IAdvertImageService, AdvertImageService>();
            services.AddScoped<INewPostService, NewPostService>();
            services.AddScoped<IBackupDataService, BackupDataService>();
            services.AddHostedService<TokenCleanupService>();
            services.AddHostedService<ImageCeanupService>();
            services.AddHostedService<AdminMesssageCleanupService>();

            services.AddMailKit(optionBuilder =>
            {
                var settings = configuration.GetSection(nameof(MailSettings)).Get<MailSettings>()
                    ?? throw new HttpException(Errors.JwtSettingsReadError, HttpStatusCode.InternalServerError);

                optionBuilder.UseMailKit(new MailKitOptions()
                {
                    Server = settings.Server,
                    Port = settings.Port,
                    SenderName = settings.SenderName,
                    SenderEmail = settings.SenderEmail,
                    Account = settings.Account,
                    Password = settings.Password,
                    Security = true
                });
            });
        }
    }
}
