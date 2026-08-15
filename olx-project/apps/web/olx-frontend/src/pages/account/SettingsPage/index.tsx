import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Upload, Avatar, message, Modal, Input, Switch } from "antd";
import { UserOutlined, UploadOutlined, PhoneOutlined, CheckCircleFilled, MailOutlined, NotificationOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import type { RootState } from "../../../store";
import { useGetSellerProfileQuery, isOwnProfileId } from "../../../services/profileService";
import { useEditUserMutation, useSendVerificationCodeMutation, useVerifyEmailCodeMutation, useSetNewsletterSubscriptionMutation } from "../../../services/accountService";
import { setAuth } from "../../../Slice/authSlice";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import { parseServerValidationErrors } from "../../../utils/parseServerValidationErrors";
import { extractSubscriberDigits, ukrainianPhoneErrorMessage } from "../../../utils/phone";
import SettlementPicker from "../../../components/location/SettlementPicker";
import AccountSidebar from "../../../components/account/AccountSidebar";
import PhoneInput from "../../../components/inputs/PhoneInput";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

// Frame 336: особисті налаштування. POST /api/account/edit/user, multipart/form-data,
// точна відповідність Olx.BLL.Models.User.UserEditModel + UserEditModelValidator.
// Бекенд затирає About/WebSite/SettlementRef значеннями null, якщо їх не передати (мапиться напряму
// через AutoMapper без ForAllMembers-умови на null) — тож About/WebSite завжди йдуть у формі
// незмінними "проходом" (не показані в UI, щоб не розширювати обсяг поза Name/Phone/Avatar).
// Так само AccountService.EditUserAsync стирає фото, якщо ImageFile відсутній — за відсутності нового
// файлу відправляємо сентинел-файл з ContentType "image/existing", як і при редагуванні оголошень.
const SettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const currentUserId = Number(user?.id);

    useEffect(() => {
        if (!isAuth) navigate("/login", { replace: true });
    }, [isAuth, navigate]);

    const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useGetSellerProfileQuery(currentUserId, { skip: !isOwnProfileId(currentUserId) });
    const [editUser, { isLoading: isSaving }] = useEditUserMutation();

    // Email verification (Profile Settings -> "Підтвердити email"): send a 6-digit code, then
    // verify it in a modal. profile.emailConfirmed drives the gold badge once confirmed.
    const [sendVerificationCode, { isLoading: isSendingCode }] = useSendVerificationCodeMutation();
    const [verifyEmailCode, { isLoading: isVerifyingCode }] = useVerifyEmailCodeMutation();
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [codeError, setCodeError] = useState<string | null>(null);

    // Newsletter subscription toggle — fires immediately on click (independent of the
    // firstName/lastName/... "Зберегти зміни" form below), same as the email-verification flow.
    const [setNewsletterSubscription, { isLoading: isTogglingNewsletter }] = useSetNewsletterSubscriptionMutation();
    const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

    const handleToggleNewsletter = async (checked: boolean) => {
        setNewsletterSubscribed(checked); // optimistic — reverted on failure below
        try {
            const result = await setNewsletterSubscription(checked).unwrap();
            setNewsletterSubscribed(result.subscribed);
            message.success(checked ? t('settings.newsletter.subscribed') : t('settings.newsletter.unsubscribed'));
        } catch {
            setNewsletterSubscribed(!checked);
            message.error(t('settings.newsletter.toggleFailed'));
        }
    };

    const handleStartEmailVerification = async () => {
        setCodeError(null);
        try {
            await sendVerificationCode().unwrap();
            setVerificationCode("");
            setIsCodeModalOpen(true);
            message.success(t('settings.toasts.codeSent'));
        } catch (err: any) {
            message.error(err?.data?.message || t('settings.toasts.codeSendFailed'));
        }
    };

    const handleConfirmEmailCode = async () => {
        setCodeError(null);
        if (verificationCode.trim().length !== 6) {
            setCodeError(t('settings.errors.codeLength'));
            return;
        }
        try {
            await verifyEmailCode({ code: verificationCode.trim() }).unwrap();
            setIsCodeModalOpen(false);
            message.success(t('settings.toasts.emailConfirmed'));
            refetchProfile();
        } catch (err: any) {
            setCodeError(err?.data?.message || t('settings.errors.codeInvalid'));
        }
    };

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [settlementRef, setSettlementRef] = useState("");
    const [settlementDescription, setSettlementDescription] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    // Snapshot of the text fields as loaded from the server — compared against current state
    // below to compute isDirty. Avatar changes are tracked separately via avatarFile (a new
    // File means "changed"), since the preview URL itself isn't a meaningful equality check
    // (object URLs are always unique). Plain state (not a ref) so isDirty can read it during
    // render without triggering the "ref access during render" hooks-lint rule.
    const [initialValues, setInitialValues] = useState({ firstName: "", lastName: "", phoneNumber: "", settlementRef: "" });
    const aboutRef = useRef("");
    const webSiteRef = useRef("");
    // Not editable on this page, but AutoMapper's mapper.Map(userEditModel, user) overwrites the
    // destination even with a null source (same reason About/WebSite are re-sent unchanged above)
    // — so the current AccountType must be resent on every save or it gets wiped back to default.
    const accountTypeRef = useRef<"Individual" | "Business">("Individual");

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            const nextFirstName = profile.firstName ?? "";
            const nextLastName = profile.lastName ?? "";
            const nextPhoneNumber = profile.phoneNumber ?? "";
            const nextSettlementRef = profile.settlementRef ?? "";
            setFirstName(nextFirstName);
            setLastName(nextLastName);
            setPhoneNumber(nextPhoneNumber);
            setSettlementRef(nextSettlementRef);
            setSettlementDescription(profile.settlementDescrption ?? "");
            aboutRef.current = profile.about ?? "";
            webSiteRef.current = profile.webSite ?? "";
            accountTypeRef.current = profile.accountType ?? "Individual";
            setAvatarPreview(buildImageUrl(profile.photo, IMAGE_SIZES.avatarLarge));
            setAvatarLoadFailed(false);
            setNewsletterSubscribed(profile.newsletterSubscribed ?? false);
            // Baseline for the isDirty comparison below — captured once per fresh profile load,
            // not on every keystroke.
            setInitialValues({
                firstName: nextFirstName,
                lastName: nextLastName,
                phoneNumber: nextPhoneNumber,
                settlementRef: nextSettlementRef,
            });
        }
    }, [profile]);

    // Enables "Зберегти зміни" only once something actually changed — any text field, the
    // selected city, or a newly picked avatar file. A freshly picked photo always counts,
    // even if every other field is untouched, since setAvatarFile(file) below is exactly what
    // beforeUploadAvatar sets on a new upload.
    const isDirty =
        avatarFile !== null ||
        firstName !== initialValues.firstName ||
        lastName !== initialValues.lastName ||
        phoneNumber !== initialValues.phoneNumber ||
        settlementRef !== initialValues.settlementRef;

    const beforeUploadAvatar = (file: RcFile) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            message.error(t('settings.avatar.allowedFormats'));
            return Upload.LIST_IGNORE;
        }
        if (file.size / 1024 / 1024 > 2) {
            message.error(t('settings.avatar.maxSize'));
            return Upload.LIST_IGNORE;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setAvatarLoadFailed(false);
        return false;
    };

    if (!isAuth) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const errors: Record<string, string> = {};
        if (firstName.trim().length < 2 || firstName.trim().length > 100) errors.firstName = t('settings.errors.nameLength');
        if (lastName.trim().length < 2 || lastName.trim().length > 100) errors.lastName = t('settings.errors.nameLength');
        const phoneError = ukrainianPhoneErrorMessage(extractSubscriberDigits(phoneNumber));
        if (phoneError) errors.phoneNumber = phoneError;
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const formData = new FormData();
        formData.append("Id", String(currentUserId));
        formData.append("FirstName", firstName.trim());
        formData.append("LastName", lastName.trim());
        formData.append("PhoneNumber", phoneNumber.trim());
        formData.append("SettlementRef", settlementRef);
        formData.append("About", aboutRef.current);
        formData.append("WebSite", webSiteRef.current);
        formData.append("AccountType", accountTypeRef.current);
        formData.append("ImageFile", avatarFile ?? new File([""], "existing", { type: "image/existing" }));

        try {
            const response = await editUser(formData).unwrap();
            dispatch(setAuth({ token: response.accessToken }));
            message.success(t('settings.toasts.saved'));
            setAvatarFile(null);
            // Re-baseline isDirty against what was just saved, so the button goes back to
            // disabled instead of staying enabled (would look like unsaved changes remain).
            const savedFirstName = firstName.trim();
            const savedLastName = lastName.trim();
            setInitialValues({
                firstName: savedFirstName,
                lastName: savedLastName,
                phoneNumber: phoneNumber.trim(),
                settlementRef,
            });
            setFirstName(savedFirstName);
            setLastName(savedLastName);
        } catch (err: any) {
            if (err?.data?.errors) {
                const { fieldErrors: serverErrors } = parseServerValidationErrors(err.data.errors);
                setFieldErrors((prev) => ({ ...prev, ...serverErrors }));
            } else {
                setFormError(err?.data?.message || t('settings.errors.saveFailed'));
            }
        }
    };

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <h1 className="text-2xl font-bold text-mm-navy mb-6">{t('settings.title')}</h1>
            <div className="flex flex-col md:flex-row gap-6">
                <AccountSidebar />

                <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl p-5 md:p-6">
                    {isProfileLoading ? (
                        <p className="text-center text-gray-400 py-16">{t('common.loading')}</p>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
                            <div className="flex items-center gap-4">
                                <Avatar
                                    size={88}
                                    src={!avatarLoadFailed ? avatarPreview ?? undefined : undefined}
                                    icon={<UserOutlined />}
                                    className="bg-mm-lavender shrink-0"
                                    onError={() => {
                                        // A broken/expired backend photo URL or an invalid base64 blob —
                                        // fall back to the icon instead of antd's broken-image glyph, and
                                        // don't let the failure retry in a loop.
                                        setAvatarLoadFailed(true);
                                        return false;
                                    }}
                                />
                                <Upload showUploadList={false} beforeUpload={beforeUploadAvatar} accept="image/png,image/jpeg,image/gif,image/webp">
                                    <button type="button" className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold text-mm-navy hover:border-mm-purple transition-colors">
                                        <UploadOutlined /> {t('settings.avatar.changePhoto')}
                                    </button>
                                </Upload>
                            </div>

                            {profile && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-mm-navy">{t('settings.email.label')}</label>
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className="text-sm text-gray-700">{profile.email}</span>
                                        {profile.emailConfirmed ? (
                                            <span
                                                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
                                                style={{ color: "#B8860B", borderColor: "#FFD700", background: "#FFF9E5" }}
                                            >
                                                <CheckCircleFilled style={{ color: "#FFD700" }} /> {t('settings.email.confirmed')}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleStartEmailVerification}
                                                disabled={isSendingCode}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-mm-purple border border-mm-purple rounded-full px-3 py-1 hover:bg-mm-lavender transition-colors disabled:opacity-50"
                                            >
                                                <MailOutlined /> {isSendingCode ? t('settings.email.sending') : t('settings.email.confirm')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {profile && (
                                <div className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-3">
                                    <div className="flex items-start gap-2">
                                        <NotificationOutlined className="text-mm-purple mt-0.5" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-mm-navy">{t('settings.newsletter.label')}</span>
                                            <span className="text-xs text-gray-500">{t('settings.newsletter.description')}</span>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={newsletterSubscribed}
                                        loading={isTogglingNewsletter}
                                        onChange={handleToggleNewsletter}
                                        aria-label={t('settings.newsletter.label')}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-mm-navy">{t('settings.firstName')}</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                                    />
                                    {fieldErrors.firstName && <p className="text-red-500 text-xs">{fieldErrors.firstName}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-mm-navy">{t('settings.lastName')}</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                                    />
                                    {fieldErrors.lastName && <p className="text-red-500 text-xs">{fieldErrors.lastName}</p>}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-mm-navy">{t('settings.phoneNumber')}</label>
                                <PhoneInput
                                    value={phoneNumber}
                                    onChange={setPhoneNumber}
                                    aria-invalid={!!fieldErrors.phoneNumber}
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                                />
                                {fieldErrors.phoneNumber && <p className="text-red-500 text-xs">{fieldErrors.phoneNumber}</p>}
                                {!fieldErrors.phoneNumber && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1"><PhoneOutlined /> {t('settings.phoneFormatHint')}</p>
                                )}
                            </div>

                            <SettlementPicker
                                value={settlementRef}
                                displayValue={settlementDescription || undefined}
                                onChange={(ref, descr) => {
                                    setSettlementRef(ref);
                                    setSettlementDescription(descr);
                                }}
                                label={t('settings.city')}
                            />

                            {formError && <p className="text-red-500 text-sm">{formError}</p>}

                            <button
                                type="submit"
                                disabled={isSaving || !isDirty}
                                className="self-start bg-mm-purple hover:bg-mm-purple-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-8 py-2.5 rounded-lg transition-colors"
                            >
                                {isSaving ? t('common.saving') : t('common.save')}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <Modal
                title={t('settings.modal.title')}
                open={isCodeModalOpen}
                onCancel={() => setIsCodeModalOpen(false)}
                onOk={handleConfirmEmailCode}
                okText={isVerifyingCode ? t('settings.modal.checking') : t('settings.modal.confirm')}
                cancelText={t('common.cancel')}
                confirmLoading={isVerifyingCode}
            >
                <p className="text-sm text-gray-500 mb-3">
                    {t('settings.modal.description', { email: profile?.email })}
                </p>
                <Input
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center tracking-[0.5em] font-bold"
                    onPressEnter={handleConfirmEmailCode}
                />
                {codeError && <p className="text-red-500 text-xs mt-2">{codeError}</p>}
                <button
                    type="button"
                    onClick={handleStartEmailVerification}
                    disabled={isSendingCode}
                    className="text-xs text-mm-purple font-medium hover:underline mt-3 disabled:opacity-50"
                >
                    {t('settings.modal.resend')}
                </button>
            </Modal>
        </div>
    );
};

export default SettingsPage;
