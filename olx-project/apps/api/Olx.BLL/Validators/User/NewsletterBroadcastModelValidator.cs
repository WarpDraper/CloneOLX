using FluentValidation;
using Olx.BLL.Models.User;
using Olx.BLL.Resources;
using Olx.BLL.Validators.Extentions;

namespace Olx.BLL.Validators.User
{
    public class NewsletterBroadcastModelValidator : AbstractValidator<NewsletterBroadcastModel>
    {
        public NewsletterBroadcastModelValidator()
        {
            RuleFor(x => x.Subject)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty)
                .MinMaxLength(2, 200);

            RuleFor(x => x.Body)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty)
                .MinMaxLength(2, 20000);
        }
    }
}
