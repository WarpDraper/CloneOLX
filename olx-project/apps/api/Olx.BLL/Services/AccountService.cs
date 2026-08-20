using AutoMapper;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NETCore.MailKit.Core;
using Newtonsoft.Json;
using Olx.BLL.DTOs.AdvertDtos;
using Olx.BLL.DTOs.OlxUserDtos;
using Olx.BLL.Entities;
using Olx.BLL.Entities.NewPost;
using Olx.BLL.Exceptions;
using Olx.BLL.Exstensions;
using Olx.BLL.Helpers;
using Olx.BLL.Helpers.Email;
using Olx.BLL.Hubs;
using Olx.BLL.Interfaces;
using Olx.BLL.Models;
using Olx.BLL.Models.AdminMessage;
using Olx.BLL.Models.Authentication;
using Olx.BLL.Models.User;
using Olx.BLL.Resources;
using Olx.BLL.Specifications;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;



namespace Olx.BLL.Services
{
    public class AccountService(
        UserManager<OlxUser> userManager,
        RoleManager<IdentityRole<int>> roleManager,
        IHttpContextAccessor  httpContext,
        IJwtService jwtService,
        IRepository<RefreshToken> tokenRepository,
        IRepository<OlxUser> userRepository,
        IRepository<Advert> advertRepository,
        IRepository<Settlement> settlementRepository,
        IEmailService emailService,
        INotificationService notificationService,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        IMapper mapper,
        IHubContext<MessageHub> hubContext,
        IImageService imageService,
        IAdminMessageService adminMessageService,
        IValidator<ResetPasswordModel> resetPasswordModelValidator,
        IValidator<EmailConfirmationModel> emailConfirmationModelValidator,
        IValidator<UserCreationModel> userCreationModelValidator,
        IValidator<UserEditModel> userEditModelValidator,
        IValidator<NewsletterBroadcastModel> newsletterBroadcastModelValidator,
        IHostEnvironment environment,
        ILogger<AccountService> logger) : IAccountService
    {
        private static readonly ConcurrentDictionary<int, SemaphoreSlim> _userSemaphores = new();
        // In-memory 6-digit email verification codes for the Profile Settings "confirm email"
        // flow — separate from the token-link confirmation used at registration. Keyed by user
        // id; a fresh request overwrites any pending code. Not persisted since a 10-minute expiry
        // makes surviving an app restart irrelevant.
        private static readonly ConcurrentDictionary<int, (string Code, DateTime Expiry)> _emailVerificationCodes = new();

        // Per-email resend cooldown for "forgot password" (see FogotPasswordAsync). Keyed by the
        // normalized email that was requested — including ones that don't correspond to a real
        // account, so the cooldown itself can never be used as a side channel to learn whether an
        // address is registered (a real account's cooldown and a nonexistent one's are set the
        // exact same way, on every call, before the "does this user exist" branch). In-memory
        // only, like _emailVerificationCodes above: a short TTL makes surviving an app restart
        // irrelevant, and it avoids adding a DB round trip to an already rate-limited endpoint.
        private static readonly ConcurrentDictionary<string, DateTime> _passwordResetCooldowns = new();
        private static readonly TimeSpan PasswordResetCooldownWindow = TimeSpan.FromSeconds(60);

        private async Task<string> CreateRefreshToken(int userId)
        {
            var refeshToken = jwtService.GetRefreshToken();
            var refreshTokenEntity = new RefreshToken
            {
                Token = refeshToken,
                OlxUserId = userId,
                ExpirationDate = DateTime.UtcNow.AddDays(jwtService.GetRefreshTokenLiveTime())
            };
            await tokenRepository.AddAsync(refreshTokenEntity);
            await tokenRepository.SaveAsync();
            return refeshToken;
        }

        private async Task CreateUserAsync(OlxUser user,string? password = null, bool isAdmin = false)
        {
            // Dev/clone project: no SMTP is configured for the confirmation-link email, so a
            // token-based confirmation flow can never complete. Treat every newly created
            // account (self-registered or admin-created) as already verified instead of gating
            // login behind a confirmation that will never arrive.
            user.EmailConfirmed = true;
            var result = password is not null
                ? await userManager.CreateAsync(user, password)
                : await userManager.CreateAsync(user);
            if (!result.Succeeded)
            {
                throw new HttpException(Errors.UserCreateError, HttpStatusCode.InternalServerError);
            }
            await userManager.AddToRoleAsync(user, isAdmin ? Roles.Admin : Roles.User);
            if (!isAdmin)
            {
                // Fires for every new non-admin account regardless of provider — including
                // Google sign-ups, which skip the confirmation-link branch above entirely
                // because Google already verifies the email up front.
                await emailService.SendAsync(user.Email, "Ласкаво просимо до MultiMart", EmailTemplates.GetWelcomeTemplate(user.FirstName ?? string.Empty), true);

                // In-app welcome notification (header bell + /notifications), same trigger as
                // the welcome email above — standard registration (AddUserAsync) and
                // first-time Google sign-in (GoogleLoginAsync) both create the account via this
                // method, so this single call site covers both without duplicating it per
                // provider. Best-effort: a notification-insert failure must never fail account
                // creation/login itself.
                try
                {
                    await notificationService.CreateWelcomeNotificationAsync(user.Id);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AccountService] Failed to create welcome notification for user {user.Id}: {ex.Message}");
                }
            }
        }

