import { z } from "zod";
import { DayOfWeekSchema } from "./general.schemas";

const TimeStringSchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm");

const StationFuelInputSchema = z.object({
    fuelCatalogId: z.string().cuid(),
    displayName: z.string().trim().min(1).max(100),
    priceDZD: z.number().positive().max(100_000),
    availability: z.enum(["AVAILABLE", "UNAVAILABLE"]).default("AVAILABLE"),
});

const OpeningHoursInputSchema = z
    .object({
        dayOfWeek: DayOfWeekSchema,
        isClosed: z.boolean(),
        openTime: TimeStringSchema.nullable(),
        closeTime: TimeStringSchema.nullable(),
    })
    .refine(
        (h) => h.isClosed || (h.openTime !== null && h.closeTime !== null),
        { message: "Open/close times are required when the station is open" },
    );

export const CreateStationSchema = z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2_000).optional(),
    phone: z.string().trim().max(30).optional(),
    photoKey: z.string().max(500).optional(),
    address: z.string().trim().min(1).max(500),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    fuels: z.array(StationFuelInputSchema).min(1, "At least one fuel is required"),
    services: z.array(z.string().cuid()).default([]),
    openingHours: z.array(OpeningHoursInputSchema).max(7).default([]),
});

export type CreateStationInput = z.infer<typeof CreateStationSchema>;

export const ResubmitStationSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2_000).optional(),
    phone: z.string().trim().max(30).optional(),
    photoKey: z.string().max(500).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    fuels: z.array(StationFuelInputSchema).min(1).optional(),
    services: z.array(z.string().cuid()).optional(),
    openingHours: z.array(OpeningHoursInputSchema).max(7).optional(),
});

export type ResubmitStationInput = z.infer<typeof ResubmitStationSchema>;

export const RejectStationSchema = z.object({
    reason: z.string().trim().min(1).max(2_000),
});

export const SuspendStationSchema = z.object({
    reason: z.string().trim().min(1).max(2_000),
});