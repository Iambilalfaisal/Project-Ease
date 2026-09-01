interface EmptyStateProps {
    message: string;
}

export const EmptyState = ({ message }: EmptyStateProps) => (
    <div className="rounded-base border border-border bg-bg-1 px-4 py-8 text-center text-sm text-ink-3">
        {message}
    </div>
);
