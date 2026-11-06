import { prisma } from "@/prisma/db";
import { DatabaseError } from "@/errors/db.error";
import { AppError } from "@/errors/base.error";
import { lookupNotificationDefinition } from "@/notification/registry";
import type { AuthenticatedUser } from "@/access/types";

export interface NotificationView {
    id: string;
    type: string;
    titleKey: string;
    bodyKey: string;
    destination: string;
    payload: Record<string, unknown>;
    readAt: Date | null;
    createdAt: Date;
}

export const listNotificationsService = async (
    user: AuthenticatedUser,
    options?: { onlyUnread?: boolean; limit?: number; offset?: number },
): Promise<NotificationView[] | AppError> => {
    try {
        const rows = await prisma.notification.findMany({
            where: {
                recipientId: user.id,
                ...(options?.onlyUnread ? { readAt: null } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: options?.limit ?? 50,
            skip: options?.offset ?? 0,
        });

        const views: NotificationView[] = [];
        for (const n of rows) {
            const def = lookupNotificationDefinition(n.type);
            if (!def) continue; // unknown types are silently skipped

            const destination =
                def.getDestination?.(
                    n.payload as never,
                    user.publicId,
                ) ?? "/dashboard";

            views.push({
                id: n.id,
                type: n.type,
                titleKey: def.presentation.titleKey,
                bodyKey: def.presentation.bodyKey,
                destination,
                payload: n.payload as Record<string, unknown>,
                readAt: n.readAt,
                createdAt: n.createdAt,
            });
        }
        return views;
    } catch (error) {
        console.error("notification.services > listNotificationsService", error);
        return new DatabaseError("Failed to list notifications");
    }
};

export const getUnreadNotificationCountService = async (
    user: AuthenticatedUser,
): Promise<number | AppError> => {
    try {
        return await prisma.notification.count({
            where: { recipientId: user.id, readAt: null },
        });
    } catch (error) {
        console.error(
            "notification.services > getUnreadNotificationCountService",
            error,
        );
        return new DatabaseError("Failed to count unread notifications");
    }
};

export const markNotificationReadService = async (
    user: AuthenticatedUser,
    notificationId: string,
): Promise<void | AppError> => {
    try {
        await prisma.notification.updateMany({
            where: { id: notificationId, recipientId: user.id },
            data: { readAt: new Date() },
        });
    } catch (error) {
        console.error("notification.services > markNotificationReadService", error);
        return new DatabaseError("Failed to mark notification read");
    }
};

export const markAllNotificationsReadService = async (
    user: AuthenticatedUser,
): Promise<void | AppError> => {
    try {
        await prisma.notification.updateMany({
            where: { recipientId: user.id, readAt: null },
            data: { readAt: new Date() },
        });
    } catch (error) {
        console.error(
            "notification.services > markAllNotificationsReadService",
            error,
        );
        return new DatabaseError("Failed to mark all notifications read");
    }
};