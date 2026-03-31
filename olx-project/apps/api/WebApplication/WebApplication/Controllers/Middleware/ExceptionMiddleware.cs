using System.Net;
using System.Text.Json;

namespace OnlineLibrary_BookKey.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Пробуємо виконати запит далі
                await _next(context);
            }
            catch (Exception ex)
            {
                // Якщо зловили помилку - обробляємо
                _logger.LogError(ex, ex.Message);

                context.Response.ContentType = "application/json";
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

                var response = _env.IsDevelopment()
                    ? new { StatusCode = context.Response.StatusCode, Message = ex.Message, StackTrace = ex.StackTrace?.ToString() }
                    : new { StatusCode = context.Response.StatusCode, Message = "Internal Server Error", StackTrace = "See logs" };

                var json = JsonSerializer.Serialize(response);
                await context.Response.WriteAsync(json);
            }
        }
    }
}