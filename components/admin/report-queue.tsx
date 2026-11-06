import Link from "next/link";
import { FileWarning, ChevronRight } from "lucide-react";
import type { ReportListItem } from "@/services/report.services";

interface Props {
    reports: ReportListItem[];
    adminPublicId: string;
}

const statusTone: Record<string, string> = {
    OPEN: "bg-error-container/40 text-error",
    REVIEWED: "bg-tertiary-container/10 text-tertiary",
    RESOLVED: "bg-primary-container/10 text-primary",
    DISMISSED: "bg-surface-container-high text-on-surface-variant",
};

const statusLabel: Record<string, string> = {
    OPEN: "مفتوح",
    REVIEWED: "قيد المراجعة",
    RESOLVED: "تم الحل",
    DISMISSED: "تم الرفض",
};

const typeLabel: Record<string, string> = {
    INCORRECT_PRICE: "سعر خاطئ",
    WRONG_LOCATION: "موقع خاطئ",
    CLOSED_OR_NONEXISTENT: "مغلقة أو غير موجودة",
    INCORRECT_INFO: "معلومات خاطئة",
    OTHER: "أخرى",
};

export function ReportQueue({ reports, adminPublicId }: Props) {
    if (reports.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg text-center">
                <FileWarning
                    className="size-10 mx-auto text-on-surface-variant mb-3"
                    aria-hidden
                />
                <p className="text-body-main text-on-surface-variant">
                    لا توجد تقارير في هذه الحالة.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <ul className="divide-y divide-outline-variant">
                {reports.map((r) => (
                    <li key={r.id}>
                        <Link
                            href={`/admin/${adminPublicId}/reports/${r.id}`}
                            className="p-4 flex items-center justify-between gap-4 hover:bg-surface-container-low transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-metadata font-semibold text-on-surface">
                                        {r.stationName}
                                    </span>
                                    <span
                                        className={`text-label-caps px-2 py-0.5 rounded-full ${statusTone[r.status] ?? ""}`}
                                    >
                                        {statusLabel[r.status] ?? r.status}
                                    </span>
                                </div>
                                <p className="text-metadata text-on-surface-variant truncate">
                                    {typeLabel[r.type] ?? r.type} — {r.notes}
                                </p>
                                <p className="text-label-caps text-on-surface-variant mt-1">
                                    من {r.reporterName} —{" "}
                                    {r.createdAt.toLocaleDateString("ar-DZ")}
                                </p>
                            </div>
                            <ChevronRight
                                className="size-5 shrink-0 text-on-surface-variant rtl:rotate-180"
                                aria-hidden
                            />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}