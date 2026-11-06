import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/db";
import { approveStationService } from "@/services/station.services";
import {
    createReportService,
    getReportDetailService,
    listReportsForAdminService,
    resolveReportService,
} from "@/services/report.services";
import { AppError } from "@/errors/base.error";
import { StationNotFoundError } from "@/errors/station.error";
import {
    CannotReportInactiveStationError,
    ReportAlreadyClosedError,
    ReportNotFoundError,
} from "@/errors/report.error";
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
    return { owner, admin, station };
};

beforeEach(async () => {
    await resetDatabase();
});

/* ========================================================================== */
/*  createReportService                                                       */
/* ========================================================================== */

describe("createReportService", () => {
    it("creates an OPEN report and notifies all admins", async () => {
        const { station } = await buildActiveStation();
        const reporter = await createTestUser();
        const admin2 = await createTestAdmin();

        const report = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "INCORRECT_PRICE",
                notes: "Price is wrong",
            }),
        );

        expect(report.status).toBe("OPEN");
        expect(report.type).toBe("INCORRECT_PRICE");

        // Admin notification count: admin (from approval) + admin2 (fresh)
        const allAdmins = await prisma.user.findMany({
            where: { globalRole: "ADMIN" },
            select: { id: true },
        });
        const adminIds = allAdmins.map((a) => a.id);

        const notifications = await prisma.notification.findMany({
            where: { type: "REPORT_RECEIVED", recipientId: { in: adminIds } },
        });
        expect(notifications).toHaveLength(adminIds.length);
        for (const n of notifications) {
            expect(n.stationId).toBe(station.id);
            const payload = n.payload as Record<string, unknown>;
            expect(payload.reportId).toBe(report.id);
            expect(payload.stationPublicId).toBe(station.publicId);
        }
        // Sanity: admin2 was created but this test proves every admin gets one
        expect(admin2.globalRole).toBe("ADMIN");
    });

    it("rejects reporting a non-ACTIVE station", async () => {
        const owner = await createTestUser();
        const station = await createTestStation(owner.id); // PENDING
        const reporter = await createTestUser();

        expectErr(
            await createReportService(reporter, station.publicId, {
                type: "OTHER",
                notes: "test",
            }),
            CannotReportInactiveStationError,
        );
    });

    it("rejects reporting a non-existent station", async () => {
        const reporter = await createTestUser();
        expectErr(
            await createReportService(reporter, "ST-NOPE01", {
                type: "OTHER",
                notes: "x",
            }),
            StationNotFoundError,
        );
    });
});

/* ========================================================================== */
/*  listReportsForAdminService                                                */
/* ========================================================================== */

describe("listReportsForAdminService", () => {
    it("returns reports newest-first, with station and reporter info", async () => {
        const { station } = await buildActiveStation();
        const reporter = await createTestUser();
        const r1 = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "INCORRECT_PRICE",
                notes: "first",
            }),
        );
        // Bump the timestamp to ensure ordering
        await prisma.report.update({
            where: { id: r1.id },
            data: { createdAt: new Date(Date.now() - 1000) },
        });
        const r2 = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "WRONG_LOCATION",
                notes: "second",
            }),
        );

        const list = expectOk(await listReportsForAdminService());
        expect(list).toHaveLength(2);
        expect(list[0].id).toBe(r2.id);
        expect(list[0].stationPublicId).toBe(station.publicId);
        expect(list[0].reporterPublicId).toBe(reporter.publicId);
    });

    it("filters by status", async () => {
        const { station, admin } = await buildActiveStation();
        const reporter = await createTestUser();
        const r1 = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "OTHER",
                notes: "resolve me",
            }),
        );
        await createReportService(reporter, station.publicId, {
            type: "OTHER",
            notes: "stay open",
        });

        await resolveReportService(admin, r1.id, { status: "RESOLVED" });

        const openReports = expectOk(
            await listReportsForAdminService({ status: "OPEN" }),
        );
        expect(openReports).toHaveLength(1);
        expect(openReports[0].notes).toBe("stay open");

        const resolved = expectOk(
            await listReportsForAdminService({ status: "RESOLVED" }),
        );
        expect(resolved).toHaveLength(1);
        expect(resolved[0].id).toBe(r1.id);
    });
});

/* ========================================================================== */
/*  getReportDetailService                                                    */
/* ========================================================================== */

describe("getReportDetailService", () => {
    it("returns full detail including station and reporter", async () => {
        const { station } = await buildActiveStation();
        const reporter = await createTestUser();
        const r = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "INCORRECT_PRICE",
                notes: "price at pump 3 was wrong",
            }),
        );

        const detail = expectOk(await getReportDetailService(r.id));
        if (detail === null) {
            throw new Error("Expected report detail to exist");
        }

        expect(detail.id).toBe(r.id);
        expect(detail.stationPublicId).toBe(station.publicId);
        expect(detail.reporterPublicId).toBe(reporter.publicId);
        expect(detail.reporterEmail).toBe(reporter.email);
        expect(detail.adminNote).toBeNull();
    });

    it("returns null for an unknown id", async () => {
        const result = await getReportDetailService("clx000000000000000000000");
        expect(result).toBeNull();
    });
});

/* ========================================================================== */
/*  resolveReportService                                                      */
/* ========================================================================== */

describe("resolveReportService", () => {
    it("moves OPEN → RESOLVED and stores the adminNote", async () => {
        const { station, admin } = await buildActiveStation();
        const reporter = await createTestUser();
        const r = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "OTHER",
                notes: "x",
            }),
        );

        const updated = expectOk(
            await resolveReportService(admin, r.id, {
                status: "RESOLVED",
                adminNote: "Verified, corrected prices",
            }),
        );
        expect(updated.status).toBe("RESOLVED");
        expect(updated.adminNote).toBe("Verified, corrected prices");
    });

    it("moves OPEN → DISMISSED", async () => {
        const { station, admin } = await buildActiveStation();
        const reporter = await createTestUser();
        const r = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "OTHER",
                notes: "x",
            }),
        );

        const updated = expectOk(
            await resolveReportService(admin, r.id, { status: "DISMISSED" }),
        );
        expect(updated.status).toBe("DISMISSED");
    });

    it("rejects resolving a RESOLVED report", async () => {
        const { station, admin } = await buildActiveStation();
        const reporter = await createTestUser();
        const r = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "OTHER",
                notes: "x",
            }),
        );
        await resolveReportService(admin, r.id, { status: "RESOLVED" });

        expectErr(
            await resolveReportService(admin, r.id, { status: "DISMISSED" }),
            ReportAlreadyClosedError,
        );
    });

    it("rejects resolving a DISMISSED report", async () => {
        const { station, admin } = await buildActiveStation();
        const reporter = await createTestUser();
        const r = expectOk(
            await createReportService(reporter, station.publicId, {
                type: "OTHER",
                notes: "x",
            }),
        );
        await resolveReportService(admin, r.id, { status: "DISMISSED" });

        expectErr(
            await resolveReportService(admin, r.id, { status: "RESOLVED" }),
            ReportAlreadyClosedError,
        );
    });

    it("rejects an unknown report", async () => {
        const admin = await createTestAdmin();
        expectErr(
            await resolveReportService(admin, "clx000000000000000000000", {
                status: "RESOLVED",
            }),
            ReportNotFoundError,
        );
    });
});