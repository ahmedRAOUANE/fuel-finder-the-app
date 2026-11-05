import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/db";
import {
    approveStationService,
    createStationService,
    reactivateStationService,
    rejectStationService,
    resubmitStationService,
    suspendStationService,
} from "@/services/station.services";
import {
    InvalidStationTransitionError,
    SelfApprovalError,
    StationFuelRequiredError,
} from "@/errors/station.error";
import { AppError } from "@/errors/base.error";
import { resetDatabase } from "./helpers/test-db";
import {
    createTestAdmin,
    createTestFuelCatalog,
    createTestStation,
    createTestSuperAdmin,
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

beforeEach(async () => {
    await resetDatabase();
});

describe("createStationService", () => {
    it("creates a station with children and an initial history row", async () => {
        const user = await createTestUser();
        const fuel = await createTestFuelCatalog();
        const otherFuel = await createTestFuelCatalog();

        const station = expectOk(
            await createStationService(user, {
                name: "Station A",
                address: "1 St",
                latitude: 36.75,
                longitude: 3.05,
                fuels: [
                    {
                        fuelCatalogId: fuel.id,
                        displayName: "Diesel",
                        priceDZD: 45,
                        availability: "AVAILABLE",
                    },
                    {
                        fuelCatalogId: otherFuel.id,
                        displayName: "Gasoline",
                        priceDZD: 50,
                        availability: "AVAILABLE",
                    },
                ],
                services: [],
                openingHours: [],
            }),
        );

        expect(station.status).toBe("PENDING");
        expect(station.publicId).toMatch(/^ST-[A-Z0-9]{6}$/);
        expect(station.requesterId).toBe(user.id);
        expect(station.ownerId).toBeNull();

        const fuels = await prisma.stationFuel.findMany({
            where: { stationId: station.id },
        });
        expect(fuels).toHaveLength(2);

        const history = await prisma.stationStatusHistory.findMany({
            where: { stationId: station.id },
        });
        expect(history).toHaveLength(1);
        expect(history[0].fromStatus).toBeNull();
        expect(history[0].toStatus).toBe("PENDING");
    });
});

describe("approveStationService", () => {
    it("activates the station, assigns OWNER, writes history, and notifies the requester", async () => {
        const requester = await createTestUser();
        const admin = await createTestAdmin();
        const fuel = await createTestFuelCatalog();
        const station = await createTestStation(requester.id);
        await prisma.stationFuel.create({
            data: {
                stationId: station.id,
                fuelCatalogId: fuel.id,
                displayName: "Diesel",
                priceDZD: 45,
            },
        });

        const updated = expectOk(
            await approveStationService(admin, station.publicId),
        );

        expect(updated.status).toBe("ACTIVE");
        expect(updated.ownerId).toBe(requester.id);

        const membership = await prisma.stationMembership.findUnique({
            where: {
                userId_stationId: { userId: requester.id, stationId: station.id },
            },
        });
        expect(membership?.role).toBe("OWNER");
        expect(membership?.active).toBe(true);

        const notifications = await prisma.notification.findMany({
            where: { recipientId: requester.id },
        });
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe("STATION_APPROVED");
    });

    it("rejects a station that is not PENDING", async () => {
        const requester = await createTestUser();
        const admin = await createTestAdmin();
        const station = await createTestStation(requester.id, {
            status: "ACTIVE",
        });

        expectErr(
            await approveStationService(admin, station.publicId),
            InvalidStationTransitionError,
        );
    });

    it("blocks a non-super admin from approving their own station", async () => {
        const admin = await createTestAdmin();
        const fuel = await createTestFuelCatalog();
        const station = await createTestStation(admin.id);
        await prisma.stationFuel.create({
            data: {
                stationId: station.id,
                fuelCatalogId: fuel.id,
                displayName: "Diesel",
                priceDZD: 45,
            },
        });

        expectErr(
            await approveStationService(admin, station.publicId),
            SelfApprovalError,
        );
    });

    it("lets a super admin approve their own station", async () => {
        const superAdmin = await createTestSuperAdmin();
        const fuel = await createTestFuelCatalog();
        const station = await createTestStation(superAdmin.id);
        await prisma.stationFuel.create({
            data: {
                stationId: station.id,
                fuelCatalogId: fuel.id,
                displayName: "Diesel",
                priceDZD: 45,
            },
        });

        const updated = expectOk(
            await approveStationService(superAdmin, station.publicId),
        );
        expect(updated.status).toBe("ACTIVE");
    });

    it("rejects approval when the station has no fuel", async () => {
        const requester = await createTestUser();
        const admin = await createTestAdmin();
        const station = await createTestStation(requester.id);

        expectErr(
            await approveStationService(admin, station.publicId),
            StationFuelRequiredError,
        );
    });
});

describe("rejectStationService", () => {
    it("moves PENDING → REJECTED with a reason and notifies the requester", async () => {
        const requester = await createTestUser();
        const admin = await createTestAdmin();
        const station = await createTestStation(requester.id);

        const updated = expectOk(
            await rejectStationService(admin, station.publicId, "Duplicate listing"),
        );
        expect(updated.status).toBe("REJECTED");

        const history = await prisma.stationStatusHistory.findFirst({
            where: { stationId: station.id, toStatus: "REJECTED" },
        });
        expect(history?.reason).toBe("Duplicate listing");

        const notifications = await prisma.notification.findMany({
            where: { recipientId: requester.id },
        });
        expect(notifications[0].type).toBe("STATION_REJECTED");
    });
});

describe("resubmitStationService", () => {
    it("moves REJECTED → PENDING for the original requester", async () => {
        const requester = await createTestUser();
        const admin = await createTestAdmin();
        const fuel = await createTestFuelCatalog();
        const station = await createTestStation(requester.id);
        await prisma.stationFuel.create({
            data: {
                stationId: station.id,
                fuelCatalogId: fuel.id,
                displayName: "Diesel",
                priceDZD: 45,
            },
        });
        await rejectStationService(admin, station.publicId, "Fix address");

        const updated = expectOk(
            await resubmitStationService(requester, station.publicId, {
                address: "2 Corrected St",
            }),
        );
        expect(updated.status).toBe("PENDING");
        expect(updated.address).toBe("2 Corrected St");
    });

    it("rejects resubmission by a non-requester", async () => {
        const requester = await createTestUser();
        const other = await createTestUser();
        const admin = await createTestAdmin();
        const station = await createTestStation(requester.id);
        await rejectStationService(admin, station.publicId, "Nope");

        const result = await resubmitStationService(
            other,
            station.publicId,
            {},
        );
        expect(result).toBeInstanceOf(AppError);
    });
});

describe("suspendStationService", () => {
    it("moves ACTIVE → SUSPENDED and notifies owners", async () => {
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
        await prisma.notification.deleteMany();

        const updated = expectOk(
            await suspendStationService(admin, station.publicId, "Reported issue"),
        );
        expect(updated.status).toBe("SUSPENDED");

        const notifications = await prisma.notification.findMany({
            where: { recipientId: owner.id },
        });
        expect(notifications[0].type).toBe("STATION_SUSPENDED");
    });

    it("rejects suspension of a non-ACTIVE station", async () => {
        const requester = await createTestUser();
        const admin = await createTestAdmin();
        const station = await createTestStation(requester.id);

        expectErr(
            await suspendStationService(admin, station.publicId, "x"),
            InvalidStationTransitionError,
        );
    });
});

describe("reactivateStationService", () => {
    it("moves SUSPENDED → ACTIVE and notifies owners", async () => {
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
        await suspendStationService(admin, station.publicId, "Issue");
        await prisma.notification.deleteMany();

        const updated = expectOk(
            await reactivateStationService(admin, station.publicId),
        );
        expect(updated.status).toBe("ACTIVE");

        const notifications = await prisma.notification.findMany({
            where: { recipientId: owner.id },
        });
        expect(notifications[0].type).toBe("STATION_REACTIVATED");
    });
});