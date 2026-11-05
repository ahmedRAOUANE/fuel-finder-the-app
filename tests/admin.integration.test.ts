import { beforeEach, describe, expect, it } from "vitest";
import { env } from "@/utils/env";
import { prisma } from "@/prisma/db";
import {
    demoteAdminService,
    getUserAdminDetailService,
    listAdminsService,
    promoteAdminService,
} from "@/services/user.services";
import {
    AlreadyAdminError,
    CannotDemoteSuperAdminError,
    NotAdminError,
    TargetUserNotFoundError,
} from "@/errors/admin.error";
import { AuthorizationError } from "@/errors/auth.error";
import { AppError } from "@/errors/base.error";
import { resetDatabase } from "./helpers/test-db";
import {
    createTestAdmin,
    createTestSuperAdmin,
    createTestUser,
} from "./helpers/factories";

const expectOk = <T>(result: T | AppError): T => {
    if (result instanceof AppError) {
        throw new Error(`Expected success, got ${result.name}: ${result.message}`);
    }
    return result;
};

const expectValue = <T>(result: T | null | AppError): T => {
    if (result === null) {
        throw new Error("Expected a value, got null");
    }
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

beforeEach(async () => {
    await resetDatabase();
});

describe("promoteAdminService", () => {
    it("promotes a regular user to admin and notifies them", async () => {
        const actor = await createTestSuperAdmin();
        const target = await createTestUser();

        const updated = expectOk(
            await promoteAdminService(actor, target.publicId),
        );

        expect(updated.globalRole).toBe("ADMIN");
        expect(updated.isSuperAdmin).toBe(false);

        const refreshed = await prisma.user.findUnique({
            where: { id: target.id },
        });
        expect(refreshed?.globalRole).toBe("ADMIN");

        const notifications = await prisma.notification.findMany({
            where: { recipientId: target.id },
        });
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe("ADMIN_PROMOTED");
        expect(notifications[0].stationId).toBeNull();
        expect(notifications[0].readAt).toBeNull();
    });

    it("rejects non-super-admin actors", async () => {
        const actor = await createTestAdmin();
        const target = await createTestUser();

        expectErr(
            await promoteAdminService(actor, target.publicId),
            AuthorizationError,
        );

        const refreshed = await prisma.user.findUnique({
            where: { id: target.id },
        });
        expect(refreshed?.globalRole).toBe("USER");
    });

    it("rejects an already-admin target", async () => {
        const actor = await createTestSuperAdmin();
        const target = await createTestAdmin();

        expectErr(
            await promoteAdminService(actor, target.publicId),
            AlreadyAdminError,
        );
    });

    it("rejects an unknown target", async () => {
        const actor = await createTestSuperAdmin();
        expectErr(
            await promoteAdminService(actor, "NOPE0000"),
            TargetUserNotFoundError,
        );
    });
});

describe("demoteAdminService", () => {
    it("demotes a regular admin to user and notifies them", async () => {
        const actor = await createTestSuperAdmin();
        const target = await createTestAdmin();

        const updated = expectOk(
            await demoteAdminService(actor, target.publicId),
        );

        expect(updated.globalRole).toBe("USER");
        expect(updated.isSuperAdmin).toBe(false);

        const refreshed = await prisma.user.findUnique({
            where: { id: target.id },
        });
        expect(refreshed?.globalRole).toBe("USER");

        const notifications = await prisma.notification.findMany({
            where: { recipientId: target.id },
        });
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe("ADMIN_DEMOTED");
    });

    it("rejects non-super-admin actors", async () => {
        const actor = await createTestAdmin();
        const target = await createTestAdmin();

        expectErr(
            await demoteAdminService(actor, target.publicId),
            AuthorizationError,
        );

        const refreshed = await prisma.user.findUnique({
            where: { id: target.id },
        });
        expect(refreshed?.globalRole).toBe("ADMIN");
    });

    it("refuses to demote the env super admin", async () => {
        const actor = await createTestSuperAdmin();
        const envSuper = await createTestUser(
            { email: env.SUPER_ADMIN_EMAIL, globalRole: "ADMIN" },
            true,
        );

        expectErr(
            await demoteAdminService(actor, envSuper.publicId),
            CannotDemoteSuperAdminError,
        );

        const refreshed = await prisma.user.findUnique({
            where: { id: envSuper.id },
        });
        expect(refreshed?.globalRole).toBe("ADMIN");

        const notifications = await prisma.notification.findMany({
            where: { recipientId: envSuper.id },
        });
        expect(notifications).toHaveLength(0);
    });

    it("rejects demotion of a non-admin user", async () => {
        const actor = await createTestSuperAdmin();
        const target = await createTestUser();

        expectErr(
            await demoteAdminService(actor, target.publicId),
            NotAdminError,
        );
    });

    it("rejects an unknown target", async () => {
        const actor = await createTestSuperAdmin();
        expectErr(
            await demoteAdminService(actor, "NOPE0000"),
            TargetUserNotFoundError,
        );
    });
});

describe("listAdminsService", () => {
    it("returns only admins, with isSuperAdmin derived from env", async () => {
        await createTestUser(); // excluded
        const regularAdmin = await createTestAdmin();
        const envSuper = await createTestUser(
            { email: env.SUPER_ADMIN_EMAIL, globalRole: "ADMIN" },
            true,
        );

        const admins = expectOk(await listAdminsService());
        expect(admins).toHaveLength(2);

        const superRow = admins.find((a) => a.id === envSuper.id);
        expect(superRow?.isSuperAdmin).toBe(true);

        const regularRow = admins.find((a) => a.id === regularAdmin.id);
        expect(regularRow?.isSuperAdmin).toBe(false);
    });

    it("returns an empty list when only regular users exist", async () => {
        await createTestUser();
        await createTestUser();

        const admins = expectOk(await listAdminsService());
        expect(admins).toEqual([]);
    });
});

describe("getUserAdminDetailService", () => {
    it("returns a user with isSuperAdmin derived from env", async () => {
        const envSuper = await createTestUser(
            { email: env.SUPER_ADMIN_EMAIL, globalRole: "ADMIN" },
            true,
        );

        const user = await getUserAdminDetailService(envSuper.publicId);
        expect(user).not.toBeNull();
        expect(user).not.toBeInstanceOf(AppError);

        const ok = expectValue(
            user as Awaited<ReturnType<typeof getUserAdminDetailService>>,
        );
        expect(ok.publicId).toBe(envSuper.publicId);
        expect(ok.isSuperAdmin).toBe(true);
    });

    it("marks regular admins as non-super", async () => {
        const admin = await createTestAdmin();
        const ok = expectValue(
            await getUserAdminDetailService(admin.publicId),
        );
        expect(ok.isSuperAdmin).toBe(false);
    });

    it("returns null for an unknown user", async () => {
        const result = await getUserAdminDetailService("NOPE0000");
        expect(result).toBeNull();
    });
});