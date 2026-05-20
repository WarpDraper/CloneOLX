import { i18n } from "@lingui/core";

export const locales = {
    en: "English",
    ua: "Українська",
};

// Функція для динамічного завантаження файлів перекладу
export async function dynamicActivate(locale: string) {
    const { messages } = await import(`./locales/${locale}/messages.po`);
    i18n.load(locale, messages);
    i18n.activate(locale);
    localStorage.setItem("lang", locale);
}

// Початкова мова (беремо з локал стореджу або ставимо "ua")
const savedLocale = localStorage.getItem("lang") || "ua";
export const initI18n = dynamicActivate(savedLocale);