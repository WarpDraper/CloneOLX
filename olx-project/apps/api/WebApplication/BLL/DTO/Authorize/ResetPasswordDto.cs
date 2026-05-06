using System.ComponentModel.DataAnnotations;

namespace OLXCLONE.DTO.Authorize
{
    public class ResetPasswordDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
        [Required]
        public string Token {  get; set; }
        [Required]
        public string NewPassword {  get; set; }
    }
}
