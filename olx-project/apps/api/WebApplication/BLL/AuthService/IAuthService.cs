using BLL.DTO.Authorize;
using Microsoft.AspNetCore.Http;
using OLXCLONE.DTO.Authorize;
using System;
using System.Collections.Generic;
using System.Text;

namespace BLL.AuthService
{
    public interface IAuthService
    {
        Task<bool> RegisterAsync(RegisterDto model);
        Task<AuthResultDto> LoginAsync(LoginDto model);
        Task<AuthResultDto> RefreshTokenAsync(RefreshTokenDto model);
        Task<bool> ConfirmEmailAsync(string userId, string token);
        Task<bool> ForgotPasswordAsync(ForgotPasswordDto model);
        Task<AuthResultDto> ResetPasswordAsync(ResetPasswordDto model);
        Task<AuthResultDto> ChangePasswordAsync(string userId, ChangePasswordDto model);
        Task<AuthResultDto> LogoutAsync(string userId);
        Task<AuthResultDto> DeleteAccountAsync(string userId);
        Task<AuthResultDto> GoogleLoginAsync(ExternalAuthDto model);
        Task<AuthResultDto> UpdateProfileAsync(string userId, UpdateProfileDto model);
        Task<AuthResultDto> UpdateAvatarAsync(string userId, IFormFile file);
    }
}
