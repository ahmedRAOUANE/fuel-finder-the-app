"use server";

import { withGlobalRole, withSuperAdmin } from "@/access/wrappers";
import {
    RejectStationSchema,
    SuspendStationSchema,
} from "@/schemas/station.schemas";
import {
    PromoteAdminSchema,
    DemoteAdminSchema,
} from "@/schemas/admin.schemas";
import {
    approveStationService,
    reactivateStationService,
    rejectStationService,
    suspendStationService,
} from "@/services/station.services";
import {
    demoteAdminService,
    promoteAdminService,
} from "@/services/user.services";
import {
    catchToResult,
    err,
    ok,
    serviceResult,
    type ActionResult,
} from "@/actions/result";
import { resolveReportService } from "@/services/report.services";
import { ResolveReportSchema } from "@/schemas/report.schemas";

interface StationSummary {
    publicId: string;
    status: string;
}

interface AdminSummary {
    publicId: string;
    globalRole: string;
    isSuperAdmin: boolean;
}

/* ========================================================================== */
/*  Station lifecycle                                                         */
/* ========================================================================== */

const approveHandler = withGlobalRole(
    ["ADMIN"],
    async (
        admin,
        stationPublicId: string,
    ): Promise<ActionResult<StationSummary>> => {
        const result = await approveStationService(admin, stationPublicId);
        return serviceResult(result, (station) =>
            ok({ publicId: station.publicId, status: station.status }),
        );
    },
);

export const approveStationAction = async (
    stationPublicId: string,
): Promise<ActionResult<StationSummary>> => {
    try {
        return await approveHandler(stationPublicId);
    } catch (error) {
        return catchToResult(error);
    }
};

const rejectHandler = withGlobalRole(
    ["ADMIN"],
    async (
        admin,
        stationPublicId: string,
        reason: string,
    ): Promise<ActionResult<StationSummary>> => {
        const result = await rejectStationService(admin, stationPublicId, reason);
        return serviceResult(result, (station) =>
            ok({ publicId: station.publicId, status: station.status }),
        );
    },
);

export const rejectStationAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<StationSummary>> => {
    const parsed = RejectStationSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await rejectHandler(stationPublicId, parsed.data.reason);
    } catch (error) {
        return catchToResult(error);
    }
};

const suspendHandler = withGlobalRole(
    ["ADMIN"],
    async (
        admin,
        stationPublicId: string,
        reason: string,
    ): Promise<ActionResult<StationSummary>> => {
        const result = await suspendStationService(admin, stationPublicId, reason);
        return serviceResult(result, (station) =>
            ok({ publicId: station.publicId, status: station.status }),
        );
    },
);

export const suspendStationAction = async (
    stationPublicId: string,
    rawInput: unknown,
): Promise<ActionResult<StationSummary>> => {
    const parsed = SuspendStationSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid input",
        );
    }
    try {
        return await suspendHandler(stationPublicId, parsed.data.reason);
    } catch (error) {
        return catchToResult(error);
    }
};

const reactivateHandler = withGlobalRole(
    ["ADMIN"],
    async (
        admin,
        stationPublicId: string,
    ): Promise<ActionResult<StationSummary>> => {
        const result = await reactivateStationService(admin, stationPublicId);
        return serviceResult(result, (station) =>
            ok({ publicId: station.publicId, status: station.status }),
        );
    },
);

export const reactivateStationAction = async (
    stationPublicId: string,
): Promise<ActionResult<StationSummary>> => {
    try {
        return await reactivateHandler(stationPublicId);
    } catch (error) {
        return catchToResult(error);
    }
};

/* ========================================================================== */
/*  Admin management                                                          */
/* ========================================================================== */

const promoteHandler = withSuperAdmin(
    async (
        actor,
        targetPublicId: string,
    ): Promise<ActionResult<AdminSummary>> => {
        const result = await promoteAdminService(actor, targetPublicId);
        return serviceResult(result, (user) =>
            ok({
                publicId: user.publicId,
                globalRole: user.globalRole,
                isSuperAdmin: user.isSuperAdmin,
            }),
        );
    },
);

export const promoteAdminAction = async (
    targetPublicId: string,
): Promise<ActionResult<AdminSummary>> => {
    const parsed = PromoteAdminSchema.safeParse({ targetPublicId });
    if (!parsed.success) {
        return err("VALIDATION_ERROR", "Invalid user ID");
    }
    try {
        return await promoteHandler(parsed.data.targetPublicId);
    } catch (error) {
        return catchToResult(error);
    }
};

const demoteHandler = withSuperAdmin(
    async (
        actor,
        targetPublicId: string,
    ): Promise<ActionResult<AdminSummary>> => {
        const result = await demoteAdminService(actor, targetPublicId);
        return serviceResult(result, (user) =>
            ok({
                publicId: user.publicId,
                globalRole: user.globalRole,
                isSuperAdmin: user.isSuperAdmin,
            }),
        );
    },
);

export const demoteAdminAction = async (
    targetPublicId: string,
): Promise<ActionResult<AdminSummary>> => {
    const parsed = DemoteAdminSchema.safeParse({ targetPublicId });
    if (!parsed.success) {
        return err("VALIDATION_ERROR", "Invalid user ID");
    }
    try {
        return await demoteHandler(parsed.data.targetPublicId);
    } catch (error) {
        return catchToResult(error);
    }
};

/* ========================================================================== */
/*  Reports                                                                   */
/* ========================================================================== */

interface ReportSummary {
    id: string;
    status: string;
}

const resolveReportHandler = withGlobalRole(
    ["ADMIN"],
    async (
        admin,
        reportId: string,
        input: unknown,
    ): Promise<ActionResult<ReportSummary>> => {
        const parsed = ResolveReportSchema.safeParse(input);
        if (!parsed.success) {
            return err(
                "VALIDATION_ERROR",
                parsed.error.issues[0]?.message ?? "Invalid input",
            );
        }
        const result = await resolveReportService(admin, reportId, parsed.data);
        return serviceResult(result, (report) =>
            ok({ id: report.id, status: report.status }),
        );
    },
);

export const resolveReportAction = async (
    reportId: string,
    rawInput: unknown,
): Promise<ActionResult<ReportSummary>> => {
    try {
        return await resolveReportHandler(reportId, rawInput);
    } catch (error) {
        return catchToResult(error);
    }
};