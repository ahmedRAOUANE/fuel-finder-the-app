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
import type {
    StationFuel,
    StationService,
    OpeningHours,
    FuelCatalog,
    ServiceCatalog,
} from "@/generated/prisma/client";
import { StationNotEditableError } from "@/errors/station.error";
import type {
    StationFuelInput,
    OpeningHoursInput,
} from "@/schemas/station.schemas";
import { SearchInput } from "@/schemas/search.schemas";
import { haversineKm } from "@/utils/geo";

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
            // Resubmit is allowed from REJECTED (rejected by admin) and
            // SUSPENDED (owner-driven recovery). Both re-enter PENDING for
            // fresh admin review. This is the only OWNER action available
            // while a station is not ACTIVE.
            if (
                station.status !== "REJECTED" &&
                station.status !== "SUSPENDED"
            ) {
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
                    fromStatus: station.status,
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

export type StationDetail = Station & {
    fuels: (StationFuel & { fuelCatalog: FuelCatalog })[];
    services: (StationService & { serviceCatalog: ServiceCatalog })[];
    openingHours: OpeningHours[];
};

export const getStationDetailService = async (
    publicId: string,
): Promise<StationDetail | null | AppError> => {
    try {
        return await prisma.station.findUnique({
            where: { publicId },
            include: {
                fuels: { include: { fuelCatalog: true } },
                services: { include: { serviceCatalog: true } },
                openingHours: { orderBy: { dayOfWeek: "asc" } },
            },
        });
    } catch (error) {
        console.error("station.services > getStationDetailService", error);
        return new DatabaseError("Failed to load station");
    }
};

export const getLatestStatusHistoryService = async (
    stationId: string,
): Promise<
    | {
        fromStatus: Station["status"] | null;
        toStatus: Station["status"];
        reason: string | null;
        createdAt: Date;
    }
    | null
    | AppError
> => {
    try {
        const row = await prisma.stationStatusHistory.findFirst({
            where: { stationId },
            orderBy: { createdAt: "desc" },
        });
        if (!row) return null;
        return {
            fromStatus: row.fromStatus,
            toStatus: row.toStatus,
            reason: row.reason,
            createdAt: row.createdAt,
        };
    } catch (error) {
        console.error("station.services > getLatestStatusHistoryService", error);
        return new DatabaseError("Failed to load history");
    }
};

export const listFuelCatalogService = async (): Promise<
    FuelCatalog[] | AppError
> => {
    try {
        return await prisma.fuelCatalog.findMany({ orderBy: { name: "asc" } });
    } catch (error) {
        console.error("station.services > listFuelCatalogService", error);
        return new DatabaseError("Failed to list fuels");
    }
};

export const listServiceCatalogService = async (): Promise<
    ServiceCatalog[] | AppError
> => {
    try {
        return await prisma.serviceCatalog.findMany({ orderBy: { name: "asc" } });
    } catch (error) {
        console.error("station.services > listServiceCatalogService", error);
        return new DatabaseError("Failed to list services");
    }
};

/* ========================================================================== */
/*  Bulk-replace management (ACTIVE stations, OWNER only)                     */
/* ========================================================================== */

const loadEditableStation = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    publicId: string,
): Promise<Station | AppError> => {
    const station = await tx.station.findUnique({ where: { publicId } });
    if (!station) return new StationNotFoundError();
    if (station.status !== "ACTIVE") {
        return new StationNotEditableError(station.status);
    }
    return station;
};

const assertOwnerMembership = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    userId: string,
    stationId: string,
): Promise<AppError | null> => {
    const membership = await tx.stationMembership.findUnique({
        where: { userId_stationId: { userId, stationId } },
    });
    if (!membership || !membership.active || membership.role !== "OWNER") {
        return new AuthorizationError("Only the station owner can perform this action");
    }
    return null;
};

