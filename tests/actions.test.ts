import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/access/context", () => ({
    getCurrentUser: vi.fn(),
    getCurrentStationContext: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    redirect: vi.fn(),
}));

import { getCurrentUser } from "@/access/context";
import { AuthenticationError } from "@/errors/auth.error";
import { createStationAction } from "@/app/station/actions";
import { approveStationAction } from "@/app/admin/actions";

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

beforeEach(() => {
    vi.clearAllMocks();
});

describe("createStationAction", () => {
    it("returns VALIDATION_ERROR for invalid input", async () => {
        const result = await createStationAction({ name: "" });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
        }
    });

    it("returns AUTHENTICATION_ERROR for unauthenticated callers", async () => {
        mockedGetCurrentUser.mockResolvedValue(new AuthenticationError());
        const result = await createStationAction({
            name: "Station A",
            address: "1 St",
            latitude: 36.75,
            longitude: 3.05,
            fuels: [
                {
                    fuelCatalogId: "clx000000000000000000000",
                    displayName: "Diesel",
                    priceDZD: 45,
                    availability: "AVAILABLE",
                },
            ],
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("AUTHENTICATION_ERROR");
        }
    });
});

describe("approveStationAction", () => {
    it("returns AUTHENTICATION_ERROR for unauthenticated callers", async () => {
        mockedGetCurrentUser.mockResolvedValue(new AuthenticationError());
        const result = await approveStationAction("ST-ABC123");
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.code).toBe("AUTHENTICATION_ERROR");
        }
    });
});