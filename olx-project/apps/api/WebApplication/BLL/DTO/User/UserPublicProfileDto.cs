namespace BLL.DTO.User;

public class UserPublicProfileDto
{
    public long Id { get; set; }
    public string? UserName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Location { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; }
}
