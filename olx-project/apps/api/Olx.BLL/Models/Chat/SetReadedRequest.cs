
namespace Olx.BLL.Models.Chat
{
    public class SetReadedRequest
    {
        public List<int> Ids { get; set; } = [];
        public int ChatId { get; set; }
    }
}
