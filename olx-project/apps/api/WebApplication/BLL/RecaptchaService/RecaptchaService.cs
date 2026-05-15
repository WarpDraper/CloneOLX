using BLL.DTO.Authorize;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace BLL.RecaptchaService;

public interface IRecaptchaService
{
    Task<bool> VerifyTokenAsync(string token, string action, float minScore = 0.5f);
}

public class RecaptchaService : IRecaptchaService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RecaptchaService> _logger;
    private const string VerifyUrl = "https://www.google.com/recaptcha/api/siteverify";

    public RecaptchaService(HttpClient httpClient, IConfiguration configuration, ILogger<RecaptchaService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> VerifyTokenAsync(string token, string action, float minScore = 0.5f)
    {
        try
        {
            // Перевірка базової валідності
            if (string.IsNullOrWhiteSpace(token))
            {
                _logger.LogWarning("Empty reCAPTCHA token provided");
                return false;
            }

            var secretKey = _configuration["RecaptchaSettings:SecretKey"];
            if (string.IsNullOrEmpty(secretKey))
            {
                _logger.LogWarning("reCAPTCHA secret key is not configured - allowing request to pass");
                return true; // У development режимі, якщо не конфігурований
            }

            // Перевірка score диапазону
            if (minScore < 0 || minScore > 1)
            {
                _logger.LogWarning($"Invalid minScore value: {minScore}. Must be between 0 and 1");
                minScore = 0.5f;
            }

            var requestData = new { secret = secretKey, response = token };
            var content = new StringContent(
                JsonSerializer.Serialize(requestData),
                System.Text.Encoding.UTF8,
                "application/json");

            // Встановляємо timeout для запиту
            using (var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(10)))
            {
                var response = await _httpClient.PostAsync(VerifyUrl, content, cts.Token);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"reCAPTCHA API returned non-success status: {response.StatusCode}");
                    return false;
                }

                var jsonResponse = await response.Content.ReadAsStringAsync(cts.Token);
                var recaptchaResponse = JsonSerializer.Deserialize<RecaptchaResponseDto>(jsonResponse);

                if (recaptchaResponse == null)
                {
                    _logger.LogError("Failed to deserialize reCAPTCHA response");
                    return false;
                }

                // Логування результатів
                _logger.LogInformation($"reCAPTCHA verification - Success: {recaptchaResponse.Success}, Score: {recaptchaResponse.Score}, Action: {recaptchaResponse.Action}");

                // Комплексна валідація
                var isValid = recaptchaResponse.Success &&
                              recaptchaResponse.Score >= minScore &&
                              recaptchaResponse.Action == action;

                if (!isValid)
                {
                    if (!recaptchaResponse.Success)
                        _logger.LogWarning("reCAPTCHA verification failed at Google API");
                    else if (recaptchaResponse.Score < minScore)
                        _logger.LogWarning($"reCAPTCHA score too low: {recaptchaResponse.Score} (minimum: {minScore})");
                    else if (recaptchaResponse.Action != action)
                        _logger.LogWarning($"reCAPTCHA action mismatch: expected '{action}', got '{recaptchaResponse.Action}'");
                }

                return isValid;
            }
        }
        catch (System.Threading.Tasks.TaskCanceledException ex)
        {
            _logger.LogError($"reCAPTCHA verification timeout: {ex.Message}");
            return false;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError($"reCAPTCHA HTTP error: {ex.Message}");
            return false;
        }
        catch (JsonException ex)
        {
            _logger.LogError($"reCAPTCHA JSON parsing error: {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Unexpected error during reCAPTCHA verification: {ex.Message}");
            return false;
        }
    }
}
