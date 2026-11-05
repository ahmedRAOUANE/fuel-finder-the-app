import type {
    AuthenticatedUser,
    GlobalRole,
    StationMembershipRow,
    StationRole,
    StationStatus,
} from "./types";

export const hasGlobalRole = (
    user: AuthenticatedUser,
    roles: readonly GlobalRole[],
): boolean => roles.includes(user.globalRole);

export const hasStationRole = (
    membership: StationMembershipRow | null | undefined,
    roles: readonly StationRole[],
): boolean => {
    if (!membership) return false;
    return roles.includes(membership.role);
};

export const isSelf = (
    user: AuthenticatedUser,
    publicId: string,
): boolean => user.publicId === publicId;

/**
 * Platform admins bypass lifecycle gating. Everyone else may operate
 * only on ACTIVE stations.
 */
export const canOperateOnStation = (
    status: StationStatus,
    globalRole: GlobalRole,
): boolean => {
    if (globalRole === "ADMIN") return true;
    return status === "ACTIVE";
};

export const isSuperAdmin = (user: AuthenticatedUser): boolean =>
    user.isSuperAdmin;