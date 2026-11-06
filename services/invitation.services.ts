import { prisma } from "@/prisma/db";
import { DatabaseError } from "@/errors/db.error";
import { AppError } from "@/errors/base.error";
import { AuthorizationError } from "@/errors/auth.error";
import { TargetUserNotFoundError } from "@/errors/admin.error";
import {
    AlreadyMemberError,
    CannotInviteSelfError,
    DuplicateInvitationError,
    InvitationExpiredError,
    InvitationNotFoundError,
    InvitationNotForYouError,
    InvitationNotPendingError,
} from "@/errors/invitation.error";
import { publishNotificationInTransaction } from "@/notification/publish";
import {
    invitationAccepted,
    invitationReceived,
    invitationRejected,
} from "@/notification/definitions/invitation";
import { getActiveMembershipFor } from "@/services/stationMembership.services";
import { composeUserName } from "@/utils/names";
import type { AuthenticatedUser } from "@/access/types";
import type {
    StationInvitation,
} from "@/generated/prisma/client";

const INVITATION_TTL_DAYS = 7;

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const loadStationForInvite = async (tx: Tx, stationPublicId: string) => {
    const station = await tx.station.findUnique({
        where: { publicId: stationPublicId },
    });
    if (!station) return null;
    return station;
};

/* ========================================================================== */
/*  Create                                                                    */
/* ========================================================================== */

export const createInvitationService = async (
    owner: AuthenticatedUser,
    stationPublicId: string,
    inviteePublicId: string,
): Promise<StationInvitation | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await loadStationForInvite(tx, stationPublicId);
            if (!station) return new InvitationNotFoundError("Station not found");

            const ownerMembership = await getActiveMembershipFor(tx, owner.id, station.id);
            if (!ownerMembership || ownerMembership.role !== "OWNER") {
                return new AuthorizationError("Only the owner can invite members");
            }

            if (inviteePublicId === owner.publicId) return new CannotInviteSelfError();

            const invitee = await tx.user.findUnique({
                where: { publicId: inviteePublicId },
            });
            if (!invitee) return new TargetUserNotFoundError();

            const existingMembership = await getActiveMembershipFor(
                tx,
                invitee.id,
                station.id,
            );
            if (existingMembership) return new AlreadyMemberError();

            const pending = await tx.stationInvitation.findFirst({
                where: {
                    stationId: station.id,
                    inviteePublicId,
                    status: "PENDING",
                    expiresAt: { gt: new Date() },
                },
            });
            if (pending) return new DuplicateInvitationError();

            const expiresAt = new Date(
                Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
            );

            const invitation = await tx.stationInvitation.create({
                data: {
                    stationId: station.id,
                    inviterId: owner.id,
                    inviteePublicId,
                    status: "PENDING",
                    expiresAt,
                },
            });

            await publishNotificationInTransaction(
                tx,
                invitationReceived,
                {
                    stationPublicId: station.publicId,
                    stationName: station.name,
                    inviterName: composeUserName(owner),
                    invitationId: invitation.id,
                    inviteePublicId,
                },
                {
                    stationId: station.id,
                    affectedUserId: invitee.id,
                    actorId: owner.id,
                },
            );

            return invitation;
        });
    } catch (error) {
        console.error("invitation.services > createInvitationService", error);
        return new DatabaseError("Failed to create invitation");
    }
};

/* ========================================================================== */
/*  List                                                                      */
/* ========================================================================== */

export interface StationInvitationView {
    id: string;
    inviteePublicId: string;
    inviteeName: string | null;
    inviterName: string;
    createdAt: Date;
    expiresAt: Date;
}

export const listInvitationsForStationService = async (
    owner: AuthenticatedUser,
    stationPublicId: string,
): Promise<StationInvitationView[] | AppError> => {
    try {
        const station = await prisma.station.findUnique({
            where: { publicId: stationPublicId },
        });
        if (!station) return new InvitationNotFoundError("Station not found");

        const ownerMembership = await getActiveMembershipFor(
            prisma as unknown as Tx,
            owner.id,
            station.id,
        );
        if (!ownerMembership || ownerMembership.role !== "OWNER") {
            return new AuthorizationError("Only the owner can view invitations");
        }

        const rows = await prisma.stationInvitation.findMany({
            where: {
                stationId: station.id,
                status: "PENDING",
                expiresAt: { gt: new Date() },
            },
            include: { inviter: true },
            orderBy: { createdAt: "desc" },
        });

        const inviteeIds = rows.map((r) => r.inviteePublicId);
        const invitees = await prisma.user.findMany({
            where: { publicId: { in: inviteeIds } },
        });
        const inviteeMap = new Map(invitees.map((u) => [u.publicId, u]));

        return rows.map((r) => {
            const invitee = inviteeMap.get(r.inviteePublicId);
            return {
                id: r.id,
                inviteePublicId: r.inviteePublicId,
                inviteeName: invitee ? composeUserName(invitee) : null,
                inviterName: composeUserName(r.inviter),
                createdAt: r.createdAt,
                expiresAt: r.expiresAt,
            };
        });
    } catch (error) {
        console.error(
            "invitation.services > listInvitationsForStationService",
            error,
        );
        return new DatabaseError("Failed to list invitations");
    }
};

