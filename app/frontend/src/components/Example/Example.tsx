interface Props {
    text: string;
    value: string;
    onClick: (value: string) => void;
}

export const Example = ({ text, value, onClick }: Props) => {
    return (
        <div
            className="flex flex-1 cursor-pointer flex-col break-words rounded-lg border border-border bg-bg-1 transition-[box-shadow,border-color,transform] duration-200 ease-standard hover:-translate-y-0.5 hover:border-gold-border hover:shadow-sm"
            onClick={() => onClick(value)}
        >
            <p className="m-0 px-4 py-3.5 text-[0.9375rem] leading-normal text-ink-2 md:px-6 md:py-5 md:text-base">{text}</p>
        </div>
    );
};
