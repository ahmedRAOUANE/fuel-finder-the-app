import type { Prisma } from "@/generated/prisma/client";
import {
    requireAffectedUserId,
    type NotificationPublishContext,
} from "./definition";

/**
 * Active OWNER members of a station.
 *
 * Used by suspension / reactivation — the flow that notifies whoever
 * currently owns the station.
 */
export const getStationOwners = async (
    tx: Prisma.TransactionClient,
    stationId: string,
): Promise<readonly string[]> => {
    const memberships = await tx.stationMembership.findMany({
        where: { stationId, active: true, role: "OWNER" },
        select: { userId: true },
    });

    return [...new Set(memberships.map((m) => m.userId))];
};

/**
 * Active OWNER and MANAGER members of a station.
 *
 * Reserved for operational events that need decision-makers (used in
 * Phase 4 for invitation outcomes if needed, and Phase 6 for reports
 * if the recipient list grows).
 */
export const getStationOwnersAndManagers = async (
    tx: Prisma.TransactionClient,
    stationId: string,
): Promise<readonly string[]> => {
    const memberships = await tx.stationMembership.findMany({
        where: {
            stationId,
            active: true,
            role: { in: ["OWNER", "MANAGER"] },
        },
        select: { userId: true },
    });

    return [...new Set(memberships.map((m) => m.userId))];
};

/**
 * Resolver for events whose only recipient is the user the event
 * concerns (requester of a rejected station, promoted admin, ...).
 */
export const resolveAffectedUser = async (
    _tx: Prisma.TransactionClient,
    ctx: NotificationPublishContext,
): Promise<readonly string[]> => [requireAffectedUserId(ctx)];

/**
 * Every user with `globalRole = ADMIN`. Used by platform-level events
 * (reports) that are addressed to the admin team rather than a station.
 */
export const getPlatformAdmins = async (
    tx: Prisma.TransactionClient,
): Promise<readonly string[]> => {
    const admins = await tx.user.findMany({
        where: { globalRole: "ADMIN" },
        select: { id: true },
    });
    return admins.map((a) => a.id);
};