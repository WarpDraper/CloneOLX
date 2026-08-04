const RETURN_URL_KEY = "returnUrl";

// Запам'ятовує поточну сторінку (наприклад, перед редіректом на /login з кнопки "У кошик"),
// щоб LoginForm міг повернути користувача туди ж після успішного входу.
export const saveReturnUrl = (path: string) => {
    sessionStorage.setItem(RETURN_URL_KEY, path);
};

// Одноразово зчитує і очищує збережений return URL; "/" за замовчуванням, якщо нічого не збережено.
export const consumeReturnUrl = (): string => {
    const url = sessionStorage.getItem(RETURN_URL_KEY);
    sessionStorage.removeItem(RETURN_URL_KEY);
    return url || "/";
};
