using Olx.BLL.Models.User;
using Olx.BLL.Validators.User;

namespace Olx.BLL.Tests.Validators;

public sealed class UserCreationModelValidatorEmailTests
{
    private readonly UserCreationModelValidator _validator = new();

    [Theory]
    [InlineData("olena@example.com")]
    [InlineData("first.last+olx@example.co.uk")]
    [InlineData("user_name@example.org")]
    public void Valid_email_formats_are_accepted(string email)
    {
        Assert.True(_validator.Validate(ModelWith(email)).IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("plainaddress")]
    [InlineData("name@")]
    [InlineData("@example.com")]
    [InlineData("name @example.com")]
    public void Invalid_email_formats_are_rejected(string email)
    {
        Assert.False(_validator.Validate(ModelWith(email)).IsValid);
    }

    private static UserCreationModel ModelWith(string email) => new()
    {
        Email = email,
        Password = "Valid1!",
        PasswordConfirmation = "Valid1!"
    };
}
