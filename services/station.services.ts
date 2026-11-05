import { prisma } from "@/prisma/db";
import { DatabaseError } from "@/errors/db.error";
import type { AppError } from "@/errors/base.error";
import type { Station } from "@/generated/prisma/client";

export const getStationService = async (
    id: string,
): Promise<Station | null | AppError> => {
    try {
        return await prisma.station.findUnique({ where: { id } });
    } catch (error) {
        console.error("station.services > getStationService", error);
        return new DatabaseError("Failed to load station");
    }
};

export const getStationByPublicIdService = async (
    publicId: string,
): Promise<Station | null | AppError> => {
    try {
        return await prisma.station.findUnique({ where: { publicId } });
    } catch (error) {
        console.error("station.services > getStationByPublicIdService", error);
        return new DatabaseError("Failed to load station");
    }
};