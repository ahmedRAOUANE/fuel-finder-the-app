import { redirect } from "next/navigation";

import { AppError } from "@/errors/base.error";
import { AuthenticationError } from "@/errors/auth.error";

import { getCurrentUser, getCurrentStationContext } from "./context";
import {
    canOperateOnStation,
    hasGlobalRole,
    hasStationRole,
    isSelf,
    isSuperAdmin,
} from "./predicates";
import type {
    AuthenticatedUser,
    GlobalRole,
    StationContext,
    StationRole,
} from "./types";

const LOGIN_PATH = "/api/auth/login";
const DENIED_PATH = "/dashboard";
// const stationStatusPath = (publicId: string) =>
//     `/station/${publicId}/manage/status`;
const stationStatusPath = (publicId: string, role: string) => {
    const rolePath = role.toLowerCase(); // 'owner' | 'manager' | 'staff'
    return `/station/${publicId}/${rolePath}/status`;
};

export const requireAuth = async (): Promise<AuthenticatedUser> => {
    const user = await getCurrentUser();
    if (user instanceof AppError) redirect(LOGIN_PATH);
    return user;
};

export const requireSelf = async (
    publicId: string,
): Promise<AuthenticatedUser> => {
    const user = await requireAuth();
    if (!isSelf(user, publicId)) redirect(DENIED_PATH);
    return user;
};

export const requireGlobalRole = async (
    roles: readonly GlobalRole[],
): Promise<AuthenticatedUser> => {
    const user = await requireAuth();
    if (!hasGlobalRole(user, roles)) redirect(DENIED_PATH);
    return user;
};

export const requireSuperAdmin = async (): Promise<AuthenticatedUser> => {
    const user = await requireAuth();
    if (!isSuperAdmin(user)) redirect(DENIED_PATH);
    return user;
};

/**
 * Membership-only guard. Used by the status panel and any page that
 * must remain reachable while a station is not ACTIVE.
 */
export const requireStationAccess = async (
    stationPublicId: string,
): Promise<StationContext> => {
    const ctx = await getCurrentStationContext(stationPublicId);
    if (ctx instanceof AppError) {
        if (ctx instanceof AuthenticationError) redirect(LOGIN_PATH);
        redirect(DENIED_PATH);
    }
    return ctx;
};

/**
 * Membership + role + lifecycle guard. Used by normal management pages.
 * Non-ACTIVE stations redirect to the status panel instead of a 404.
 */
export const requireStationRole = async (
    stationPublicId: string,
    roles: readonly StationRole[],
): Promise<StationContext> => {
    const ctx = await getCurrentStationContext(stationPublicId);
    if (ctx instanceof AppError) {
        if (ctx instanceof AuthenticationError) redirect(LOGIN_PATH);
        redirect(DENIED_PATH);
    }
    if (!hasStationRole(ctx.membership, roles)) redirect(DENIED_PATH);
    if (!canOperateOnStation(ctx.station.status, ctx.user.globalRole)) {
        // redirect(stationStatusPath(stationPublicId));
        redirect(stationStatusPath(stationPublicId, ctx.membership.role));
    }
    return ctx;
};