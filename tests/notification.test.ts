import { describe, expect, it, vi } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import {
    derivePresentation,
    requireAffectedUserId,
    requireStationId,
} from "@/notification/definition";
import { publishNotificationInTransaction } from "@/notification/publish";
import {
    isCoreNotificationType,
    lookupNotificationDefinition,
} from "@/notification/registry";
import { stationApproved } from "@/notification/definitions/station";
import { adminPromoted } from "@/notification/definitions/admin";

const makeTx = () => {
    const create = vi.fn().mockResolvedValue(undefined);
    return {
        tx: { notification: { create } } as unknown as Prisma.TransactionClient,
        create,
    };
};

describe("derivePresentation", () => {
    it("returns the notifications.<TYPE>.title/.body keys", () => {
        expect(derivePresentation("STATION_APPROVED")).toEqual({
            titleKey: "notifications.STATION_APPROVED.title",
            bodyKey: "notifications.STATION_APPROVED.body",
        });
    });
});

describe("requireStationId", () => {
    it("throws when stationId is null", () => {
        expect(() =>
            requireStationId({ stationId: null }),
        ).toThrow(/station context/);
    });

    it("returns the id when present", () => {
        expect(requireStationId({ stationId: "s1" })).toBe("s1");
    });
});

describe("requireAffectedUserId", () => {
    it("throws when missing", () => {
        expect(() =>
            requireAffectedUserId({ stationId: "s1" }),
        ).toThrow(/affected user/);
    });

    it("returns the id when present", () => {
        expect(
            requireAffectedUserId({ stationId: "s1", affectedUserId: "u1" }),
        ).toBe("u1");
    });
});

describe("publishNotificationInTransaction", () => {
    it("creates one row per unique recipient", async () => {
        const { tx, create } = makeTx();

        const def = {
            ...stationApproved,
            resolveRecipients: async () => ["u1", "u2", "u1"],
        };

        await publishNotificationInTransaction(
            tx,
            def,
            { stationPublicId: "ST-123456", stationName: "Station A" },
            { stationId: "s1", affectedUserId: "u1" },
        );

        expect(create).toHaveBeenCalledTimes(2);
        expect(create).toHaveBeenNthCalledWith(1, {
            data: {
                recipientId: "u1",
                stationId: "s1",
                type: "STATION_APPROVED",
                payload: { stationPublicId: "ST-123456", stationName: "Station A" },
            },
        });
        expect(create).toHaveBeenNthCalledWith(2, {
            data: {
                recipientId: "u2",
                stationId: "s1",
                type: "STATION_APPROVED",
                payload: { stationPublicId: "ST-123456", stationName: "Station A" },
            },
        });
    });

    it("validates the payload and throws on invalid input", async () => {
        const { tx } = makeTx();
        await expect(
            publishNotificationInTransaction(
                tx,
                stationApproved,
                { stationPublicId: "", stationName: "" },
                { stationId: "s1", affectedUserId: "u1" },
            ),
        ).rejects.toThrow();
    });

    it("throws on an empty recipient id", async () => {
        const { tx } = makeTx();
        const def = {
            ...stationApproved,
            resolveRecipients: async () => [""],
        };
        await expect(
            publishNotificationInTransaction(
                tx,
                def,
                { stationPublicId: "ST-123456", stationName: "Station A" },
                { stationId: "s1", affectedUserId: "u1" },
            ),
        ).rejects.toThrow(/Invalid notification recipient id/);
    });

    it("propagates recipient resolver failures", async () => {
        const { tx } = makeTx();
        await expect(
            publishNotificationInTransaction(
                tx,
                adminPromoted,
                { recipientPublicId: "ABCD1234", actorName: "Owner" },
                // missing affectedUserId → resolver throws
                { stationId: null },
            ),
        ).rejects.toThrow(/affected user/);
    });
});

describe("registry", () => {
    it("recognizes every registered type", () => {
        expect(isCoreNotificationType("STATION_APPROVED")).toBe(true);
        expect(isCoreNotificationType("ADMIN_PROMOTED")).toBe(true);
        expect(isCoreNotificationType("REPORT_RECEIVED")).toBe(false);
    });

    it("looks up a definition by type", () => {
        expect(lookupNotificationDefinition("STATION_APPROVED")).toBe(
            stationApproved,
        );
        expect(lookupNotificationDefinition("UNKNOWN")).toBeNull();
    });
});

describe("getDestination", () => {
    it("builds the manage route for approved stations", () => {
        const dest = stationApproved.getDestination?.({
            stationPublicId: "ST-ABC123",
            stationName: "x",
        });
        expect(dest).toBe("/station/ST-ABC123/manage");
    });
});