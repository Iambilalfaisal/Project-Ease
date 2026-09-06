import { useEffect, useId, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

import { HelpCallout } from "../../components/HelpCallout";
import { RetrievalMode } from "../../api";
import { SETTINGS_CHECKBOX_INPUT, SETTINGS_FIELD, SETTINGS_FIELDSET, SETTINGS_LEGEND, SETTINGS_SELECT } from "../Settings/settingsStyles";

interface Props {
    showImageOptions?: boolean;
    defaultRetrievalMode: RetrievalMode;
    defaultSearchTextEmbeddings?: boolean;
    defaultSearchImageEmbeddings?: boolean;
    updateRetrievalMode: (retrievalMode: RetrievalMode) => void;
    updateSearchTextEmbeddings: (searchTextEmbeddings: boolean) => void;
    updateSearchImageEmbeddings: (searchImageEmbeddings: boolean) => void;
}

export const VectorSettings = ({
    updateRetrievalMode,
    updateSearchTextEmbeddings,
    updateSearchImageEmbeddings,
    showImageOptions,
    defaultRetrievalMode,
    defaultSearchTextEmbeddings = true,
    defaultSearchImageEmbeddings = true
}: Props) => {
    const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>(defaultRetrievalMode || RetrievalMode.Hybrid);
    const [searchTextEmbeddings, setSearchTextEmbeddings] = useState<boolean>(defaultSearchTextEmbeddings);
    const [searchImageEmbeddings, setSearchImageEmbeddings] = useState<boolean>(defaultSearchImageEmbeddings);

    const onRetrievalModeChange = (ev: ChangeEvent<HTMLSelectElement>) => {
        const mode = (ev.target.value as RetrievalMode) || RetrievalMode.Hybrid;
        setRetrievalMode(mode);
        updateRetrievalMode(mode);
    };

    const onSearchTextEmbeddingsChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setSearchTextEmbeddings(ev.target.checked);
        updateSearchTextEmbeddings(ev.target.checked);
    };

    const onSearchImageEmbeddingsChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setSearchImageEmbeddings(ev.target.checked);
        updateSearchImageEmbeddings(ev.target.checked);
    };

    // Only run if showImageOptions changes from true to false or false to true
    useEffect(() => {
        if (!showImageOptions) {
            // If images are disabled, we must disable image embeddings
            setSearchImageEmbeddings(false);
            updateSearchImageEmbeddings(false);
        } else {
            // When image options become available, reset to default
            setSearchImageEmbeddings(defaultSearchImageEmbeddings);
            updateSearchImageEmbeddings(defaultSearchImageEmbeddings);
        }
    }, [showImageOptions, updateSearchImageEmbeddings, defaultSearchImageEmbeddings]);

    const retrievalModeId = useId();
    const retrievalModeFieldId = useId();
    const vectorFieldsId = useId();
    const vectorFieldsFieldId = useId();
    const { t } = useTranslation();

    return (
        <div className="mt-2.5" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className={SETTINGS_FIELD}>
                <HelpCallout
                    labelId={retrievalModeId}
                    fieldId={retrievalModeFieldId}
                    helpText={t("helpTexts.retrievalMode")}
                    label={t("labels.retrievalMode.label")}
                />
                <select id={retrievalModeFieldId} className={SETTINGS_SELECT} value={retrievalMode} onChange={onRetrievalModeChange} aria-labelledby={retrievalModeId}>
                    <option value="hybrid">{t("labels.retrievalMode.options.hybrid")}</option>
                    <option value="vectors">{t("labels.retrievalMode.options.vectors")}</option>
                    <option value="text">{t("labels.retrievalMode.options.texts")}</option>
                </select>
            </div>

            {showImageOptions && [RetrievalMode.Vectors, RetrievalMode.Hybrid].includes(retrievalMode) && (
                <fieldset className={SETTINGS_FIELDSET}>
                    <legend className={SETTINGS_LEGEND}>{t("labels.vector.label")}</legend>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <input
                                type="checkbox"
                                className={SETTINGS_CHECKBOX_INPUT}
                                id={vectorFieldsFieldId + "-text"}
                                checked={searchTextEmbeddings}
                                onChange={onSearchTextEmbeddingsChange}
                                aria-labelledby={vectorFieldsId + "-text"}
                            />
                            <HelpCallout
                                labelId={vectorFieldsId + "-text"}
                                fieldId={vectorFieldsFieldId + "-text"}
                                helpText={t("helpTexts.textEmbeddings")}
                                label={t("labels.vector.options.embedding")}
                            />
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <input
                                type="checkbox"
                                className={SETTINGS_CHECKBOX_INPUT}
                                id={vectorFieldsFieldId + "-image"}
                                checked={searchImageEmbeddings}
                                onChange={onSearchImageEmbeddingsChange}
                                aria-labelledby={vectorFieldsId + "-image"}
                            />
                            <HelpCallout
                                labelId={vectorFieldsId + "-image"}
                                fieldId={vectorFieldsFieldId + "-image"}
                                helpText={t("helpTexts.imageEmbeddings")}
                                label={t("labels.vector.options.imageEmbedding")}
                            />
                        </div>
                    </div>
                </fieldset>
            )}
        </div>
    );
};
