import { prisma } from "@/prisma/db";
import { DatabaseError } from "@/errors/db.error";
import type { AppError } from "@/errors/base.error";
import type { StationMembership } from "@/generated/prisma/client";

/**
 * Return the active membership for a user in a station, or null.
 * Inactive memberships are treated as no membership.
 */
export const getActiveMembershipService = async (
    userId: string,
    stationId: string,
): Promise<StationMembership | null | AppError> => {
    try {
        const membership = await prisma.stationMembership.findUnique({
            where: { userId_stationId: { userId, stationId } },
        });

        return membership?.active ? membership : null;
    } catch (error) {
        console.error("stationMembership.services > getActiveMembershipService", error);
        return new DatabaseError("Failed to load membership");
    }
};