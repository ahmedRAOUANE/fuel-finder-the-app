import { z } from "zod";

export const PublicIdSchema = z.string().min(6).max(20);

export const StationPublicIdSchema = z
    .string()
    .regex(/^ST-[A-Z0-9]{6}$/, "Invalid station public ID");

export const DayOfWeekSchema = z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
]);

export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;