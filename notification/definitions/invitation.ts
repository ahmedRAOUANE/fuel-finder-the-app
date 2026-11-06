import { z } from "zod";
import {
    defineNotification,
    derivePresentation,
    requireStationId,
} from "../definition";
import { getStationOwners, resolveAffectedUser } from "../recipients";

const InvitationReceivedPayload = z
    .object({
        stationPublicId: z.string().min(1).max(50),
        stationName: z.string().trim().min(1).max(200),
        inviterName: z.string().trim().min(1).max(200),
        invitationId: z.string().min(1).max(100),
        inviteePublicId: z.string().min(1).max(50),
    })
    .strict();

const InvitationOutcomePayload = z
    .object({
        stationPublicId: z.string().min(1).max(50),
        stationName: z.string().trim().min(1).max(200),
        memberName: z.string().trim().min(1).max(200),
    })
    .strict();

/**
 * INVITATION_RECEIVED — recipient is the invitee.
 * The destination uses `inviteePublicId` from the payload so the URL
 * resolves to the correct `/user/[publicId]/invitations` page.
 */
export const invitationReceived = defineNotification({
    type: "INVITATION_RECEIVED",
    payloadSchema: InvitationReceivedPayload,
    presentation: derivePresentation("INVITATION_RECEIVED"),
    resolveRecipients: resolveAffectedUser,
    getDestination: (p) => `/user/${p.inviteePublicId}/invitations`,
});

/**
 * INVITATION_ACCEPTED — recipients are the station's owners, excluding
 * the accepter (they already know they accepted).
 */
export const invitationAccepted = defineNotification({
    type: "INVITATION_ACCEPTED",
    payloadSchema: InvitationOutcomePayload,
    presentation: derivePresentation("INVITATION_ACCEPTED"),
    resolveRecipients: async (tx, ctx) => {
        const owners = await getStationOwners(tx, requireStationId(ctx));
        return owners.filter((id) => id !== ctx.affectedUserId);
    },
    getDestination: (p) => `/station/${p.stationPublicId}/owner/team`,
});

/**
 * INVITATION_REJECTED — recipients are the station's owners.
 */
export const invitationRejected = defineNotification({
    type: "INVITATION_REJECTED",
    payloadSchema: InvitationOutcomePayload,
    presentation: derivePresentation("INVITATION_REJECTED"),
    resolveRecipients: (tx, ctx) =>
        getStationOwners(tx, requireStationId(ctx)),
    getDestination: (p) => `/station/${p.stationPublicId}/owner/team`,
});