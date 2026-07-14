import { useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { useRegisterMutation } from "../../services/accountService.ts";
import type { IRegisterUser } from "../../types/account/IRegisterUser.ts";
import InputField from "../inputs/InputField.tsx";
import ImageUploader from "../uploaders/ImageUploader.tsx";
import BaseButton from "../inputs/BaseButton.tsx";
import type { UploadFile } from "antd";
import { parseServerValidationErrors } from "../../utils/parseServerValidationErrors.ts";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { setAuth } from "../../Slice/authSlice.ts";

const RegisterForm: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [register, { isLoading }] = useRegisterMutation();

    // Ініціалізуємо хук капчі
    const { executeRecaptcha } = useGoogleReCaptcha();

    const [formValues, setFormValues] = useState<IRegisterUser>({
        Email: "",
        Password: "",
        PasswordConfirmation: "",
        FirstName: "",
        LastName: "",
        ImageFile: null,
        WebSite: "",
        About: "",
        PhoneNumber: "",
        SettlementRef: "",
        RecapthcaToken: "",
        Action: ""
    });

    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [imageError, setImageError] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFieldErrors({});

        // Перевіряємо збіг паролів
        if (formValues.Password !== formValues.PasswordConfirmation) {
            setFieldErrors((prev) => ({
                ...prev,
                PasswordConfirmation: "Паролі не збігаються!",
            }));
            return;
        }

        if (!executeRecaptcha) {
            setFormError("Захист від роботів завантажується. Спробуйте ще раз через мить.");
            return;
        }

        try {
            const token = await executeRecaptcha("register");

            const formData = new FormData();

            // Передаємо дані відповідно до назв у Swagger
            formData.append("Email", formValues.Email);
            formData.append("Password", formValues.Password);
            formData.append("PasswordConfirmation", formValues.PasswordConfirmation);
            formData.append("FirstName", formValues.FirstName);
            formData.append("LastName", formValues.LastName);
            formData.append("PhoneNumber", formValues.PhoneNumber);
            formData.append("WebSite", formValues.WebSite || "");
            formData.append("About", formValues.About || "");
            formData.append("SettlementRef", formValues.SettlementRef || "");
            formData.append("RecapthcaToken", token);
            formData.append("Action", "register");

            // Додаємо фото тільки якщо користувач його дійсно вибрав
            if (fileList[0]?.originFileObj) {
                formData.append("ImageFile", fileList[0].originFileObj as File);
            }

            // Надсилаємо PUT запит на реєстрацію
            const userData = (await register(formData as any).unwrap()) as any;
            console.log("Реєстрація успішна:", userData);

            if (userData && userData.accessToken) {
                dispatch(setAuth({ token: userData.accessToken }));
            }

            navigate("/");
        } catch (err: any) {
            if (err?.data?.errors) {
                const { fieldErrors } = parseServerValidationErrors(err.data.errors);
                setFieldErrors(fieldErrors);
            } else {
                setFormError(err?.data?.message || "Помилка реєстрації");
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                    label="First name"
                    name="FirstName" // ✅ Збігається з ключем у state
                    placeholder="Pedro"
                    value={formValues.FirstName}
                    onChange={handleChange}
                    error={fieldErrors.FirstName || fieldErrors.firstName}
                />
                <InputField
                    label="Last name"
                    name="LastName" // ✅ Збігається з ключем у state
                    placeholder="Timchuk"
                    value={formValues.LastName}
                    onChange={handleChange}
                    error={fieldErrors.LastName || fieldErrors.lastName}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                    label="Phone"
                    name="PhoneNumber" // ✅ Збігається з ключем у state
                    placeholder="+380..."
                    value={formValues.PhoneNumber}
                    onChange={handleChange}
                    error={fieldErrors.PhoneNumber || fieldErrors.phoneNumber}
                />
                <InputField
                    label="Email"
                    name="Email" // ✅ Збігається з ключем у state
                    placeholder="pedro@example.com"
                    value={formValues.Email}
                    onChange={handleChange}
                    error={fieldErrors.Email || fieldErrors.email}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                    label="Password"
                    type="password"
                    name="Password" // ✅ Збігається з ключем у state
                    placeholder="********"
                    value={formValues.Password}
                    onChange={handleChange}
                    error={fieldErrors.Password || fieldErrors.password}
                />
                <InputField
                    label="Confirm Password"
                    type="password"
                    name="PasswordConfirmation" // ✅ Збігається з ключем у state
                    placeholder="********"
                    value={formValues.PasswordConfirmation}
                    onChange={handleChange}
                    error={fieldErrors.PasswordConfirmation || fieldErrors.passwordConfirmation || fieldErrors.passwordConfirm}
                />
            </div>

            <div className="w-full text-center">
                <ImageUploader
                    fileList={fileList}
                    setFileList={setFileList}
                    imageError={imageError}
                    setImageError={setImageError}
                />
                {imageError && <p className="text-red-500 text-sm mt-1">Image is required</p>}
            </div>

            {formError && <p className="text-red-500 text-sm text-center">{formError}</p>}

            <BaseButton
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl border border-blue-300 font-medium py-2"
            >
                {isLoading ? "Loading..." : "Register"}
            </BaseButton>
        </form>
    );
};

export default RegisterForm;