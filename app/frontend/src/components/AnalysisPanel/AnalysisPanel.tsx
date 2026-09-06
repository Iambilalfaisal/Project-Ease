import { useMsal } from "@azure/msal-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { ChatAppResponse, fetchWithAuthRedirect, getHeaders } from "../../api";
import { getToken, useLogin } from "../../authConfig";
import { MarkdownViewer } from "../MarkdownViewer";
import { SupportingContent } from "../SupportingContent";
import { AnalysisPanelTabs } from "./AnalysisPanelTabs";
import { ThoughtProcess } from "./ThoughtProcess";

const TAB_BTN =
    "cursor-pointer border-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-sans text-sm font-semibold text-ink-3 transition-colors duration-150 ease-standard hover:text-ink-1 disabled:cursor-not-allowed disabled:text-ink-3/40 disabled:hover:text-ink-3/40";
const TAB_BTN_ACTIVE = "!border-b-gold !text-gold";

interface Props {
    className: string;
    activeTab: AnalysisPanelTabs;
    onActiveTabChanged: (tab: AnalysisPanelTabs) => void;
    activeCitation: string | undefined;
    citationHeight: string;
    answer: ChatAppResponse;
    onCitationClicked?: (citationFilePath: string) => void;
}

export const AnalysisPanel = ({ answer, activeTab, activeCitation, citationHeight, className, onActiveTabChanged, onCitationClicked }: Props) => {
    const isDisabledThoughtProcessTab: boolean = !answer.context.thoughts;
    const dataPoints = answer.context.data_points;
    const hasSupportingContent = Boolean(
        dataPoints &&
        ((dataPoints.text && dataPoints.text.length > 0) ||
            (dataPoints.images && dataPoints.images.length > 0) ||
            (dataPoints.external_results_metadata && dataPoints.external_results_metadata.length > 0))
    );
    const isDisabledSupportingContentTab: boolean = !hasSupportingContent;
    const isDisabledCitationTab: boolean = !activeCitation;
    const [citation, setCitation] = useState("");

    const client = useLogin ? useMsal().instance : undefined;
    const { t } = useTranslation();

    const fetchCitation = async () => {
        const token = client ? await getToken(client) : undefined;
        if (activeCitation) {
            // Get hash from the URL as it may contain #page=N
            // which helps browser PDF renderer jump to correct page N
            const originalHash = activeCitation.includes("#") ? activeCitation.split("#")[1] : "";
            const response = await fetchWithAuthRedirect(activeCitation, {
                method: "GET",
                headers: await getHeaders(token)
            });
            const citationContent = await response.blob();
            let citationObjectUrl = URL.createObjectURL(citationContent);
            // Add hash back to the new blob URL
            if (originalHash) {
                citationObjectUrl += "#" + originalHash;
            }
            setCitation(citationObjectUrl);
        }
    };
    useEffect(() => {
        fetchCitation();
    }, []);

    const renderFileViewer = () => {
        if (!activeCitation) {
            return null;
        }

        const fileExtension = activeCitation.split(".").pop()?.toLowerCase();
        switch (fileExtension) {
            case "png":
                return <img src={citation} className="max-w-full object-contain" style={{ height: "28.125rem" }} alt="Citation Image" />;
            case "md":
                return <MarkdownViewer src={activeCitation} />;
            default:
                return <iframe title="Citation" src={citation} width="100%" height={citationHeight} />;
        }
    };

    const TAB_DEFS: { value: AnalysisPanelTabs; label: string; disabled: boolean }[] = [
        { value: AnalysisPanelTabs.ThoughtProcessTab, label: t("headerTexts.thoughtProcess"), disabled: isDisabledThoughtProcessTab },
        { value: AnalysisPanelTabs.SupportingContentTab, label: t("headerTexts.supportingContent"), disabled: isDisabledSupportingContentTab },
        { value: AnalysisPanelTabs.CitationTab, label: t("headerTexts.citation"), disabled: isDisabledCitationTab }
    ];

    return (
        <div className={className}>
            <div role="tablist" className="flex border-b border-border">
                {TAB_DEFS.map(tab => (
                    <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.value}
                        disabled={tab.disabled}
                        onClick={() => onActiveTabChanged(tab.value)}
                        className={cn(TAB_BTN, activeTab === tab.value && TAB_BTN_ACTIVE)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div>
                {activeTab === AnalysisPanelTabs.ThoughtProcessTab && (
                    <ThoughtProcess thoughts={answer.context.thoughts || []} onCitationClicked={onCitationClicked} />
                )}
                {activeTab === AnalysisPanelTabs.SupportingContentTab && <SupportingContent supportingContent={answer.context.data_points} />}
                {activeTab === AnalysisPanelTabs.CitationTab && renderFileViewer()}
            </div>
        </div>
    );
};
