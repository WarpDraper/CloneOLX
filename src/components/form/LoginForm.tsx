import { useState } from "react";
import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "../../services/accountService.ts"; // Припустимо, назва така
import type { IUserLogin } from "../../types/account/IUserLogin.ts"; // Тіп тільки з email та password
import InputField from "../inputs/InputField.tsx";
import BaseButton from "../inputs/BaseButton.tsx";
import { parseServerValidationErrors } from "../../utils/parseServerValidationErrors.ts";
import { setAuth } from "../../Slice/authSlice.ts";

const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [login, { isLoading }] = useLoginMutation();

    const [formValues, setFormValues] = useState<IUserLogin>({
        email: "",
        password: "",
        isAuth: false,
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

        try {
            // await login(formValues).unwrap();
            const userData = await login(formValues).unwrap();
            console.log("Дані користувача:", userData);

            dispatch(setAuth({
                token: userData.token,
                email: userData.email
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