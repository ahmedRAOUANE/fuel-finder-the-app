import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/db";
import {
    approveStationService,
} from "@/services/station.services";
import {
    acceptInvitationService,
    createInvitationService,
    listInvitationsForStationService,
    listInvitationsForUserService,
    rejectInvitationService,
} from "@/services/invitation.services";
import {
    promoteMemberService,
    removeMemberService,
    listStationMembersService,
} from "@/services/stationMembership.services";
import { AppError } from "@/errors/base.error";
import { AuthorizationError } from "@/errors/auth.error";
import { TargetUserNotFoundError } from "@/errors/admin.error";
import {
    AlreadyManagerError,
    AlreadyMemberError,
    CannotInviteSelfError,
    CannotPromoteOwnerError,
    CannotRemoveOwnerError,
    DuplicateInvitationError,
    InvitationExpiredError,
    InvitationNotForYouError,
    InvitationNotPendingError,
    MemberNotFoundError,
} from "@/errors/invitation.error";
import { resetDatabase } from "./helpers/test-db";
import {
    createTestAdmin,
    createTestFuelCatalog,
    createTestStation,
    createTestUser,
} from "./helpers/factories";

const expectOk = <T>(result: T | AppError): T => {
    if (result instanceof AppError) {
        throw new Error(`Expected success, got ${result.name}: ${result.message}`);
    }
    return result;
};

const expectErr = <T>(
    result: T | AppError,
    ctor: new (...a: never[]) => AppError,
) => {
    expect(result).toBeInstanceOf(ctor);
    return result as AppError;
};

const buildActiveStationWithOwner = async () => {
    const owner = await createTestUser();
    const admin = await createTestAdmin();
    const fuel = await createTestFuelCatalog();
    const station = await createTestStation(owner.id);
    await prisma.stationFuel.create({
        data: {
            stationId: station.id,
            fuelCatalogId: fuel.id,
            displayName: "Diesel",
            priceDZD: 45,
        },
    });
    await approveStationService(admin, station.publicId);
    return { owner, admin, station };
};

beforeEach(async () => {
    await resetDatabase();
});

/* ========================================================================== */
/*  createInvitationService                                                   */
/* ========================================================================== */

describe("createInvitationService", () => {
    it("creates a PENDING invitation and notifies the invitee", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();

        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, invitee.publicId),
        );

        expect(invitation.status).toBe("PENDING");
        expect(invitation.inviteePublicId).toBe(invitee.publicId);
        expect(invitation.inviterId).toBe(owner.id);

        const notifications = await prisma.notification.findMany({
            where: { recipientId: invitee.id },
        });
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe("INVITATION_RECEIVED");
    });

    it("rejects self-invitation", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        expectErr(
            await createInvitationService(owner, station.publicId, owner.publicId),
            CannotInviteSelfError,
        );
    });

    it("rejects inviting a non-existent user", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        expectErr(
            await createInvitationService(owner, station.publicId, "NOPE0000"),
            TargetUserNotFoundError,
        );
    });

    it("rejects a duplicate pending invitation", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();
        await createInvitationService(owner, station.publicId, invitee.publicId);

        expectErr(
            await createInvitationService(owner, station.publicId, invitee.publicId),
            DuplicateInvitationError,
        );
    });

    it("rejects a non-owner", async () => {
        const { station } = await buildActiveStationWithOwner();
        const stranger = await createTestUser();
        const target = await createTestUser();

        expectErr(
            await createInvitationService(stranger, station.publicId, target.publicId),
            AuthorizationError,
        );
    });
});

/* ========================================================================== */
/*  acceptInvitationService                                                   */
/* ========================================================================== */

describe("acceptInvitationService", () => {
    it("creates a STAFF membership and notifies owners", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, invitee.publicId),
        );
        // Clear the invitation-received notification for clean counting
        await prisma.notification.deleteMany();

        expectOk(await acceptInvitationService(invitee, invitation.id));

        const membership = await prisma.stationMembership.findUnique({
            where: {
                userId_stationId: { userId: invitee.id, stationId: station.id },
            },
        });
        expect(membership?.role).toBe("STAFF");
        expect(membership?.active).toBe(true);

        const refreshed = await prisma.stationInvitation.findUnique({
            where: { id: invitation.id },
        });
        expect(refreshed?.status).toBe("ACCEPTED");

        const notifications = await prisma.notification.findMany({
            where: { recipientId: owner.id },
        });
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe("INVITATION_ACCEPTED");
    });

    it("rejects if the caller is not the invitee", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();
        const stranger = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, invitee.publicId),
        );

        expectErr(
            await acceptInvitationService(stranger, invitation.id),
            InvitationNotForYouError,
        );
    });

    it("rejects an already-used invitation", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, invitee.publicId),
        );
        await acceptInvitationService(invitee, invitation.id);

        expectErr(
            await acceptInvitationService(invitee, invitation.id),
            InvitationNotPendingError,
        );
    });

    it("marks an expired invitation as EXPIRED and errors", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, invitee.publicId),
        );
        await prisma.stationInvitation.update({
            where: { id: invitation.id },
            data: { expiresAt: new Date(Date.now() - 1000) },
        });

        expectErr(
            await acceptInvitationService(invitee, invitation.id),
            InvitationExpiredError,
        );
        const refreshed = await prisma.stationInvitation.findUnique({
            where: { id: invitation.id },
        });
        expect(refreshed?.status).toBe("EXPIRED");
    });

    it("rejects when user is already an active member", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, invitee.publicId),
        );
        await acceptInvitationService(invitee, invitation.id);
        // Now manually create another PENDING invitation (bypassing the guard)
        const second = await prisma.stationInvitation.create({
            data: {
                stationId: station.id,
                inviterId: owner.id,
                inviteePublicId: invitee.publicId,
                status: "PENDING",
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        expectErr(
            await acceptInvitationService(invitee, second.id),
            AlreadyMemberError,
        );
    });
});

