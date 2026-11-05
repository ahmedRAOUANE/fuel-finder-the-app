import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError, AuthorizationError } from "@/errors/auth.error";
import type { AuthenticatedUser } from "@/access/types";

vi.mock("next/navigation", () => ({
    redirect: vi.fn((path: string) => {
        throw new Error(`REDIRECT:${path}`);
    }),
}));

vi.mock("@/access/context", () => ({
    getCurrentUser: vi.fn(),
    getCurrentStationContext: vi.fn(),
}));

import { getCurrentUser } from "@/access/context";
import {
    requireAuth,
    requireGlobalRole,
    requireSuperAdmin,
} from "@/access/guards";
import {
    withAuth,
    withGlobalRole,
    withSuperAdmin,
} from "@/access/wrappers";

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

const user: AuthenticatedUser = {
    id: "u1",
    publicId: "A7K9P2X4",
    kindeId: "k1",
    email: "user@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    avatarUrl: null,
    locale: null,
    globalRole: "USER",
    createdAt: new Date(),
    updatedAt: new Date(),
    isSuperAdmin: false,
};

const admin: AuthenticatedUser = {
    ...user,
    globalRole: "ADMIN",
    isSuperAdmin: true,
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("requireAuth", () => {
    it("redirects to login when unauthenticated", async () => {
        mockedGetCurrentUser.mockResolvedValue(new AuthenticationError());
        await expect(requireAuth()).rejects.toThrow("REDIRECT:/api/auth/login");
    });

    it("returns the resolved user", async () => {
        mockedGetCurrentUser.mockResolvedValue(user);
        await expect(requireAuth()).resolves.toBe(user);
    });
});

describe("requireGlobalRole", () => {
    it("redirects when the role is missing", async () => {
        mockedGetCurrentUser.mockResolvedValue(user);
        await expect(requireGlobalRole(["ADMIN"])).rejects.toThrow(
            "REDIRECT:/dashboard",
        );
    });

    it("returns the user when the role matches", async () => {
        mockedGetCurrentUser.mockResolvedValue(admin);
        await expect(requireGlobalRole(["ADMIN"])).resolves.toBe(admin);
    });
});

describe("requireSuperAdmin", () => {
    it("redirects when the user is an admin but not super", async () => {
        mockedGetCurrentUser.mockResolvedValue({
            ...admin,
            isSuperAdmin: false,
        });
        await expect(requireSuperAdmin()).rejects.toThrow("REDIRECT:/dashboard");
    });

    it("returns the super admin", async () => {
        mockedGetCurrentUser.mockResolvedValue(admin);
        await expect(requireSuperAdmin()).resolves.toBe(admin);
    });
});

describe("withAuth", () => {
    it("throws the context error when unauthenticated", async () => {
        mockedGetCurrentUser.mockResolvedValue(new AuthenticationError());
        const action = withAuth(async () => "ok");
        await expect(action()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it("passes the user to the handler", async () => {
        mockedGetCurrentUser.mockResolvedValue(user);
        const action = withAuth(async (u) => u.publicId);
        await expect(action()).resolves.toBe("A7K9P2X4");
    });
});

describe("withGlobalRole", () => {
    it("throws AuthorizationError when the role is missing", async () => {
        mockedGetCurrentUser.mockResolvedValue(user);
        const action = withGlobalRole(["ADMIN"], async () => "ok");
        await expect(action()).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("runs the handler when the role matches", async () => {
        mockedGetCurrentUser.mockResolvedValue(admin);
        const action = withGlobalRole(["ADMIN"], async () => "ok");
        await expect(action()).resolves.toBe("ok");
    });
});

describe("withSuperAdmin", () => {
    it("throws AuthorizationError when not super admin", async () => {
        mockedGetCurrentUser.mockResolvedValue({
            ...admin,
            isSuperAdmin: false,
        });
        const action = withSuperAdmin(async () => "ok");
        await expect(action()).rejects.toBeInstanceOf(AuthorizationError);
    });
});