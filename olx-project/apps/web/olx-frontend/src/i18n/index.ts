import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import uk from "./locales/uk.json";
import en from "./locales/en.json";

// Two supported UI locales (Task 1 — bilingual UKR/ENG toggle in Header.tsx). Detected from
// localStorage first (key below, written by Header's toggle) so the choice survives a reload,
// then falls back to the browser's language, then to Ukrainian (the app's default voice).
export const LANGUAGE_STORAGE_KEY = "multimart-language";

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            uk: { translation: uk },
            en: { translation: en },
        },
        fallbackLng: "uk",
        supportedLngs: ["uk", "en"],
        detection: {
            order: ["localStorage", "navigator"],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
            caches: ["localStorage"],
        },
        interpolation: { escapeValue: false },
    });

export default i18n;
