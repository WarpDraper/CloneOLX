using System.ComponentModel.DataAnnotations;

namespace OnlineLibrary_BookKey.DTO.Authorize
{
    public class RegisterDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
        [Required]
        [MinLength(2)]
        public string UserName { get; set; }
        [Required]
        [MinLength(2)]
        public string FirstName { get; set; }
        [Required]
        [MinLength(2)]
        public string LastName { get; set; }
        [Required]
        public string Password { get; set; }
        [Required]
        [Compare("Password", ErrorMessage = "Pass")]
        public string ConfirmPassword { get; set; }
    }
}
