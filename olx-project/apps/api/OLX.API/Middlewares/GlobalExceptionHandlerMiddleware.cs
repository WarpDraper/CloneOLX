using Olx.BLL.Exceptions;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using FluentValidation;
using Microsoft.Extensions.Logging;

namespace OLX.API.Middlewares
{
    public class GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {

        public async Task Invoke(HttpContext context)
        {
            // ASP.NET Core already stamps every request with a unique TraceIdentifier — reuse it
            // as the correlation/request id instead of minting a new one. Logged on every branch
            // below AND echoed back in the JSON error body, so a user-reported failure ("got an
            // error trying to load the page") can be grep'd straight out of the server logs by
            // the id shown in the browser console (see createBaseQuery.ts logging).
            var requestId = context.TraceIdentifier;
            var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;

            try
            {
                await next(context);
            }
            catch (HttpException httpError)
            {
                // Expected business-rule failure (bad credentials, invalid id, ...) — Warning,
                // not Error, since these are normal request outcomes, not bugs.
                logger.LogWarning(httpError, "[{RequestId}] {Method} {Path}{Query} (user={UserId}) -> {Status}: {Message}",
                    requestId, context.Request.Method, context.Request.Path, queryString, userId, (int)httpError.Status, httpError.Message);

                if (httpError.Value is not null)
                {
                    await CreateResponse(context, requestId, httpError.Status, httpError.Value);
                }
                else
                {
                    await CreateResponse(context, requestId, httpError.Status, httpError.Message);
                }
            }
            catch (ValidationException validationError)
            {
                logger.LogWarning(validationError, "[{RequestId}] {Method} {Path}{Query} (user={UserId}) -> 400 (validation): {Message}",
                    requestId, context.Request.Method, context.Request.Path, queryString, userId, validationError.Message);
                await CreateResponse(context, requestId, HttpStatusCode.BadRequest, validationError.Errors);
            }
            catch (KeyNotFoundException error)
            {
                logger.LogWarning(error, "[{RequestId}] {Method} {Path}{Query} (user={UserId}) -> 404: {Message}",
                    requestId, context.Request.Method, context.Request.Path, queryString, userId, error.Message);
                await CreateResponse(context, requestId, HttpStatusCode.NotFound, error.Message);
            }
            catch (Exception error)
            {
                // Anything reaching here is unexpected (e.g. a Npgsql "column does not exist"
                // from an entity change that shipped without its migration, or a LINQ expression
                // that has no SQL translation on the current provider) — Error level with the
                // full exception, request id, route, query string AND user id, so it actually
                // shows up in the log output with enough context to reproduce, instead of only
                // ever being visible (minus a stack trace) in the HTTP response body. This is the
                // single place every unhandled exception in the API surfaces, so logging here
                // covers every controller/service, not just Account/login.
                logger.LogError(error, "[{RequestId}] Unhandled exception on {Method} {Path}{Query} (user={UserId})",
                    requestId, context.Request.Method, context.Request.Path, queryString, userId);
                await CreateResponse(context, requestId, HttpStatusCode.InternalServerError, error.Message);
            }
        }

        private async Task CreateResponse(HttpContext context,
                                    string requestId,
                                    HttpStatusCode statusCode = HttpStatusCode.InternalServerError,
                                    string message = "Unknown error type!")
        {
            await CreateResponse(context, requestId, statusCode, new { message });
        }

        private async Task CreateResponse(HttpContext context,
                                    string requestId,
                                    HttpStatusCode statusCode,
                                    object errors)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;
            context.Response.Headers["X-Request-Id"] = requestId;

            // requestId is merged into the serialized error payload (rather than only a header)
            // so it's visible next to the message in the browser console/network tab without the
            // frontend needing to separately read response headers. `errors` can be a plain
            // `{ message }` object, an HttpException's custom `.Value`, or FluentValidation's
            // propertyName->messages map — go through JsonNode instead of reflection so every one
            // of those shapes round-trips correctly; only a JSON object gets the extra field
            // merged in directly, anything else (array/primitive) is wrapped so requestId is
            // still present without corrupting the original shape.
            var errorsNode = JsonSerializer.SerializeToNode(errors);
            JsonNode responseNode;
            if (errorsNode is JsonObject errorsObject)
            {
                errorsObject["requestId"] = requestId;
                responseNode = errorsObject;
            }
            else
            {
                responseNode = new JsonObject { ["requestId"] = requestId, ["errors"] = errorsNode };
            }

            await context.Response.WriteAsync(responseNode.ToJsonString());
        }
    }
}
