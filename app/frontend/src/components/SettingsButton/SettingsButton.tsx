import { Settings24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Props {
    className?: string;
    onClick: () => void;
}

export const SettingsButton = ({ className, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <Button variant="ghost" size="sm" onClick={onClick}>
                <span className="inline-flex items-center gap-1.5">
                    <Settings24Regular className="h-4 w-4" /> {t("developerSettings")}
                </span>
            </Button>
        </div>
    );
};
