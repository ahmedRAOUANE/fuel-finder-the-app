"use server";

import { withStationRole } from "@/access/wrappers";
import { AppError } from "@/errors/base.error";
import {
    CreateInvitationSchema,
    PromoteMemberSchema,
    RemoveMemberSchema,
} from "@/schemas/invitation.schemas";
import { createInvitationService } from "@/services/invitation.services";
import {
    promoteMemberService,
    removeMemberService,
} from "@/services/stationMembership.services";
import { getStationByPublicIdService } from "@/services/station.services";
import {
    catchToResult,
    err,
    ok,
    serviceResult,
    type ActionResult,
} from "@/actions/result";

interface InvitationCreated {
    id: string;
    inviteePublicId: string;
}

interface MemberRoleChanged {
    publicId: string;
    role: string;
}

interface MemberRemoved {
    removedPublicId: string;
}

/* ========================================================================== */
/*  Invite                                                                    */
/* ========================================================================== */

const createHandler = withStationRole(
    ["OWNER"],
    async (
        owner,
        _membership,
        stationPublicId,
        input: { inviteePublicId: string },
    ): Promise<ActionResult<InvitationCreated>> => {
        const result = await createInvitationService(
            owner,
            stationPublicId,
            input.inviteePublicId,
        );
        return serviceResult(result, (inv) =>
            ok({ id: inv.id, inviteePublicId: inv.inviteePublicId }),
        );
    },
);

export const createInvitationAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<InvitationCreated>> => {
    const parsed = CreateInvitationSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await createHandler(stationPublicId, parsed.data);
    } catch (error) {
        return catchToResult(error);
    }
};

/* ========================================================================== */
/*  Promote                                                                   */
/* ========================================================================== */

const promoteHandler = withStationRole(
    ["OWNER"],
    async (
        owner,
        _membership,
        stationPublicId,
        input: { memberPublicId: string },
    ): Promise<ActionResult<MemberRoleChanged>> => {
        const station = await getStationByPublicIdService(stationPublicId);
        if (station instanceof AppError || !station) {
            return err("STATION_NOT_FOUND", "Station not found");
        }
        const result = await promoteMemberService(
            owner,
            station.id,
            input.memberPublicId,
        );
        return serviceResult(result, (m) =>
            ok({ publicId: m.publicId, role: m.role }),
        );
    },
);

export const promoteMemberAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<MemberRoleChanged>> => {
    const parsed = PromoteMemberSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await promoteHandler(stationPublicId, parsed.data);
    } catch (error) {
        return catchToResult(error);
    }
};

/* ========================================================================== */
/*  Remove                                                                    */
/* ========================================================================== */

const removeHandler = withStationRole(
    ["OWNER"],
    async (
        owner,
        _membership,
        stationPublicId,
        input: { memberPublicId: string },
    ): Promise<ActionResult<MemberRemoved>> => {
        const station = await getStationByPublicIdService(stationPublicId);
        if (station instanceof AppError || !station) {
            return err("STATION_NOT_FOUND", "Station not found");
        }
        const result = await removeMemberService(
            owner,
            station.id,
            input.memberPublicId,
        );
        return serviceResult(result, (r) => ok(r));
    },
);

export const removeMemberAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<MemberRemoved>> => {
    const parsed = RemoveMemberSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await removeHandler(stationPublicId, parsed.data);
    } catch (error) {
        return catchToResult(error);
    }
};