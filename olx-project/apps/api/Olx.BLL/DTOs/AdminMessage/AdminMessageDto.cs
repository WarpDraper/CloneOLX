
namespace Olx.BLL.DTOs.AdminMessage
{
    public class AdminMessageDto
    {
        public int Id { get; set; }
        public string UserName { get; set; } = null!;
        public int UserId { get; set; }
        public bool Readed { get; set; }
        public bool Deleted { get; set; }
        public string? MessageLogo { get; set; }
        public DateTime Created { get; set; }
        public MessageDto Message { get; set; } = null!;
        public bool ForAdmin { get; set; }
    }
       
}
