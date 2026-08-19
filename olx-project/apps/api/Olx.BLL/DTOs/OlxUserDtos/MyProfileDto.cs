namespace Olx.BLL.DTOs.OlxUserDtos
{
    // Extends OlxUserDto with fields that must NEVER be exposed via the public/anonymous
    // GET /api/User/get/{id} seller-profile lookup (OlxUserDto) — only ever returned by
    // GET /api/Account/profile, which resolves the current user's id server-side from the JWT
    // (see AccountService.GetMyProfileAsync), so it can never be used to read someone else's
    // wallet balance.
    public class MyProfileDto : OlxUserDto
    {
        public decimal Balance { get; set; }
    }
}
