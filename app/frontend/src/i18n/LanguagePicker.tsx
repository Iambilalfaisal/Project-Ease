import { useTranslation } from "react-i18next";
import { LocalLanguage24Regular } from "@fluentui/react-icons";
import { type ChangeEvent, useId } from "react";

import { supportedLngs } from "./config";

interface Props {
    onLanguageChange: (language: string) => void;
}

export const LanguagePicker = ({ onLanguageChange }: Props) => {
    const { i18n } = useTranslation();

    const handleLanguageChange = (ev: ChangeEvent<HTMLSelectElement>) => {
        onLanguageChange(ev.target.value || i18n.language);
    };
    const languagePickerId = useId();
    const { t } = useTranslation();

    return (
        <div className="flex w-fit cursor-pointer items-center justify-center gap-1 rounded-lg border border-border-md bg-bg-1 px-2 py-1 transition-[border-color,box-shadow] duration-200 ease-standard hover:border-gold-border hover:shadow-sm">
            <LocalLanguage24Regular className="shrink-0 text-ink-3" />
            <select
                id={languagePickerId}
                value={i18n.language}
                onChange={handleLanguageChange}
                aria-label={t("labels.languagePicker")}
                className="cursor-pointer border-none bg-transparent text-sm text-ink-1 outline-none"
            >
                {Object.entries(supportedLngs).map(([code, details]) => (
                    <option key={code} value={code}>
                        {details.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
