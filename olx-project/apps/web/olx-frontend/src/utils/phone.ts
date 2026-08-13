// Ukrainian mobile phone helpers shared by every phone input in the app (registration,
// profile settings). Two string shapes are in play:
//   - "subscriber digits": the 9 raw digits after the country code, e.g. "671234567".
//     This is what the mask/UI logic below works with internally.
//   - backend format: "+38 (0XX) XXX-XX-XX" — what CustomValidationExtensions.PhoneNumber()
//     (apps/api .../Validators/Extentions/CustomValidationExtensions.cs) actually validates
//     server-side, and what UserEditModel/UserCreationModel expect on the wire.
// The UI mask shown to the user is "+380 (XX) XXX-XX-XX" (per design), which encodes the exact
// same 12 digits as the backend's "+38 (0XX) XXX-XX-XX" — only the grouping differs — so we can
// display one and submit the other without touching backend validation.

/** Currently issued Ukrainian mobile operator prefixes (2 digits, right after the country code). */
export const UA_MOBILE_PREFIXES = [
    "39", "50", "63", "66", "67", "68", "73",
    "91", "92", "93", "94", "95", "96", "97", "98", "99",
];

/**
 * Pulls the 9 subscriber digits out of an arbitrary phone string — a raw paste ("0671234567",
 * "380671234567", "+380671234567"), a backend-format value already in state
 * ("+38 (067) 123-45-67"), or partial user input. Always returns at most 9 digits.
 */
export const extractSubscriberDigits = (input: string | null | undefined): string => {
    if (!input) return "";
    let digits = input.replace(/\D/g, "");
    if (digits.startsWith("380")) {
        digits = digits.slice(3);
    } else if (digits.startsWith("0") && digits.length >= 10) {
        // Legacy local format with a leading trunk "0" (e.g. "0671234567") — drop just the 0.
        digits = digits.slice(1);
    }
    return digits.slice(0, 9);
};

/** Progressive "+380 (XX) XXX-XX-XX" mask for whatever's been typed so far. Empty in -> empty out. */
export const formatUkrainianPhoneDisplay = (subscriberDigits: string): string => {
    const d = subscriberDigits.slice(0, 9);
    if (d.length === 0) return "";
    let out = `+380 (${d.slice(0, 2)}`;
    if (d.length >= 2) out += ")";
    if (d.length > 2) out += ` ${d.slice(2, 5)}`;
    if (d.length > 5) out += `-${d.slice(5, 7)}`;
    if (d.length > 7) out += `-${d.slice(7, 9)}`;
    return out;
};

/** Backend-compatible "+38 (0XX) XXX-XX-XX" string — what actually gets sent in the request. */
export const toBackendPhoneFormat = (subscriberDigits: string): string => {
    const d = subscriberDigits.slice(0, 9);
    if (d.length === 0) return "";
    return `+38 (0${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`;
};

/** True once all 9 digits are present AND the 2-digit operator prefix is a real UA mobile code. */
export const isValidUkrainianMobile = (subscriberDigits: string): boolean =>
    subscriberDigits.length === 9 && UA_MOBILE_PREFIXES.includes(subscriberDigits.slice(0, 2));

/** Human-readable validation message for a subscriber-digit string that isn't valid yet/at all. */
export const ukrainianPhoneErrorMessage = (subscriberDigits: string): string | null => {
    if (subscriberDigits.length === 0) return null; // empty is allowed — phone is optional
    if (subscriberDigits.length < 9) return "Введіть номер повністю: +380 (XX) XXX-XX-XX";
    if (!UA_MOBILE_PREFIXES.includes(subscriberDigits.slice(0, 2))) {
        return "Невідомий код оператора. Перевірте номер.";
    }
    return null;
};
