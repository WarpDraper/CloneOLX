using FluentValidation;
using Olx.BLL.Models.Report;
using Olx.BLL.Resources;
using Olx.BLL.Validators.Extentions;

namespace Olx.BLL.Validators
{
    public class ReportCreationModelValidator : AbstractValidator<ReportCreationModel>
    {
        public ReportCreationModelValidator()
        {
            RuleFor(x => x.Reason)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty)
                .MinMaxLength(2, 100);

            RuleFor(x => x.Description)
                .MaximumLength(2000).WithMessage($"{ValidationErrors.MaxSymbolsCountError} 2000 symbols")
                .When(x => x.Description is not null);

            // Exactly one target: reporting both an advert and a user at once (or neither) isn't
            // a supported flow — ReportModal always sends one or the other.
            RuleFor(x => x)
                .Must(x => x.AdvertId.HasValue ^ x.TargetUserId.HasValue)
                .WithMessage(ValidationErrors.NotEmpty);
        }
    }
}
