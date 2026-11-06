import { z } from "zod";
import { defineNotification, derivePresentation } from "../definition";
import { getPlatformAdmins } from "../recipients";

const ReportTypeSchema = z.enum([
    "INCORRECT_PRICE",
    "WRONG_LOCATION",
    "CLOSED_OR_NONEXISTENT",
    "INCORRECT_INFO",
    "OTHER",
]);

const ReportReceivedPayload = z
    .object({
        reportId: z.string().min(1).max(100),
        stationPublicId: z.string().min(1).max(50),
        stationName: z.string().trim().min(1).max(200),
        reportType: ReportTypeSchema,
    })
    .strict();

/**
 * REPORT_RECEIVED — recipients are all platform admins.
 *
 * The destination is per-admin (`/admin/{adminPublicId}/reports/{reportId}`),
 * so it needs `recipientPublicId` from the render context. If it is
 * unavailable (e.g. rendering outside an authenticated session), it
 * falls back to `/dashboard`.
 */
export const reportReceived = defineNotification({
    type: "REPORT_RECEIVED",
    payloadSchema: ReportReceivedPayload,
    presentation: derivePresentation("REPORT_RECEIVED"),
    resolveRecipients: (tx) => getPlatformAdmins(tx),
    getDestination: (p, recipientPublicId) =>
        recipientPublicId
            ? `/admin/${recipientPublicId}/reports/${p.reportId}`
            : "/dashboard",
});