using System.Net;

namespace Olx.BLL.Helpers.Email
{
    internal static class EmailTemplates
    {
        private static string _path = Path.Combine(Directory.GetCurrentDirectory(), "Helpers/EmailTemplates");

        public static string GetAdvertBoughtTemplate(string text)
        {
            var html = File.ReadAllText(Path.Combine(_path, "AdvertBought.html"));
            html = html.Replace("[text]", text);
            return html;
        }
        public static string GetAccountRemovedTemplate(string reason)
        {
            var html = File.ReadAllText(Path.Combine(_path, "AccountRemoved.html"));
            html = html.Replace("[reason]", reason);
            return html;
        }
        public static string GetAdvertRemovedTemplate(string reason)
        {
            var html = File.ReadAllText(Path.Combine(_path, "AdvertRemoved.html"));
            html = html.Replace("[reason]", reason);
            return html;
        }
        public static string GetAdvertLockedTemplate( string reason)
        {
            var html = File.ReadAllText(Path.Combine(_path, "AdvertLocked.html"));
            html = html.Replace("[reason]", reason);
            return html;
        }
        public static string GetEmailConfirmationTemplate(string url,string token, int id)
        {
            var html = File.ReadAllText(Path.Combine(_path,"EmailConfirmation.html"));
            html = html.Replace("[token]",WebUtility.UrlEncode(token));
            html = html.Replace("[id]", id.ToString());
            html = html.Replace("[url]", url);
            return html;
        }
        public static string GetEmailConfirmedTemplate(string url)
        {
            var html = File.ReadAllText(Path.Combine(_path, "EmailConfirmed.html"));
            html = html.Replace("[url]", url);
            return html;
        }
        public static string GetPasswordResetTemplate(string url, string token, int id)
        {
            var html = File.ReadAllText(Path.Combine(_path, "PasswordReset.html"));
            html = html.Replace("[token]", WebUtility.UrlEncode(token));
            html = html.Replace("[id]", id.ToString());
            html = html.Replace("[url]", url);
            return html;
        }

        public static string GetAccountBlockedTemplate(string reason, string lockoutEnd)
        {
            var html = File.ReadAllText(Path.Combine(_path, "AccountBlocked.html"));
            html = html.Replace("[reason]",reason);
            html = html.Replace("[LockoutEnd]", lockoutEnd);
            return html;
        }

        public static string GetAccountUnblockedTemplate() => File.ReadAllText(Path.Combine(_path, "AccountUnblocked.html"));

        // 6-digit code shown in Profile Settings -> "Підтвердити email". Built inline (no
        // external .html asset) since it's a small transactional message, unlike the templated
        // registration/reset flows above.
        public static string GetEmailVerificationCodeTemplate(string code) =>
            $@"<div style=""font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px;text-align:center"">
                <h2 style=""color:#1a1a2e;margin-bottom:8px"">Підтвердження email</h2>
                <p style=""color:#555;font-size:14px"">Введіть цей код у формі підтвердження email на MultiMart:</p>
                <div style=""font-size:34px;font-weight:bold;letter-spacing:10px;color:#6648D2;margin:24px 0"">{code}</div>
                <p style=""color:#999;font-size:12px"">Код дійсний протягом 10 хвилин. Якщо ви не робили цей запит, просто проігноруйте цей лист.</p>
            </div>";

        // Sent after a successful password change (via ResetPassword or profile "old password"
        // change) as a security notification — the user didn't necessarily trigger it themselves.
        public static string GetPasswordChangedTemplate() =>
            @"<div style=""font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px;text-align:center"">
                <h2 style=""color:#1a1a2e;margin-bottom:8px"">Пароль змінено</h2>
                <p style=""color:#555;font-size:14px"">Пароль вашого акаунту MultiMart щойно було успішно змінено.</p>
                <p style=""color:#999;font-size:12px"">Якщо це були не ви, негайно зв'яжіться з нашою службою підтримки та відновіть доступ до акаунту.</p>
            </div>";

        // Sent right after AddUserAsync creates a new (non-admin) account — separate from the
        // email-confirmation link so a fresh signup always gets a friendly "you're in" message
        // even for Google-registered accounts (already email-confirmed, so they never get the
        // confirmation-link email at all).
        public static string GetWelcomeTemplate(string firstName) =>
            $@"<div style=""font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px;text-align:center"">
                <h2 style=""color:#1a1a2e;margin-bottom:8px"">Ласкаво просимо до MultiMart{(string.IsNullOrWhiteSpace(firstName) ? "" : $", {firstName}")}!</h2>
                <p style=""color:#555;font-size:14px"">Дякуємо за реєстрацію. Ваш акаунт створено — тепер ви можете переглядати оголошення, публікувати власні та спілкуватися з продавцями.</p>
                <p style=""color:#999;font-size:12px"">Якщо ви не реєструвалися на MultiMart, просто проігноруйте цей лист.</p>
            </div>";

        // Sent once an order is placed (OrderService.CreateAsync) — a lightweight itemized
        // receipt, in the same inline-style family as GetPasswordChangedTemplate/
        // GetEmailVerificationCodeTemplate rather than the full Stripo-exported .html templates,
        // since it's a small transactional message built from data, not a static asset.
        public static string GetOrderConfirmationTemplate(int orderId, string itemsHtml, decimal totalPrice, string deliveryDescription)
        {
            return $@"<div style=""font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px"">
                <h2 style=""color:#1a1a2e;margin-bottom:8px;text-align:center"">Замовлення №{orderId} оформлено</h2>
                <p style=""color:#555;font-size:14px;text-align:center"">Дякуємо за покупку на MultiMart! Ось деталі вашого замовлення:</p>
                <table style=""width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;color:#333"">
                    <thead>
                        <tr style=""border-bottom:2px solid #eee;text-align:left"">
                            <th style=""padding:8px 4px"">Товар</th>
                            <th style=""padding:8px 4px;text-align:center"">К-сть</th>
                            <th style=""padding:8px 4px;text-align:right"">Сума</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsHtml}
                    </tbody>
                </table>
                <p style=""font-size:16px;font-weight:bold;color:#1a1a2e;text-align:right"">Разом: {totalPrice:0.00} грн</p>
                <p style=""color:#555;font-size:14px"">Доставка: {deliveryDescription}</p>
                <p style=""color:#999;font-size:12px;margin-top:24px"">Історію замовлень можна переглянути в особистому кабінеті на MultiMart.</p>
            </div>";
        }
    }
}
