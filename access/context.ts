import { cache } from "react";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { AppError } from "@/errors/base.error";
import { AuthenticationError, AuthorizationError } from "@/errors/auth.error";
import { StationNotFoundError } from "@/errors/station.error";
import { syncKindeUserService } from "@/services/user.services";
import { getStationByPublicIdService } from "@/services/station.services";
import { getActiveMembershipService } from "@/services/stationMembership.services";

import type { AuthenticatedUser, StationContext } from "./types";

const isNextRedirect = (error: unknown): boolean => {
    if (typeof error !== "object" || error === null) return false;
    const digest = (error as { digest?: unknown }).digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
};

/**
 * Resolve the current authenticated user.
 *
 * Returns AppError rather than throwing. Guards redirect, wrappers throw,
 * pages render an error state. The context layer has no opinion.
 *
 * Wrapped in cache() so a page, its layout, and a server action in the
 * same request all resolve to one lookup.
 */
export const getCurrentUser = cache(
    async (): Promise<AuthenticatedUser | AppError> => {
        try {
            const { isAuthenticated, getUser } = getKindeServerSession();

            let authed = false;
            try {
                authed = (await isAuthenticated()) ?? false;
            } catch (error) {
                // Kinde can throw a NEXT_REDIRECT when the session is absent.
                // Treat it as "not authenticated" so callers decide what to do.
                if (isNextRedirect(error)) return new AuthenticationError();
                throw error;
            }

            if (!authed) return new AuthenticationError();

            const kindeUser = await getUser();
            if (!kindeUser?.id) return new AuthenticationError();

            return await syncKindeUserService({
                id: kindeUser.id,
                email: kindeUser.email ?? "",
                given_name: kindeUser.given_name ?? null,
                family_name: kindeUser.family_name ?? null,
                picture: kindeUser.picture ?? null,
            });
        } catch (error) {
            if (error instanceof AppError) return error;
            console.error("access/context > getCurrentUser", error);
            return new AuthenticationError();
        }
    },
);

/**
 * Resolve the current user's context within a specific station.
 *
 * Membership is required. Station lifecycle status is NOT checked here —
 * callers (guards/wrappers) decide whether status matters. This lets the
 * status panel render for a SUSPENDED station while mutations stay blocked.
 */
export const getCurrentStationContext = cache(
    async (stationPublicId: string): Promise<StationContext | AppError> => {
        const user = await getCurrentUser();
        if (user instanceof AppError) return user;

        const station = await getStationByPublicIdService(stationPublicId);
        if (station instanceof AppError) return station;
        if (!station) return new StationNotFoundError();

        const membership = await getActiveMembershipService(user.id, station.id);
        if (membership instanceof AppError) return membership;
        if (!membership) return new AuthorizationError();

        return { user, station, membership };
    },
);