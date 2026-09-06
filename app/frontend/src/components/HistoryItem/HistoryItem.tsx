import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Delete24Regular } from "@fluentui/react-icons";

import { Button, Modal } from "@/components/ui";

export interface HistoryData {
    id: string;
    title: string;
    timestamp: number;
}

interface HistoryItemProps {
    item: HistoryData;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
}

export function HistoryItem({ item, onSelect, onDelete }: HistoryItemProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDelete = useCallback(() => {
        setIsModalOpen(false);
        onDelete(item.id);
    }, [item.id, onDelete]);

    return (
        <div className="group flex items-center justify-between rounded-sm px-2 py-1 transition-colors duration-150 hover:bg-bg-2">
            <button
                onClick={() => onSelect(item.id)}
                className="mr-1 grow cursor-pointer border-none bg-transparent p-0 text-left"
            >
                <div className="truncate text-sm text-ink-1">{item.title}</div>
            </button>
            <button
                onClick={() => setIsModalOpen(true)}
                aria-label="delete this chat history"
                className="cursor-pointer rounded-pill border-none bg-transparent p-1 text-ink-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-danger focus:opacity-100"
            >
                <Delete24Regular className="h-5 w-5" />
            </button>
            <DeleteHistoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleDelete} />
        </div>
    );
}

function DeleteHistoryModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) {
    const { t } = useTranslation();
    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={t("history.deleteModalTitle")}
            maxWidth={400}
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        {t("history.cancelLabel")}
                    </Button>
                    <Button variant="danger" size="sm" onClick={onConfirm}>
                        {t("history.deleteLabel")}
                    </Button>
                </>
            }
        >
            <p className="m-0 text-sm text-ink-2">{t("history.deleteModalDescription")}</p>
        </Modal>
    );
}
