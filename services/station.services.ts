import { customAlphabet } from "nanoid";
import { prisma } from "@/prisma/db";
import { DatabaseError } from "@/errors/db.error";
import { AppError } from "@/errors/base.error";
import { AuthorizationError } from "@/errors/auth.error";
import {
    InvalidStationTransitionError,
    SelfApprovalError,
    StationFuelRequiredError,
    StationNotFoundError,
} from "@/errors/station.error";
import { publishNotificationInTransaction } from "@/notification/publish";
import {
    stationApproved,
    stationRejected,
    stationReactivated,
    stationSuspended,
} from "@/notification/definitions/station";
import type { AuthenticatedUser } from "@/access/types";
import type { Station } from "@/generated/prisma/client";
import type {
    CreateStationInput,
    ResubmitStationInput,
} from "@/schemas/station.schemas";

const STATION_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateId = customAlphabet(STATION_ID_ALPHABET, 6);

export const generateStationPublicId = (): string => `ST-${generateId()}`;

const generateUniqueStationPublicId = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> => {
    for (let i = 0; i < 5; i++) {
        const candidate = generateStationPublicId();
        const existing = await tx.station.findUnique({
            where: { publicId: candidate },
            select: { id: true },
        });
        if (!existing) return candidate;
    }
    throw new Error("Could not generate unique station public ID");
};

/* ========================================================================== */
/*  Reads                                                                     */
/* ========================================================================== */

export const getStationService = async (
    id: string,
): Promise<Station | null | AppError> => {
    try {
        return await prisma.station.findUnique({ where: { id } });
    } catch (error) {
        console.error("station.services > getStationService", error);
        return new DatabaseError("Failed to load station");
    }
};

export const getStationByPublicIdService = async (
    publicId: string,
): Promise<Station | null | AppError> => {
    try {
        return await prisma.station.findUnique({ where: { publicId } });
    } catch (error) {
        console.error("station.services > getStationByPublicIdService", error);
        return new DatabaseError("Failed to load station");
    }
};

export const listPendingStationsService = async (): Promise<
    Station[] | AppError
> => {
    try {
        return await prisma.station.findMany({
            where: { status: "PENDING" },
            orderBy: { createdAt: "asc" },
        });
    } catch (error) {
        console.error("station.services > listPendingStationsService", error);
        return new DatabaseError("Failed to list pending stations");
    }
};

export const listStationsForRequesterService = async (
    requesterId: string,
): Promise<Station[] | AppError> => {
    try {
        return await prisma.station.findMany({
            where: { requesterId },
            orderBy: { createdAt: "desc" },
        });
    } catch (error) {
        console.error("station.services > listStationsForRequesterService", error);
        return new DatabaseError("Failed to list stations");
    }
};

/* ========================================================================== */
/*  Create                                                                    */
/* ========================================================================== */

export const createStationService = async (
    requester: AuthenticatedUser,
    input: CreateStationInput,
): Promise<Station | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const publicId = await generateUniqueStationPublicId(tx);

            const station = await tx.station.create({
                data: {
                    publicId,
                    name: input.name,
                    description: input.description,
                    phone: input.phone,
                    photoKey: input.photoKey,
                    address: input.address,
                    latitude: input.latitude,
                    longitude: input.longitude,
                    requesterId: requester.id,
                    status: "PENDING",
                },
            });

            await tx.stationFuel.createMany({
                data: input.fuels.map((f) => ({
                    stationId: station.id,
                    fuelCatalogId: f.fuelCatalogId,
                    displayName: f.displayName,
                    priceDZD: f.priceDZD,
                    availability: f.availability,
                })),
            });

            if (input.services.length > 0) {
                await tx.stationService.createMany({
                    data: input.services.map((serviceCatalogId) => ({
                        stationId: station.id,
                        serviceCatalogId,
                    })),
                });
            }

            if (input.openingHours.length > 0) {
                await tx.openingHours.createMany({
                    data: input.openingHours.map((h) => ({
                        stationId: station.id,
                        dayOfWeek: h.dayOfWeek,
                        isClosed: h.isClosed,
                        openTime: h.openTime,
                        closeTime: h.closeTime,
                    })),
                });
            }

            await tx.stationStatusHistory.create({
                data: {
                    stationId: station.id,
                    fromStatus: null,
                    toStatus: "PENDING",
                    actorId: requester.id,
                },
            });

            return station;
        });
    } catch (error) {
        console.error("station.services > createStationService", error);
        return new DatabaseError("Failed to create station");
    }
};

