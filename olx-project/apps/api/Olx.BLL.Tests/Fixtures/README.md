# User-edit request fixtures

`user-edit.valid.json` and `user-edit.invalid.json` document the current `UserEditModel` contract. The production endpoint is `POST /api/Account/edit/user` and uses `[FromForm]`, so in Postman select **Body → form-data** and copy each JSON property as a text field. Add `imageFile` as a File field when testing uploads.

The current edit model has no `Email`, `Username`, or `Location` property. It uses `FirstName`, `LastName`, and `SettlementRef` instead; `SettlementRef` currently has no validation rule. Email format validation belongs to `UserCreationModelValidator`, which is covered separately by `UserCreationModelValidatorEmailTests`.
