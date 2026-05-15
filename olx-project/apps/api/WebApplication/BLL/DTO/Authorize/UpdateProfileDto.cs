using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text;

namespace BLL.DTO.Authorize
{
    public class UpdateProfileDto
    {
        [Phone(ErrorMessage = "Невірний формат телефонного номера")]
        public string? PhoneNumber { get; set; }

        [MaxLength(100, ErrorMessage = "Місто не може бути довше за 100 символів")]
        public string? City { get; set; }

        [Url(ErrorMessage = "Невірна URL аватара")]
        public string? AvatarUrl { get; set; }

        // Privacy Settings
        public bool? IsPhoneNumberPrivate { get; set; }

        public bool? IsLocationPrivate { get; set; }
    }
}
