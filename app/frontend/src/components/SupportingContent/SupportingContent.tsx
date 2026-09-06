import { DataPoints } from "../../api";
import { parseSupportingContentItem } from "./SupportingContentParser";

const ITEM =
    "flex flex-col break-words rounded-base border border-border bg-bg-2 p-5 shadow-sm";
const ITEM_HEADER = "m-0 text-ink-1";
const ITEM_TEXT = "mb-0 font-normal text-ink-2";
const ITEM_IMAGE = "mx-auto block max-w-full object-contain";

interface Props {
    supportingContent?: DataPoints;
}

export const SupportingContent = ({ supportingContent }: Props) => {
    const textItems = supportingContent?.text ?? [];
    const imageItems = supportingContent?.images ?? [];
    const webItems = supportingContent?.external_results_metadata ?? [];
    return (
        <ul className="flex list-none flex-col gap-2.5 pl-1">
            {textItems.map((c, ind) => {
                const parsed = parseSupportingContentItem(c);
                return (
                    <li className={ITEM} key={`supporting-content-text-${ind}`}>
                        <h4 className={ITEM_HEADER}>{parsed.title}</h4>
                        <p className={ITEM_TEXT} dangerouslySetInnerHTML={{ __html: parsed.content }} />
                    </li>
                );
            })}
            {imageItems?.map((img, ind) => {
                return (
                    <li className={ITEM} key={`supporting-content-image-${ind}`}>
                        <img className={ITEM_IMAGE} src={img} alt="Supporting content" />
                    </li>
                );
            })}
            {webItems.map((item, ind) => (
                <li className={ITEM} key={`supporting-content-web-${item.id ?? ind}`}>
                    {item.url ? (
                        <h4 className={ITEM_HEADER}>
                            <a href={item.url} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                                {item.title ?? item.url}
                            </a>
                        </h4>
                    ) : (
                        <h4 className={ITEM_HEADER}>{item.title ?? "Web result"}</h4>
                    )}
                </li>
            ))}
        </ul>
    );
};
