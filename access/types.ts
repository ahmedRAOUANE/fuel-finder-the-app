import type {
    User,
    Station,
    StationMembership,
} from "@/generated/prisma/client";

/** A DB user plus the env-derived super-admin flag. */
export type AuthenticatedUser = User & { isSuperAdmin: boolean };

/** Scalar station row (no relations). */
export type StationRow = Station;

/** Scalar membership row (no relations). */
export type StationMembershipRow = StationMembership;

export type GlobalRole = User["globalRole"];
export type StationRole = StationMembership["role"];
export type StationStatus = Station["status"];

/** Everything a station-scoped page or action needs in one object. */
export interface StationContext {
    user: AuthenticatedUser;
    station: StationRow;
    membership: StationMembershipRow;
}