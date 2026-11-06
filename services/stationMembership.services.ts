import { prisma } from "@/prisma/db";
import { DatabaseError } from "@/errors/db.error";
import type { AppError } from "@/errors/base.error";
import type { StationMembership } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/access/types";
import {
    AlreadyManagerError,
    CannotPromoteOwnerError,
    CannotRemoveOwnerError,
    MemberNotFoundError,
} from "@/errors/invitation.error";
import { AuthorizationError } from "@/errors/auth.error";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const getActiveMembershipFor = async (
    tx: Tx,
    userId: string,
    stationId: string,
): Promise<StationMembership | null> => {
    const membership = await tx.stationMembership.findUnique({
        where: { userId_stationId: { userId, stationId } },
    });
    return membership?.active ? membership : null;
};

export interface StationMemberDetail {
    userId: string;
    publicId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: StationMembership["role"];
    joinedAt: Date;
}

export const listStationMembersService = async (
    stationId: string,
): Promise<StationMemberDetail[] | AppError> => {
    try {
        const rows = await prisma.stationMembership.findMany({
            where: { stationId, active: true },
            include: { user: true },
            orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        });

        return rows.map((m) => ({
            userId: m.userId,
            publicId: m.user.publicId,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            email: m.user.email,
            role: m.role,
            joinedAt: m.createdAt,
        }));
    } catch (error) {
        console.error("stationMembership.services > listStationMembersService", error);
        return new DatabaseError("Failed to list members");
    }
};

export const promoteMemberService = async (
    owner: AuthenticatedUser,
    stationId: string,
    memberPublicId: string,
): Promise<StationMemberDetail | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const ownerMembership = await getActiveMembershipFor(tx, owner.id, stationId);
            if (!ownerMembership || ownerMembership.role !== "OWNER") {
                return new AuthorizationError("Only the owner can promote members");
            }

            const user = await tx.user.findUnique({
                where: { publicId: memberPublicId },
            });
            if (!user) return new MemberNotFoundError();

            const membership = await getActiveMembershipFor(tx, user.id, stationId);
            if (!membership) return new MemberNotFoundError();

            if (membership.role === "OWNER") return new CannotPromoteOwnerError();
            if (membership.role === "MANAGER") return new AlreadyManagerError();

            const updated = await tx.stationMembership.update({
                where: { id: membership.id },
                data: { role: "MANAGER" },
            });

            return {
                userId: user.id,
                publicId: user.publicId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: updated.role,
                joinedAt: updated.createdAt,
            };
        });
    } catch (error) {
        console.error("stationMembership.services > promoteMemberService", error);
        return new DatabaseError("Failed to promote member");
    }
};

export const removeMemberService = async (
    owner: AuthenticatedUser,
    stationId: string,
    memberPublicId: string,
): Promise<{ removedPublicId: string } | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const ownerMembership = await getActiveMembershipFor(tx, owner.id, stationId);
            if (!ownerMembership || ownerMembership.role !== "OWNER") {
                return new AuthorizationError("Only the owner can remove members");
            }

            const user = await tx.user.findUnique({
                where: { publicId: memberPublicId },
            });
            if (!user) return new MemberNotFoundError();

            const membership = await getActiveMembershipFor(tx, user.id, stationId);
            if (!membership) return new MemberNotFoundError();

            if (membership.role === "OWNER") return new CannotRemoveOwnerError();

            await tx.stationMembership.update({
                where: { id: membership.id },
                data: { active: false },
            });

            return { removedPublicId: user.publicId };
        });
    } catch (error) {
        console.error("stationMembership.services > removeMemberService", error);
        return new DatabaseError("Failed to remove member");
    }
};

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