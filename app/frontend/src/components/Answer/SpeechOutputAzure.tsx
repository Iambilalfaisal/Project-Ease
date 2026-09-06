import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowSync24Regular, Speaker224Regular } from "@fluentui/react-icons";
import { Button } from "@/components/ui";
import { getSpeechApi, SpeechConfig } from "../../api";

interface Props {
    answer: string;
    speechConfig: SpeechConfig;
    index: number;
    isStreaming: boolean;
}

export const SpeechOutputAzure = ({ answer, speechConfig, index, isStreaming }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [localPlayingState, setLocalPlayingState] = useState(false);
    const { t } = useTranslation();

    const playAudio = async (url: string) => {
        speechConfig.audio.src = url;
        await speechConfig.audio
            .play()
            .then(() => {
                speechConfig.audio.onended = () => {
                    speechConfig.setIsPlaying(false);
                    setLocalPlayingState(false);
                };
                speechConfig.setIsPlaying(true);
                setLocalPlayingState(true);
            })
            .catch(() => {
                alert("Failed to play speech output.");
                console.error("Failed to play speech output.");
                speechConfig.setIsPlaying(false);
                setLocalPlayingState(false);
            });
    };

    const startOrStopSpeech = async (answer: string) => {
        if (speechConfig.isPlaying) {
            speechConfig.audio.pause();
            speechConfig.audio.currentTime = 0;
            speechConfig.setIsPlaying(false);
            setLocalPlayingState(false);
            return;
        }
        if (speechConfig.speechUrls[index]) {
            playAudio(speechConfig.speechUrls[index]);
            return;
        }
        setIsLoading(true);
        await getSpeechApi(answer).then(async speechUrl => {
            if (!speechUrl) {
                alert("Speech output is not available.");
                console.error("Speech output is not available.");
                return;
            }
            setIsLoading(false);
            speechConfig.setSpeechUrls(speechConfig.speechUrls.map((url, i) => (i === index ? speechUrl : url)));
            playAudio(speechUrl);
        });
    };

    const color = localPlayingState ? "var(--danger)" : "var(--text-2)";

    // We always preload the Sync icon in hidden mode so that there's no visual glitch when icon changes
    return isLoading ? (
        <Button variant="ghost" size="sm" className="border-none" style={{ color }} title="Loading speech" aria-label="Loading speech" disabled={true}>
            <ArrowSync24Regular />
        </Button>
    ) : (
        <>
            <Button variant="ghost" size="sm" className="hidden border-none" aria-hidden={true} disabled={true}>
                <ArrowSync24Regular />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="border-none"
                style={{ color }}
                title={t("tooltips.speakAnswer")}
                aria-label={t("tooltips.speakAnswer")}
                onClick={() => startOrStopSpeech(answer)}
                disabled={isStreaming}
            >
                <Speaker224Regular />
            </Button>
        </>
    );
};
