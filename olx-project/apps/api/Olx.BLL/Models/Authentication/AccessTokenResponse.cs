
namespace Olx.BLL.Models.Authentication
{
    // Returned by endpoints that issue tokens (login/refresh). Deliberately excludes
    // RefreshToken: the refresh token is set only in an HttpOnly cookie and must never
    // be reachable from client-side JS or logged via the JSON response body.
    public class AccessTokenResponse
    {
        public string AccessToken { get; init; } = string.Empty;
    }
}
