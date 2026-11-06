import type { NavItem } from "./nav-items";

interface Props {
    title: string;
    items: NavItem[];
}

export function AppSidebar({ title, items }: Props) {
    return (
        <aside className="hidden md:flex flex-col bg-surface-container border-e border-outline-variant p-stack-md h-full">
            <h1 className="text-section-title font-bold text-primary mb-8">
                {title}
            </h1>
            <nav className="flex-1 space-y-1">
                {items.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {item.icon}
                        </span>
                        <span className="text-metadata">{item.label}</span>
                    </a>
                ))}
            </nav>
            <a
                href="/api/auth/logout"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors border-t border-outline-variant pt-4 mt-4"
            >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span className="text-metadata">تسجيل الخروج</span>
            </a>
        </aside>
    );
}