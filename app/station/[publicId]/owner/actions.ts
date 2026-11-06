"use server";

import { withStationRole } from "@/access/wrappers";
import {
    SetStationFuelsSchema,
    SetStationOpeningHoursSchema,
    SetStationServicesSchema,
    type OpeningHoursInput,
    type StationFuelInput,
} from "@/schemas/station.schemas";
import {
    setStationFuelsService,
    setStationOpeningHoursService,
    setStationServicesService,
} from "@/services/station.services";
import {
    catchToResult,
    err,
    ok,
    serviceResult,
    type ActionResult,
} from "@/actions/result";

interface CountResult {
    count: number;
}

/* ========================================================================== */
/*  Fuels                                                                     */
/* ========================================================================== */

const setFuelsHandler = withStationRole(
    ["OWNER"],
    async (
        owner,
        _membership,
        stationPublicId,
        input: { fuels: StationFuelInput[] },
    ): Promise<ActionResult<CountResult>> => {
        const result = await setStationFuelsService(
            owner,
            stationPublicId,
            input.fuels,
        );
        return serviceResult(result, (fuels) => ok({ count: fuels.length }));
    },
);

export const setStationFuelsAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<CountResult>> => {
    const parsed = SetStationFuelsSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await setFuelsHandler(stationPublicId, parsed.data);
    } catch (error) {
        return catchToResult(error);
    }
};

/* ========================================================================== */
/*  Services                                                                  */
/* ========================================================================== */

const setServicesHandler = withStationRole(
    ["OWNER"],
    async (
        owner,
        _membership,
        stationPublicId,
        input: { serviceIds: string[] },
    ): Promise<ActionResult<CountResult>> => {
        const result = await setStationServicesService(
            owner,
            stationPublicId,
            input.serviceIds,
        );
        return serviceResult(result, (rows) => ok({ count: rows.length }));
    },
);

export const setStationServicesAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<CountResult>> => {
    const parsed = SetStationServicesSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await setServicesHandler(stationPublicId, parsed.data);
    } catch (error) {
        return catchToResult(error);
    }
};

/* ========================================================================== */
/*  Opening hours                                                             */
/* ========================================================================== */

const setHoursHandler = withStationRole(
    ["OWNER"],
    async (
        owner,
        _membership,
        stationPublicId,
        input: { openingHours: OpeningHoursInput[] },
    ): Promise<ActionResult<CountResult>> => {
        const result = await setStationOpeningHoursService(
            owner,
            stationPublicId,
            input.openingHours,
        );
        return serviceResult(result, (rows) => ok({ count: rows.length }));
    },
);

export const setStationOpeningHoursAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<CountResult>> => {
    const parsed = SetStationOpeningHoursSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await setHoursHandler(stationPublicId, parsed.data);
    } catch (error) {
        return catchToResult(error);
    }
};