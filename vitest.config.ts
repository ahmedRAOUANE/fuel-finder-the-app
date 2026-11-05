import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        globals: true,
        passWithNoTests: true,
        globalSetup: ["./tests/global-setup.ts"],
        setupFiles: ["./tests/setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "."),
        },
    },
});