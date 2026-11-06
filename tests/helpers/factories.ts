import { nanoid } from "nanoid";
import { prisma } from "@/prisma/db";
import type { AuthenticatedUser } from "@/access/types";
import type {
    FuelCatalog,
    ServiceCatalog,
    Station,
    User,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export async function createTestUser(
    overrides: Partial<User> = {},
    isSuperAdmin = false,
): Promise<AuthenticatedUser> {
    const row = await prisma.user.create({
        data: {
            kindeId: `kinde_${nanoid(12)}`,
            publicId: nanoid(8),
            email: `user_${nanoid(8)}@test.com`,
            firstName: "Test",
            lastName: "User",
            globalRole: "USER",
            ...overrides,
        },
    });
    return { ...row, isSuperAdmin };
}

export async function createTestAdmin(
    overrides: Partial<User> = {},
): Promise<AuthenticatedUser> {
    return createTestUser({ globalRole: "ADMIN", ...overrides }, false);
}

export async function createTestSuperAdmin(
    overrides: Partial<User> = {},
): Promise<AuthenticatedUser> {
    return createTestUser({ globalRole: "ADMIN", ...overrides }, true);
}

export async function createTestFuelCatalog(
    overrides: Partial<FuelCatalog> = {},
): Promise<FuelCatalog> {
    return prisma.fuelCatalog.create({
        data: {
            code: `FUEL_${nanoid(6)}`,
            name: "Test Fuel",
            unit: "LITER",
            ...overrides,
        },
    });
}

export async function createTestServiceCatalog(
    overrides: Partial<ServiceCatalog> = {},
): Promise<ServiceCatalog> {
    return prisma.serviceCatalog.create({
        data: {
            code: `SVC_${nanoid(6)}`,
            name: "Test Service",
            iconKey: "test",
            ...overrides,
        },
    });
}

export async function createTestStation(
    requesterId: string,
    overrides: Partial<Station> = {},
): Promise<Station> {
    return prisma.station.create({
        data: {
            publicId: `ST-${nanoid(6).toUpperCase()}`,
            name: "Test Station",
            address: "1 Test Street",
            latitude: 36.7538,
            longitude: 3.0588,
            requesterId,
            status: "PENDING",
            ...overrides,
        },
    });
}

export const decimal = (n: number): Prisma.Decimal => new Prisma.Decimal(n);