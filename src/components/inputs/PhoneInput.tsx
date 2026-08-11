import React from "react";
import { useTranslation } from "react-i18next";
import {
    extractSubscriberDigits,
    formatUkrainianPhoneDisplay,
    toBackendPhoneFormat,
} from "../../utils/phone";

interface PhoneInputProps {
    /** Current value in backend format ("+38 (0XX) XXX-XX-XX") or "" — same shape callers
     *  already store/submit, so this drops into existing form state without a shape change. */
    value: string;
    onChange: (backendFormattedValue: string) => void;
    id?: string;
    name?: string;
    className?: string;
    placeholder?: string;
    "aria-invalid"?: boolean;
}

// Ukrainian mobile phone input with a live "+380 (XX) XXX-XX-XX" mask. Digits are the only thing
// that can ever be typed into the number portion — the "+380 (", ")", spaces and dashes are all
// inserted automatically, and backspacing across a separator removes the digit before it, not
// the separator itself. Internally it always reports the equivalent backend-format string
// ("+38 (0XX) XXX-XX-XX") via onChange, so it's a drop-in replacement for a plain phone <input>.
const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    id,
    name,
    className,
    placeholder,
    ...rest
}) => {
    const { t } = useTranslation();
    const digits = extractSubscriberDigits(value);
    const display = formatUkrainianPhoneDisplay(digits);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextDigits = extractSubscriberDigits(e.target.value);
        onChange(toBackendPhoneFormat(nextDigits));
    };

    return (
        <input
            id={id}
            name={name}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={display}
            onChange={handleChange}
            placeholder={placeholder ?? t('phoneInput.placeholder')}
            className={className}
            {...rest}
        />
    );
};

export default PhoneInput;
