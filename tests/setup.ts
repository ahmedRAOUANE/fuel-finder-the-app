import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.test"), override: true });

if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is not set — tests cannot run safely");
}

// The app's prisma singleton reads DATABASE_URL via @/utils/env.
// Point it at the test DB for the entire test run.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;