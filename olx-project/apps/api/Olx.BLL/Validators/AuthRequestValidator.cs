using FluentValidation;
using Olx.BLL.Models.Authentication;
using Olx.BLL.Resources;

namespace Olx.BLL.Validators
{
    public class AuthRequestValidator : AbstractValidator<AuthRequest>
    {
        public AuthRequestValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty)
                .EmailAddress().WithMessage(ValidationErrors.InvalidEmail);
            // Login only needs a non-empty password: the actual credential check happens
            // against the stored hash via userManager.CheckPasswordAsync in AccountService.
            // Applying the registration-strength .Password() complexity regex here rejected
            // otherwise-correct logins with a formatted 400 whenever an account's real password
            // didn't happen to match today's complexity rules (e.g. accounts created before the
            // rule existed, or seeded accounts).
            RuleFor(x => x.Password)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty);
            RuleFor(x => x.RecapthcaToken)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty);
            RuleFor(x => x.Action)
                .NotEmpty().WithMessage(ValidationErrors.NotEmpty);
        }
    }
}
