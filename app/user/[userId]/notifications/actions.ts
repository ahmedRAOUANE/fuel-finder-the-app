"use server";

import { withAuth } from "@/access/wrappers";
import {
    markAllNotificationsReadService,
    markNotificationReadService,
} from "@/services/notification.services";
import {
    catchToResult,
    ok,
    serviceResult,
    type ActionResult,
} from "@/actions/result";

interface MarkResult {
    ok: boolean;
}

const markOneHandler = withAuth(
    async (user, notificationId: string): Promise<ActionResult<MarkResult>> => {
        const result = await markNotificationReadService(user, notificationId);
        return serviceResult(result, () => ok({ ok: true }));
    },
);

export const markNotificationReadAction = async (
    notificationId: string,
): Promise<ActionResult<MarkResult>> => {
    try {
        return await markOneHandler(notificationId);
    } catch (error) {
        return catchToResult(error);
    }
};

const markAllHandler = withAuth(
    async (user): Promise<ActionResult<MarkResult>> => {
        const result = await markAllNotificationsReadService(user);
        return serviceResult(result, () => ok({ ok: true }));
    },
);

export const markAllNotificationsReadAction = async (): Promise<
    ActionResult<MarkResult>
> => {
    try {
        return await markAllHandler();
    } catch (error) {
        return catchToResult(error);
    }
};