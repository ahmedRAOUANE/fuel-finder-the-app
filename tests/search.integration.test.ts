import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/db";
import {
    approveStationService,
    searchStationsService,
} from "@/services/station.services";
import { SearchSchema } from "@/schemas/search.schemas";
import { AppError } from "@/errors/base.error";
import { resetDatabase } from "./helpers/test-db";
import {
    createTestAdmin,
    createTestStation,
    createTestUser,
    decimal,
} from "./helpers/factories";

const expectOk = <T>(result: T | AppError): T => {
    if (result instanceof AppError) {
        throw new Error(`Expected success, got ${result.name}: ${result.message}`);
    }
    return result;
};

interface StationOverrides {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    fuels?: Array<{
        code: string;
        displayName: string;
        priceDZD: number;
        availability?: "AVAILABLE" | "UNAVAILABLE";
    }>;
    serviceCodes?: string[];
    active?: boolean;
}

const seedStation = async (overrides: StationOverrides) => {
    const requester = await createTestUser();
    const admin = await createTestAdmin();
    const station = await createTestStation(requester.id, {
        name: overrides.name ?? "Test Station",
        address: overrides.address ?? "1 Test St",
        latitude: decimal(overrides.lat ?? 36.7538),
        longitude: decimal(overrides.lng ?? 3.0588),
    });

    const fuelsToCreate =
        overrides.fuels && overrides.fuels.length > 0
            ? overrides.fuels
            : overrides.active !== false
                ? [{ code: "DEFAULT", displayName: "Default Fuel", priceDZD: 10 }]
                : [];

    for (const f of fuelsToCreate) {
        const catalog = await prisma.fuelCatalog.upsert({
            where: { code: f.code },
            update: {},
            create: { code: f.code, name: f.code },
        });
        await prisma.stationFuel.create({
            data: {
                stationId: station.id,
                fuelCatalogId: catalog.id,
                displayName: f.displayName,
                priceDZD: f.priceDZD,
                availability: f.availability ?? "AVAILABLE",
            },
        });
    }

    for (const code of overrides.serviceCodes ?? []) {
        const catalog = await prisma.serviceCatalog.upsert({
            where: { code },
            update: {},
            create: { code, name: code, iconKey: code },
        });
        await prisma.stationService.create({
            data: {
                stationId: station.id,
                serviceCatalogId: catalog.id,
            },
        });
    }

    if (overrides.active !== false) {
        await approveStationService(admin, station.publicId);
    }

    return station;
};

beforeEach(async () => {
    await resetDatabase();
});

describe("SearchSchema", () => {
    it("requires lat and lng together", () => {
        expect(SearchSchema.safeParse({ lat: 36.7 }).success).toBe(false);
        expect(SearchSchema.safeParse({ lng: 3.0 }).success).toBe(false);
        expect(SearchSchema.safeParse({ lat: 36.7, lng: 3.0 }).success).toBe(true);
    });

    it("rejects out-of-range coordinates", () => {
        expect(SearchSchema.safeParse({ lat: 91, lng: 3.0 }).success).toBe(false);
        expect(SearchSchema.safeParse({ lat: 36.7, lng: 181 }).success).toBe(false);
    });
});

describe("searchStationsService — baseline", () => {
    it("returns only ACTIVE stations", async () => {
        await seedStation({ name: "Active", active: true });
        await seedStation({ name: "Pending", active: false });

        const r = expectOk(await searchStationsService({}));
        expect(r.results).toHaveLength(1);
        expect(r.results[0].name).toBe("Active");
    });

    it("returns an empty list when nothing matches", async () => {
        const r = expectOk(await searchStationsService({}));
        expect(r.results).toEqual([]);
        expect(r.total).toBe(0);
    });

    it("distanceKm is null when no location is provided", async () => {
        await seedStation({ name: "A" });
        const r = expectOk(await searchStationsService({}));
        expect(r.results[0].distanceKm).toBeNull();
        expect(r.userLocation).toBeNull();
    });

    it("computes distanceKm when location is provided", async () => {
        await seedStation({ name: "A", lat: 36.7538, lng: 3.0588 });
        const r = expectOk(
            await searchStationsService({ lat: 36.7538, lng: 3.0588 }),
        );
        expect(r.results[0].distanceKm).toBeCloseTo(0, 1);
    });
});

describe("searchStationsService — text search", () => {
    it("matches station names (case-insensitive)", async () => {
        await seedStation({ name: "Shell Express" });
        await seedStation({ name: "Total Station" });

        const r = expectOk(await searchStationsService({ q: "shell" }));
        expect(r.results).toHaveLength(1);
        expect(r.results[0].name).toBe("Shell Express");
    });

    it("matches addresses", async () => {
        await seedStation({ name: "A", address: "Rue Didouche, Alger" });
        await seedStation({ name: "B", address: "Oran centre" });

        const r = expectOk(await searchStationsService({ q: "alger" }));
        expect(r.results).toHaveLength(1);
    });

    it("name matches rank higher than address matches", async () => {
        await seedStation({ name: "Alger Fuel", address: "Somewhere else" });
        await seedStation({ name: "Other", address: "Alger Road" });

        const r = expectOk(await searchStationsService({ q: "alger" }));
        expect(r.results[0].name).toBe("Alger Fuel");
    });
});

