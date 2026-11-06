import { prisma } from "@/prisma/db";
import { DatabaseError } from "@/errors/db.error";
import { AppError } from "@/errors/base.error";
import { StationNotFoundError } from "@/errors/station.error";
import {
    CannotReportInactiveStationError,
    ReportAlreadyClosedError,
    ReportNotFoundError,
} from "@/errors/report.error";
import { publishNotificationInTransaction } from "@/notification/publish";
import { reportReceived } from "@/notification/definitions/report";
import { composeUserName } from "@/utils/names";
import type { AuthenticatedUser } from "@/access/types";
import type {
    Report,
    ReportStatus,
    ReportType,
} from "@/generated/prisma/client";
import type {
    CreateReportInput,
    ResolveReportInput,
} from "@/schemas/report.schemas";

/* ========================================================================== */
/*  Create                                                                    */
/* ========================================================================== */

export const createReportService = async (
    reporter: AuthenticatedUser,
    stationPublicId: string,
    input: CreateReportInput,
): Promise<Report | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const station = await tx.station.findUnique({
                where: { publicId: stationPublicId },
            });
            if (!station) return new StationNotFoundError();

            if (station.status !== "ACTIVE") {
                return new CannotReportInactiveStationError();
            }

            const report = await tx.report.create({
                data: {
                    stationId: station.id,
                    reporterId: reporter.id,
                    type: input.type,
                    notes: input.notes,
                    status: "OPEN",
                },
            });

            await publishNotificationInTransaction(
                tx,
                reportReceived,
                {
                    reportId: report.id,
                    stationPublicId: station.publicId,
                    stationName: station.name,
                    reportType: input.type,
                },
                {
                    stationId: station.id,
                    actorId: reporter.id,
                },
            );

            return report;
        });
    } catch (error) {
        console.error("report.services > createReportService", error);
        return new DatabaseError("Failed to create report");
    }
};

/* ========================================================================== */
/*  Reads                                                                     */
/* ========================================================================== */

export interface ReportListItem {
    id: string;
    type: ReportType;
    status: ReportStatus;
    notes: string;
    createdAt: Date;
    stationPublicId: string;
    stationName: string;
    reporterPublicId: string;
    reporterName: string;
}

export const listReportsForAdminService = async (filters?: {
    status?: ReportStatus;
}): Promise<ReportListItem[] | AppError> => {
    try {
        const rows = await prisma.report.findMany({
            where: filters?.status ? { status: filters.status } : {},
            include: { station: true, reporter: true },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        });

        return rows.map((r) => ({
            id: r.id,
            type: r.type,
            status: r.status,
            notes: r.notes,
            createdAt: r.createdAt,
            stationPublicId: r.station.publicId,
            stationName: r.station.name,
            reporterPublicId: r.reporter.publicId,
            reporterName: composeUserName(r.reporter),
        }));
    } catch (error) {
        console.error("report.services > listReportsForAdminService", error);
        return new DatabaseError("Failed to list reports");
    }
};

export interface ReportDetail {
    id: string;
    type: ReportType;
    status: ReportStatus;
    notes: string;
    adminNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    stationPublicId: string;
    stationName: string;
    stationAddress: string;
    stationStatus: string;
    reporterPublicId: string;
    reporterName: string;
    reporterEmail: string;
}

export const getReportDetailService = async (
    reportId: string,
): Promise<ReportDetail | null | AppError> => {
    try {
        const r = await prisma.report.findUnique({
            where: { id: reportId },
            include: { station: true, reporter: true },
        });
        if (!r) return null;

        return {
            id: r.id,
            type: r.type,
            status: r.status,
            notes: r.notes,
            adminNote: r.adminNote,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            stationPublicId: r.station.publicId,
            stationName: r.station.name,
            stationAddress: r.station.address,
            stationStatus: r.station.status,
            reporterPublicId: r.reporter.publicId,
            reporterName: composeUserName(r.reporter),
            reporterEmail: r.reporter.email,
        };
    } catch (error) {
        console.error("report.services > getReportDetailService", error);
        return new DatabaseError("Failed to load report");
    }
};

/* ========================================================================== */
/*  Resolve                                                                   */
/* ========================================================================== */

export const resolveReportService = async (
    _admin: AuthenticatedUser,
    reportId: string,
    input: ResolveReportInput,
): Promise<Report | AppError> => {
    try {
        return await prisma.$transaction(async (tx) => {
            const report = await tx.report.findUnique({
                where: { id: reportId },
            });
            if (!report) return new ReportNotFoundError();

            if (report.status === "RESOLVED" || report.status === "DISMISSED") {
                return new ReportAlreadyClosedError(report.status);
            }

            return await tx.report.update({
                where: { id: report.id },
                data: {
                    status: input.status,
                    adminNote: input.adminNote ?? null,
                },
            });
        });
    } catch (error) {
        console.error("report.services > resolveReportService", error);
        return new DatabaseError("Failed to resolve report");
    }
};