import type { AuthenticatedUser } from "@/access/types";

export const composeUserName = (
    user: Pick<AuthenticatedUser, "firstName" | "lastName" | "email">,
): string => {
    const parts = [user.firstName, user.lastName].filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
    );
    if (parts.length > 0) return parts.join(" ").trim();
    return user.email;
};