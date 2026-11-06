import { z } from "zod";

export const SearchSortSchema = z.enum(["recommended", "nearest"]);

export const SearchSchema = z
    .object({
        q: z.string().trim().max(200).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        fuelCode: z.string().trim().min(1).max(50).optional(),
        serviceCode: z.string().trim().min(1).max(50).optional(),
        availableOnly: z.boolean().optional(),
        sort: SearchSortSchema.optional(),
        limit: z.number().int().min(1).max(100).optional(),
    })
    .refine(
        (d) => (d.lat === undefined) === (d.lng === undefined),
        { message: "lat and lng must be provided together", path: ["lat"] },
    );

export type SearchInput = z.infer<typeof SearchSchema>;
export type SearchSort = z.infer<typeof SearchSortSchema>;