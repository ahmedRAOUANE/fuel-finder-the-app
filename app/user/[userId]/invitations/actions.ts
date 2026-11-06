"use server";

import { withAuth } from "@/access/wrappers";
import {
    acceptInvitationService,
    rejectInvitationService,
} from "@/services/invitation.services";
import {
    catchToResult,
    ok,
    serviceResult,
    type ActionResult,
} from "@/actions/result";

interface InvitationHandled {
    stationPublicId: string;
}

const acceptHandler = withAuth(
    async (
        user,
        invitationId: string,
    ): Promise<ActionResult<InvitationHandled>> => {
        const result = await acceptInvitationService(user, invitationId);
        return serviceResult(result, (r) =>
            ok({ stationPublicId: r.stationPublicId }),
        );
    },
);

export const acceptInvitationAction = async (
    invitationId: string,
): Promise<ActionResult<InvitationHandled>> => {
    try {
        return await acceptHandler(invitationId);
    } catch (error) {
        return catchToResult(error);
    }
};

const rejectHandler = withAuth(
    async (
        user,
        invitationId: string,
    ): Promise<ActionResult<InvitationHandled>> => {
        const result = await rejectInvitationService(user, invitationId);
        return serviceResult(result, (r) =>
            ok({ stationPublicId: r.stationPublicId }),
        );
    },
);

export const rejectInvitationAction = async (
    invitationId: string,
): Promise<ActionResult<InvitationHandled>> => {
    try {
        return await rejectHandler(invitationId);
    } catch (error) {
        return catchToResult(error);
    }
};