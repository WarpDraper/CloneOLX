import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Upload, Avatar, message } from "antd";
import { UserOutlined, UploadOutlined, PhoneOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload/interface";
import type { RootState } from "../../../store";
import { useGetSellerProfileQuery, isRealUserId } from "../../../services/profileService";
import { useEditUserMutation } from "../../../services/accountService";
import { setAuth } from "../../../Slice/authSlice";
import { buildImageUrl, IMAGE_SIZES } from "../../../utils/buildImageUrl";
import { parseServerValidationErrors } from "../../../utils/parseServerValidationErrors";
import SettlementPicker from "../../../components/location/SettlementPicker";
import AccountSidebar from "../../../components/account/AccountSidebar";

const PHONE_REGEX = /^\+38\s?\(\d{3}\)\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

// Frame 336: особисті налаштування. POST /api/account/edit/user, multipart/form-data,
// точна відповідність Olx.BLL.Models.User.UserEditModel + UserEditModelValidator.
// Бекенд затирає About/WebSite/SettlementRef значеннями null, якщо їх не передати (мапиться напряму
// через AutoMapper без ForAllMembers-умови на null) — тож About/WebSite завжди йдуть у формі
// незмінними "проходом" (не показані в UI, щоб не розширювати обсяг поза Name/Phone/Avatar).
// Так само AccountService.EditUserAsync стирає фото, якщо ImageFile відсутній — за відсутності нового
// файлу відправляємо сентинел-файл з ContentType "image/existing", як і при редагуванні оголошень.
const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuth, user } = useSelector((state: RootState) => state.auth);
    const currentUserId = Number(user?.id);

    useEffect(() => {
        if (!isAuth) navigate("/login", { replace: true });
    }, [isAuth, navigate]);

    const { data: profile, isLoading: isProfileLoading } = useGetSellerProfileQuery(currentUserId, { skip: !isRealUserId(currentUserId) });
    const [editUser, { isLoading: isSaving }] = useEditUserMutation();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [settlementRef, setSettlementRef] = useState("");
    const [settlementDescription, setSettlementDescription] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const aboutRef = useRef("");
    const webSiteRef = useRef("");

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setFirstName(profile.firstName ?? "");
            setLastName(profile.lastName ?? "");
            setPhoneNumber(profile.phoneNumber ?? "");
            setSettlementRef(profile.settlementRef ?? "");
            setSettlementDescription(profile.settlementDescrption ?? "");
            aboutRef.current = profile.about ?? "";
            webSiteRef.current = profile.webSite ?? "";
            setAvatarPreview(buildImageUrl(profile.photo, IMAGE_SIZES.avatarLarge));
        }
    }, [profile]);

    const beforeUploadAvatar = (file: RcFile) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            message.error("Дозволені формати: JPG, PNG, GIF, WEBP.");
            return Upload.LIST_IGNORE;
        }
        if (file.size / 1024 / 1024 > 2) {
            message.error("Розмір фото не може перевищувати 2MB.");
            return Upload.LIST_IGNORE;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        return false;
    };

    if (!isAuth) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const errors: Record<string, string> = {};
        if (firstName.trim().length < 2 || firstName.trim().length > 100) errors.firstName = "Від 2 до 100 символів";
        if (lastName.trim().length < 2 || lastName.trim().length > 100) errors.lastName = "Від 2 до 100 символів";
        if (phoneNumber.trim() && !PHONE_REGEX.test(phoneNumber.trim())) errors.phoneNumber = "Формат: +38 (0XX) XXX-XX-XX";
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
        formData.append("ImageFile", avatarFile ?? new File([""], "existing", { type: "image/existing" }));

        try {
            const response = await editUser(formData).unwrap();
            dispatch(setAuth({ token: response.accessToken }));
            message.success("Налаштування збережено!");
            setAvatarFile(null);
        } catch (err: any) {
            if (err?.data?.errors) {
                const { fieldErrors: serverErrors } = parseServerValidationErrors(err.data.errors);
                setFieldErrors((prev) => ({ ...prev, ...serverErrors }));
            } else {
                setFormError(err?.data?.message || "Не вдалося зберегти зміни.");
            }
        }
    };

    return (
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
            <h1 className="text-2xl font-bold text-mm-navy mb-6">Налаштування</h1>
            <div className="flex flex-col md:flex-row gap-6">
                <AccountSidebar />

                <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl p-5 md:p-6">
                    {isProfileLoading ? (
                        <p className="text-center text-gray-400 py-16">Завантаження...</p>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
                            <div className="flex items-center gap-4">
                                <Avatar size={88} src={avatarPreview ?? undefined} icon={<UserOutlined />} className="bg-mm-lavender shrink-0" />
                                <Upload showUploadList={false} beforeUpload={beforeUploadAvatar} accept="image/png,image/jpeg,image/gif,image/webp">
                                    <button type="button" className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold text-mm-navy hover:border-mm-purple transition-colors">
                                        <UploadOutlined /> Змінити фото
                                    </button>
                                </Upload>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-mm-navy">Ім'я</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                                    />
                                    {fieldErrors.firstName && <p className="text-red-500 text-xs">{fieldErrors.firstName}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium text-mm-navy">Прізвище</label>
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
                                <label className="text-sm font-medium text-mm-navy">Номер телефону</label>
                                <input
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+38 (0XX) XXX-XX-XX"
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-mm-purple"
                                />
                                {fieldErrors.phoneNumber && <p className="text-red-500 text-xs">{fieldErrors.phoneNumber}</p>}
                                {!fieldErrors.phoneNumber && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1"><PhoneOutlined /> Формат: +38 (0XX) XXX-XX-XX</p>
                                )}
                            </div>

                            <SettlementPicker
                                value={settlementRef}
                                displayValue={settlementDescription || undefined}
                                onChange={(ref, descr) => {
                                    setSettlementRef(ref);
                                    setSettlementDescription(descr);
                                }}
                                label="Місто"
                            />

                            {formError && <p className="text-red-500 text-sm">{formError}</p>}

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="self-start bg-mm-purple hover:bg-mm-purple-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-8 py-2.5 rounded-lg transition-colors"
                            >
                                {isSaving ? "Збереження..." : "Зберегти зміни"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
