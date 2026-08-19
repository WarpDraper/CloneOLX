using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace OLX.API.Filters
{
    /// <summary>
    /// Runs FluentValidation against every bound action argument that has a registered
    /// <see cref="IValidator{T}"/> before the action executes, short-circuiting with a
    /// formatted 400 response (grouped by field, matching ASP.NET's standard validation-problem
    /// shape) instead of letting an invalid model reach the controller/service layer.
    ///
    /// This is additive, not a replacement: some services also call
    /// `validator.ValidateAndThrow(...)` directly (e.g. AdvertService, CategoryService), which
    /// stays in place as a safety net for any code path that builds/validates models outside the
    /// MVC pipeline (background jobs, DbSeeder, etc). GlobalExceptionHandlerMiddleware already
    ///  formats a thrown FluentValidation.ValidationException the same way a raw 400 from this
    /// filter would look to a client, so the two layers are consistent with each other.
    /// </summary>
    public class FluentValidationActionFilter(IServiceProvider serviceProvider) : IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            foreach (var argument in context.ActionArguments.Values)
            {
                if (argument is null)
                {
                    continue;
                }

                var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
                if (serviceProvider.GetService(validatorType) is not IValidator validator)
                {
                    continue;
                }

                var validationContext = new ValidationContext<object>(argument);
                var result = await validator.ValidateAsync(validationContext, context.HttpContext.RequestAborted);
                if (!result.IsValid)
                {
                    var errors = result.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());

                    context.Result = new BadRequestObjectResult(new
                    {
                        title = "One or more validation errors occurred.",
                        status = StatusCodes.Status400BadRequest,
                        errors
                    });
                    return;
                }
            }

            await next();
        }
    }
}
