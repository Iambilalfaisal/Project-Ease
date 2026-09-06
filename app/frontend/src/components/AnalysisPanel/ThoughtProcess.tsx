import React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import { a11yLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

import { T_CODE_BLOCK, T_LIST, T_LIST_ITEM, T_PROP, T_PROP_ROW, T_STEP } from "./analysisPanelStyles";

import { Thoughts } from "../../api";
import { AgentPlan } from "./AgentPlan";
import { TokenUsageGraph } from "./TokenUsageGraph";

SyntaxHighlighter.registerLanguage("json", json);

interface Props {
    thoughts: Thoughts[];
    onCitationClicked?: (citationFilePath: string) => void;
}

// Helper to truncate URLs
function truncateImageUrl(val: string) {
    if (typeof val === "string" && val.startsWith("data:image/")) {
        return val.slice(0, 30) + "...";
    }
    return val;
}

export const ThoughtProcess = ({ thoughts, onCitationClicked }: Props) => {
    const [effort, setEffort] = React.useState<string | undefined>();

    return (
        <ul className={T_LIST}>
            {thoughts.map((t, ind) => {
                const hasAgenticPlan = Array.isArray(t.props?.query_plan) && t.props.query_plan.length > 0;
                return (
                    <li className={T_LIST_ITEM} key={ind}>
                        <div className={T_STEP}>{t.title}</div>
                        <div style={{ display: "flex", gap: "5px" }} className={T_PROP_ROW}>
                            {t.props &&
                                (Object.keys(t.props).filter(k => k !== "token_usage" && k !== "query_plan") || []).map((k: any) => (
                                    <span className={T_PROP} key={k}>
                                        {k}: {truncateImageUrl(JSON.stringify(t.props?.[k]))}
                                    </span>
                                ))}
                            {hasAgenticPlan && effort && <span className={T_PROP}>effort: {effort}</span>}
                        </div>
                        {t.props?.token_usage && !hasAgenticPlan && (
                            <TokenUsageGraph tokenUsage={t.props.token_usage} reasoningEffort={t.props.reasoning_effort} />
                        )}
                        {hasAgenticPlan && (
                            <AgentPlan
                                queryPlan={t.props?.query_plan ?? []}
                                onEffortExtracted={setEffort}
                                onCitationClicked={onCitationClicked}
                                results={Array.isArray(t.description) ? t.description : []}
                            />
                        )}
                        {Array.isArray(t.description) || (t.description !== null && typeof t.description === "object") ? (
                            <SyntaxHighlighter language="json" wrapLines wrapLongLines className={T_CODE_BLOCK} style={a11yLight}>
                                {JSON.stringify(t.description, (key, value) => truncateImageUrl(value), 2)}
                            </SyntaxHighlighter>
                        ) : (
                            <div>{t.description}</div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
