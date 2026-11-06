import { notFound } from "next/navigation";
import { requireGlobalRole } from "@/access/guards";
import { AppError } from "@/errors/base.error";
import { getReportDetailService } from "@/services/report.services";
import { ReportDetailView } from "@/components/admin/report-detail";

export default async function ReportDetailPage({
    params,
}: {
    params: Promise<{ adminId: string; reportId: string }>;
}) {
    const { adminId, reportId } = await params;
    await requireGlobalRole(["ADMIN"]);

    const report = await getReportDetailService(reportId);
    if (report instanceof AppError || !report) notFound();

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <a
                    href={`/admin/${adminId}/reports`}
                    className="inline-flex items-center gap-2 text-metadata text-on-surface-variant hover:text-on-surface mb-3"
                >
                    <span aria-hidden>→</span>
                    عودة إلى التقارير
                </a>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    تفاصيل البلاغ
                </h1>
            </div>

            <ReportDetailView report={report} adminPublicId={adminId} />
        </div>
    );
}