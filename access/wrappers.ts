import { AuthorizationError } from "@/errors/auth.error";
import { AppError } from "@/errors/base.error";

import { getCurrentStationContext, getCurrentUser } from "./context";
import {
    canOperateOnStation,
    hasGlobalRole,
    hasStationRole,
    isSuperAdmin,
} from "./predicates";
import type {
    AuthenticatedUser,
    GlobalRole,
    StationMembershipRow,
    StationRole,
} from "./types";

type AuthenticatedHandler<TArgs extends unknown[], TResult> = (
    user: AuthenticatedUser,
    ...args: TArgs
) => TResult | Promise<TResult>;

type StationHandler<TArgs extends unknown[], TResult> = (
    user: AuthenticatedUser,
    membership: StationMembershipRow,
    stationPublicId: string,
    ...args: TArgs
) => TResult | Promise<TResult>;

export const withAuth = <TArgs extends unknown[], TResult>(
    handler: AuthenticatedHandler<TArgs, TResult>,
) => {
    return async (...args: TArgs): Promise<TResult> => {
        const user = await getCurrentUser();
        if (user instanceof AppError) throw user;
        return handler(user, ...args);
    };
};

export const withGlobalRole = <TArgs extends unknown[], TResult>(
    allowedRoles: readonly GlobalRole[],
    handler: AuthenticatedHandler<TArgs, TResult>,
) => {
    return withAuth<TArgs, TResult>(async (user, ...args) => {
        if (!hasGlobalRole(user, allowedRoles)) {
            throw new AuthorizationError();
        }
        return handler(user, ...args);
    });
};

export const withSuperAdmin = <TArgs extends unknown[], TResult>(
    handler: AuthenticatedHandler<TArgs, TResult>,
) => {
    return withAuth<TArgs, TResult>(async (user, ...args) => {
        if (!isSuperAdmin(user)) {
            throw new AuthorizationError();
        }
        return handler(user, ...args);
    });
};

/**
 * Station-scoped action wrapper.
 *
 * First argument must be the station publicId. Enforces membership and
 * the station lifecycle gate (non-admins may only operate on ACTIVE).
 */
export const withStationAccess = <
    TArgs extends unknown[],
    TResult,
>(
    handler: StationHandler<TArgs, TResult>,
) => {
    return async (
        stationPublicId: string,
        ...args: TArgs
    ): Promise<TResult> => {
        const user = await getCurrentUser();
        if (user instanceof AppError) throw user;

        const ctx = await getCurrentStationContext(stationPublicId);
        if (ctx instanceof AppError) throw ctx;

        if (!canOperateOnStation(ctx.station.status, user.globalRole)) {
            throw new AuthorizationError();
        }

        return handler(user, ctx.membership, stationPublicId, ...args);
    };
};

export const withStationRole = <
    TArgs extends unknown[],
    TResult,
>(
    allowedRoles: readonly StationRole[],
    handler: StationHandler<TArgs, TResult>,
) => {
    return withStationAccess<TArgs, TResult>(
        async (user, membership, stationPublicId, ...args) => {
            if (!hasStationRole(membership, allowedRoles)) {
                throw new AuthorizationError();
            }
            return handler(user, membership, stationPublicId, ...args);
        },
    );
};