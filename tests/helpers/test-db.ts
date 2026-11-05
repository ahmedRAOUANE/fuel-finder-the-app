import { prisma } from "@/prisma/db";

/**
 * Truncate every table in dependency order.
 * Called in beforeEach — cheap (docker tmpfs) and guarantees isolation.
 */
export async function resetDatabase(): Promise<void> {
    await prisma.$transaction([
        prisma.notification.deleteMany(),
        prisma.report.deleteMany(),
        prisma.openingHours.deleteMany(),
        prisma.stationService.deleteMany(),
        prisma.stationFuel.deleteMany(),
        prisma.stationInvitation.deleteMany(),
        prisma.stationMembership.deleteMany(),
        prisma.stationStatusHistory.deleteMany(),
        prisma.station.deleteMany(),
        prisma.serviceCatalog.deleteMany(),
        prisma.fuelCatalog.deleteMany(),
        prisma.user.deleteMany(),
    ]);
}