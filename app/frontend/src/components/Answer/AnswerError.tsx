import { ErrorCircle24Regular } from "@fluentui/react-icons";

import { Button } from "@/components/ui";
import { ANSWER_CONTAINER, ANSWER_TEXT } from "./answerStyles";

interface Props {
    error: string;
    onRetry: () => void;
}

export const AnswerError = ({ error, onRetry }: Props) => {
    return (
        <div className={ANSWER_CONTAINER} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <ErrorCircle24Regular aria-hidden="true" aria-label="Error icon" primaryFill="red" />

            <div style={{ flexGrow: 1 }}>
                <p className={ANSWER_TEXT}>{error}</p>
            </div>

            <Button variant="primary" size="sm" className="w-fit" onClick={onRetry}>
                Retry
            </Button>
        </div>
    );
};
