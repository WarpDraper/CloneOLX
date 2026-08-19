using FluentValidation;
using Olx.BLL.Models.Advert;
using Olx.BLL.Resources;
using Olx.BLL.Validators.Extentions;

namespace Olx.BLL.Validators.Advert
{
    public class AdvertCreationModelValidator : AbstractValidator<AdvertCreationModel>
    {
        public AdvertCreationModelValidator()
        {
            RuleFor(x => x.SettlementRef)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty);

            // Price must never be negative, and — unless the seller explicitly marked the advert
            // "price by agreement" (IsContractPrice, an existing domain concept for listings like
            // "договірна ціна") — it must be strictly positive: a 0 price on a normal listing is
            // almost always a client bug, not a real free-giveaway ad.
            RuleFor(x => x.Price)
                .GreaterThanOrEqualTo(0).WithMessage(ValidationErrors.GreaterEqualZeroError)
                .LessThanOrEqualTo(1_000_000_000).WithMessage($"{ValidationErrors.MaxSymbolsCountError} 1000000000");
            RuleFor(x => x.Price)
                .GreaterThan(0).WithMessage(ValidationErrors.GreaterZeroError)
                .When(x => !x.IsContractPrice);

            RuleFor(x => x.UserId)
                .GreaterThan(0).WithMessage(ValidationErrors.GreaterZeroError);
            RuleFor(x=>x.CategoryId)
                .GreaterThan(0).WithMessage(ValidationErrors.GreaterZeroError);
            RuleFor(x => x.ContactEmail)
               .EmailAddress().WithMessage(ValidationErrors.InvalidEmail);
            RuleFor(x => x.ContactPersone)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty);
            RuleFor(x => x.Description)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty)
                .MinMaxLength(10, 5000);
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty)
                .MinMaxLength(5, 256);
            RuleFor(x => x.ImageFiles)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty)
                .ImageFile();
            RuleFor(x => x.PhoneNumber)
                .PhoneNumber().WithMessage(ValidationErrors.InvalidPhoneNumber);
        }
    }
}
