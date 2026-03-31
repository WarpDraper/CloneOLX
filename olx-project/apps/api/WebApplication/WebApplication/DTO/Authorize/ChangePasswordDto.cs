using System.ComponentModel.DataAnnotations;

namespace OnlineLibrary_BookKey.DTO.Authorize
{
    public class ChangePasswordDto
    {
        [Required(ErrorMessage = "current password")]
        public string CurrentPassword {  get; set; }
        [Required(ErrorMessage = "new password")]
        public string NewPassword { get; set; }
    }
}
