import { z } from "zod";
import {
    defineNotification,
    derivePresentation,
    requireStationId,
} from "../definition";
import { getStationOwners, resolveAffectedUser } from "../recipients";

const StationEventPayload = z
    .object({
        stationPublicId: z.string().min(1).max(50),
        stationName: z.string().trim().min(1).max(200),
    })
    .strict();

const StationRejectionPayload = z
    .object({
        stationPublicId: z.string().min(1).max(50),
        stationName: z.string().trim().min(1).max(200),
        reason: z.string().trim().min(1).max(2000),
    })
    .strict();

/**
 * STATION_APPROVED — recipient is the requester (who becomes owner).
 * Uses `resolveAffectedUser` rather than `getStationOwners` so the
 * notification does not depend on the OWNER membership row already
 * existing when it is published.
 */
export const stationApproved = defineNotification({
    type: "STATION_APPROVED",
    payloadSchema: StationEventPayload,
    presentation: derivePresentation("STATION_APPROVED"),
    resolveRecipients: resolveAffectedUser,
    getDestination: (p) => `/station/${p.stationPublicId}`,
});

export const stationRejected = defineNotification({
    type: "STATION_REJECTED",
    payloadSchema: StationRejectionPayload,
    presentation: derivePresentation("STATION_REJECTED"),
    resolveRecipients: resolveAffectedUser,
    getDestination: (p) => `/station/${p.stationPublicId}/status`,
});

export const stationSuspended = defineNotification({
    type: "STATION_SUSPENDED",
    payloadSchema: StationEventPayload,
    presentation: derivePresentation("STATION_SUSPENDED"),
    resolveRecipients: (tx, ctx) => getStationOwners(tx, requireStationId(ctx)),
    getDestination: (p) => `/station/${p.stationPublicId}/status`,
});

export const stationReactivated = defineNotification({
    type: "STATION_REACTIVATED",
    payloadSchema: StationEventPayload,
    presentation: derivePresentation("STATION_REACTIVATED"),
    resolveRecipients: (tx, ctx) => getStationOwners(tx, requireStationId(ctx)),
    getDestination: (p) => `/station/${p.stationPublicId}`,
});