/* ========================================================================== */
/*  Resubmit                                                                  */
/* ========================================================================== */

export const resubmitStationService = async (
    requester: AuthenticatedUser,
    stationPublicId: string,
    input: ResubmitStationInput,
): Promise<Station | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await tx.station.findUnique({
                where: { publicId: stationPublicId },
            });
            if (!station) return new StationNotFoundError();

            if (station.requesterId !== requester.id) {
                return new AuthorizationError("Only the requester can resubmit");
            }
            if (station.status !== "REJECTED") {
                return new InvalidStationTransitionError(station.status, "PENDING");
            }

            if (input.fuels) {
                await tx.stationFuel.deleteMany({ where: { stationId: station.id } });
                await tx.stationFuel.createMany({
                    data: input.fuels.map((f) => ({
                        stationId: station.id,
                        fuelCatalogId: f.fuelCatalogId,
                        displayName: f.displayName,
                        priceDZD: f.priceDZD,
                        availability: f.availability,
                    })),
                });
            }

            if (input.services) {
                await tx.stationService.deleteMany({ where: { stationId: station.id } });
                if (input.services.length > 0) {
                    await tx.stationService.createMany({
                        data: input.services.map((serviceCatalogId) => ({
                            stationId: station.id,
                            serviceCatalogId,
                        })),
                    });
                }
            }

            if (input.openingHours) {
                await tx.openingHours.deleteMany({ where: { stationId: station.id } });
                if (input.openingHours.length > 0) {
                    await tx.openingHours.createMany({
                        data: input.openingHours.map((h) => ({
                            stationId: station.id,
                            dayOfWeek: h.dayOfWeek,
                            isClosed: h.isClosed,
                            openTime: h.openTime,
                            closeTime: h.closeTime,
                        })),
                    });
                }
            }

            const updated = await tx.station.update({
                where: { id: station.id },
                data: {
                    name: input.name ?? undefined,
                    description: input.description ?? undefined,
                    phone: input.phone ?? undefined,
                    photoKey: input.photoKey ?? undefined,
                    address: input.address ?? undefined,
                    latitude: input.latitude ?? undefined,
                    longitude: input.longitude ?? undefined,
                    status: "PENDING",
                },
            });

            await tx.stationStatusHistory.create({
                data: {
                    stationId: station.id,
                    fromStatus: "REJECTED",
                    toStatus: "PENDING",
                    actorId: requester.id,
                },
            });

            return updated;
        });
    } catch (error) {
        console.error("station.services > resubmitStationService", error);
        return new DatabaseError("Failed to resubmit station");
    }
};

/* ========================================================================== */
/*  Approve                                                                   */
/* ========================================================================== */

export const approveStationService = async (
    admin: AuthenticatedUser,
    stationPublicId: string,
): Promise<Station | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await tx.station.findUnique({
                where: { publicId: stationPublicId },
            });
            if (!station) return new StationNotFoundError();

            if (station.status !== "PENDING") {
                return new InvalidStationTransitionError(station.status, "ACTIVE");
            }

            if (!admin.isSuperAdmin && station.requesterId === admin.id) {
                return new SelfApprovalError();
            }

            const fuelCount = await tx.stationFuel.count({
                where: { stationId: station.id },
            });
            if (fuelCount === 0) return new StationFuelRequiredError();

            const updated = await tx.station.update({
                where: { id: station.id },
                data: { status: "ACTIVE", ownerId: station.requesterId },
            });

            await tx.stationMembership.upsert({
                where: {
                    userId_stationId: {
                        userId: station.requesterId,
                        stationId: station.id,
                    },
                },
                create: {
                    userId: station.requesterId,
                    stationId: station.id,
                    role: "OWNER",
                    active: true,
                },
                update: { role: "OWNER", active: true },
            });

            await tx.stationStatusHistory.create({
                data: {
                    stationId: station.id,
                    fromStatus: "PENDING",
                    toStatus: "ACTIVE",
                    actorId: admin.id,
                },
            });

            await publishNotificationInTransaction(
                tx,
                stationApproved,
                { stationPublicId: station.publicId, stationName: station.name },
                {
                    stationId: station.id,
                    affectedUserId: station.requesterId,
                    actorId: admin.id,
                },
            );

            return updated;
        });
    } catch (error) {
        console.error("station.services > approveStationService", error);
        return new DatabaseError("Failed to approve station");
    }
};

