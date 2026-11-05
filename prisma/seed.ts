import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const fuels = [
    { code: "DIESEL", name: "Diesel" },
    { code: "GASOLINE_91", name: "Gasoline 91" },
    { code: "GASOLINE_95", name: "Gasoline 95" },
    { code: "LPG", name: "LPG" },
] as const;

const services = [
    { code: "CAR_WASH", name: "Car Wash", iconKey: "local_car_wash" },
    { code: "ATM", name: "ATM", iconKey: "atm" },
    { code: "RESTROOM", name: "Restroom", iconKey: "wc" },
    { code: "SHOP", name: "Shop", iconKey: "storefront" },
    { code: "CAFE", name: "Cafe", iconKey: "local_cafe" },
    { code: "AIR_WATER", name: "Air / Water", iconKey: "air" },
    { code: "OIL_CHANGE", name: "Oil Change", iconKey: "oil_barrel" },
    { code: "TIRE_SERVICE", name: "Tire Service", iconKey: "tire_repair" },
    { code: "WIFI", name: "WiFi", iconKey: "wifi" },
] as const;

async function main() {
    for (const fuel of fuels) {
        await prisma.fuelCatalog.upsert({
            where: { code: fuel.code },
            update: { name: fuel.name },
            create: { code: fuel.code, name: fuel.name },
        });
    }

    for (const service of services) {
        await prisma.serviceCatalog.upsert({
            where: { code: service.code },
            update: { name: service.name, iconKey: service.iconKey },
            create: service,
        });
    }

    console.log("Seed complete: fuel + service catalogs");
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });