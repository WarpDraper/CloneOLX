using System.ComponentModel.DataAnnotations;

namespace OnlineLibrary_BookKey.DTO.Authorize
{
    public class RefreshTokenDto
    {
        [Required]
        public string RefreshToken { get; set; }
        [Required]
        public string Token {  get; set; }
    }
}
