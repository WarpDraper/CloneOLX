namespace Olx.BLL.Models.User
{
    // Body for POST /api/Account/wallet/topup — mock payment amount (see WalletTopUpModal on the
    // frontend / AccountService.TopUpBalanceAsync for why there's no real payment gateway here).
    public class WalletTopUpModel
    {
        public decimal Amount { get; init; }
    }
}
