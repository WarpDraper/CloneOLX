using System.Text.Json.Serialization;

namespace BLL.DTO.Authorize;

public class RecaptchaDto
{
    public string Token { get; set; }
}

public class RecaptchaResponseDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    
    [JsonPropertyName("score")]
    public float Score { get; set; } // 0.0 - 1.0
    
    [JsonPropertyName("action")]
    public string Action { get; set; }
    
    [JsonPropertyName("challenge_ts")]
    public DateTime ChallengeTimestamp { get; set; }
    
    [JsonPropertyName("hostname")]
    public string Hostname { get; set; }
}
