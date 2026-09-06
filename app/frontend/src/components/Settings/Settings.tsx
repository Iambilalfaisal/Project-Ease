import { useId } from "react";
import { useTranslation } from "react-i18next";
import { HelpCallout } from "../HelpCallout";
import { VectorSettings } from "../VectorSettings";
import { RetrievalMode } from "../../api";
import {
    SETTINGS_CHECKBOX,
    SETTINGS_CHECKBOX_INPUT,
    SETTINGS_FIELD,
    SETTINGS_FIELDSET,
    SETTINGS_LEGEND,
    SETTINGS_SECTION_HEADER,
    SETTINGS_SELECT,
    SETTINGS_INPUT,
    SETTINGS_TEXTAREA
} from "./settingsStyles";

export interface SettingsProps {
    promptTemplate: string;
    temperature: number;
    retrieveCount: number;
    agenticReasoningEffort: string;
    minimumSearchScore: number;
    minimumRerankerScore: number;
    useSemanticRanker: boolean;
    useSemanticCaptions: boolean;
    useQueryRewriting: boolean;
    reasoningEffort: string;
    reasoningEffortOptions: string[];
    excludeCategory: string;
    includeCategory: string;
    retrievalMode: RetrievalMode;
    sendTextSources: boolean;
    sendImageSources: boolean;
    searchTextEmbeddings: boolean;
    searchImageEmbeddings: boolean;
    showSemanticRankerOption: boolean;
    showQueryRewritingOption: boolean;
    showReasoningEffortOption: boolean;
    showMultimodalOptions: boolean;
    showVectorOption: boolean;
    useLogin: boolean;
    loggedIn: boolean;
    requireAccessControl: boolean;
    className?: string;
    onChange: (field: string, value: any) => void;
    streamingEnabled?: boolean; // Only used in chat
    shouldStream?: boolean; // Only used in Chat
    useSuggestFollowupQuestions?: boolean; // Only used in Chat
    promptTemplatePrefix?: string;
    promptTemplateSuffix?: string;
    showAgenticRetrievalOption?: boolean;
    useAgenticKnowledgeBase?: boolean;
    hideMinimalRetrievalReasoningOption?: boolean;
    useWebSource?: boolean;
    showWebSourceOption?: boolean;
    useSharePointSource?: boolean;
    showSharePointSourceOption?: boolean;
}

