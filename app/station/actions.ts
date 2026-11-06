"use server";

import { withAuth } from "@/access/wrappers";
import {
    CreateStationSchema,
    ResubmitStationSchema,
    type CreateStationInput,
} from "@/schemas/station.schemas";
import {
    createStationService,
    resubmitStationService,
} from "@/services/station.services";
import {
    catchToResult,
    err,
    ok,
    serviceResult,
    type ActionResult,
} from "@/actions/result";

interface StationCreated {
    publicId: string;
    status: string;
}

const createHandler = withAuth(
    async (
        user,
        input: CreateStationInput,
    ): Promise<ActionResult<StationCreated>> => {
        const result = await createStationService(user, input);
        return serviceResult(result, (station) =>
            ok({ publicId: station.publicId, status: station.status }),
        );
    },
);

export const createStationAction = async (
    rawInput: unknown,
): Promise<ActionResult<StationCreated>> => {
    const parsed = CreateStationSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await createHandler(parsed.data);
    } catch (error) {
        return catchToResult(error);
    }
};

const resubmitHandler = withAuth(
    async (
        user,
        stationPublicId: string,
        input: unknown,
    ): Promise<ActionResult<StationCreated>> => {
        const parsed = ResubmitStationSchema.safeParse(input);
        if (!parsed.success) {
            return err(
                "VALIDATION_ERROR",
                parsed.error.issues[0]?.message ?? "Invalid input",
            );
        }
        const result = await resubmitStationService(
            user,
            stationPublicId,
            parsed.data,
        );
        return serviceResult(result, (station) =>
            ok({ publicId: station.publicId, status: station.status }),
        );
    },
);

export const resubmitStationAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<StationCreated>> => {
    try {
        return await resubmitHandler(stationPublicId, rawInput);
    } catch (error) {
        return catchToResult(error);
    }
};