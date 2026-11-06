import { z } from "zod";
import { PublicIdSchema } from "./general.schemas";

export const CreateInvitationSchema = z.object({
    inviteePublicId: PublicIdSchema,
});

export const PromoteMemberSchema = z.object({
    memberPublicId: PublicIdSchema,
});

export const RemoveMemberSchema = z.object({
    memberPublicId: PublicIdSchema,
});

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
export type PromoteMemberInput = z.infer<typeof PromoteMemberSchema>;
export type RemoveMemberInput = z.infer<typeof RemoveMemberSchema>;