import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
// 1. Імпортуємо хук для роботи з reCAPTCHA v3
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { useLoginMutation } from "../../services/accountService.ts";
import type { IUserLogin } from "../../types/account/IUserLogin.ts";
import InputField from "../inputs/InputField.tsx";
import BaseButton from "../inputs/BaseButton.tsx";
import { parseServerValidationErrors } from "../../utils/parseServerValidationErrors.ts";
import { setAuth } from "../../Slice/authSlice.ts";
import { Link } from "react-router-dom";

const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();

    // Ініціалізуємо хук капчі всередині компонента
    const { executeRecaptcha } = useGoogleReCaptcha();

    // ✅ ФІКС 1: Прибрали поле 'isAuth', щоб не було помилки TS2353
    const [formValues, setFormValues] = useState<IUserLogin>({
        email: "",
        password: "",
        recapthcaToken: "",
        action: ""
    });

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

        // Перевіряємо, чи скрипт капчі готовий
        if (!executeRecaptcha) {
            setFormError("Захист від роботів завантажується. Спробуйте ще раз через мить.");
            return;
        }

        try {
            const token = await executeRecaptcha("login");

            const userData = (await login({
                email: formValues.email,
                password: formValues.password,
                recapthcaToken: token,
                action: "login",
            } as any).unwrap()) as any;

            console.log("Дані користувача:", userData);

            // Передаємо лише токен, як і вимагає твій Redux стор
            dispatch(setAuth({
                token: userData.accessToken,
            }));

            navigate("/");
        } catch (err: any) {
            if (err?.data?.errors) {
                const { fieldErrors } = parseServerValidationErrors(err.data.errors);
                setFieldErrors(fieldErrors);
            } else {
                setFormError(err?.data?.message || "Помилка входу. Перевірте дані.");
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
            <InputField
                label="Email"
                name="email"
                type="email"
                placeholder="example@mail.com"
                value={formValues.email}
                onChange={handleChange}
                error={fieldErrors.email}
            />

            <InputField
                label="Password"
                type="password"
                name="password"
                placeholder="********"
                value={formValues.password}
                onChange={handleChange}
                error={fieldErrors.password}
            />

            {formError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3">
                    <p className="text-red-700 text-sm">{formError}</p>
                </div>
            )}

            <Link to="/forgot-password" className="font-bold text-[#002f34] hover:text-[#23e5db] transition-colors">
                I forgot my password.
            </Link>

            <BaseButton
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl border border-blue-300 font-medium py-2 mt-4"
            >
                {isLoading ? "Signing in..." : "Login"}
            </BaseButton>
        </form>
    );
};

export default LoginForm;