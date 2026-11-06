import { z } from "zod";

export const ReportTypeSchema = z.enum([
    "INCORRECT_PRICE",
    "WRONG_LOCATION",
    "CLOSED_OR_NONEXISTENT",
    "INCORRECT_INFO",
    "OTHER",
]);

export const ReportStatusSchema = z.enum([
    "OPEN",
    "REVIEWED",
    "RESOLVED",
    "DISMISSED",
]);

export const CreateReportSchema = z.object({
    type: ReportTypeSchema,
    notes: z.string().trim().min(1).max(2000),
});

export const ResolveReportSchema = z.object({
    status: z.enum(["REVIEWED", "RESOLVED", "DISMISSED"]),
    adminNote: z.string().trim().max(2000).optional(),
});

export const ListReportsQuerySchema = z.object({
    status: ReportStatusSchema.optional(),
});

export type ReportType = z.infer<typeof ReportTypeSchema>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;