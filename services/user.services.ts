import { nanoid } from "nanoid";
import { prisma } from "@/prisma/db";
import { env } from "@/utils/env";
import { DatabaseError } from "@/errors/db.error";
import type { AppError } from "@/errors/base.error";
import type { AuthenticatedUser } from "@/access/types";
import type { User } from "@/generated/prisma/client";

export interface KindeUserInput {
    id: string;
    email: string;
    given_name: string | null;
    family_name: string | null;
    picture: string | null;
}

/**
 * Upsert the DB row for the signed-in Kinde user.
 *
 * - New users get a generated publicId and default USER role.
 * - The SUPER_ADMIN_EMAIL user is promoted to ADMIN on sync.
 * - Admins are never demoted here; env changes only affect isSuperAdmin.
 */
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