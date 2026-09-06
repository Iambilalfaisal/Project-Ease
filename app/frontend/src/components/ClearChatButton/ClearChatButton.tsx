import { Delete24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
}

export const ClearChatButton = ({ className, disabled, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={onClick}>
                <span className="inline-flex items-center gap-1.5">
                    <Delete24Regular className="h-4 w-4" /> {t("clearChat")}
                </span>
            </Button>
        </div>
    );
};
