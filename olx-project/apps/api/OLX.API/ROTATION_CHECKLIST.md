# Credential rotation checklist — 2026-08-17 leak

Every value below was committed in plaintext to `WarpDraper/CloneOLX` (in `appsettings.json`,
`appsettings.Development.json`, and the frontend's `.env.development`) and is considered
compromised. Removing them from the current tree (done) does **not** revoke them — anyone who
cloned the repo, forked it, or saw the GitGuardian alert already has the old values. Each one
needs to be rotated at its provider. Check items off as you go.

| # | Credential | Where it was exposed | Provider / rotation steps | Done |
|---|---|---|---|---|
| 1 | reCAPTCHA **site key** | frontend `.env.development` | Google reCAPTCHA admin console → Settings → generate/replace site key for the domain. Update `.env.development.local` (frontend) and any deployment env vars. | ☐ |
| 2 | reCAPTCHA **secret key** | `appsettings.json` (`RecaptchaSecretKey`) | Same console as above — secret key is rotated alongside the site key for a given reCAPTCHA registration. Update via `dotnet user-secrets` / deployment env var. | ☐ |
| 3 | Postgres password (Neon) | `appsettings.json`/`appsettings.Development.json` (`DbSettings:Password`, `ConnectionStrings:DefaultConnection`) | Neon console → Project → Branches → your role → Reset password. Update `DbSettings:*` and `ConnectionStrings:DefaultConnection` everywhere it's configured (local secrets + deployment). | ☐ |
| 4 | Redis password — Cache (Upstash) | `appsettings.json` (`ConnectionStrings:Redis:Cache`) | Upstash console → database → Reset password/token. | ☐ |
| 5 | Redis password — SignalR (Upstash) | `appsettings.json` (`ConnectionStrings:Redis:SignalR`) | Same Upstash database as #4 if shared, or its own instance — reset there. Note: this repo used the **same** Upstash password for both Cache and SignalR; consider giving them separate databases/credentials when rotating so one leak doesn't cover both. | ☐ |
| 6 | Redis password — Limiter (Aiven Valkey) | `appsettings.json` (`ConnectionStrings:Redis:Limiter`) | Aiven console → service → Users → reset password. | ☐ |
| 7 | JWT signing key | `appsettings.json` (`JwtOptions:Key`) | Generate a new random 256-bit+ secret (e.g. `openssl rand -base64 64`). Rotating this invalidates every currently-issued access/refresh token — all users get logged out. Update `JwtOptions:Key` everywhere. | ☐ |
| 8 | Admin account password | `appsettings.json` (`AdminSeed:Password`, default `Passw0rd_23`) | Log in as the seeded admin and change the password immediately (or delete/recreate the account). This was also the *fallback default* baked into `DbSeeder.cs` — anyone with repo access knew it even before the leak. | ☐ |
| 9 | NovaPoshta API key | `appsettings.json` (`NewPostApiKey`) | NovaPoshta business cabinet → API keys → reissue. | ☐ |
| 10 | Gemini API key | `appsettings.json` (`GeminiApiKey`) | Google AI Studio / Cloud Console → API keys → delete old key, create new one. | ☐ |
| 11 | SMTP password (ukr.net mailbox) | `appsettings.json` (`MailSettings:Password`) | ukr.net mailbox settings → change password (or app-specific password if supported). | ☐ |

## After rotating

1. Set every new value via `dotnet user-secrets` locally (see `SECRETS.md`) and as environment
   variables in whatever deploys the API (Railway, etc.) and frontend (Vite env at build time).
2. Restart/redeploy both apps so the new values actually take effect.
3. Confirm the old values no longer work — e.g. try the old JWT-signed token (should 401 once the
   signing key changes), confirm the old DB password is rejected by Neon.
4. If you later decide the git history itself needs cleaning up (removing the old commits with
   `git-filter-repo`/BFG), that's a separate, disruptive step — every collaborator would need to
   re-clone and every open PR/fork would break. Worth doing eventually, but rotating the
   credentials above is what actually closes the exposure; the history rewrite is cosmetic/hygiene
   on top of that.
