import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/db";
import {
    approveStationService,
    setStationFuelsService,
    setStationOpeningHoursService,
    setStationServicesService,
} from "@/services/station.services";
import { AuthorizationError } from "@/errors/auth.error";
import { StationNotEditableError, StationNotFoundError } from "@/errors/station.error";
import { AppError } from "@/errors/base.error";
import { resetDatabase } from "./helpers/test-db";
import {
    createTestAdmin,
    createTestFuelCatalog,
    createTestServiceCatalog,
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

const buildActiveStation = async () => {
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
    return { owner, admin, station, initialFuel: fuel };
};

beforeEach(async () => {
    await resetDatabase();
});

describe("setStationFuelsService", () => {
    it("replaces all fuels for the owner", async () => {
        const { owner, station } = await buildActiveStation();
        const diesel = await createTestFuelCatalog();
        const gasoline = await createTestFuelCatalog();

        const rows = expectOk(
            await setStationFuelsService(owner, station.publicId, [
                {
                    fuelCatalogId: diesel.id,
                    displayName: "Diesel",
                    priceDZD: 50,
                    availability: "AVAILABLE",
                },
                {
                    fuelCatalogId: gasoline.id,
                    displayName: "Gasoline",
                    priceDZD: 60,
                    availability: "UNAVAILABLE",
                },
            ]),
        );

        expect(rows).toHaveLength(2);
        const refreshed = await prisma.stationFuel.findMany({
            where: { stationId: station.id },
            orderBy: { displayName: "asc" },
        });
        expect(refreshed).toHaveLength(2);
        expect(refreshed[0].displayName).toBe("Diesel");
        expect(refreshed[1].displayName).toBe("Gasoline");
    });

    it("rejects non-ACTIVE stations", async () => {
        const owner = await createTestUser();
        const fuel = await createTestFuelCatalog();
        const station = await createTestStation(owner.id); // PENDING

        expectErr(
            await setStationFuelsService(owner, station.publicId, [
                {
                    fuelCatalogId: fuel.id,
                    displayName: "Diesel",
                    priceDZD: 45,
                    availability: "AVAILABLE",
                },
            ]),
            StationNotEditableError,
        );
    });

    it("rejects callers without OWNER membership (defense-in-depth)", async () => {
        const { station } = await buildActiveStation();
        const stranger = await createTestUser();
        const fuel = await createTestFuelCatalog();

        expectErr(
            await setStationFuelsService(stranger, station.publicId, [
                {
                    fuelCatalogId: fuel.id,
                    displayName: "X",
                    priceDZD: 45,
                    availability: "AVAILABLE",
                },
            ]),
            AuthorizationError,
        );
    });

    it("returns NOT_FOUND for an unknown station", async () => {
        const owner = await createTestUser();
        const fuel = await createTestFuelCatalog();
        expectErr(
            await setStationFuelsService(owner, "ST-NOPE01", [
                {
                    fuelCatalogId: fuel.id,
                    displayName: "X",
                    priceDZD: 45,
                    availability: "AVAILABLE",
                },
            ]),
            StationNotFoundError,
        );
    });
});

describe("setStationServicesService", () => {
    it("replaces the service list", async () => {
        const { owner, station } = await buildActiveStation();
        const svc1 = await createTestServiceCatalog();
        const svc2 = await createTestServiceCatalog();

        expectOk(
            await setStationServicesService(owner, station.publicId, [
                svc1.id,
                svc2.id,
            ]),
        );

        const rows = await prisma.stationService.findMany({
            where: { stationId: station.id },
        });
        expect(rows).toHaveLength(2);

        // Replace with just one
        expectOk(
            await setStationServicesService(owner, station.publicId, [svc1.id]),
        );
        const after = await prisma.stationService.findMany({
            where: { stationId: station.id },
        });
        expect(after).toHaveLength(1);
        expect(after[0].serviceCatalogId).toBe(svc1.id);
    });

    it("accepts an empty list (clears services)", async () => {
        const { owner, station } = await buildActiveStation();
        const svc = await createTestServiceCatalog();
        await setStationServicesService(owner, station.publicId, [svc.id]);

        expectOk(await setStationServicesService(owner, station.publicId, []));
        const rows = await prisma.stationService.findMany({
            where: { stationId: station.id },
        });
        expect(rows).toHaveLength(0);
    });

    it("rejects non-ACTIVE stations", async () => {
        const owner = await createTestUser();
        const station = await createTestStation(owner.id);
        expectErr(
            await setStationServicesService(owner, station.publicId, []),
            StationNotEditableError,
        );
    });
});

describe("setStationOpeningHoursService", () => {
    it("replaces opening hours", async () => {
        const { owner, station } = await buildActiveStation();

        expectOk(
            await setStationOpeningHoursService(owner, station.publicId, [
                {
                    dayOfWeek: "MONDAY",
                    isClosed: false,
                    openTime: "08:00",
                    closeTime: "20:00",
                },
                {
                    dayOfWeek: "SUNDAY",
                    isClosed: true,
                    openTime: null,
                    closeTime: null,
                },
            ]),
        );

        const rows = await prisma.openingHours.findMany({
            where: { stationId: station.id },
        });
        expect(rows).toHaveLength(2);
        const monday = rows.find((r) => r.dayOfWeek === "MONDAY");
        expect(monday?.openTime).toBe("08:00");
        expect(monday?.isClosed).toBe(false);
        const sunday = rows.find((r) => r.dayOfWeek === "SUNDAY");
        expect(sunday?.isClosed).toBe(true);
    });

    it("rejects non-ACTIVE stations", async () => {
        const owner = await createTestUser();
        const station = await createTestStation(owner.id);
        expectErr(
            await setStationOpeningHoursService(owner, station.publicId, []),
            StationNotEditableError,
        );
    });
});