/* ========================================================================== */
/*  rejectInvitationService                                                   */
/* ========================================================================== */

describe("rejectInvitationService", () => {
    it("moves to REJECTED and notifies owners", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, invitee.publicId),
        );
        await prisma.notification.deleteMany();

        expectOk(await rejectInvitationService(invitee, invitation.id));

        const refreshed = await prisma.stationInvitation.findUnique({
            where: { id: invitation.id },
        });
        expect(refreshed?.status).toBe("REJECTED");

        const notifications = await prisma.notification.findMany({
            where: { recipientId: owner.id },
        });
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe("INVITATION_REJECTED");
    });

    it("rejects if the caller is not the invitee", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const invitee = await createTestUser();
        const stranger = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, invitee.publicId),
        );

        expectErr(
            await rejectInvitationService(stranger, invitation.id),
            InvitationNotForYouError,
        );
    });
});

/* ========================================================================== */
/*  listInvitationsFor*                                                       */
/* ========================================================================== */

describe("listInvitationsForStationService", () => {
    it("returns pending invitations only", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const a = await createTestUser();
        const b = await createTestUser();
        await createInvitationService(owner, station.publicId, a.publicId);
        const bInvite = expectOk(
            await createInvitationService(owner, station.publicId, b.publicId),
        );
        await rejectInvitationService(b, bInvite.id);

        const list = expectOk(
            await listInvitationsForStationService(owner, station.publicId),
        );
        expect(list).toHaveLength(1);
        expect(list[0].inviteePublicId).toBe(a.publicId);
    });

    it("rejects a non-owner", async () => {
        const { station } = await buildActiveStationWithOwner();
        const stranger = await createTestUser();
        expectErr(
            await listInvitationsForStationService(stranger, station.publicId),
            AuthorizationError,
        );
    });
});

describe("listInvitationsForUserService", () => {
    it("returns only the caller's pending invitations", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const a = await createTestUser();
        const b = await createTestUser();
        await createInvitationService(owner, station.publicId, a.publicId);
        await createInvitationService(owner, station.publicId, b.publicId);

        const aList = expectOk(await listInvitationsForUserService(a));
        expect(aList).toHaveLength(1);
        expect(aList[0].stationPublicId).toBe(station.publicId);
    });
});

/* ========================================================================== */
/*  promoteMemberService                                                      */
/* ========================================================================== */

describe("promoteMemberService", () => {
    it("promotes a STAFF member to MANAGER", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const member = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, member.publicId),
        );
        await acceptInvitationService(member, invitation.id);

        const result = expectOk(
            await promoteMemberService(owner, station.id, member.publicId),
        );
        expect(result.role).toBe("MANAGER");

        const refreshed = await prisma.stationMembership.findUnique({
            where: {
                userId_stationId: { userId: member.id, stationId: station.id },
            },
        });
        expect(refreshed?.role).toBe("MANAGER");
    });

    it("rejects promoting an already-MANAGER member", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const member = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, member.publicId),
        );
        await acceptInvitationService(member, invitation.id);
        await promoteMemberService(owner, station.id, member.publicId);

        expectErr(
            await promoteMemberService(owner, station.id, member.publicId),
            AlreadyManagerError,
        );
    });

    it("rejects promoting the owner", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        expectErr(
            await promoteMemberService(owner, station.id, owner.publicId),
            CannotPromoteOwnerError,
        );
    });

    it("rejects a non-owner", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const member = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, member.publicId),
        );
        await acceptInvitationService(member, invitation.id);

        expectErr(
            await promoteMemberService(member, station.id, owner.publicId),
            AuthorizationError,
        );
    });

    it("rejects an unknown member", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        expectErr(
            await promoteMemberService(owner, station.id, "NOPE0000"),
            MemberNotFoundError,
        );
    });
});

/* ========================================================================== */
/*  removeMemberService                                                       */
/* ========================================================================== */

describe("removeMemberService", () => {
    it("deactivates the membership", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const member = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, member.publicId),
        );
        await acceptInvitationService(member, invitation.id);

        expectOk(await removeMemberService(owner, station.id, member.publicId));

        const refreshed = await prisma.stationMembership.findUnique({
            where: {
                userId_stationId: { userId: member.id, stationId: station.id },
            },
        });
        expect(refreshed?.active).toBe(false);
    });

    it("rejects removing the owner", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        expectErr(
            await removeMemberService(owner, station.id, owner.publicId),
            CannotRemoveOwnerError,
        );
    });

    it("rejects a non-owner", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const member = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, member.publicId),
        );
        await acceptInvitationService(member, invitation.id);

        expectErr(
            await removeMemberService(member, station.id, owner.publicId),
            AuthorizationError,
        );
    });

    it("members list excludes removed members", async () => {
        const { owner, station } = await buildActiveStationWithOwner();
        const member = await createTestUser();
        const invitation = expectOk(
            await createInvitationService(owner, station.publicId, member.publicId),
        );
        await acceptInvitationService(member, invitation.id);

        const before = expectOk(await listStationMembersService(station.id));
        expect(before).toHaveLength(2); // owner + member

        await removeMemberService(owner, station.id, member.publicId);

        const after = expectOk(await listStationMembersService(station.id));
        expect(after).toHaveLength(1); // owner only
    });
});