using FluentValidation;
using Olx.BLL.Models.User;
using Olx.BLL.Validators.User;

namespace Olx.BLL.Tests.Validators;

public sealed class UserEditModelValidatorTests
{
    private readonly UserEditModelValidator _validator = new();

    public static TheoryData<string?, bool> PhoneNumbers => new()
    {
        { null, true },
        { string.Empty, true },
        { "+38(067)123-45-67", true },
        { "+38 (067) 123 45 67", true },
        { "+380671234567", false },
        { "+38(67)123-45-67", false },
        { "0671234567", false },
        { "not-a-phone", false }
    };

    [Fact]
    public void Validate_null_payload_throws()
    {
        Assert.Throws<ArgumentNullException>(() => _validator.Validate((UserEditModel)null!));
    }

    [Fact]
    public void Empty_payload_is_valid()
    {
        Assert.True(_validator.Validate(new UserEditModel()).IsValid);
    }

    [Theory]
    [MemberData(nameof(PhoneNumbers))]
    public void Phone_number_format_is_validated(string? phoneNumber, bool expectedValid)
    {
        var result = _validator.Validate(new UserEditModel { PhoneNumber = phoneNumber });

        Assert.Equal(expectedValid, result.IsValid);
    }

    [Theory]
    [InlineData("FirstName", 1, false)]
    [InlineData("FirstName", 2, true)]
    [InlineData("FirstName", 100, true)]
    [InlineData("FirstName", 101, false)]
    [InlineData("LastName", 1, false)]
    [InlineData("LastName", 2, true)]
    [InlineData("LastName", 100, true)]
    [InlineData("LastName", 101, false)]
    public void Name_length_boundaries_are_validated(string propertyName, int length, bool expectedValid)
    {
        var value = new string('a', length);
        var model = propertyName == "FirstName"
            ? new UserEditModel { FirstName = value }
            : new UserEditModel { FirstName = "Jo", LastName = value };

        var result = _validator.Validate(model);

        Assert.Equal(expectedValid, result.IsValid);
    }

    [Theory]
    [InlineData(39, false)]
    [InlineData(40, true)]
    [InlineData(4000, true)]
    [InlineData(4001, false)]
    public void About_length_boundaries_are_validated(int length, bool expectedValid)
    {
        var result = _validator.Validate(new UserEditModel { About = new string('a', length) });

        Assert.Equal(expectedValid, result.IsValid);
    }

    [Fact]
    public void Settlement_reference_has_no_current_validation_rule()
    {
        var result = _validator.Validate(new UserEditModel { SettlementRef = new string('x', 10_001) });

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("Short1!")]
    [InlineData("AnotherPass1$")]
    public void Valid_password_change_is_accepted(string password)
    {
        var result = _validator.Validate(new UserEditModel
        {
            OldPassword = "OldPass1!",
            Password = password,
            PasswordConfirmation = password
        });

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Password_change_with_mismatched_confirmation_is_rejected()
    {
        var result = _validator.Validate(new UserEditModel
        {
            OldPassword = "OldPass1!",
            Password = "NewPass1!",
            PasswordConfirmation = "Different1!"
        });

        Assert.Contains(result.Errors, error => error.PropertyName == nameof(UserEditModel.PasswordConfirmation));
    }
}
