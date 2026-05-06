using System.ComponentModel.DataAnnotations;

namespace OLXCLONE.DTO.Authorize
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email Required")]
        [EmailAddress]
        public string Email { get; set; }
    }
}
