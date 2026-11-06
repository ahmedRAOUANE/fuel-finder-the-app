interface Props {
    title: string;
    userId: string;
    userName: string;
}

export function TopBar({ title, userId, userName }: Props) {
    return (
        <header className="flex items-center justify-between bg-surface border-b border-outline-variant h-16 px-margin-mobile md:px-margin-desktop">
            <h2 className="text-section-title font-semibold text-on-surface truncate">
                {title}
            </h2>
            <div className="flex items-center gap-3">
                <a
                    href={`/user/${userId}/notifications`}
                    className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    aria-label="Notifications"
                >
                    <span className="material-symbols-outlined">notifications</span>
                </a>
                <a
                    href={`/user/${userId}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors"
                >
                    <span className="material-symbols-outlined text-primary">
                        account_circle
                    </span>
                    <span className="text-metadata hidden md:block text-on-surface">
                        {userName}
                    </span>
                </a>
            </div>
        </header>
    );
}