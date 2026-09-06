import { type JSX, useId, useState } from "react";
import { Info24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import { Button, Popover } from "@/components/ui";

interface IHelpCalloutProps {
    label: string | undefined;
    labelId: string;
    fieldId: string | undefined;
    helpText: string;
}

export const HelpCallout = (props: IHelpCalloutProps): JSX.Element => {
    const [isCalloutVisible, setIsCalloutVisible] = useState(false);
    const descriptionId = useId();
    const { t } = useTranslation();

    return (
        <div className="flex flex-1 items-center gap-1">
            <label id={props.labelId} htmlFor={props.fieldId} className="text-sm text-ink-2">
                {props.label}
            </label>
            <Popover
                open={isCalloutVisible}
                onOpenChange={setIsCalloutVisible}
                trigger={
                    <button
                        type="button"
                        title={t("tooltips.info")}
                        aria-label={t("tooltips.info")}
                        className="-mb-[3px] shrink-0 cursor-pointer rounded-sm border-none bg-transparent p-1 text-ink-3 transition-colors duration-150 hover:text-gold"
                    >
                        <Info24Regular className="h-4 w-4" />
                    </button>
                }
            >
                <div aria-describedby={descriptionId} role="alertdialog" className="flex flex-col items-start gap-1">
                    <span id={descriptionId} className="text-sm text-ink-2">
                        {props.helpText}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setIsCalloutVisible(false)}>
                        {t("labels.closeButton")}
                    </Button>
                </div>
            </Popover>
        </div>
    );
};
