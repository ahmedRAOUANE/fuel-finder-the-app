import { requireGlobalRole } from "@/access/guards";
import { AppError } from "@/errors/base.error";
import { listReportsForAdminService } from "@/services/report.services";
import { ReportQueue } from "@/components/admin/report-queue";
import type { ReportStatus } from "@/schemas/report.schemas";

const TABS: { label: string; status?: ReportStatus }[] = [
    { label: "مفتوحة", status: "OPEN" },
    { label: "قيد المراجعة", status: "REVIEWED" },
    { label: "تم حلها", status: "RESOLVED" },
    { label: "مرفوضة", status: "DISMISSED" },
    { label: "الكل" },
];

export default async function AdminReportsPage({
    params,
    searchParams,
}: {
    params: Promise<{ adminId: string }>;
    searchParams: Promise<{ status?: string }>;
}) {
    const { adminId } = await params;
    const { status } = await searchParams;
    await requireGlobalRole(["ADMIN"]);

    const validStatus = (
        ["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"] as const
    ).includes(status as never)
        ? (status as ReportStatus)
        : undefined;

    const result = await listReportsForAdminService(
        validStatus ? { status: validStatus } : undefined,
    );
    const reports = result instanceof AppError ? [] : result;

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    التقارير
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    البلاغات الواردة من المستخدمين حول المحطات.
                </p>
            </div>

            <div className="flex gap-2 flex-wrap">
                {TABS.map((tab) => {
                    const active =
                        tab.status === validStatus ||
                        (!tab.status && validStatus === undefined);
                    const href = tab.status
                        ? `/admin/${adminId}/reports?status=${tab.status}`
                        : `/admin/${adminId}/reports`;
                    return (
                        <a
                            key={tab.label}
                            href={href}
                            className={`px-3 py-1.5 rounded-full text-metadata transition-colors ${active
                                    ? "bg-primary text-on-primary"
                                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                                }`}
                        >
                            {tab.label}
                        </a>
                    );
                })}
            </div>

            <ReportQueue reports={reports} adminPublicId={adminId} />
        </div>
    );
}