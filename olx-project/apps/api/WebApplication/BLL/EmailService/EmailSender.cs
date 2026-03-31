using AuthDomain;
using System.Diagnostics;
using MailKit.Net.Smtp;
using MimeKit;


namespace AuthBLL.EmailService
{
    public class EmailSender : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        public EmailSender(EmailSettings email)
        {
            _emailSettings = email;
        }
        public async Task SendEmailAsync(string email, string subject, string message)
        {
            try
            {
                var emailMesage = new MimeMessage();
                emailMesage.From.Add(new MailboxAddress(_emailSettings.SenderDisplayName, _emailSettings.SenderEmail));
                emailMesage.To.Add(MailboxAddress.Parse(email));
                emailMesage.Subject = subject;
                var builder = new BodyBuilder();
                builder.HtmlBody = message;
                emailMesage.Body = builder.ToMessageBody();
                using (var client = new SmtpClient())
                {
                    client.ServerCertificateValidationCallback = (s, c, h, e) => true;
                    await client.ConnectAsync(
                        _emailSettings.SmtpServer,
                        _emailSettings.SmtpPort,
                        MailKit.Security.SecureSocketOptions.StartTls
                    );
                    if (!string.IsNullOrEmpty(_emailSettings.SenderPassword))
                    {
                        await client.AuthenticateAsync(
                            _emailSettings.SenderEmail,
                            _emailSettings.SenderPassword
                        );
                    }
                    await client.SendAsync(emailMesage);
                    await client.DisconnectAsync(true);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex);
            }
        }
    }
}
