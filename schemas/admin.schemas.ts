import { z } from "zod";
import { PublicIdSchema } from "./general.schemas";

export const PromoteAdminSchema = z.object({
    targetPublicId: PublicIdSchema,
});

export const DemoteAdminSchema = z.object({
    targetPublicId: PublicIdSchema,
});

export type PromoteAdminInput = z.infer<typeof PromoteAdminSchema>;
export type DemoteAdminInput = z.infer<typeof DemoteAdminSchema>;