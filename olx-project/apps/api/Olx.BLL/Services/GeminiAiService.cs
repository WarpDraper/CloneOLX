using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Olx.BLL.DTOs.CategoryDtos;
using Olx.BLL.Exceptions;
using Olx.BLL.Helpers;
using Olx.BLL.Helpers.Options;
using Olx.BLL.Interfaces;
using Olx.BLL.Models.Ai;
using Olx.BLL.Models.Category;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Olx.BLL.Services
{
    // Calls Google's Gemini `generateContent` REST endpoint (no official Google AI SDK
    // dependency — a plain HttpClient call against the endpoint built from GeminiOptions) to
    // turn a short advert title into a suggested category + a structured description, and
    // (separately) to translate/slugify admin-entered category names.
    public class GeminiAiService(
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiOptions> geminiOptions,
        ICategoryService categoryService,
        ICacheService cacheService,
        ILogger<GeminiAiService> logger) : IAiService
    {
        // Matches a whole response wrapped in a fenced code block, e.g. "```json\n{...}\n```" or
        // just "```\n{...}\n```". Gemini's `responseMimeType: application/json` is supposed to
        // stop this, but it's not guaranteed for every model/version, and stripping it is cheap
        // insurance against an otherwise-valid response failing to deserialize.
        private static readonly Regex MarkdownFenceRegex = new(
            @"^\s*```(?:json)?\s*\r?\n?(?<body>.*?)\r?\n?```\s*$",
            RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

        // Collapses runs of whitespace when building the advert-generation cache key, so
        // "iPhone 13   Pro" and "iphone 13 pro" hit the same cache entry.
        private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled);

        private static readonly JsonSerializerOptions SerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        // Deterministic, low-latency settings shared by every Gemini generateContent call: a low
        // temperature keeps category classification/JSON output stable across near-identical
        // titles (also improving cache-hit consistency), and a hard maxOutputTokens cap bounds
        // per-request cost/latency regardless of what the model tries to generate.
        private const double GenerationTemperature = 0.2;
        private const int MaxOutputTokens = 250;

        // Response cache for GenerateAdvertContentAsync, keyed by the normalized advert title.
        // Repeat/near-duplicate titles (many sellers list "iPhone 13 Pro") reuse the same
        // suggested category + description instead of re-spending a Gemini call and eating into
        // the daily rate limit; 24h keeps results fresh enough that a category catalog change
        // isn't stale for long.
        private static readonly TimeSpan AdvertCacheDuration = TimeSpan.FromHours(24);
        private const string AdvertCacheKeyPrefix = "ai:generate-advert:";

        public Task<GenerateAdvertResponse> GenerateAdvertContentAsync(string title, CancellationToken cancellationToken = default)
        {
            var cacheKey = BuildAdvertCacheKey(title);

            // GetOrSetAsync only invokes the factory (and therefore only calls Gemini) on a cache
            // miss; a thrown HttpException propagates straight out without caching anything, so a
            // transient upstream failure never poisons the cache with a bad/empty result — only a
            // genuinely successful response ever gets stored.
            return cacheService.GetOrSetAsync(
                cacheKey,
                async ct =>
                {
                    // Real category ids from the DB are included in the prompt so Gemini can only
                    // ever suggest a CategoryId that actually exists, instead of hallucinating one.
                    var categories = await categoryService.Get();
                    var prompt = BuildPrompt(title, categories);

                    var requestPayload = new
                    {
                        contents = new object[]
                        {
                            new { parts = new object[] { new { text = prompt } } }
                        },
                        generationConfig = new
                        {
                            temperature = GenerationTemperature,
                            maxOutputTokens = MaxOutputTokens,
                            responseMimeType = "application/json",
                            responseSchema = new
                            {
                                type = "OBJECT",
                                properties = new
                                {
                                    suggestedCategoryId = new { type = "INTEGER" },
                                    generatedDescription = new { type = "STRING" }
                                },
                                required = new[] { "suggestedCategoryId", "generatedDescription" }
                            }
                        }
                    };

                    var text = await CallGeminiAsync(requestPayload, "generate-advert", ct);

                    try
                    {
                        return JsonSerializer.Deserialize<GenerateAdvertResponse>(text, SerializerOptions)
                            ?? throw new HttpException("The AI generation service returned an unexpected response.", HttpStatusCode.BadGateway);
                    }
                    catch (JsonException ex)
                    {
                        logger.LogError(ex, "Failed to parse the structured JSON Gemini returned for generate-advert: {Text}", text);
                        throw new HttpException("The AI generation service returned an unexpected response.", HttpStatusCode.BadGateway);
                    }
                },
                AdvertCacheDuration,
                cancellationToken);
        }

        // POST /api/admin/categories/auto-translate. Shares the same Gemini `generateContent`
        // REST endpoint/error-handling shape as GenerateAdvertContentAsync above, just with a
        // different prompt + response schema (UK/EN titles + a URL slug instead of a category
        // suggestion + description).
        public async Task<CategoryTranslationResult> GenerateCategoryTranslationAsync(string prompt, CancellationToken cancellationToken = default)
        {
            var requestPayload = new
            {
                contents = new object[]
                {
                    new { parts = new object[] { new { text = BuildCategoryTranslationPrompt(prompt) } } }
                },
                generationConfig = new
                {
                    temperature = GenerationTemperature,
                    maxOutputTokens = MaxOutputTokens,
                    responseMimeType = "application/json",
                    responseSchema = new
                    {
                        type = "OBJECT",
                        properties = new
                        {
                            nameUk = new { type = "STRING" },
                            nameEn = new { type = "STRING" },
                            slug = new { type = "STRING" }
                        },
                        required = new[] { "nameUk", "nameEn", "slug" }
                    }
                }
            };

            var text = await CallGeminiAsync(requestPayload, "category-translation", cancellationToken);

            try
            {
                return JsonSerializer.Deserialize<CategoryTranslationResult>(text, SerializerOptions)
                    ?? throw new HttpException("The AI generation service returned an unexpected response.", HttpStatusCode.BadGateway);
            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Failed to parse the structured JSON Gemini returned for category-translation: {Text}", text);
                throw new HttpException("The AI generation service returned an unexpected response.", HttpStatusCode.BadGateway);
            }
        }

        // Sends `requestPayload` to Gemini's `generateContent` endpoint (URL built from the
        // configured GeminiOptions) and returns the raw text of the first candidate, with any
        // Markdown code-fence wrapper stripped off. `callerContext` is just for log messages
        // (e.g. "generate-advert" vs "category-translation") so a failure in the server log can
        // be tied back to which caller triggered it.
        private async Task<string> CallGeminiAsync(object requestPayload, string callerContext, CancellationToken cancellationToken)
        {
            var options = geminiOptions.Value;
            if (string.IsNullOrWhiteSpace(options.ApiKey))
            {
                logger.LogError(
                    "Gemini API key is not configured (Gemini:ApiKey / legacy GeminiApiKey); cannot call the Gemini AI endpoint for {CallerContext}.",
                    callerContext);
                throw new HttpException(
                    "AI generation is not configured on the server.",
                    HttpStatusCode.ServiceUnavailable);
            }

            var endpoint = options.GenerateContentUrl;

            var client = httpClientFactory.CreateClient(HttpClients.Gemini);
            // Send the key via the x-goog-api-key header rather than the ?key= query string.
            // Functionally either works, but the query-string form puts the key in plain text in
            // HttpClient/Polly logs, any intermediate proxy's access log, and browser/network
            // history if this ever gets proxied through client-visible tooling — the header form
            // is Google's currently recommended approach and avoids all of that. Using
            // HttpRequestMessage (not client.PostAsync(uri, content)) so the header can be set
            // per-request instead of as a client-wide default (this HttpClient is shared/pooled
            // via IHttpClientFactory).
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = new StringContent(JsonSerializer.Serialize(requestPayload), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("x-goog-api-key", options.ApiKey);

            HttpResponseMessage response;
            try
            {
                response = await client.SendAsync(request, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex,
                    "Failed to reach the Gemini API for {CallerContext} at {Endpoint}.",
                    callerContext, endpoint);
                throw new HttpException("Failed to reach the AI generation service.", HttpStatusCode.BadGateway, ex);
            }

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                // Logged at Error with the exact upstream status code, the endpoint that was
                // called, and the full response body regardless of status, since Google's error
                // payload (`error.status` / `error.message`) is the only way to tell apart "API
                // key missing/invalid" (401 UNAUTHENTICATED / 400 API_KEY_INVALID), "key valid but
                // Generative Language API not enabled on the project" (403 PERMISSION_DENIED), and
                // "quota exceeded" (429) — all of which otherwise look identical to the caller as
                // a generic BadGateway.
                logger.LogError(
                    "Gemini API request failed for {CallerContext} — {StatusCode} from {Endpoint}: {Body}",
                    callerContext, response.StatusCode, endpoint, responseBody);

                throw MapUpstreamError(response.StatusCode, responseBody);
            }

            GeminiGenerateContentResponse? geminiResponse;
            try
            {
                geminiResponse = JsonSerializer.Deserialize<GeminiGenerateContentResponse>(responseBody, SerializerOptions);
            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Failed to parse Gemini API response for {CallerContext}: {Body}", callerContext, responseBody);
                throw new HttpException("The AI generation service returned an unexpected response.", HttpStatusCode.BadGateway);
            }

            var blockReason = geminiResponse?.PromptFeedback?.BlockReason;
            if (!string.IsNullOrWhiteSpace(blockReason))
            {
                logger.LogWarning("Gemini blocked the {CallerContext} prompt: {BlockReason}", callerContext, blockReason);
                throw new HttpException("The AI generation service declined to respond to this input.", HttpStatusCode.BadRequest);
            }

            // Defensive null-chain: candidates/content/parts can legitimately be missing (e.g. a
            // finishReason of SAFETY/RECITATION with no content at all), so this must never throw
            // a NullReferenceException — that would surface as an unhandled 500/502 instead of the
            // descriptive error below.
            var text = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(text))
            {
                logger.LogError("Gemini API response for {CallerContext} contained no text candidate: {Body}", callerContext, responseBody);
                throw new HttpException("The AI generation service returned an empty response.", HttpStatusCode.BadGateway);
            }

            return StripMarkdownFence(text);
        }

        // Maps a failed upstream Gemini HTTP status to a descriptive, non-502 error wherever the
        // failure is attributable to our own configuration (missing/invalid/expired key, quota)
        // rather than a genuine "the AI service itself is unreachable/broken" condition.
        private static HttpException MapUpstreamError(HttpStatusCode status, string body)
        {
            if (status is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            {
                return new HttpException(
                    "AI generation is not available: the configured API key is missing, revoked, or the Generative Language API isn't enabled for its project.",
                    HttpStatusCode.ServiceUnavailable);
            }

            if (status == HttpStatusCode.BadRequest && body.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase))
            {
                return new HttpException(
                    "AI generation is not available: the configured API key is invalid.",
                    HttpStatusCode.ServiceUnavailable);
            }

            if (status == HttpStatusCode.TooManyRequests)
            {
                return new HttpException(
                    "AI generation is temporarily unavailable (rate limit exceeded). Please try again shortly.",
                    HttpStatusCode.ServiceUnavailable);
            }

            return new HttpException("The AI generation service returned an error.", HttpStatusCode.BadGateway);
        }

        // Strips a Markdown code-fence wrapper (```json ... ``` or ``` ... ```) off a Gemini
        // response before it's handed to JsonSerializer. Returns the input unchanged if it isn't
        // fenced.
        private static string StripMarkdownFence(string text)
        {
            var match = MarkdownFenceRegex.Match(text.Trim());
            return match.Success ? match.Groups["body"].Value.Trim() : text.Trim();
        }

        // Cache key for GenerateAdvertContentAsync: trims, lowercases, and collapses internal
        // whitespace so trivially-different titles for the same item ("iPhone 13   Pro " vs
        // "iphone 13 pro") share one cache entry instead of each spending its own Gemini call.
        private static string BuildAdvertCacheKey(string title) =>
            AdvertCacheKeyPrefix + WhitespaceRegex.Replace(title.Trim(), " ").ToLowerInvariant();

        private static string BuildCategoryTranslationPrompt(string prompt) => $"""
            You are helping an admin of an OLX-style classifieds marketplace fill in a category form.

            Draft category name / description (may be in Ukrainian, English, or mixed): "{prompt}"

            Respond with ONLY a raw JSON object matching the provided schema — no Markdown code
            fences, no commentary, no text before or after the JSON:
            - nameUk: the category title in Ukrainian, short (1-4 words), title case.
            - nameEn: the category title in English, short (1-4 words), title case.
            - slug: a URL-friendly slug for nameEn — lowercase, ASCII letters/digits only,
              words separated by hyphens (e.g. "kids-world").
            """;

        private static string BuildPrompt(string title, IEnumerable<CategoryDto> categories)
        {
            var categoryLines = categories.Select(c => $"{c.Id}: {c.Name}");
            var categoryList = string.Join("\n", categoryLines);

            return $"""
                You are an assistant that helps sellers on an OLX-style classifieds marketplace
                fill in their advert faster.

                Advert title: "{title}"

                Available categories (format is "id: name"), choose the single best match:
                {categoryList}

                Write a helpful, honest advert description in Ukrainian for this title — at
                most 3 concise sentences, covering condition, key features/specs implied by
                the title, and typical selling points. Do not invent specific facts (exact
                price, exact defects, warranty terms) that cannot be inferred from the title
                alone.

                Respond with ONLY a raw JSON object matching the provided schema — no Markdown
                code fences, no commentary, no text before or after the JSON:
                suggestedCategoryId must be one of the category ids listed above, and
                generatedDescription must be the description text (max 3 sentences).
                """;
        }
    }
}