export const setStationFuelsService = async (
    owner: AuthenticatedUser,
    stationPublicId: string,
    fuels: StationFuelInput[],
): Promise<StationFuel[] | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await loadEditableStation(tx, stationPublicId);
            if (station instanceof AppError) return station;

            const membershipErr = await assertOwnerMembership(tx, owner.id, station.id);
            if (membershipErr) return membershipErr;

            await tx.stationFuel.deleteMany({ where: { stationId: station.id } });
            await tx.stationFuel.createMany({
                data: fuels.map((f) => ({
                    stationId: station.id,
                    fuelCatalogId: f.fuelCatalogId,
                    displayName: f.displayName,
                    priceDZD: f.priceDZD,
                    availability: f.availability,
                })),
            });

            return await tx.stationFuel.findMany({
                where: { stationId: station.id },
            });
        });
    } catch (error) {
        console.error("station.services > setStationFuelsService", error);
        return new DatabaseError("Failed to update fuels");
    }
};

export const setStationServicesService = async (
    owner: AuthenticatedUser,
    stationPublicId: string,
    serviceIds: string[],
): Promise<StationService[] | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await loadEditableStation(tx, stationPublicId);
            if (station instanceof AppError) return station;

            const membershipErr = await assertOwnerMembership(tx, owner.id, station.id);
            if (membershipErr) return membershipErr;

            await tx.stationService.deleteMany({ where: { stationId: station.id } });
            if (serviceIds.length > 0) {
                await tx.stationService.createMany({
                    data: serviceIds.map((serviceCatalogId) => ({
                        stationId: station.id,
                        serviceCatalogId,
                    })),
                });
            }

            return await tx.stationService.findMany({
                where: { stationId: station.id },
            });
        });
    } catch (error) {
        console.error("station.services > setStationServicesService", error);
        return new DatabaseError("Failed to update services");
    }
};

export const setStationOpeningHoursService = async (
    owner: AuthenticatedUser,
    stationPublicId: string,
    hours: OpeningHoursInput[],
): Promise<OpeningHours[] | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await loadEditableStation(tx, stationPublicId);
            if (station instanceof AppError) return station;

            const membershipErr = await assertOwnerMembership(tx, owner.id, station.id);
            if (membershipErr) return membershipErr;

            await tx.openingHours.deleteMany({ where: { stationId: station.id } });
            if (hours.length > 0) {
                await tx.openingHours.createMany({
                    data: hours.map((h) => ({
                        stationId: station.id,
                        dayOfWeek: h.dayOfWeek,
                        isClosed: h.isClosed,
                        openTime: h.openTime,
                        closeTime: h.closeTime,
                    })),
                });
            }

            return await tx.openingHours.findMany({
                where: { stationId: station.id },
                orderBy: { dayOfWeek: "asc" },
            });
        });
    } catch (error) {
        console.error("station.services > setStationOpeningHoursService", error);
        return new DatabaseError("Failed to update opening hours");
    }
};

/* ========================================================================== */
/*  Search / Discovery                                                        */
/* ========================================================================== */

export interface SearchResultFuel {
    code: string;
    displayName: string;
    priceDZD: number;
    availability: "AVAILABLE" | "UNAVAILABLE";
}

export interface SearchResultService {
    code: string;
    name: string;
}

export interface StationSearchResult {
    publicId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number | null;
    fuels: SearchResultFuel[];
    services: SearchResultService[];
}

export interface SearchResponse {
    results: StationSearchResult[];
    total: number;
    userLocation: { lat: number; lng: number } | null;
    sort: "recommended" | "nearest";
}

const SEARCH_CANDIDATE_LIMIT = 500;
const DEFAULT_RESULT_LIMIT = 30;

interface ScoringContext {
    fuelCode?: string;
    q?: string;
    hasLocation: boolean;
}

const scoreResult = (
    r: StationSearchResult,
    ctx: ScoringContext,
): number => {
    let score = 0;

    if (ctx.fuelCode) {
        const matching = r.fuels.find((f) => f.code === ctx.fuelCode);
        if (matching) {
            score += 100;
            if (matching.availability === "AVAILABLE") score += 50;
        }
    }

    if (ctx.hasLocation && r.distanceKm !== null) {
        // Closer stations score higher; caps at +50 when distance is 0.
        score += 50 / (1 + r.distanceKm);
    }

    if (ctx.q) {
        const lq = ctx.q.toLowerCase();
        if (r.name.toLowerCase().includes(lq)) score += 20;
        if (r.address.toLowerCase().includes(lq)) score += 5;
    }

    return score;
};

