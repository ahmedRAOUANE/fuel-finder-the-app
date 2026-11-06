"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, X, AlertCircle, Check } from "lucide-react";
import { submitReportAction } from "@/app/station/[publicId]/actions";

interface Props {
    stationPublicId: string;
    isAuthenticated: boolean;
}

const TYPES = [
    { value: "INCORRECT_PRICE", label: "سعر خاطئ" },
    { value: "WRONG_LOCATION", label: "موقع خاطئ" },
    { value: "CLOSED_OR_NONEXISTENT", label: "مغلقة أو غير موجودة" },
    { value: "INCORRECT_INFO", label: "معلومات خاطئة" },
    { value: "OTHER", label: "أخرى" },
] as const;

export function ReportModal({ stationPublicId, isAuthenticated }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<string>("INCORRECT_PRICE");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isPending, startTransition] = useTransition();

    const reset = () => {
        setType("INCORRECT_PRICE");
        setNotes("");
        setError(null);
        setSuccess(false);
    };

    const handleOpen = () => {
        if (!isAuthenticated) {
            router.push("/api/auth/login");
            return;
        }
        reset();
        setOpen(true);
    };

    const handleClose = () => {
        if (isPending) return;
        setOpen(false);
    };

    const handleSubmit = () => {
        setError(null);
        startTransition(async () => {
            const result = await submitReportAction(stationPublicId, {
                type,
                notes: notes.trim(),
            });
            if (result.ok) {
                setSuccess(true);
                setTimeout(() => setOpen(false), 1500);
            } else {
                setError(result.error.message);
            }
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-metadata hover:bg-surface-container-low"
            >
                <Flag className="size-4" aria-hidden />
                الإبلاغ عن مشكلة
            </button>

            {open && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-md w-full p-stack-lg shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-section-title text-on-surface">
                                الإبلاغ عن مشكلة
                            </h2>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isPending}
                                className="p-1 rounded hover:bg-surface-container-low disabled:opacity-50"
                                aria-label="إغلاق"
                            >
                                <X className="size-5" aria-hidden />
                            </button>
                        </div>

                        {success ? (
                            <div className="flex items-start gap-2 p-stack-md bg-primary-container/10 border border-primary/30 rounded-lg text-primary">
                                <Check className="size-5 shrink-0 mt-0.5" aria-hidden />
                                <p className="text-body-main">
                                    تم استلام الإبلاغ. شكراً لمساهمتك.
                                </p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="flex items-start gap-2 p-stack-md mb-3 bg-error-container/40 border border-error/30 rounded-lg text-error">
                                        <AlertCircle
                                            className="size-5 shrink-0 mt-0.5"
                                            aria-hidden
                                        />
                                        <p className="text-metadata">{error}</p>
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="block text-metadata text-on-surface-variant mb-1">
                                        نوع المشكلة
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        disabled={isPending}
                                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-main text-on-surface"
                                    >
                                        {TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-metadata text-on-surface-variant mb-1">
                                        ملاحظات
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        disabled={isPending}
                                        rows={4}
                                        placeholder="صف المشكلة التي لاحظتها..."
                                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-main text-on-surface resize-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        disabled={isPending}
                                        className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-metadata disabled:opacity-50"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isPending || notes.trim().length === 0}
                                        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata disabled:opacity-50"
                                    >
                                        {isPending ? "جارٍ الإرسال..." : "إرسال الإبلاغ"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}