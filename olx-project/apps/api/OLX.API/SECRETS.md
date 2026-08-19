# Local secrets setup

`appsettings.json` / `appsettings.Development.json` no longer contain real credentials — a
previous commit leaked all of these in plaintext (Postgres password, Redis passwords, JWT signing
key, reCAPTCHA secret key, admin password, NovaPoshta/Gemini API keys, SMTP password) and
GitGuardian flagged it on 2026-08-17. **Every credential listed below must be rotated at its
provider before reuse** — removing them from source control does not undo the exposure, since
anyone who already cloned the repo or saw the alert has the old values.

## Local development: dotnet user-secrets

Run once from `apps/api/OLX.API` (the `UserSecretsId` is already set in the `.csproj`):

```bash
cd apps/api/OLX.API

dotnet user-secrets set "DbSettings:Server" "<new-neon-host>"
dotnet user-secrets set "DbSettings:Port" "5432"
dotnet user-secrets set "DbSettings:Database" "neondb"
dotnet user-secrets set "DbSettings:UserId" "<new-username>"
dotnet user-secrets set "DbSettings:Password" "<new-password>"

dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=<new-neon-host>;Database=neondb;Username=<new-username>;Password=<new-password>;SSL Mode=Require;Trust Server Certificate=true"
dotnet user-secrets set "ConnectionStrings:Redis:Cache" "<new-upstash-cache-connection-string>"
dotnet user-secrets set "ConnectionStrings:Redis:SignalR" "<new-upstash-signalr-connection-string>"
dotnet user-secrets set "ConnectionStrings:Redis:Limiter" "<new-aiven-valkey-connection-string>"

dotnet user-secrets set "JwtOptions:Key" "<new-random-256-bit-key>"

dotnet user-secrets set "RecaptchaSecretKey" "<new-recaptcha-secret-key>"
dotnet user-secrets set "NewPostApiKey" "<new-novaposhta-key>"
dotnet user-secrets set "GeminiApiKey" "<new-gemini-key>"
# Optional — override the model/base URL GeminiOptions uses (defaults to gemini-3.5-flash-lite /
# https://generativelanguage.googleapis.com/v1beta if left unset):
# dotnet user-secrets set "Gemini:Model" "gemini-3.5-flash-lite"
# dotnet user-secrets set "Gemini:ApiUrl" "https://generativelanguage.googleapis.com/v1beta"

dotnet user-secrets set "MailSettings:SenderEmail" "<mailbox>"
dotnet user-secrets set "MailSettings:Account" "<mailbox>"
dotnet user-secrets set "MailSettings:Password" "<new-app-password>"

# Optional — omit entirely to use the DbSeeder fixture defaults instead:
dotnet user-secrets set "AdminSeed:Email" "<admin-email>"
dotnet user-secrets set "AdminSeed:Password" "<admin-password>"
```

Verify what's set (values included — don't paste this output anywhere public):

```bash
dotnet user-secrets list
```

Secrets live outside the repo at:
- Windows: `%APPDATA%\Microsoft\UserSecrets\olx-clone-api-7f3e2b9a-4d61-4c8e-9a12-8b5f6e0d1c3a\secrets.json`
- macOS/Linux: `~/.microsoft/usersecrets/olx-clone-api-7f3e2b9a-4d61-4c8e-9a12-8b5f6e0d1c3a/secrets.json`

`WebApplication.CreateBuilder` wires the user-secrets provider in automatically when
`ASPNETCORE_ENVIRONMENT=Development` (the default for `dotnet run`), so nothing else needs to
change in `Program.cs`.

## Deployed environments (Railway, etc.)

Use environment variables instead, with `__` (double underscore) as the nesting separator
(ASP.NET Core's `IConfiguration` maps `Foo__Bar` to the same key as JSON `"Foo": { "Bar": ... }`):

```
DbSettings__Server=...
DbSettings__Port=...
DbSettings__Database=...
DbSettings__UserId=...
DbSettings__Password=...
ConnectionStrings__DefaultConnection=...
ConnectionStrings__Redis__Cache=...
ConnectionStrings__Redis__SignalR=...
ConnectionStrings__Redis__Limiter=...
JwtOptions__Key=...
RecaptchaSecretKey=...
NewPostApiKey=...
GeminiApiKey=...
MailSettings__SenderEmail=...
MailSettings__Account=...
MailSettings__Password=...
AdminSeed__Email=...
AdminSeed__Password=...
```

## Frontend (`apps/web/olx-frontend`)

`VITE_RECAPTCHA_SITE_KEY` moved from the tracked `.env.development` to the gitignored
`.env.development.local`. Set the rotated site key there:

```
VITE_RECAPTCHA_SITE_KEY=<new-recaptcha-site-key>
```