export const searchStationsService = async (
    input: SearchInput,
): Promise<SearchResponse | AppError> => {
    try {
        const userLocation =
            input.lat !== undefined && input.lng !== undefined
                ? { lat: input.lat, lng: input.lng }
                : null;

        const fuelFilter =
            input.fuelCode || input.availableOnly
                ? {
                    fuels: {
                        some: {
                            ...(input.fuelCode
                                ? { fuelCatalog: { code: input.fuelCode } }
                                : {}),
                            ...(input.availableOnly
                                ? { availability: "AVAILABLE" as const }
                                : {}),
                        },
                    },
                }
                : {};

        const serviceFilter = input.serviceCode
            ? {
                services: {
                    some: { serviceCatalog: { code: input.serviceCode } },
                },
            }
            : {};

        const qFilter = input.q
            ? {
                OR: [
                    { name: { contains: input.q, mode: "insensitive" as const } },
                    { address: { contains: input.q, mode: "insensitive" as const } },
                ],
            }
            : {};

        const rows = await prisma.station.findMany({
            where: {
                status: "ACTIVE",
                ...qFilter,
                ...fuelFilter,
                ...serviceFilter,
            },
            include: {
                fuels: { include: { fuelCatalog: true } },
                services: { include: { serviceCatalog: true } },
            },
            orderBy: { id: "asc" },
            take: SEARCH_CANDIDATE_LIMIT,
        });

        const results: StationSearchResult[] = rows.map((station) => {
            const lat = station.latitude.toNumber();
            const lng = station.longitude.toNumber();
            const distanceKm = userLocation
                ? haversineKm(userLocation.lat, userLocation.lng, lat, lng)
                : null;

            return {
                publicId: station.publicId,
                name: station.name,
                address: station.address,
                latitude: lat,
                longitude: lng,
                distanceKm,
                fuels: station.fuels.map((f) => ({
                    code: f.fuelCatalog.code,
                    displayName: f.displayName,
                    priceDZD: f.priceDZD.toNumber(),
                    availability: f.availability,
                })),
                services: station.services.map((s) => ({
                    code: s.serviceCatalog.code,
                    name: s.serviceCatalog.name,
                })),
            };
        });

        const sort = input.sort ?? "recommended";
        const limit = input.limit ?? DEFAULT_RESULT_LIMIT;

        if (sort === "nearest" && userLocation) {
            results.sort((a, b) => {
                if (a.distanceKm === null) return 1;
                if (b.distanceKm === null) return -1;
                return a.distanceKm - b.distanceKm;
            });
        } else {
            const ctx: ScoringContext = {
                fuelCode: input.fuelCode,
                q: input.q,
                hasLocation: userLocation !== null,
            };
            const scored = results.map((r) => ({ r, score: scoreResult(r, ctx) }));
            scored.sort((a, b) => b.score - a.score);
            results.length = 0;
            for (const { r } of scored) results.push(r);
        }

        return {
            results: results.slice(0, limit),
            total: results.length,
            userLocation,
            sort,
        };
    } catch (error) {
        console.error("station.services > searchStationsService", error);
        return new DatabaseError("Failed to search stations");
    }
};

export const listFuelCatalogsForFilterService = async (): Promise<
    { code: string; name: string }[] | AppError
> => {
    try {
        const rows = await prisma.fuelCatalog.findMany({
            orderBy: { name: "asc" },
            select: { code: true, name: true },
        });
        return rows;
    } catch (error) {
        console.error(
            "station.services > listFuelCatalogsForFilterService",
            error,
        );
        return new DatabaseError("Failed to list fuels");
    }
};

export const listServiceCatalogsForFilterService = async (): Promise<
    { code: string; name: string }[] | AppError
> => {
    try {
        const rows = await prisma.serviceCatalog.findMany({
            orderBy: { name: "asc" },
            select: { code: true, name: true },
        });
        return rows;
    } catch (error) {
        console.error(
            "station.services > listServiceCatalogsForFilterService",
            error,
        );
        return new DatabaseError("Failed to list services");
    }
};