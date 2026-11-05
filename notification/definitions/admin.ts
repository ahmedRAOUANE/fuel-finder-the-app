import { z } from "zod";
import { defineNotification, derivePresentation } from "../definition";
import { resolveAffectedUser } from "../recipients";

const AdminEventPayload = z
    .object({
        recipientPublicId: z.string().min(1).max(50),
        actorName: z.string().trim().min(1).max(200),
    })
    .strict();

export const adminPromoted = defineNotification({
    type: "ADMIN_PROMOTED",
    payloadSchema: AdminEventPayload,
    presentation: derivePresentation("ADMIN_PROMOTED"),
    resolveRecipients: resolveAffectedUser,
    getDestination: (p) => `/admin/${p.recipientPublicId}`,
});

export const adminDemoted = defineNotification({
    type: "ADMIN_DEMOTED",
    payloadSchema: AdminEventPayload,
    presentation: derivePresentation("ADMIN_DEMOTED"),
    resolveRecipients: resolveAffectedUser,
    getDestination: () => "/dashboard",
});