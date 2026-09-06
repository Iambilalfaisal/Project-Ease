import { Save24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button, Spinner } from "@/components/ui";
import { fetchWithAuthRedirect } from "../../api";

interface MarkdownViewerProps {
    src: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ src }) => {
    const [content, setContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const { t } = useTranslation();

    /**
     * Anchor links result in HTTP 404 errors as the URL they point to does not exist.
     * This function removes them from the markdown.
     */
    const removeAnchorLinks = (markdown: string) => {
        const ancorLinksRegex = /\[.*?\]\(#.*?\)/g;
        return markdown.replace(ancorLinksRegex, "");
    };

    useEffect(() => {
        const fetchMarkdown = async () => {
            try {
                const response = await fetchWithAuthRedirect(src);

                if (!response.ok) {
                    throw new Error("Failed loading markdown file.");
                }

                let markdownText = await response.text();
                markdownText = removeAnchorLinks(markdownText);
                setContent(markdownText);
            } catch (error: any) {
                setError(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarkdown();
    }, [src]);

    return (
        <div>
            {isLoading ? (
                <div className="rounded-[0.5em] bg-bg-1 p-25 shadow-[#0000000d_0_0_0_0.0625em,#0000001a_0_0.125em_0.1875em]">
                    <Spinner size="lg" label="Loading file" />
                </div>
            ) : error ? (
                <div className="rounded-[0.5em] bg-bg-1 shadow-[#0000000d_0_0_0_0.0625em,#0000001a_0_0.125em_0.1875em]">
                    <div className="flex items-center gap-3 rounded-sm border border-danger/25 bg-danger/12 px-4 py-3 text-sm text-danger">
                        <span>{error.message}</span>
                        <a href={src} download className="font-weight-semibold text-danger underline">
                            Download the file
                        </a>
                    </div>
                </div>
            ) : (
                <div className="rounded-[0.5em] bg-bg-1 shadow-[#0000000d_0_0_0_0.0625em,#0000001a_0_0.125em_0.1875em]">
                    <a href={src} download className="relative float-right">
                        <Button variant="ghost" size="sm" className="border-none text-ink-2 hover:text-gold" title={t("tooltips.save")} aria-label={t("tooltips.save")}>
                            <Save24Regular />
                        </Button>
                    </a>
                    <ReactMarkdown
                        children={content}
                        remarkPlugins={[remarkGfm]}
                        className="p-[1.875em] [&_code]:block [&_code]:bg-[#f6f8fa] [&_code]:p-[0.625em] [&_code]:font-mono [&_table]:border-collapse [&_td]:border [&_td]:border-[#ddd] [&_td]:p-[0.5em] [&_th]:border [&_th]:border-[#ddd] [&_th]:p-[0.5em] [&_tr:nth-child(even)]:bg-[#f6f8fa]"
                    />
                </div>
            )}
        </div>
    );
};
