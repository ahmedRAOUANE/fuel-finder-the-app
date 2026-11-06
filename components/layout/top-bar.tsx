import { Bell, CircleUser } from "lucide-react";
import { getCurrentUser } from "@/access/context";
import { AppError } from "@/errors/base.error";
import { getUnreadNotificationCountService } from "@/services/notification.services";
import Link from "next/link";

interface Props {
    title: string;
    userId: string;
    userName: string;
}

export async function TopBar({ title, userId, userName }: Props) {
    const user = await getCurrentUser();
    let unreadCount = 0;

    if (!(user instanceof AppError)) {
        const count = await getUnreadNotificationCountService(user);
        if (typeof count === "number") unreadCount = count;
    }

    return (
        <header className="flex items-center justify-between bg-surface border-b border-outline-variant h-16 px-margin-mobile md:px-margin-desktop shrink-0">
            <h2 className="text-section-title font-semibold text-on-surface truncate">
                {title}
            </h2>
            <div className="flex items-center gap-3">
                <Link
                    href={`/user/${userId}/notifications`}
                    className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    aria-label={
                        unreadCount > 0
                            ? `${unreadCount} إشعارات غير مقروءة`
                            : "الإشعارات"
                    }
                >
                    <Bell className="size-5" aria-hidden />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -inset-e-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-error text-on-primary text-[10px] font-bold flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Link>
                <Link
                    href={`/user/${userId}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors"
                >
                    <CircleUser className="size-5 text-primary" aria-hidden />
                    <span className="text-metadata hidden md:block text-on-surface">
                        {userName}
                    </span>
                </Link>
            </div>
        </header>
    );
}