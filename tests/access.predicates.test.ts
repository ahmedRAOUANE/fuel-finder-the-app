import { describe, expect, it } from "vitest";

import {
    canOperateOnStation,
    hasGlobalRole,
    hasStationRole,
    isSelf,
    isSuperAdmin,
} from "@/access/predicates";
import type {
    AuthenticatedUser,
    StationMembershipRow,
} from "@/access/types";

const baseUser: AuthenticatedUser = {
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

const baseMembership: StationMembershipRow = {
    id: "m1",
    userId: "u1",
    stationId: "s1",
    role: "OWNER",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("hasGlobalRole", () => {
    it("matches the user's global role", () => {
        expect(hasGlobalRole(baseUser, ["USER"])).toBe(true);
        expect(hasGlobalRole(baseUser, ["ADMIN"])).toBe(false);
    });

    it("matches any of several roles", () => {
        expect(hasGlobalRole(baseUser, ["ADMIN", "USER"])).toBe(true);
    });
});

describe("hasStationRole", () => {
    it("matches the membership role", () => {
        expect(hasStationRole(baseMembership, ["OWNER"])).toBe(true);
        expect(hasStationRole(baseMembership, ["STAFF"])).toBe(false);
    });

    it("returns false for null or undefined membership", () => {
        expect(hasStationRole(null, ["OWNER"])).toBe(false);
        expect(hasStationRole(undefined, ["OWNER"])).toBe(false);
    });

    it("matches any of several roles", () => {
        expect(hasStationRole(baseMembership, ["MANAGER", "OWNER"])).toBe(true);
    });
});

describe("isSelf", () => {
    it("compares public IDs", () => {
        expect(isSelf(baseUser, "A7K9P2X4")).toBe(true);
        expect(isSelf(baseUser, "ZZZZZZZZ")).toBe(false);
    });
});

describe("canOperateOnStation", () => {
    it("allows users to operate only on ACTIVE stations", () => {
        expect(canOperateOnStation("ACTIVE", "USER")).toBe(true);
        expect(canOperateOnStation("PENDING", "USER")).toBe(false);
        expect(canOperateOnStation("REJECTED", "USER")).toBe(false);
        expect(canOperateOnStation("SUSPENDED", "USER")).toBe(false);
    });

    it("lets admins bypass the lifecycle gate", () => {
        expect(canOperateOnStation("ACTIVE", "ADMIN")).toBe(true);
        expect(canOperateOnStation("SUSPENDED", "ADMIN")).toBe(true);
        expect(canOperateOnStation("PENDING", "ADMIN")).toBe(true);
    });
});

describe("isSuperAdmin", () => {
    it("reads the derived flag", () => {
        expect(isSuperAdmin(baseUser)).toBe(false);
        expect(isSuperAdmin({ ...baseUser, isSuperAdmin: true })).toBe(true);
    });
});