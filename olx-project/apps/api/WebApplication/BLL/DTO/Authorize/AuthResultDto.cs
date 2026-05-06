using System;
using System.Collections.Generic;
using System.Text;

namespace BLL.DTO.Authorize
{
    public class AuthResultDto
    {
        public bool IsSuccess { get; set; }
        public string? Token { get; set; }
        public string? RefreshToken { get; set; }
        public string? Email { get; set; }
        public string? Message { get; set; }

        public static AuthResultDto Success(string token, string? refreshToken = null, string? email = null) =>
            new AuthResultDto { IsSuccess = true, Token = token, RefreshToken = refreshToken, Email = email };
        public static AuthResultDto Fail(string message) =>
            new AuthResultDto { IsSuccess = false, Message = message };
    }
}
