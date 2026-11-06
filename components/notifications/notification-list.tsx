"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Mail, CheckCheck } from "lucide-react";
import {
    markAllNotificationsReadAction,
    markNotificationReadAction,
} from "@/app/user/[userId]/notifications/actions";
import type { NotificationView } from "@/services/notification.services";

interface Props {
    initialNotifications: NotificationView[];
}

// Translation keys are resolved on the server via next-intl. For MVP,
// map by type to a human-readable fallback. Future: pass through
// next-intl's useTranslations with the returned keys.
const fallbackLabel: Record<string, string> = {
    STATION_APPROVED: "تمت الموافقة على محطتك",
    STATION_REJECTED: "تم رفض طلب محطتك",
    STATION_SUSPENDED: "تم تعليق محطتك",
    STATION_REACTIVATED: "تمت إعادة تفعيل محطتك",
    INVITATION_RECEIVED: "دعوة جديدة",
    INVITATION_ACCEPTED: "قبول دعوة",
    INVITATION_REJECTED: "رفض دعوة",
    REPORT_RECEIVED: "بلاغ جديد",
    ADMIN_PROMOTED: "تمت ترقيتك إلى مشرف",
    ADMIN_DEMOTED: "تمت إزالة صلاحيات الإشراف",
};

export function NotificationList({ initialNotifications }: Props) {
    const router = useRouter();
    const [notifications, setNotifications] =
        useState<NotificationView[]>(initialNotifications);
    const [isPending, startTransition] = useTransition();
    const [busy, setBusy] = useState<string | null>(null);

    const unreadCount = notifications.filter((n) => n.readAt === null).length;

    const openNotification = (n: NotificationView) => {
        setBusy(n.id);
        startTransition(async () => {
            if (n.readAt === null) {
                await markNotificationReadAction(n.id);
            }
            setBusy(null);
            router.push(n.destination);
        });
    };

    const handleMarkAll = () => {
        startTransition(async () => {
            const result = await markAllNotificationsReadAction();
            if (result.ok) {
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.readAt ? n : { ...n, readAt: new Date() },
                    ),
                );
                router.refresh();
            }
        });
    };

    if (notifications.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg text-center">
                <Bell
                    className="size-10 mx-auto text-on-surface-variant mb-3"
                    aria-hidden
                />
                <p className="text-body-main text-on-surface-variant">
                    لا توجد إشعارات حالياً.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-stack-md">
            <div className="flex items-center justify-between gap-3">
                <p className="text-metadata text-on-surface-variant">
                    {unreadCount > 0
                        ? `${unreadCount} غير مقروء`
                        : "لا توجد إشعارات غير مقروءة"}
                </p>
                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={handleMarkAll}
                        disabled={isPending}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low disabled:opacity-50"
                    >
                        <CheckCheck className="size-4" aria-hidden />
                        تحديد الكل كمقروء
                    </button>
                )}
            </div>

            <ul className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant">
                {notifications.map((n) => {
                    const unread = n.readAt === null;
                    const label =
                        fallbackLabel[n.type] ?? n.titleKey.split(".").pop() ?? n.type;
                    return (
                        <li key={n.id}>
                            <button
                                type="button"
                                onClick={() => openNotification(n)}
                                disabled={busy === n.id}
                                className={`w-full p-4 flex items-start gap-3 text-start hover:bg-surface-container-low transition-colors disabled:opacity-60 ${unread ? "bg-primary-container/5" : ""
                                    }`}
                            >
                                <div
                                    className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${unread
                                            ? "bg-primary-container/20 text-primary"
                                            : "bg-surface-container-high text-on-surface-variant"
                                        }`}
                                >
                                    {unread ? (
                                        <Mail className="size-5" aria-hidden />
                                    ) : (
                                        <Check className="size-5" aria-hidden />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={`text-body-main ${unread
                                                ? "text-on-surface font-semibold"
                                                : "text-on-surface-variant"
                                            }`}
                                    >
                                        {label}
                                    </p>
                                    <p className="text-label-caps text-on-surface-variant mt-1">
                                        {n.createdAt.toLocaleString("ar-DZ")}
                                    </p>
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}