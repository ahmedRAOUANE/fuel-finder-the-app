/* eslint-disable @typescript-eslint/no-explicit-any */
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

export interface NotificationPresentation {
    readonly titleKey: string;
    readonly bodyKey: string;
}

export interface NotificationPublishContext {
    readonly stationId: string | null;
    readonly affectedUserId?: string;
    readonly actorId?: string;
}

/**
 * `z.ZodType<any, any>` (not `z.ZodType`) is required so that
 * `satisfies Record<string, NotificationDefinition>` accepts definitions
 * with specific payload schemas. `z.ZodType` defaults to
 * `ZodType<unknown, unknown>`, which makes `resolveRecipients`
 * contravariant and rejects the `satisfies` check.
 */
export interface NotificationDefinition<
    TType extends string = string,
    TPayloadSchema extends z.ZodType<any, any> = z.ZodType<any, any>,
> {
    readonly type: TType;
    readonly payloadSchema: TPayloadSchema;
    readonly presentation: NotificationPresentation;
    readonly resolveRecipients: (
        tx: Prisma.TransactionClient,
        ctx: NotificationPublishContext,
        payload: z.infer<TPayloadSchema>,
    ) => Promise<readonly string[]>;
    /**
     * Optional destination resolver. Called at render time on the stored
     * payload, so route changes propagate without rewriting rows.
     */
    readonly getDestination?: (payload: z.infer<TPayloadSchema>) => string;
}

export const defineNotification = <
    TType extends string,
    TPayloadSchema extends z.ZodType<any, any>,
>(
    def: NotificationDefinition<TType, TPayloadSchema>,
): NotificationDefinition<TType, TPayloadSchema> => def;

export const requireStationId = (
    ctx: NotificationPublishContext,
): string => {
    if (!ctx.stationId) {
        throw new Error("Notification event requires a station context");
    }
    return ctx.stationId;
};

export const requireAffectedUserId = (
    ctx: NotificationPublishContext,
): string => {
    if (!ctx.affectedUserId) {
        throw new Error("Notification event requires an affected user");
    }
    return ctx.affectedUserId;
};

export const derivePresentation = (
    type: string,
): NotificationPresentation => ({
    titleKey: `notifications.${type}.title`,
    bodyKey: `notifications.${type}.body`,
});