describe("searchStationsService — fuel filters", () => {
    it("filters by fuel code", async () => {
        await seedStation({
            name: "Diesel Only",
            fuels: [
                { code: "DIESEL", displayName: "Diesel", priceDZD: 45 },
            ],
        });
        await seedStation({
            name: "Petrol Only",
            fuels: [
                { code: "GASOLINE_95", displayName: "Gasoline", priceDZD: 50 },
            ],
        });

        const r = expectOk(await searchStationsService({ fuelCode: "DIESEL" }));
        expect(r.results).toHaveLength(1);
        expect(r.results[0].name).toBe("Diesel Only");
    });

    it("availableOnly with fuelCode requires that fuel to be available", async () => {
        await seedStation({
            name: "Diesel Available",
            fuels: [
                { code: "DIESEL", displayName: "Diesel", priceDZD: 45 },
            ],
        });
        await seedStation({
            name: "Diesel Unavailable",
            fuels: [
                {
                    code: "DIESEL",
                    displayName: "Diesel",
                    priceDZD: 45,
                    availability: "UNAVAILABLE",
                },
            ],
        });

        const r = expectOk(
            await searchStationsService({
                fuelCode: "DIESEL",
                availableOnly: true,
            }),
        );
        expect(r.results).toHaveLength(1);
        expect(r.results[0].name).toBe("Diesel Available");
    });

    it("ranks available fuel above unavailable fuel", async () => {
        await seedStation({
            name: "Avail",
            fuels: [
                { code: "DIESEL", displayName: "Diesel", priceDZD: 45 },
            ],
        });
        await seedStation({
            name: "Unavail",
            fuels: [
                {
                    code: "DIESEL",
                    displayName: "Diesel",
                    priceDZD: 45,
                    availability: "UNAVAILABLE",
                },
            ],
        });

        const r = expectOk(await searchStationsService({ fuelCode: "DIESEL" }));
        expect(r.results[0].name).toBe("Avail");
        expect(r.results[1].name).toBe("Unavail");
    });
});

describe("searchStationsService — service filter", () => {
    it("filters by service code", async () => {
        await seedStation({
            name: "With Cafe",
            serviceCodes: ["CAFE"],
        });
        await seedStation({ name: "No Cafe" });

        const r = expectOk(await searchStationsService({ serviceCode: "CAFE" }));
        expect(r.results).toHaveLength(1);
        expect(r.results[0].name).toBe("With Cafe");
    });
});

describe("searchStationsService — sorting", () => {
    it("nearest sort orders by distance ascending", async () => {
        await seedStation({ name: "Far", lat: 36.9, lng: 3.3 });
        await seedStation({ name: "Near", lat: 36.755, lng: 3.06 });

        const r = expectOk(
            await searchStationsService({
                lat: 36.7538,
                lng: 3.0588,
                sort: "nearest",
            }),
        );
        expect(r.results[0].name).toBe("Near");
        expect(r.results[1].name).toBe("Far");
    });

    it("recommended sort prefers closer stations when no fuel filter", async () => {
        await seedStation({ name: "Far", lat: 36.9, lng: 3.3 });
        await seedStation({ name: "Near", lat: 36.755, lng: 3.06 });

        const r = expectOk(
            await searchStationsService({ lat: 36.7538, lng: 3.0588 }),
        );
        expect(r.results[0].name).toBe("Near");
    });

    it("recommended sort with fuel filter prioritizes fuel match over proximity", async () => {
        // Far station has the fuel; near one does not
        await seedStation({
            name: "Far With Diesel",
            lat: 36.9,
            lng: 3.3,
            fuels: [
                { code: "DIESEL", displayName: "Diesel", priceDZD: 45 },
            ],
        });
        await seedStation({
            name: "Near Without Diesel",
            lat: 36.755,
            lng: 3.06,
            fuels: [
                { code: "GASOLINE_95", displayName: "Gasoline", priceDZD: 50 },
            ],
        });

        const r = expectOk(
            await searchStationsService({
                lat: 36.7538,
                lng: 3.0588,
                fuelCode: "DIESEL",
            }),
        );
        // Fuel filter excludes the near station entirely
        expect(r.results).toHaveLength(1);
        expect(r.results[0].name).toBe("Far With Diesel");
    });

    it("respects the limit option", async () => {
        for (let i = 0; i < 5; i++) {
            await seedStation({ name: `Station ${i}` });
        }
        const r = expectOk(await searchStationsService({ limit: 2 }));
        expect(r.results).toHaveLength(2);
        expect(r.total).toBe(5);
    });
});