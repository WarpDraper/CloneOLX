using System.ComponentModel.DataAnnotations;

namespace BLL.DTO.Authorize
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "Введіть Email")]
        [EmailAddress(ErrorMessage = "Невірний формат пошти")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Введіть пароль")]
        [MinLength(6, ErrorMessage = "Пароль має бути не менше 6 символів")]
        public string Password { get; set; } = string.Empty;
    }
}