        // In-app "Password changed" notification, paired with the existing email at both call
        // sites (ResetPasswordAsync — forgot-password flow, and EditUserAsync — Settings page
        // "change password"). Best-effort, same reasoning as the welcome notification above: a
        // notification-insert failure must never fail the password change itself.
        private async Task TryCreatePasswordChangedNotificationAsync(int userId)
        {
            try
            {
                await notificationService.CreateAsync(
                    userId,
                    "Пароль змінено",
                    "Пароль вашого облікового запису щойно було змінено. Якщо це були не ви, негайно зверніться до підтримки.",
                    type: NotificationType.PasswordChanged);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AccountService] Failed to create password-changed notification for user {userId}: {ex.Message}");
            }
        }

        private async Task SendEmailConfirmationMessageAsync(OlxUser user)
        {
            var confirmationToken = await userManager.GenerateEmailConfirmationTokenAsync(user);
            var email = EmailTemplates.GetEmailConfirmationTemplate(configuration["FrontendEmailConfirmationUrl"]!, confirmationToken, user.Id);
            await emailService.SendAsync(user.Email, Messages.EmailConfirmation, email, true);
        }

        private async Task CheckEmailConfirmAsync(OlxUser user)
        {
            if (!await userManager.IsEmailConfirmedAsync(user))
            {
                // 400 with a plain { message } body (like every other business-rule failure
                // here — see Errors.InvalidLoginData above) instead of 403 with a UserBlockInfo
                // object: GlobalExceptionHandlerMiddleware serializes a raw HttpException.Value
                // with default (PascalCase) casing, which the frontend's camelCase `data.message`
                // extraction can never match — that mismatch surfaced as an unreadable, generic
                // "Доступ заборонено" toast instead of the actual reason.
                throw new HttpException(Messages.EmailNotConfirmed, HttpStatusCode.BadRequest);
            }
        }

        private async Task CheckLockedOutAsync(OlxUser user)
        {
            
            if (await userManager.IsLockedOutAsync(user))
            {
                throw new HttpException(HttpStatusCode.Locked, new UserBlockInfo
                {
                    Message = Messages.AccountLocked,
                    UnlockTime = user.LockoutEnd.HasValue && user.LockoutEnd.Value.Year < 9000 ? user.LockoutEnd.Value.LocalDateTime : null
                });
            }
        }
        private async Task<AuthResponse> GetAuthTokens(OlxUser user)
        {
            return new()
            {
                AccessToken = jwtService.CreateToken(await jwtService.GetClaimsAsync(user)),
                RefreshToken = await CreateRefreshToken(user.Id)
            };
        }

        private async Task<OlxUser> GetCurrentUser()
        {
            var currentUserId = int.Parse(userManager.GetUserId(httpContext.HttpContext?.User!)!);
            var currentUser = await userRepository.GetItemBySpec(new OlxUserSpecs.GetById(currentUserId, UserOpt.FavoriteAdverts))
                ?? throw new HttpException(Errors.ErrorAthorizedUser, HttpStatusCode.InternalServerError);
            currentUser.LastActivity = DateTime.UtcNow;
            return currentUser;
        }

        private async Task RecaptcaVerify(string recaptcaToken, string action)
        {
            var recaptchaApiUrl = configuration["RecaptchaApiUrl"];
            var recaptchaSecretKey = configuration["RecaptchaSecretKey"];

            // appsettings.Development.json has no RecaptchaApiUrl/RecaptchaSecretKey configured
            // (no local dev value exists for either). Previously that meant the interpolated
            // "?secret=&response=..." was posted as a *relative* URI against an HttpClient with
            // no BaseAddress, which threw an unhandled InvalidOperationException — surfacing to
            // the frontend as a failed login on every single local attempt regardless of the
            // credentials/recaptcha token being otherwise valid. Skip verification in Development
            // when the config is absent so local login works out of the box; if a real key IS
            // filled in locally (to test recaptcha itself), verification still runs for real.
            if (string.IsNullOrWhiteSpace(recaptchaApiUrl) || string.IsNullOrWhiteSpace(recaptchaSecretKey))
            {
                if (environment.IsDevelopment())
                {
                    Console.WriteLine("[Recaptcha] RecaptchaApiUrl/RecaptchaSecretKey not configured — skipping verification in Development.");
                    return;
                }

                // Outside Development, missing config is a server misconfiguration, not a
                // validation failure — fail with a clear, structured message instead of the
                // InvalidOperationException this used to throw.
                throw new HttpException(HttpStatusCode.Forbidden, new UserBlockInfo
                {
                    Message = Messages.reCaptchaValidationError
                });
            }

            var httpClient = httpClientFactory.CreateClient(HttpClients.Recaptcha);
            var response = await httpClient.PostAsync(
                $"{recaptchaApiUrl}?secret={recaptchaSecretKey}&response={recaptcaToken}",
                null);
            var result = await response.Content.ReadAsStringAsync();
            var verification = JsonConvert.DeserializeObject<RecaptchaVerificationResponse>(result);
            if (verification?.Success != true || verification.Action != action || verification?.Score < 0.5)
            {
                throw new HttpException(HttpStatusCode.Forbidden, new UserBlockInfo
                {
                    Message = Messages.reCaptchaValidationError
                });
            }
        }

        public async Task<AuthResponse> LoginAsync(AuthRequest model)
        {
            await RecaptcaVerify(model.RecapthcaToken, model.Action);
            var user = await userManager.FindByEmailAsync(model.Email);
            if (user != null) 
            {
                user.LastActivity = DateTime.UtcNow;
                await userManager.UpdateAsync(user);
                await CheckLockedOutAsync(user);
                await CheckEmailConfirmAsync(user);

                // A manually inserted or otherwise corrupt PasswordHash (not valid Base64) makes
                // PasswordHasher.VerifyHashedPassword throw FormatException instead of returning
                // a mismatch — CheckPasswordAsync propagates that straight out, which previously
                // crashed this whole endpoint as an unhandled 500 instead of a normal failed
                // login. Treat it exactly like a wrong password: failed auth, not a server error.
                bool isPasswordValid;
                try
                {
                    isPasswordValid = await userManager.CheckPasswordAsync(user, model.Password);
                }
                catch (FormatException)
                {
                    isPasswordValid = false;
                }

                if (!isPasswordValid)
                {
                    await userManager.AccessFailedAsync(user);
                    if (await userManager.IsLockedOutAsync(user))
                    {
                        throw new HttpException(HttpStatusCode.Locked, new UserBlockInfo
                        {
                            Message = Messages.FailedLoginAttempts,
                            UnlockTime = user.LockoutEnd.HasValue ? user.LockoutEnd.Value.LocalDateTime : null
                        });
                    }
                }
                else
                {
                    await userManager.ResetAccessFailedCountAsync(user);

                    // Same master-admin bootstrap as GoogleLoginAsync below: must run and commit
                    // BEFORE GetAuthTokens mints the JWT, since GetAuthTokens -> GetClaimsAsync
                    // reads roles fresh via userManager.GetRolesAsync at that exact point. Without
                    // this, a password-login user whose email matches AdminSeed:Email got the
                    // Admin role written to the DB but the *first* issued token still only carried
                    // "User" — forcing a second login (or a refresh) before admin endpoints worked.
                    await EnsureMasterAdminRoleAsync(user);

                    return await GetAuthTokens(user);
                }
            }
            throw new HttpException(Errors.InvalidLoginData, HttpStatusCode.BadRequest);
        }

        public async Task SendEmailConfirmationMessageAsync(string email) 
        {
            var user = await userManager.FindByEmailAsync(email)
                ?? throw new HttpException(Errors.InvalidUserEmail,HttpStatusCode.BadRequest);
            await SendEmailConfirmationMessageAsync(user);
        }

        public async Task<AuthResponse> GoogleLoginAsync(string googleAccessToken)
        {
            var httpClient = httpClientFactory.CreateClient(HttpClients.GoogleAuth);
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", googleAccessToken);
            HttpResponseMessage response = await httpClient.GetAsync(configuration["GoogleUserInfoUrl"]);
            response.EnsureSuccessStatusCode();
            string responseBody = await response.Content.ReadAsStringAsync();
            var userInfo = JsonConvert.DeserializeObject<GoogleUserInfo>(responseBody)!;
            OlxUser? user = await userManager.FindByEmailAsync(userInfo.Email);

            if (user is null)
            {
                // No account (by email) exists at all — this is a brand-new Google sign-in, or
                // the email previously belonged to an account that was later removed via
                // RemoveAccountAsync (a hard delete: this app has no soft-delete/IsDeleted flag
                // on OlxUser, so "the old row is gone" and "never existed" look identical here).
                // Either way the correct outcome is the same: create a fresh, clean record —
                // never attempt to resurrect or re-link to whatever numeric id the email used to
                // have, since that id may already have been reassigned or may simply not exist
                // anymore (this is exactly the class of bug behind the stale "user 29" 404 loop).
                user = mapper.Map<OlxUser>(userInfo);
                if (!string.IsNullOrEmpty(userInfo.Picture))
                {
                    user.Photo = await imageService.SaveImageFromUrlAsync(userInfo.Picture);
                }
                await CreateUserAsync(user);

                // CreateUserAsync persists via userManager.CreateAsync, which populates user.Id
                // on success — but re-fetch by the now-known id instead of trusting the in-memory
                // instance blindly, so GetAuthTokens can never mint a JWT for a user id that
                // didn't actually make it to the database (e.g. a partial failure Identity
                // swallowed). This guarantees the token's nameidentifier always resolves via
                // GET /api/User/get/{id} on the very next request.
                user = await userManager.FindByIdAsync(user.Id.ToString())
                    ?? throw new HttpException(Errors.ErrorAthorizedUser, HttpStatusCode.InternalServerError);
            }
            else
            {
                // Existing account found by email — confirm it's actually still a live,
                // resolvable row (defense against any future soft-delete/deactivation flag) and
                // that it isn't locked out, exactly like the standard password login path does.
                var stillExists = await userManager.FindByIdAsync(user.Id.ToString());
                if (stillExists is null)
                {
                    throw new HttpException(Errors.ErrorAthorizedUser, HttpStatusCode.InternalServerError);
                }
                user = stillExists;
                await CheckLockedOutAsync(user);
            }

            // Master-admin bootstrap via Google sign-in: reuses the same "AdminSeed:Email" config
            // key DbSeeder already reads to guarantee a working Admin login exists (see
            // SeedAdminAccountAsync in OLX.API/Extensions/DbSeeder.cs). DbSeeder only runs at
            // startup though, so it can't help an account that reaches Admin-email status later,
            // or one that only ever signs in via Google rather than the seeded password — this
            // covers both without any manual DB edit.
            await EnsureMasterAdminRoleAsync(user);

            await CheckEmailConfirmAsync(user);
            return await GetAuthTokens(user);
        }

        // Called from both LoginAsync and GoogleLoginAsync above, always before GetAuthTokens.
        // Promotes `user` to the Admin role if (and only if) its email matches the configured
        // master-admin address. No-ops when AdminSeed:Email isn't configured, and is idempotent —
        // skips AddToRoleAsync entirely once the role is already present, so this is safe to call
        // on every login rather than only on first creation. GetAuthTokens (called right after
        // this in both callers) mints its JWT from userManager.GetRolesAsync(user) fetched fresh
        // at that point (see JwtService.GetClaimsAsync), so a role granted here is guaranteed to
        // already be in the very first token issued — no separate re-login/refresh is needed.
        private async Task EnsureMasterAdminRoleAsync(OlxUser user)
        {
            // Trim both sides before comparing: a trailing space in AdminSeed:Email (easy to
            // introduce via appsettings/env vars) or in the email coming back from a Google
            // token/login payload would otherwise make an OrdinalIgnoreCase match fail even
            // though the addresses are logically identical.
            var masterAdminEmail = configuration["AdminSeed:Email"]?.Trim();
            var currentUserEmail = user.Email?.Trim();
            if (string.IsNullOrEmpty(masterAdminEmail)
                || string.IsNullOrEmpty(currentUserEmail)
                || !string.Equals(currentUserEmail, masterAdminEmail, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            // Defense-in-depth against the "Admin" role row itself missing (e.g. DbSeeder's role
            // seed step failed/was skipped) — AddToRoleAsync below fails silently-ish (a non-
            // succeeded IdentityResult, not an exception) against a role that doesn't exist in
            // AspNetRoles, which would otherwise leave the master admin permanently un-promotable
            // with only a swallowed Console.WriteLine to explain why.
            if (!await roleManager.RoleExistsAsync(Roles.Admin))
            {
                await roleManager.CreateAsync(new IdentityRole<int>(Roles.Admin));
            }

            if (!await userManager.IsInRoleAsync(user, Roles.Admin))
            {
                var result = await userManager.AddToRoleAsync(user, Roles.Admin);
                if (!result.Succeeded)
                {
                    Console.WriteLine($"[AccountService] Failed to grant Admin role to master email \"{user.Email}\": {string.Join("; ", result.Errors.Select(e => e.Description))}");
                }
            }
        }

        // Admin override (Admin > Users > "Confirm email"): force-verifies an account without a
        // confirmation token/link.
        public async Task ForceConfirmEmailAsync(int userId)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var user = await userManager.FindByIdAsync(userId.ToString())
                ?? throw new HttpException(Errors.InvalidUserId, HttpStatusCode.NotFound);
            if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                await userManager.UpdateAsync(user);
            }
        }

        public async Task<AuthResponse> TelegramLoginAsync(TelegramAuthModel model)
        {
            var botToken = configuration["TelegramBotToken"];
            if (string.IsNullOrWhiteSpace(botToken) || !TelegramAuthValidator.IsValid(model, botToken))
            {
                throw new HttpException(Errors.InvalidLoginData, HttpStatusCode.Unauthorized);
            }

            var telegramId = model.Id.ToString();
            var user = await userManager.Users.FirstOrDefaultAsync(x => x.TelegramId == telegramId);
            if (user is null)
            {
                // Telegram never hands out an email, but Identity requires a unique
                // UserName/Email — synthesize a stable, non-guessable placeholder instead of
                // reusing CreateUserAsync (which unconditionally fires a "welcome" email that
                // would bounce against this non-deliverable address).
                var syntheticEmail = $"telegram_{telegramId}@telegram.multimart.local";
                user = new OlxUser
                {
                    UserName = syntheticEmail,
                    Email = syntheticEmail,
                    EmailConfirmed = true,
                    FirstName = model.First_Name,
                    LastName = model.Last_Name,
                    TelegramId = telegramId,
                };
                if (!string.IsNullOrEmpty(model.Photo_Url))
                {
                    user.Photo = await imageService.SaveImageFromUrlAsync(model.Photo_Url);
                }
                var result = await userManager.CreateAsync(user);
                if (!result.Succeeded)
                {
                    throw new HttpException(Errors.UserCreateError, HttpStatusCode.InternalServerError);
                }
                await userManager.AddToRoleAsync(user, Roles.User);
            }
            else
            {
                await CheckLockedOutAsync(user);
            }

            user.LastActivity = DateTime.UtcNow;
            await userManager.UpdateAsync(user);
            return await GetAuthTokens(user);
        }

        public async Task<AuthResponse> RefreshTokensAsync(string refreshToken)
        {
            var token = await tokenRepository.GetItemBySpec(new RefreshTokenSpecs.GetByValue(refreshToken));
            if (token is not null)
            {
                if (token.ExpirationDate.ToUniversalTime() > DateTime.UtcNow)
                {
                    var user = userManager.Users.AsNoTracking().FirstOrDefault(x => x.Id == token.OlxUserId);
                    if (user is not null)
                    {
                        var semaphore = _userSemaphores.GetOrAdd(user.Id, _ => new SemaphoreSlim(1, 1));
                        await semaphore.WaitAsync();
                        if (await tokenRepository.AnyAsync(x => x.Id == token.Id))
                        {
                            await tokenRepository.DeleteAsync(token.Id);
                            var tokens = await GetAuthTokens(user);
                            semaphore.Release();
                            _userSemaphores.TryRemove(user.Id, out _);
                            return tokens;
                        }
                         semaphore.Release();
                        _userSemaphores.TryRemove(user.Id, out _);
                        throw new HttpException(Errors.MultipleRefresh, HttpStatusCode.Conflict);
                    }
                }
            }
            throw new HttpException(Errors.InvalidToken, HttpStatusCode.Unauthorized);
        }

        public async Task LogoutAsync(string refreshToken)
        {
            var token = await tokenRepository.GetItemBySpec(new RefreshTokenSpecs.GetByValue(refreshToken));
            if (token is not null) 
            {
                await tokenRepository.DeleteAsync(token.Id);
                await tokenRepository.SaveAsync();
            }    
        }

        public async Task EmailConfirmAsync(EmailConfirmationModel confirmationModel)
        {
            emailConfirmationModelValidator.ValidateAndThrow(confirmationModel);
            var user = await userManager.FindByIdAsync(confirmationModel.Id.ToString());
            if (user != null)
            {
                var result = await userManager.ConfirmEmailAsync(user, confirmationModel.Token);
                if (!result.Succeeded)
                {
                    throw new HttpException(Errors.InvalidConfirmationData, HttpStatusCode.BadRequest);
                }
            }
        }

        public async Task FogotPasswordAsync(string email)
        {
            // Normalize so "Foo@Bar.com" and "foo@bar.com" share one cooldown bucket instead of
            // two, and so the key is stable regardless of casing quirks in what the client sends.
            var normalizedEmail = email.Trim().ToUpperInvariant();

            // Checked (and set) BEFORE the FindByEmailAsync lookup below, and unconditionally for
            // every requested address — real account or not. Bailing out only for real accounts
            // would let an attacker distinguish "still on cooldown" (real account, no email sent)
            // from "sent" (nonexistent account, silently no-op) by timing/repeating requests,
            // defeating the whole point of FindByEmailAsync's null-check silently no-op-ing below.
            var now = DateTime.UtcNow;
            if (_passwordResetCooldowns.TryGetValue(normalizedEmail, out var cooldownUntil) && cooldownUntil > now)
            {
                throw new HttpException(Errors.PasswordResetCooldown, HttpStatusCode.TooManyRequests);
            }
            _passwordResetCooldowns[normalizedEmail] = now.Add(PasswordResetCooldownWindow);

            var user = await userManager.FindByEmailAsync(email);
            if (user is not null)
            {
                var passwordResetToken = await userManager.GeneratePasswordResetTokenAsync(user);
                var mail = EmailTemplates.GetPasswordResetTemplate(configuration["FrontendResetPasswordUrl"]!, passwordResetToken,user.Id);
                await emailService.SendAsync(user.Email, "Скидання пароля", mail, true);
            }
        }

        public async Task ResetPasswordAsync(ResetPasswordModel resetPasswordModel)
        {
            resetPasswordModelValidator.ValidateAndThrow(resetPasswordModel);
            var user = await userManager.FindByIdAsync(resetPasswordModel.UserId.ToString());
            if (user is not null)
            {
                var result = await userManager.ResetPasswordAsync(user,resetPasswordModel.Token,resetPasswordModel.Password);
                if (result.Succeeded)
                {
                    await emailService.SendAsync(user.Email, "Пароль змінено", EmailTemplates.GetPasswordChangedTemplate(), true);
                    await TryCreatePasswordChangedNotificationAsync(user.Id);
                    return;
                }
            }
            throw new HttpException(Errors.InvalidResetPasswordData, HttpStatusCode.BadRequest);
        }

        public async Task SendEmailVerificationCodeAsync()
        {
            var user = await GetCurrentUser();
            var code = Random.Shared.Next(100000, 1000000).ToString();
            _emailVerificationCodes[user.Id] = (code, DateTime.UtcNow.AddMinutes(10));
            await emailService.SendAsync(user.Email, "Підтвердження email", EmailTemplates.GetEmailVerificationCodeTemplate(code), true);
        }

        public async Task VerifyEmailCodeAsync(string code)
        {
            var user = await GetCurrentUser();
            if (string.IsNullOrWhiteSpace(code)
                || !_emailVerificationCodes.TryGetValue(user.Id, out var entry)
                || entry.Expiry < DateTime.UtcNow
                || entry.Code != code.Trim())
            {
                throw new HttpException(Errors.InvalidConfirmationData, HttpStatusCode.BadRequest);
            }
            _emailVerificationCodes.TryRemove(user.Id, out _);
            user.EmailConfirmed = true;
            await userManager.UpdateAsync(user);
        }

        public async Task BlockUserAsync(UserBlockModel userBlockModel)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            if (userBlockModel.UserIds.Any())
            { 
                var users = await userManager.Users.Where(x => userBlockModel.UserIds.Contains(x.Id)).ToArrayAsync();
                if (users.Length > 0)
                {
                    foreach (var user in users)
                    {
                        bool userLocked = await userManager.IsLockedOutAsync(user);
                        if (!userLocked && userBlockModel.Lock)
                        {
                            var result = await userManager.SetLockoutEndDateAsync(user, userBlockModel.LockoutEndDate.HasValue ? userBlockModel.LockoutEndDate.Value.ToUniversalTime() : DateTime.MaxValue.ToUniversalTime());
                            if (result.Succeeded)
                            {
                                string lockoutEndMessage = userBlockModel.LockoutEndDate is null
                                    ? Messages.Indefinitely
                                    : $"{Messages.LockedUntil} {userBlockModel.LockoutEndDate.Value.ToLongDateString()} {userBlockModel.LockoutEndDate.Value.ToLongTimeString()}";
                                var accountBlockedTemplate = EmailTemplates.GetAccountBlockedTemplate(userBlockModel.LockReason ?? "", lockoutEndMessage);
                                await emailService.SendAsync(user.Email, Messages.AccountLocked, accountBlockedTemplate, true);
                                await hubContext.Clients.Users(user.Id.ToString()).SendAsync(HubMethods.AdminLockAccount);
                                continue;
                            }
                        }
                        else if (userLocked && !userBlockModel.Lock)
                        {
                            var result = await userManager.SetLockoutEndDateAsync(user, null);
                            if (result.Succeeded)
                            {
                                var accountUnblockedTemplate = EmailTemplates.GetAccountUnblockedTemplate();
                                await emailService.SendAsync(user.Email, Messages.AccountUnlocked, accountUnblockedTemplate, true);
                                continue;
                            }
                        }
                        else throw new HttpException(Errors.InvalidLockedOperation, HttpStatusCode.BadRequest);
                    }
                    return;
                }
            }
            throw new HttpException(Errors.InvalidUserId, HttpStatusCode.BadRequest);
        }

        public async Task<AuthResponse?> AddUserAsync(UserCreationModel userModel, bool isAdmin = false)
        {
            if (isAdmin)
            {
                await userManager.UpdateUserActivityAsync(httpContext);
            }
            await RecaptcaVerify(userModel.RecapthcaToken,userModel.Action);

            userCreationModelValidator.ValidateAndThrow(userModel);

            if (!String.IsNullOrEmpty(userModel.SettlementRef) && !await settlementRepository.AnyAsync(x => x.Ref == userModel.SettlementRef))
            {
                throw new HttpException(Errors.InvalidSettlementId, HttpStatusCode.BadRequest);
            }
            if (await userManager.FindByEmailAsync(userModel.Email) is not null)
            {
                throw new HttpException(Errors.EmailAlreadyExist, HttpStatusCode.BadRequest);
            }
            OlxUser user = mapper.Map<OlxUser>(userModel);
            if (userModel.ImageFile is not null)
            {
                user.Photo = await imageService.SaveImageAsync(userModel.ImageFile);
            }

            await CreateUserAsync(user, userModel.Password, isAdmin);

            // Self-registration: log the new account in immediately instead of leaving the
            // frontend to call /login separately (which previously 401'd on the following
            // useOwnProfile fetch and instantly bounced the just-registered user to /login).
            // Admin-created accounts (isAdmin = true) skip this — the caller here is an
            // already-authenticated admin, not the new account holder.
            return isAdmin ? null : await GetAuthTokens(user);
         }

        public async Task RemoveAccountAsync(int id)
        {
             var user = await userManager.FindByIdAsync(id.ToString()) 
                ?? throw new HttpException(Errors.InvalidUserEmail, HttpStatusCode.BadRequest);
                    
            if (await userManager.IsInRoleAsync(user, Roles.Admin))
            {
                var adminsCount =  await userManager.GetUsersInRoleAsync(Roles.Admin);
                if (adminsCount.Count <= 1)
                {
                    throw new HttpException(Errors.LastAdminDeleteBlock, HttpStatusCode.Locked);
                }
            }
            var currentUser = await GetCurrentUser();

            var result = await userManager.DeleteAsync(user);
            if (result.Succeeded)
            {
                if (user.Photo is not null)
                {
                    imageService.DeleteImageIfExists(user.Photo);
                }
              
                if (currentUser.Id != id && await userManager.IsInRoleAsync(currentUser, Roles.Admin)) 
                {
                    await userManager.UpdateUserActivityAsync(httpContext);
                    var accountBlockedTemplate = EmailTemplates.GetAccountRemovedTemplate(Messages.AccountDeleted);
                    await emailService.SendAsync(user.Email, Messages.AccountRemoved, accountBlockedTemplate, true);
                    await hubContext.Clients.Users(user.Id.ToString())
                         .SendAsync(HubMethods.AdminRemoveAccount);
                }
            }
            else throw new HttpException(Errors.UserRemoveError, HttpStatusCode.InternalServerError);
        }

        public async Task<string> EditUserAsync(UserEditModel userEditModel, bool isAdmin)
        {
            await userManager.UpdateUserActivityAsync(httpContext);
            var user = await userManager.FindByIdAsync(userEditModel.Id.ToString())
                ?? throw new HttpException(Errors.InvalidUserId,HttpStatusCode.NotFound);

            if (await userManager.IsInRoleAsync(user, Roles.Admin) && !isAdmin)
            {
                throw new HttpException(Errors.ActionBlocked, HttpStatusCode.Forbidden);
            }

            userEditModelValidator.ValidateAndThrow(userEditModel);

            // Same guard as AddUserAsync: a garbage/expired SettlementRef would otherwise
            // silently persist via the AutoMapper Map(userEditModel, user) call below, and the
            // profile's location dropdowns would then fail to hydrate on the next load since
            // GetSettlementByRef has nothing to resolve.
            if (!string.IsNullOrEmpty(userEditModel.SettlementRef) && !await settlementRepository.AnyAsync(x => x.Ref == userEditModel.SettlementRef))
            {
                throw new HttpException(Errors.InvalidSettlementId, HttpStatusCode.BadRequest);
            }

            if (userEditModel.OldPassword is not null)
            {
                var result = await userManager.ChangePasswordAsync(user, userEditModel.OldPassword!, userEditModel.Password!);
                if (!result.Succeeded)
                {
                    throw new HttpException(Errors.CurrentPasswordIsNotValid, HttpStatusCode.BadRequest);
                }
                await emailService.SendAsync(user.Email, "Пароль змінено", EmailTemplates.GetPasswordChangedTemplate(), true);
                await TryCreatePasswordChangedNotificationAsync(user.Id);
            }


            mapper.Map(userEditModel,user);
            if (userEditModel.ImageFile is null || userEditModel.ImageFile.ContentType != "image/existing")
            {
                if (user.Photo is not null)
                {
                    imageService.DeleteImageIfExists(user.Photo);
                    user.Photo = null;
                }
                if (userEditModel.ImageFile is not null)
                {
                    user.Photo = await imageService.SaveImageAsync(userEditModel.ImageFile);
                }
            }
            
            await userManager.UpdateAsync(user);

            return jwtService.CreateToken(await jwtService.GetClaimsAsync(user));
        }


        public async Task AddToFavoritesAsync(int advertId)
        {
            var user = await GetCurrentUser();
            if (user.FavoriteAdverts.All(a => a.Id != advertId))
            {
                var advert = await advertRepository.GetItemBySpec(new AdvertSpecs.GetById(advertId, AdvertOpt.Images))
                    ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
                user.FavoriteAdverts.Add(advert);
                await adminMessageService.SendToUser(
                    new AdminMessageCreationModel
                    {
                        MessageLogo = advert.Images.FirstOrDefault(x => x.Priority == 0)?.Name,
                        Content = string.Format(Messages.UserAddedToFavorites, user.GetUserDescription(), advert.Title),
                        Subject = Messages.AdvertInFavorites,
                        UserId = advert.UserId
                    });
        }
            await userManager.UpdateAsync(user);
        }

        public async Task AddToFavoritesRangeAsync(IEnumerable<int> advertIds)
        {
            if (advertIds == null || !advertIds.Any())
            {
                throw new HttpException(Errors.EmptyAdvertIds, HttpStatusCode.BadRequest);
            }

            var user = await GetCurrentUser();
            var existingFavoriteIds = user.FavoriteAdverts.Select(a => a.Id).ToHashSet();
            var newAdvertIds = advertIds.Where(id => !existingFavoriteIds.Contains(id)).ToList();

            if (newAdvertIds.Count == 0)
            {
                return;
            }

            var advertsToAdd = await advertRepository.GetListBySpec(new AdvertSpecs.GetByIds(newAdvertIds));
            if (!advertsToAdd.Any())
            {
                throw new HttpException(Errors.NoValidAdverts, HttpStatusCode.BadRequest);
            }

            foreach (var advert in advertsToAdd)
            {
                user.FavoriteAdverts.Add(advert);
            }
            await userManager.UpdateAsync(user);

        }

        public async Task RemoveFromFavoritesAsync(int advertId)
        {
            var user = await GetCurrentUser();
            var advertToRemove = user.FavoriteAdverts.FirstOrDefault(x => x.Id == advertId)
                ?? throw new HttpException(Errors.InvalidAdvertId, HttpStatusCode.BadRequest);
            user.FavoriteAdverts.Remove(advertToRemove);
            await userManager.UpdateAsync(user);
        }

        public async Task<IEnumerable<AdvertDto>> GetFavoritesAsync()
        {
            var user = await GetCurrentUser();
            if (user.FavoriteAdverts.Count == 0)
            {
                return [];
            }
            var favoriteAdvertsIds = user.FavoriteAdverts.Select(a => a.Id);
            var adverts = await mapper.ProjectTo<AdvertDto>(advertRepository.GetQuery().Where(x => favoriteAdvertsIds.Contains(x.Id) && !x.Blocked && !x.Completed)).ToArrayAsync();
            return adverts;
        }

        public async Task CheckPasswordAsync(string password)
        {
            var user = await GetCurrentUser();
            if (!await userManager.CheckPasswordAsync(user, password))
            {
                throw new HttpException(Errors.InvalidPassword, HttpStatusCode.BadRequest);
            }
        }

        // Profile Settings -> "Subscribe to Newsletter / Updates" toggle. Accepts the desired
        // state explicitly (rather than blind-toggling) so a UI switch never gets out of sync
        // with the server on a double-click/retry, and returns the persisted value back so the
        // caller can reconcile its local state with what was actually saved.
        public async Task<bool> SetNewsletterSubscriptionAsync(bool subscribed)
        {
            var user = await GetCurrentUser();
            user.NewsletterSubscribed = subscribed;
            await userManager.UpdateAsync(user);
            return user.NewsletterSubscribed;
        }

        // Same ProjectTo<OlxUserDto> SQL-projection approach as UserService.Get(id) (the public
        // seller-profile lookup) — but filtered to the caller's own id (from the JWT, never a
        // param), so this is safe to include Balance/NewsletterSubscribed/etc. in the response.
        public async Task<MyProfileDto> GetMyProfileAsync()
        {
            var currentUserId = int.Parse(userManager.GetUserId(httpContext.HttpContext?.User!)!);
            var userDto = await mapper.ProjectTo<MyProfileDto>(userRepository.GetQuery().AsNoTracking().Where(x => x.Id == currentUserId))
                .SingleOrDefaultAsync()
                ?? throw new HttpException(Errors.ErrorAthorizedUser, HttpStatusCode.InternalServerError);
            return userDto;
        }

        public async Task<decimal> TopUpBalanceAsync(decimal amount)
        {
            if (amount <= 0)
            {
                throw new HttpException(ValidationErrors.GreaterZeroError, HttpStatusCode.BadRequest);
            }
            var user = await GetCurrentUser();
            user.Balance += amount;
            await userManager.UpdateAsync(user);
            return user.Balance;
        }

        public async Task<int> SendNewsletterAsync(NewsletterBroadcastModel model)
        {
            newsletterBroadcastModelValidator.ValidateAndThrow(model);

            var subscriberEmails = await userRepository.GetQuery()
                .Where(u => u.NewsletterSubscribed && u.Email != null)
                .Select(u => u.Email!)
                .ToListAsync();

            var html = $"<div style=\"font-family:Arial,Helvetica,sans-serif;line-height:1.5;\">" +
                       $"{WebUtility.HtmlEncode(model.Body).Replace("\n", "<br/>")}" +
                       $"</div>";

            // Best-effort broadcast: one bad/bounced address must never abort the rest of the
            // batch — same fail-open philosophy as the rest of this service's email sends.
            // Failures are logged (not silently swallowed) and excluded from the returned count,
            // so admins can tell a broadcast that silently failed for everyone (e.g. bad SMTP
            // config) apart from one that actually reached its subscribers.
            var sentCount = 0;
            foreach (var email in subscriberEmails)
            {
                try
                {
                    await emailService.SendAsync(email, model.Subject, html, true);
                    sentCount++;
                    logger.LogInformation("Newsletter sent successfully to {Email}", email);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to send newsletter email to {Email}", email);
                }
            }

            return sentCount;
        }
    }
}
