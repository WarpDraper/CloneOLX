using System.ComponentModel.DataAnnotations;

namespace OnlineLibrary_BookKey.DTO.Authorize
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email Required")]
        [EmailAddress]
        public string Email { get; set; }
    }
}
