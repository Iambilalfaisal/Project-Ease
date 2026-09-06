import { animated, useSpring } from "@react-spring/web";
import { useTranslation } from "react-i18next";

import { AnswerIcon } from "./AnswerIcon";
import { ANSWER_CONTAINER, ANSWER_TEXT, LOADING_DOTS } from "./answerStyles";

export const AnswerLoading = () => {
    const { t } = useTranslation();
    const animatedStyles = useSpring({
        from: { opacity: 0 },
        to: { opacity: 1 }
    });

    return (
        <animated.div style={{ ...animatedStyles }}>
            <div className={ANSWER_CONTAINER} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <AnswerIcon />
                <div style={{ flexGrow: 1 }}>
                    <p className={ANSWER_TEXT}>
                        {t("generatingAnswer")}
                        <span className={LOADING_DOTS} />
                    </p>
                </div>
            </div>
        </animated.div>
    );
};
