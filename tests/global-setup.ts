import { execSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";

export default function setup() {
    config({ path: resolve(process.cwd(), ".env.test") });

    if (!process.env.TEST_DATABASE_URL) {
        throw new Error("TEST_DATABASE_URL is not set in .env.test");
    }

    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    console.log("Applying migrations to test database...");
    execSync("pnpm prisma migrate deploy", { stdio: "inherit" });
}