export const Settings = ({
    promptTemplate,
    temperature,
    retrieveCount,
    agenticReasoningEffort,
    minimumSearchScore,
    minimumRerankerScore,
    useSemanticRanker,
    useSemanticCaptions,
    useQueryRewriting,
    reasoningEffort,
    reasoningEffortOptions,
    excludeCategory,
    includeCategory,
    retrievalMode,
    searchTextEmbeddings,
    searchImageEmbeddings,
    sendTextSources,
    sendImageSources,
    showSemanticRankerOption,
    showQueryRewritingOption,
    showReasoningEffortOption,
    showMultimodalOptions,
    showVectorOption,
    useLogin,
    loggedIn,
    requireAccessControl,
    className,
    onChange,
    streamingEnabled,
    shouldStream,
    useSuggestFollowupQuestions,
    promptTemplatePrefix,
    promptTemplateSuffix,
    showAgenticRetrievalOption,
    useAgenticKnowledgeBase = false,
    hideMinimalRetrievalReasoningOption = false,
    useWebSource = false,
    showWebSourceOption = false,
    useSharePointSource = false,
    showSharePointSourceOption = false
}: SettingsProps) => {
    const { t } = useTranslation();

    // Form field IDs
    const promptTemplateId = useId();
    const promptTemplateFieldId = useId();
    const temperatureId = useId();
    const temperatureFieldId = useId();
    const agenticRetrievalId = useId();
    const agenticRetrievalFieldId = useId();
    const webSourceId = useId();
    const webSourceFieldId = useId();
    const sharePointSourceId = useId();
    const sharePointSourceFieldId = useId();
    const searchScoreId = useId();
    const searchScoreFieldId = useId();
    const rerankerScoreId = useId();
    const rerankerScoreFieldId = useId();
    const retrieveCountId = useId();
    const retrieveCountFieldId = useId();
    const agenticReasoningEffortId = useId();
    const agenticReasoningEffortFieldId = useId();
    const includeCategoryId = useId();
    const includeCategoryFieldId = useId();
    const excludeCategoryId = useId();
    const excludeCategoryFieldId = useId();
    const semanticRankerId = useId();
    const semanticRankerFieldId = useId();
    const queryRewritingId = useId();
    const queryRewritingFieldId = useId();
    const reasoningEffortId = useId();
    const reasoningEffortFieldId = useId();
    const semanticCaptionsId = useId();
    const semanticCaptionsFieldId = useId();
    const shouldStreamId = useId();
    const shouldStreamFieldId = useId();
    const suggestFollowupQuestionsId = useId();
    const suggestFollowupQuestionsFieldId = useId();

    const webSourceDisablesStreamingAndFollowup = !!useWebSource;

    const retrievalReasoningOptions: { key: string; text: string }[] = [
        { key: "minimal", text: t("labels.agenticReasoningEffortOptions.minimal") },
        { key: "low", text: t("labels.agenticReasoningEffortOptions.low") },
        { key: "medium", text: t("labels.agenticReasoningEffortOptions.medium") }
    ];

    return (
        <div className={className}>
            {streamingEnabled && (
                <>
                    <div className={SETTINGS_CHECKBOX}>
                        <input
                            type="checkbox"
                            className={SETTINGS_CHECKBOX_INPUT}
                            id={shouldStreamFieldId}
                            checked={webSourceDisablesStreamingAndFollowup ? false : shouldStream}
                            onChange={ev => onChange("shouldStream", ev.target.checked)}
                            aria-labelledby={shouldStreamId}
                            disabled={webSourceDisablesStreamingAndFollowup}
                        />
                        <HelpCallout
                            labelId={shouldStreamId}
                            fieldId={shouldStreamFieldId}
                            helpText={t("helpTexts.streamChat")}
                            label={t("labels.shouldStream")}
                        />
                    </div>

                    <div className={SETTINGS_CHECKBOX}>
                        <input
                            type="checkbox"
                            className={SETTINGS_CHECKBOX_INPUT}
                            id={suggestFollowupQuestionsFieldId}
                            checked={webSourceDisablesStreamingAndFollowup ? false : useSuggestFollowupQuestions}
                            onChange={ev => onChange("useSuggestFollowupQuestions", ev.target.checked)}
                            aria-labelledby={suggestFollowupQuestionsId}
                            disabled={webSourceDisablesStreamingAndFollowup}
                        />
                        <HelpCallout
                            labelId={suggestFollowupQuestionsId}
                            fieldId={suggestFollowupQuestionsFieldId}
                            helpText={t("helpTexts.suggestFollowupQuestions")}
                            label={t("labels.useSuggestFollowupQuestions")}
                        />
                    </div>
                </>
            )}

            <h3 className={SETTINGS_SECTION_HEADER}>{t("searchSettings")}</h3>

            {showAgenticRetrievalOption && (
                <>
                    <div className={SETTINGS_CHECKBOX}>
                        <input
                            type="checkbox"
                            className={SETTINGS_CHECKBOX_INPUT}
                            id={agenticRetrievalFieldId}
                            checked={useAgenticKnowledgeBase}
                            onChange={ev => onChange("useAgenticKnowledgeBase", ev.target.checked)}
                            aria-labelledby={agenticRetrievalId}
                        />
                        <HelpCallout
                            labelId={agenticRetrievalId}
                            fieldId={agenticRetrievalFieldId}
                            helpText={t("helpTexts.useAgenticKnowledgeBase")}
                            label={t("labels.useAgenticKnowledgeBase")}
                        />
                    </div>
                </>
            )}

            {showAgenticRetrievalOption && useAgenticKnowledgeBase && (
                <>
                    <div className={SETTINGS_FIELD}>
                        <HelpCallout
                            labelId={agenticReasoningEffortId}
                            fieldId={agenticReasoningEffortFieldId}
                            helpText={t("helpTexts.agenticReasoningEffort")}
                            label={t("labels.agenticReasoningEffort")}
                        />
                        <select
                            id={agenticReasoningEffortFieldId}
                            className={SETTINGS_SELECT}
                            value={agenticReasoningEffort}
                            onChange={ev => {
                                const newValue = ev.target.value || agenticReasoningEffort;
                                onChange("agenticReasoningEffort", newValue);
                                if (newValue === "minimal" && useWebSource) {
                                    onChange("useWebSource", false);
                                }
                            }}
                            aria-labelledby={agenticReasoningEffortId}
                        >
                            {retrievalReasoningOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>
                                    {opt.text}
                                </option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            {showAgenticRetrievalOption && useAgenticKnowledgeBase && showWebSourceOption && (
                <>
                    <div className={SETTINGS_CHECKBOX}>
                        <input
                            type="checkbox"
                            className={SETTINGS_CHECKBOX_INPUT}
                            id={webSourceFieldId}
                            checked={useWebSource}
                            onChange={ev => {
                                onChange("useWebSource", ev.target.checked);
                                if (ev.target.checked) {
                                    if (shouldStream) {
                                        onChange("shouldStream", false);
                                    }
                                    if (useSuggestFollowupQuestions) {
                                        onChange("useSuggestFollowupQuestions", false);
                                    }
                                }
                            }}
                            aria-labelledby={webSourceId}
                            disabled={!useAgenticKnowledgeBase || agenticReasoningEffort === "minimal"}
                        />
                        <HelpCallout labelId={webSourceId} fieldId={webSourceFieldId} helpText={t("helpTexts.useWebSource")} label={t("labels.useWebSource")} />
                    </div>
                </>
            )}
            {showAgenticRetrievalOption && useAgenticKnowledgeBase && showSharePointSourceOption && (
                <>
                    <div className={SETTINGS_CHECKBOX}>
                        <input
                            type="checkbox"
                            className={SETTINGS_CHECKBOX_INPUT}
                            id={sharePointSourceFieldId}
                            checked={useSharePointSource}
                            onChange={ev => onChange("useSharePointSource", ev.target.checked)}
                            aria-labelledby={sharePointSourceId}
                            disabled={!useAgenticKnowledgeBase}
                        />
                        <HelpCallout
                            labelId={sharePointSourceId}
                            fieldId={sharePointSourceFieldId}
                            helpText={t("helpTexts.useSharePointSource")}
                            label={t("labels.useSharePointSource")}
                        />
                    </div>
                </>
            )}
            {!useAgenticKnowledgeBase && (
                <>
                    <div className={SETTINGS_FIELD}>
                        <HelpCallout
                            labelId={searchScoreId}
                            fieldId={searchScoreFieldId}
                            helpText={t("helpTexts.searchScore")}
                            label={t("labels.minimumSearchScore")}
                        />
                        <input
                            className={SETTINGS_INPUT}
                            id={searchScoreFieldId}
                            type="number"
                            min={0}
                            step={0.01}
                            defaultValue={minimumSearchScore.toString()}
                            onChange={ev => onChange("minimumSearchScore", parseFloat(ev.target.value || "0"))}
                            aria-labelledby={searchScoreId}
                        />
                    </div>
                </>
            )}

            {showSemanticRankerOption && (
                <>
                    <div className={SETTINGS_FIELD}>
                        <HelpCallout
                            labelId={rerankerScoreId}
                            fieldId={rerankerScoreFieldId}
                            helpText={t("helpTexts.rerankerScore")}
                            label={t("labels.minimumRerankerScore")}
                        />
                        <input
                            className={SETTINGS_INPUT}
                            id={rerankerScoreFieldId}
                            type="number"
                            min={1}
                            max={4}
                            step={0.1}
                            defaultValue={minimumRerankerScore.toString()}
                            onChange={ev => onChange("minimumRerankerScore", parseFloat(ev.target.value || "0"))}
                            aria-labelledby={rerankerScoreId}
                        />
                    </div>
                </>
            )}

            {!useAgenticKnowledgeBase && (
                <>
                    <div className={SETTINGS_FIELD}>
                        <HelpCallout
                            labelId={retrieveCountId}
                            fieldId={retrieveCountFieldId}
                            helpText={t("helpTexts.retrieveNumber")}
                            label={t("labels.retrieveCount")}
                        />
                        <input
                            className={SETTINGS_INPUT}
                            id={retrieveCountFieldId}
                            type="number"
                            min={1}
                            max={50}
                            defaultValue={retrieveCount.toString()}
                            onChange={ev => onChange("retrieveCount", parseInt(ev.target.value || "3"))}
                            aria-labelledby={retrieveCountId}
                        />
                    </div>
                </>
            )}
            <div className={SETTINGS_FIELD}>
                <HelpCallout
                    labelId={includeCategoryId}
                    fieldId={includeCategoryFieldId}
                    helpText={t("helpTexts.includeCategory")}
                    label={t("labels.includeCategory")}
                />
                <select
                    id={includeCategoryFieldId}
                    className={SETTINGS_SELECT}
                    value={includeCategory}
                    onChange={ev => onChange("includeCategory", ev.target.value || "")}
                    aria-labelledby={includeCategoryId}
                >
                    <option value="">{t("labels.includeCategoryOptions.all")}</option>
                </select>
            </div>
            <div className={SETTINGS_FIELD}>
                <HelpCallout
                    labelId={excludeCategoryId}
                    fieldId={excludeCategoryFieldId}
                    helpText={t("helpTexts.excludeCategory")}
                    label={t("labels.excludeCategory")}
                />
                <input
                    className={SETTINGS_INPUT}
                    id={excludeCategoryFieldId}
                    defaultValue={excludeCategory}
                    onChange={ev => onChange("excludeCategory", ev.target.value || "")}
                    aria-labelledby={excludeCategoryId}
                />
            </div>
            {showSemanticRankerOption && !useAgenticKnowledgeBase && (
                <>
                    <div className={SETTINGS_CHECKBOX}>
                        <input
                            type="checkbox"
                            className={SETTINGS_CHECKBOX_INPUT}
                            id={semanticRankerFieldId}
                            checked={useSemanticRanker}
                            onChange={ev => onChange("useSemanticRanker", ev.target.checked)}
                            aria-labelledby={semanticRankerId}
                        />
                        <HelpCallout
                            labelId={semanticRankerId}
                            fieldId={semanticRankerFieldId}
                            helpText={t("helpTexts.useSemanticReranker")}
                            label={t("labels.useSemanticRanker")}
                        />
                    </div>

                    <div className={SETTINGS_CHECKBOX}>
                        <input
                            type="checkbox"
                            className={SETTINGS_CHECKBOX_INPUT}
                            id={semanticCaptionsFieldId}
                            checked={useSemanticCaptions}
                            onChange={ev => onChange("useSemanticCaptions", ev.target.checked)}
                            disabled={!useSemanticRanker}
                            aria-labelledby={semanticCaptionsId}
                        />
                        <HelpCallout
                            labelId={semanticCaptionsId}
                            fieldId={semanticCaptionsFieldId}
                            helpText={t("helpTexts.useSemanticCaptions")}
                            label={t("labels.useSemanticCaptions")}
                        />
                    </div>
                </>
            )}
            {showQueryRewritingOption && !useAgenticKnowledgeBase && (
                <>
                    <div className={SETTINGS_CHECKBOX}>
                        <input
                            type="checkbox"
                            className={SETTINGS_CHECKBOX_INPUT}
                            id={queryRewritingFieldId}
                            checked={useQueryRewriting}
                            disabled={!useSemanticRanker}
                            onChange={ev => onChange("useQueryRewriting", ev.target.checked)}
                            aria-labelledby={queryRewritingId}
                        />
                        <HelpCallout
                            labelId={queryRewritingId}
                            fieldId={queryRewritingFieldId}
                            helpText={t("helpTexts.useQueryRewriting")}
                            label={t("labels.useQueryRewriting")}
                        />
                    </div>
                </>
            )}
            {showVectorOption && !useAgenticKnowledgeBase && (
                <>
                    <VectorSettings
                        defaultRetrievalMode={retrievalMode}
                        defaultSearchTextEmbeddings={searchTextEmbeddings}
                        defaultSearchImageEmbeddings={searchImageEmbeddings}
                        showImageOptions={showMultimodalOptions}
                        updateRetrievalMode={val => onChange("retrievalMode", val)}
                        updateSearchTextEmbeddings={val => onChange("searchTextEmbeddings", val)}
                        updateSearchImageEmbeddings={val => onChange("searchImageEmbeddings", val)}
                    />
                </>
            )}

            {!useWebSource && (
                <>
                    <h3 className={SETTINGS_SECTION_HEADER}>{t("llmSettings")}</h3>
                    <div className={SETTINGS_FIELD}>
                        <HelpCallout
                            labelId={promptTemplateId}
                            fieldId={promptTemplateFieldId}
                            helpText={t("helpTexts.promptTemplate")}
                            label={t("labels.promptTemplate")}
                        />
                        <textarea
                            className={SETTINGS_TEXTAREA}
                            id={promptTemplateFieldId}
                            defaultValue={promptTemplate}
                            onChange={ev => onChange("promptTemplate", ev.target.value || "")}
                            aria-labelledby={promptTemplateId}
                        />
                    </div>
                    {!showReasoningEffortOption && (
                        <div className={SETTINGS_FIELD}>
                            <HelpCallout
                                labelId={temperatureId}
                                fieldId={temperatureFieldId}
                                helpText={t("helpTexts.temperature")}
                                label={t("labels.temperature")}
                            />
                            <input
                                className={SETTINGS_INPUT}
                                id={temperatureFieldId}
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                defaultValue={temperature.toString()}
                                onChange={ev => onChange("temperature", parseFloat(ev.target.value || "0"))}
                                aria-labelledby={temperatureId}
                            />
                        </div>
                    )}
                    {showReasoningEffortOption && reasoningEffortOptions.length > 0 && (
                        <div className={SETTINGS_FIELD}>
                            <HelpCallout
                                labelId={reasoningEffortId}
                                fieldId={reasoningEffortFieldId}
                                helpText={t("helpTexts.reasoningEffort")}
                                label={t("labels.reasoningEffort")}
                            />
                            <select
                                id={reasoningEffortFieldId}
                                className={SETTINGS_SELECT}
                                value={reasoningEffort}
                                onChange={ev => onChange("reasoningEffort", ev.target.value || "")}
                                aria-labelledby={reasoningEffortId}
                            >
                                {reasoningEffortOptions.map(option => (
                                    <option key={option} value={option}>
                                        {t(`labels.reasoningEffortOptions.${option}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {showMultimodalOptions && !useAgenticKnowledgeBase && (
                        <fieldset className={`${SETTINGS_FIELDSET} ${SETTINGS_FIELD}`}>
                            <legend className={SETTINGS_LEGEND}>{t("labels.llmInputs")}</legend>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <div className={SETTINGS_CHECKBOX} style={{ marginTop: 0 }}>
                                    <input
                                        type="checkbox"
                                        className={SETTINGS_CHECKBOX_INPUT}
                                        id="sendTextSources"
                                        checked={sendTextSources}
                                        onChange={ev => {
                                            onChange("sendTextSources", ev.target.checked);
                                        }}
                                    />
                                    <HelpCallout
                                        labelId="sendTextSourcesLabel"
                                        fieldId="sendTextSources"
                                        helpText={t("helpTexts.llmTextInputs")}
                                        label={t("labels.llmInputsOptions.texts")}
                                    />
                                </div>
                                <div className={SETTINGS_CHECKBOX} style={{ marginTop: 0 }}>
                                    <input
                                        type="checkbox"
                                        className={SETTINGS_CHECKBOX_INPUT}
                                        id="sendImageSources"
                                        checked={sendImageSources}
                                        onChange={ev => {
                                            onChange("sendImageSources", ev.target.checked);
                                        }}
                                    />
                                    <HelpCallout
                                        labelId="sendImageSourcesLabel"
                                        fieldId="sendImageSources"
                                        helpText={t("helpTexts.llmImageInputs")}
                                        label={t("labels.llmInputsOptions.images")}
                                    />
                                </div>
                            </div>
                        </fieldset>
                    )}
                </>
            )}
        </div>
    );
};
