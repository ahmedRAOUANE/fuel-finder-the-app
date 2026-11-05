import type { NotificationDefinition } from "./definition";
import {
    stationApproved,
    stationRejected,
    stationSuspended,
    stationReactivated,
} from "./definitions/station";
import { adminPromoted, adminDemoted } from "./definitions/admin";

/**
 * Core notification types owned by this MVP. Frozen so nothing mutates
 * it at runtime. Extensions are explicitly out of scope.
 */
export const CORE_NOTIFICATION_REGISTRY = Object.freeze({
    [stationApproved.type]: stationApproved,
    [stationRejected.type]: stationRejected,
    [stationSuspended.type]: stationSuspended,
    [stationReactivated.type]: stationReactivated,
    [adminPromoted.type]: adminPromoted,
    [adminDemoted.type]: adminDemoted,
} satisfies Record<string, NotificationDefinition>);

export type CoreNotificationType = keyof typeof CORE_NOTIFICATION_REGISTRY;

export const isCoreNotificationType = (
    type: string,
): type is CoreNotificationType =>
    Object.prototype.hasOwnProperty.call(CORE_NOTIFICATION_REGISTRY, type);

/**
 * Resolve a stored notification's `type` to its definition.
 * Returns `null` for unknown types so callers can fall back.
 */
export const lookupNotificationDefinition = (
    type: string,
): NotificationDefinition | null => {
    if (isCoreNotificationType(type)) {
        return CORE_NOTIFICATION_REGISTRY[type];
    }
    return null;
};