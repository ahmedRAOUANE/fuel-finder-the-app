import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/db";
import { approveStationService } from "@/services/station.services";
import {
    getUnreadNotificationCountService,
    listNotificationsService,
    markAllNotificationsReadService,
    markNotificationReadService,
} from "@/services/notification.services";
import { AppError } from "@/errors/base.error";
import { resetDatabase } from "./helpers/test-db";
import {
    createTestAdmin,
    createTestFuelCatalog,
    createTestStation,
    createTestUser,
} from "./helpers/factories";

const expectOk = <T>(result: T | AppError): T => {
    if (result instanceof AppError) {
        throw new Error(`Expected success, got ${result.name}: ${result.message}`);
    }
    return result;
};

beforeEach(async () => {
    await resetDatabase();
});

describe("notification services", () => {
    it("returns an empty list for a user with no notifications", async () => {
        const user = await createTestUser();
        const list = expectOk(await listNotificationsService(user));
        expect(list).toEqual([]);
    });

    it("returns notifications newest-first", async () => {
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
        // Owner should now have one STATION_APPROVED notification

        const list = expectOk(await listNotificationsService(owner));
        expect(list.length).toBeGreaterThanOrEqual(1);
        expect(list[0].type).toBe("STATION_APPROVED");
        expect(list[0].destination).toBe(
            `/station/${station.publicId}`,
        );
    });

    it("counts unread notifications", async () => {
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

        const count = expectOk(await getUnreadNotificationCountService(owner));
        expect(count).toBe(1);
    });

    it("marks a single notification as read", async () => {
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

        const list = expectOk(await listNotificationsService(owner));
        const target = list[0];

        expectOk(await markNotificationReadService(owner, target.id));

        const unread = expectOk(await getUnreadNotificationCountService(owner));
        expect(unread).toBe(0);
    });

    it("does not mark another user's notification as read", async () => {
        const owner = await createTestUser();
        const other = await createTestUser();
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

        const ownerList = expectOk(await listNotificationsService(owner));
        const target = ownerList[0];

        // Other user cannot mark owner's notification
        expectOk(await markNotificationReadService(other, target.id));

        const unread = expectOk(await getUnreadNotificationCountService(owner));
        expect(unread).toBe(1); // still unread for owner
    });

    it("marks all notifications as read", async () => {
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
        // Suspend to trigger a second notification
        const { suspendStationService } = await import(
            "@/services/station.services"
        );
        await suspendStationService(admin, station.publicId, "test");

        const before = expectOk(
            await getUnreadNotificationCountService(owner),
        );
        expect(before).toBe(2);

        expectOk(await markAllNotificationsReadService(owner));

        const after = expectOk(await getUnreadNotificationCountService(owner));
        expect(after).toBe(0);
    });

    it("resolves the destination for REPORT_RECEIVED using recipientPublicId", async () => {
        const { createReportService } = await import(
            "@/services/report.services"
        );
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

        const reporter = await createTestUser();
        const report = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "OTHER",
                notes: "test",
            }),
        );

        const adminList = expectOk(await listNotificationsService(admin));
        const reportNotif = adminList.find((n) => n.type === "REPORT_RECEIVED");
        expect(reportNotif).toBeDefined();
        expect(reportNotif!.destination).toBe(
            `/admin/${admin.publicId}/reports/${report.id}`,
        );
    });
});