export interface UserInvitationView {
    id: string;
    stationPublicId: string;
    stationName: string;
    inviterName: string;
    createdAt: Date;
    expiresAt: Date;
}

export const listInvitationsForUserService = async (
    user: AuthenticatedUser,
): Promise<UserInvitationView[] | AppError> => {
    try {
        const rows = await prisma.stationInvitation.findMany({
            where: {
                inviteePublicId: user.publicId,
                status: "PENDING",
                expiresAt: { gt: new Date() },
            },
            include: { station: true, inviter: true },
            orderBy: { createdAt: "desc" },
        });

        return rows.map((r) => ({
            id: r.id,
            stationPublicId: r.station.publicId,
            stationName: r.station.name,
            inviterName: composeUserName(r.inviter),
            createdAt: r.createdAt,
            expiresAt: r.expiresAt,
        }));
    } catch (error) {
        console.error("invitation.services > listInvitationsForUserService", error);
        return new DatabaseError("Failed to list invitations");
    }
};

/* ========================================================================== */
/*  Accept / Reject                                                           */
/* ========================================================================== */

export const acceptInvitationService = async (
    user: AuthenticatedUser,
    invitationId: string,
): Promise<{ stationPublicId: string } | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const invitation = await tx.stationInvitation.findUnique({
                where: { id: invitationId },
                include: { station: true },
            });
            if (!invitation) return new InvitationNotFoundError();

            if (invitation.inviteePublicId !== user.publicId) {
                return new InvitationNotForYouError();
            }

            if (invitation.status !== "PENDING") {
                return new InvitationNotPendingError(invitation.status);
            }

            if (invitation.expiresAt.getTime() < Date.now()) {
                await tx.stationInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "EXPIRED" },
                });
                return new InvitationExpiredError();
            }

            const existing = await getActiveMembershipFor(
                tx,
                user.id,
                invitation.stationId,
            );
            if (existing) {
                await tx.stationInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "ACCEPTED" },
                });
                return new AlreadyMemberError();
            }

            await tx.stationMembership.upsert({
                where: {
                    userId_stationId: {
                        userId: user.id,
                        stationId: invitation.stationId,
                    },
                },
                create: {
                    userId: user.id,
                    stationId: invitation.stationId,
                    role: "STAFF",
                    active: true,
                },
                update: { role: "STAFF", active: true },
            });

            await tx.stationInvitation.update({
                where: { id: invitation.id },
                data: { status: "ACCEPTED" },
            });

            await publishNotificationInTransaction(
                tx,
                invitationAccepted,
                {
                    stationPublicId: invitation.station.publicId,
                    stationName: invitation.station.name,
                    memberName: composeUserName(user),
                },
                {
                    stationId: invitation.stationId,
                    affectedUserId: user.id,
                    actorId: user.id,
                },
            );

            return { stationPublicId: invitation.station.publicId };
        });
    } catch (error) {
        console.error("invitation.services > acceptInvitationService", error);
        return new DatabaseError("Failed to accept invitation");
    }
};

export const rejectInvitationService = async (
    user: AuthenticatedUser,
    invitationId: string,
): Promise<{ stationPublicId: string } | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const invitation = await tx.stationInvitation.findUnique({
                where: { id: invitationId },
                include: { station: true },
            });
            if (!invitation) return new InvitationNotFoundError();

            if (invitation.inviteePublicId !== user.publicId) {
                return new InvitationNotForYouError();
            }

            if (invitation.status !== "PENDING") {
                return new InvitationNotPendingError(invitation.status);
            }

            if (invitation.expiresAt.getTime() < Date.now()) {
                await tx.stationInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "EXPIRED" },
                });
                return new InvitationExpiredError();
            }

            await tx.stationInvitation.update({
                where: { id: invitation.id },
                data: { status: "REJECTED" },
            });

            await publishNotificationInTransaction(
                tx,
                invitationRejected,
                {
                    stationPublicId: invitation.station.publicId,
                    stationName: invitation.station.name,
                    memberName: composeUserName(user),
                },
                {
                    stationId: invitation.stationId,
                    affectedUserId: user.id,
                    actorId: user.id,
                },
            );

            return { stationPublicId: invitation.station.publicId };
        });
    } catch (error) {
        console.error("invitation.services > rejectInvitationService", error);
        return new DatabaseError("Failed to reject invitation");
    }
};