/* ========================================================================== */
/*  Reject                                                                    */
/* ========================================================================== */

export const rejectStationService = async (
    admin: AuthenticatedUser,
    stationPublicId: string,
    reason: string,
): Promise<Station | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await tx.station.findUnique({
                where: { publicId: stationPublicId },
            });
            if (!station) return new StationNotFoundError();
            if (station.status !== "PENDING") {
                return new InvalidStationTransitionError(station.status, "REJECTED");
            }

            const updated = await tx.station.update({
                where: { id: station.id },
                data: { status: "REJECTED" },
            });

            await tx.stationStatusHistory.create({
                data: {
                    stationId: station.id,
                    fromStatus: "PENDING",
                    toStatus: "REJECTED",
                    reason,
                    actorId: admin.id,
                },
            });

            await publishNotificationInTransaction(
                tx,
                stationRejected,
                {
                    stationPublicId: station.publicId,
                    stationName: station.name,
                    reason,
                },
                {
                    stationId: station.id,
                    affectedUserId: station.requesterId,
                    actorId: admin.id,
                },
            );

            return updated;
        });
    } catch (error) {
        console.error("station.services > rejectStationService", error);
        return new DatabaseError("Failed to reject station");
    }
};

/* ========================================================================== */
/*  Suspend / Reactivate                                                      */
/* ========================================================================== */

export const suspendStationService = async (
    admin: AuthenticatedUser,
    stationPublicId: string,
    reason: string,
): Promise<Station | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await tx.station.findUnique({
                where: { publicId: stationPublicId },
            });
            if (!station) return new StationNotFoundError();
            if (station.status !== "ACTIVE") {
                return new InvalidStationTransitionError(station.status, "SUSPENDED");
            }

            const updated = await tx.station.update({
                where: { id: station.id },
                data: { status: "SUSPENDED" },
            });

            await tx.stationStatusHistory.create({
                data: {
                    stationId: station.id,
                    fromStatus: "ACTIVE",
                    toStatus: "SUSPENDED",
                    reason,
                    actorId: admin.id,
                },
            });

            await publishNotificationInTransaction(
                tx,
                stationSuspended,
                { stationPublicId: station.publicId, stationName: station.name },
                { stationId: station.id, actorId: admin.id },
            );

            return updated;
        });
    } catch (error) {
        console.error("station.services > suspendStationService", error);
        return new DatabaseError("Failed to suspend station");
    }
};

export const reactivateStationService = async (
    admin: AuthenticatedUser,
    stationPublicId: string,
): Promise<Station | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await tx.station.findUnique({
                where: { publicId: stationPublicId },
            });
            if (!station) return new StationNotFoundError();
            if (station.status !== "SUSPENDED") {
                return new InvalidStationTransitionError(station.status, "ACTIVE");
            }

            const updated = await tx.station.update({
                where: { id: station.id },
                data: { status: "ACTIVE" },
            });

            await tx.stationStatusHistory.create({
                data: {
                    stationId: station.id,
                    fromStatus: "SUSPENDED",
                    toStatus: "ACTIVE",
                    actorId: admin.id,
                },
            });

            await publishNotificationInTransaction(
                tx,
                stationReactivated,
                { stationPublicId: station.publicId, stationName: station.name },
                { stationId: station.id, actorId: admin.id },
            );

            return updated;
        });
    } catch (error) {
        console.error("station.services > reactivateStationService", error);
        return new DatabaseError("Failed to reactivate station");
    }
};