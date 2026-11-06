import { nanoid } from "nanoid";
import { prisma } from "@/prisma/db";
import { env } from "@/utils/env";
import { DatabaseError } from "@/errors/db.error";
import { AppError } from "@/errors/base.error";
import { AuthorizationError } from "@/errors/auth.error";
import {
    AlreadyAdminError,
    CannotDemoteSuperAdminError,
    NotAdminError,
    TargetUserNotFoundError,
} from "@/errors/admin.error";
import { publishNotificationInTransaction } from "@/notification/publish";
import {
    adminDemoted,
    adminPromoted,
} from "@/notification/definitions/admin";
import type { AuthenticatedUser } from "@/access/types";
import type { User } from "@/generated/prisma/client";
import { composeUserName } from "@/utils/names";

export interface KindeUserInput {
    id: string;
    email: string;
    given_name: string | null;
    family_name: string | null;
    picture: string | null;
}

/* ========================================================================== */
/*  Identity sync                                                             */
/* ========================================================================== */

export const syncKindeUserService = async (
    input: KindeUserInput,
): Promise<AuthenticatedUser | AppError> => {
    try {
        const existing = await prisma.user.findUnique({
            where: { kindeId: input.id },
        });

        const shouldBeAdmin = input.email === env.SUPER_ADMIN_EMAIL;

        if (existing) {
            const nextGlobalRole = shouldBeAdmin ? "ADMIN" : existing.globalRole;

            const needsUpdate =
                existing.email !== input.email ||
                existing.firstName !== input.given_name ||
                existing.lastName !== input.family_name ||
                existing.avatarUrl !== input.picture ||
                existing.globalRole !== nextGlobalRole;

            const row = needsUpdate
                ? await prisma.user.update({
                    where: { id: existing.id },
                    data: {
                        email: input.email,
                        firstName: input.given_name,
                        lastName: input.family_name,
                        avatarUrl: input.picture,
                        globalRole: nextGlobalRole,
                    },
                })
                : existing;

            return { ...row, isSuperAdmin: shouldBeAdmin };
        }

        const row = await prisma.user.create({
            data: {
                kindeId: input.id,
                publicId: nanoid(8),
                email: input.email,
                firstName: input.given_name,
                lastName: input.family_name,
                avatarUrl: input.picture,
                globalRole: shouldBeAdmin ? "ADMIN" : "USER",
            },
        });

        return { ...row, isSuperAdmin: shouldBeAdmin };
    } catch (error) {
        console.error("user.services > syncKindeUserService", error);
        return new DatabaseError("Failed to sync user");
    }
};

/* ========================================================================== */
/*  Reads                                                                     */
/* ========================================================================== */

export const getUserByPublicIdService = async (
    publicId: string,
): Promise<User | null | AppError> => {
    try {
        return await prisma.user.findUnique({ where: { publicId } });
    } catch (error) {
        console.error("user.services > getUserByPublicIdService", error);
        return new DatabaseError("Failed to load user");
    }
};

export const getUserByIdService = async (
    id: string,
): Promise<User | null | AppError> => {
    try {
        return await prisma.user.findUnique({ where: { id } });
    } catch (error) {
        console.error("user.services > getUserByIdService", error);
        return new DatabaseError("Failed to load user");
    }
};

export const listAdminsService = async (): Promise<
    AuthenticatedUser[] | AppError
> => {
    try {
        const rows = await prisma.user.findMany({
            where: { globalRole: "ADMIN" },
            orderBy: { createdAt: "asc" },
        });
        return rows.map((r) => ({
            ...r,
            isSuperAdmin: r.email === env.SUPER_ADMIN_EMAIL,
        }));
    } catch (error) {
        console.error("user.services > listAdminsService", error);
        return new DatabaseError("Failed to list admins");
    }
};

export const getUserAdminDetailService = async (
    publicId: string,
): Promise<AuthenticatedUser | null | AppError> => {
    try {
        const row = await prisma.user.findUnique({ where: { publicId } });
        if (!row) return null;
        return {
            ...row,
            isSuperAdmin: row.email === env.SUPER_ADMIN_EMAIL,
        };
    } catch (error) {
        console.error("user.services > getUserAdminDetailService", error);
        return new DatabaseError("Failed to load user");
    }
};

/* ========================================================================== */
/*  Admin management                                                          */
/* ========================================================================== */

export const promoteAdminService = async (
    actor: AuthenticatedUser,
    targetPublicId: string,
): Promise<AuthenticatedUser | AppError> => {
    if (!actor.isSuperAdmin) {
        return new AuthorizationError("Only the super admin can promote admins");
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const target = await tx.user.findUnique({
                where: { publicId: targetPublicId },
            });
            if (!target) return new TargetUserNotFoundError();
            if (target.globalRole === "ADMIN") return new AlreadyAdminError();

            const updated = await tx.user.update({
                where: { id: target.id },
                data: { globalRole: "ADMIN" },
            });

            await publishNotificationInTransaction(
                tx,
                adminPromoted,
                {
                    recipientPublicId: target.publicId,
                    actorName: composeUserName(actor),
                },
                {
                    stationId: null,
                    affectedUserId: target.id,
                    actorId: actor.id,
                },
            );

            return {
                ...updated,
                isSuperAdmin: updated.email === env.SUPER_ADMIN_EMAIL,
            };
        });
    } catch (error) {
        console.error("user.services > promoteAdminService", error);
        return new DatabaseError("Failed to promote admin");
    }
};

export const demoteAdminService = async (
    actor: AuthenticatedUser,
    targetPublicId: string,
): Promise<AuthenticatedUser | AppError> => {
    if (!actor.isSuperAdmin) {
        return new AuthorizationError("Only the super admin can demote admins");
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const target = await tx.user.findUnique({
                where: { publicId: targetPublicId },
            });
            if (!target) return new TargetUserNotFoundError();

            // Env super admin is protected — refuse even if the DB row is
            // inconsistent. Changing SUPER_ADMIN_EMAIL is the only way.
            if (target.email === env.SUPER_ADMIN_EMAIL) {
                return new CannotDemoteSuperAdminError();
            }

            if (target.globalRole !== "ADMIN") return new NotAdminError();

            const updated = await tx.user.update({
                where: { id: target.id },
                data: { globalRole: "USER" },
            });

            await publishNotificationInTransaction(
                tx,
                adminDemoted,
                {
                    recipientPublicId: target.publicId,
                    actorName: composeUserName(actor),
                },
                {
                    stationId: null,
                    affectedUserId: target.id,
                    actorId: actor.id,
                },
            );

            return { ...updated, isSuperAdmin: false };
        });
    } catch (error) {
        console.error("user.services > demoteAdminService", error);
        return new DatabaseError("Failed to demote admin");
    }
};