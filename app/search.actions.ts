"use server";

import {
    searchStationsService,
    type SearchResponse,
} from "@/services/station.services";
import { SearchSchema } from "@/schemas/search.schemas";
import {
    catchToResult,
    err,
    ok,
    serviceResult,
    type ActionResult,
} from "@/actions/result";

export const searchStationsAction = async (
    rawInput: unknown,
): Promise<ActionResult<SearchResponse>> => {
    const parsed = SearchSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        const result = await searchStationsService(parsed.data);
        return serviceResult(result, ok);
    } catch (error) {
        return catchToResult(error);
    }
};