import { Example } from "./Example";
import { useTranslation } from "react-i18next";

interface Props {
    onExampleClicked: (value: string) => void;
    useMultimodalAnswering?: boolean;
}

export const ExampleList = ({ onExampleClicked, useMultimodalAnswering }: Props) => {
    const { t } = useTranslation();

    const DEFAULT_EXAMPLES: string[] = [t("defaultExamples.1"), t("defaultExamples.2"), t("defaultExamples.3")];
    const MULTIMODAL_EXAMPLES: string[] = [t("multimodalExamples.1"), t("multimodalExamples.2"), t("multimodalExamples.3")];

    return (
        <ul className="mx-auto flex w-full max-w-[64.25rem] flex-none list-none flex-col items-stretch justify-center gap-3 px-4 sm:flex-row sm:gap-4">
            {(useMultimodalAnswering ? MULTIMODAL_EXAMPLES : DEFAULT_EXAMPLES).map((question, i) => (
                <li key={i} className="flex sm:min-w-0 sm:flex-1">
                    <Example text={question} value={question} onClick={onExampleClicked} />
                </li>
            ))}
        </ul>
    );
};
