import { requireSelf } from "@/access/guards";
import { AppError } from "@/errors/base.error";
import { listNotificationsService } from "@/services/notification.services";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function NotificationsPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    const user = await requireSelf(userId);

    const result = await listNotificationsService(user);
    const notifications = result instanceof AppError ? [] : result;

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    الإشعارات
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    آخر الأنشطة والتنبيهات.
                </p>
            </div>

            <NotificationList initialNotifications={notifications} />
        </div>
    );
}