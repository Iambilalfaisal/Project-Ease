interface Props {
    message: string;
}

export const UserChatMessage = ({ message }: Props) => {
    return (
        <div className="ml-auto mb-5 flex max-w-[80%] justify-end">
            <div className="rounded-lg border border-gold-border bg-gold-dim p-5 text-ink-1 shadow-sm">{message}</div>
        </div>
    );
};
