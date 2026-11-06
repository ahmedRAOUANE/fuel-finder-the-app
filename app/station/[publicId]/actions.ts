"use server";

import { withAuth } from "@/access/wrappers";
import { CreateReportSchema } from "@/schemas/report.schemas";
import { createReportService } from "@/services/report.services";
import {
    catchToResult,
    err,
    ok,
    serviceResult,
    type ActionResult,
} from "@/actions/result";

interface ReportCreated {
    reportId: string;
}

const createHandler = withAuth(
    async (
        user,
        stationPublicId: string,
        input: unknown,
    ): Promise<ActionResult<ReportCreated>> => {
        const parsed = CreateReportSchema.safeParse(input);
        if (!parsed.success) {
            return err(
                "VALIDATION_ERROR",
                parsed.error.issues[0]?.message ?? "Invalid input",
            );
        }
        const result = await createReportService(
            user,
            stationPublicId,
            parsed.data,
        );
        return serviceResult(result, (report) => ok({ reportId: report.id }));
    },
);

export const submitReportAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<ReportCreated>> => {
    try {
        return await createHandler(stationPublicId, rawInput);
    } catch (error) {
        return catchToResult(error);
    }
};