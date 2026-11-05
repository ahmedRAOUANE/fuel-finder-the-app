import { describe, expect, it } from "vitest";
import {
    CreateStationSchema,
    RejectStationSchema,
    SuspendStationSchema,
} from "@/schemas/station.schemas";

const validFuel = {
    fuelCatalogId: "clx000000000000000000000",
    displayName: "Diesel",
    priceDZD: 45.5,
    availability: "AVAILABLE" as const,
};

const validInput = {
    name: "Station A",
    address: "1 Test St",
    latitude: 36.75,
    longitude: 3.05,
    fuels: [validFuel],
};

describe("CreateStationSchema", () => {
    it("accepts a minimal valid payload", () => {
        expect(() => CreateStationSchema.parse(validInput)).not.toThrow();
    });

    it("rejects an empty name", () => {
        const result = CreateStationSchema.safeParse({ ...validInput, name: "" });
        expect(result.success).toBe(false);
    });

    it("rejects out-of-range latitude", () => {
        const result = CreateStationSchema.safeParse({
            ...validInput,
            latitude: 91,
        });
        expect(result.success).toBe(false);
    });

    it("rejects an empty fuel array", () => {
        const result = CreateStationSchema.safeParse({ ...validInput, fuels: [] });
        expect(result.success).toBe(false);
    });

    it("rejects a negative price", () => {
        const result = CreateStationSchema.safeParse({
            ...validInput,
            fuels: [{ ...validFuel, priceDZD: -1 }],
        });
        expect(result.success).toBe(false);
    });

    it("rejects an invalid open/close time format", () => {
        const result = CreateStationSchema.safeParse({
            ...validInput,
            openingHours: [
                {
                    dayOfWeek: "MONDAY",
                    isClosed: false,
                    openTime: "9:00",
                    closeTime: "18:00",
                },
            ],
        });
        expect(result.success).toBe(false);
    });

    it("accepts closed days with null times", () => {
        const result = CreateStationSchema.safeParse({
            ...validInput,
            openingHours: [
                {
                    dayOfWeek: "SUNDAY",
                    isClosed: true,
                    openTime: null,
                    closeTime: null,
                },
            ],
        });
        expect(result.success).toBe(true);
    });
});

describe("RejectStationSchema", () => {
    it("requires a non-empty reason", () => {
        expect(RejectStationSchema.safeParse({ reason: "" }).success).toBe(false);
        expect(RejectStationSchema.safeParse({ reason: "Duplicate" }).success).toBe(
            true,
        );
    });
});

describe("SuspendStationSchema", () => {
    it("requires a non-empty reason", () => {
        expect(SuspendStationSchema.safeParse({ reason: "" }).success).toBe(false);
    });
});