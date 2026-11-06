"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, AlertCircle } from "lucide-react";
import { resolveReportAction } from "@/app/admin/actions";
import type { ReportDetail } from "@/services/report.services";

interface Props {
    report: ReportDetail;
    adminPublicId: string;
}

const typeLabel: Record<string, string> = {
    INCORRECT_PRICE: "سعر خاطئ",
    WRONG_LOCATION: "موقع خاطئ",
    CLOSED_OR_NONEXISTENT: "مغلقة أو غير موجودة",
    INCORRECT_INFO: "معلومات خاطئة",
    OTHER: "أخرى",
};

const statusLabel: Record<string, string> = {
    OPEN: "مفتوح",
    REVIEWED: "قيد المراجعة",
    RESOLVED: "تم الحل",
    DISMISSED: "تم الرفض",
};

const isOpen = (s: string) => s === "OPEN" || s === "REVIEWED";

export function ReportDetailView({ report, adminPublicId }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [adminNote, setAdminNote] = useState(report.adminNote ?? "");
    const [error, setError] = useState<string | null>(null);

    const handleResolve = (status: "RESOLVED" | "DISMISSED" | "REVIEWED") => {
        setError(null);
        startTransition(async () => {
            const result = await resolveReportAction(report.id, {
                status,
                adminNote: adminNote.trim() || undefined,
            });
            if (result.ok) {
                router.push(`/admin/${adminPublicId}/reports`);
                router.refresh();
            } else {
                setError(result.error.message);
            }
        });
    };

    return (
        <div className="space-y-stack-lg">
            {error && (
                <div className="flex items-start gap-2 p-stack-md bg-error-container/40 border border-error/30 rounded-xl text-error">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" aria-hidden />
                    <p className="text-body-main">{error}</p>
                </div>
            )}

            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-label-caps text-on-surface-variant">النوع</p>
                        <p className="text-body-main text-on-surface font-semibold mt-1">
                            {typeLabel[report.type] ?? report.type}
                        </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-surface-container-high text-metadata text-on-surface">
                        {statusLabel[report.status] ?? report.status}
                    </span>
                </div>

                <div>
                    <p className="text-label-caps text-on-surface-variant">
                        الملاحظات
                    </p>
                    <p className="text-body-main text-on-surface mt-1 whitespace-pre-wrap">
                        {report.notes}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md pt-stack-md border-t border-outline-variant">
                    <div>
                        <p className="text-label-caps text-on-surface-variant">المحطة</p>
                        <a
                            href={`/station/${report.stationPublicId}`}
                            className="text-body-main text-primary hover:underline mt-1 block"
                        >
                            {report.stationName}
                        </a>
                        <p className="text-metadata text-on-surface-variant">
                            {report.stationAddress}
                        </p>
                    </div>
                    <div>
                        <p className="text-label-caps text-on-surface-variant">
                            المُبلِّغ
                        </p>
                        <p className="text-body-main text-on-surface mt-1">
                            {report.reporterName}
                        </p>
                        <p className="text-metadata text-on-surface-variant font-mono">
                            {report.reporterPublicId}
                        </p>
                    </div>
                </div>

                <div className="text-label-caps text-on-surface-variant pt-stack-md border-t border-outline-variant">
                    أُرسل في {report.createdAt.toLocaleString("ar-DZ")}
                </div>
            </section>

            {isOpen(report.status) && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                    <h2 className="text-section-title text-on-surface">
                        اتخاذ إجراء
                    </h2>

                    <div>
                        <label className="block text-metadata text-on-surface-variant mb-1">
                            ملاحظة داخلية (اختياري)
                        </label>
                        <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            rows={3}
                            disabled={isPending}
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-main text-on-surface resize-none"
                        />
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                        {report.status === "OPEN" && (
                            <button
                                type="button"
                                onClick={() => handleResolve("REVIEWED")}
                                disabled={isPending}
                                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-metadata disabled:opacity-50"
                            >
                                تحديد كقيد المراجعة
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleResolve("DISMISSED")}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-error text-error text-metadata hover:bg-error-container/20 disabled:opacity-50"
                        >
                            <X className="size-4" aria-hidden />
                            رفض البلاغ
                        </button>
                        <button
                            type="button"
                            onClick={() => handleResolve("RESOLVED")}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata disabled:opacity-50"
                        >
                            <Check className="size-4" aria-hidden />
                            {isPending ? "جارٍ..." : "تم الحل"}
                        </button>
                    </div>
                </section>
            )}

            {!isOpen(report.status) && report.adminNote && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                    <h2 className="text-section-title text-on-surface mb-2">
                        ملاحظة المشرف
                    </h2>
                    <p className="text-body-main text-on-surface whitespace-pre-wrap">
                        {report.adminNote}
                    </p>
                </section>
            )}
        </div>
    );
}