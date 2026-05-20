import type { LinguiConfig } from '@lingui/conf';
import { formatter } from '@lingui/format-po';

const config: LinguiConfig = {
    locales: ["en", "ua"],
    catalogs: [
        {
            path: "src/locales/{locale}/messages",
            include: ["src"], // де шукати тексти для перекладу
        },
    ],
    format: formatter({lineNumbers: false}), // Стандартний формат для перекладів
};

export default config;