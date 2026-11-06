"use client";

import { useState, useTransition } from "react";
import { Save, AlertCircle, Check } from "lucide-react";
import { setStationOpeningHoursAction } from "@/app/station/[publicId]/owner/actions";
import type { StationDetail } from "@/services/station.services";

interface HourRow {
    dayOfWeek: string;
    isClosed: boolean;
    openTime: string;
    closeTime: string;
}

interface Props {
    station: StationDetail;
}

const DAYS = [
    { code: "MONDAY", label: "الإثنين" },
    { code: "TUESDAY", label: "الثلاثاء" },
    { code: "WEDNESDAY", label: "الأربعاء" },
    { code: "THURSDAY", label: "الخميس" },
    { code: "FRIDAY", label: "الجمعة" },
    { code: "SATURDAY", label: "السبت" },
    { code: "SUNDAY", label: "الأحد" },
] as const;

export function HoursEditor({ station }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const [hours, setHours] = useState<HourRow[]>(() => {
        const map = new Map(station.openingHours.map((h) => [h.dayOfWeek, h]));
        return DAYS.map((d) => {
            const existing = map.get(d.code as never);
            return {
                dayOfWeek: d.code,
                isClosed: existing?.isClosed ?? true,
                openTime: existing?.openTime ?? "08:00",
                closeTime: existing?.closeTime ?? "20:00",
            };
        });
    });

    const update = (index: number, patch: Partial<HourRow>) => {
        setHours(hours.map((row, i) => (i === index ? { ...row, ...patch } : row)));
        setSaved(false);
    };

    const handleSave = () => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
            const result = await setStationOpeningHoursAction(station.publicId, {
                openingHours: hours.map((h) => ({
                    dayOfWeek: h.dayOfWeek,
                    isClosed: h.isClosed,
                    openTime: h.isClosed ? null : h.openTime,
                    closeTime: h.isClosed ? null : h.closeTime,
                })),
            });
            if (result.ok) {
                setSaved(true);
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

            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                <h2 className="text-section-title text-on-surface mb-4">ساعات العمل</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-metadata min-w-125">
                        <thead>
                            <tr className="border-b border-outline-variant">
                                <th className="text-start p-2 text-on-surface-variant">اليوم</th>
                                <th className="text-start p-2 text-on-surface-variant">مغلق</th>
                                <th className="text-start p-2 text-on-surface-variant">الفتح</th>
                                <th className="text-start p-2 text-on-surface-variant">الإغلاق</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hours.map((h, i) => {
                                const day = DAYS.find((d) => d.code === h.dayOfWeek);
                                return (
                                    <tr
                                        key={h.dayOfWeek}
                                        className="border-b border-outline-variant/40"
                                    >
                                        <td className="p-2 text-on-surface">{day?.label}</td>
                                        <td className="p-2">
                                            <input
                                                type="checkbox"
                                                checked={h.isClosed}
                                                onChange={(e) =>
                                                    update(i, { isClosed: e.target.checked })
                                                }
                                                className="size-4"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="time"
                                                value={h.openTime}
                                                onChange={(e) => update(i, { openTime: e.target.value })}
                                                disabled={h.isClosed}
                                                className="px-2 py-1 rounded border border-outline-variant bg-surface text-metadata disabled:opacity-50"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="time"
                                                value={h.closeTime}
                                                onChange={(e) =>
                                                    update(i, { closeTime: e.target.value })
                                                }
                                                disabled={h.isClosed}
                                                className="px-2 py-1 rounded border border-outline-variant bg-surface text-metadata disabled:opacity-50"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="flex justify-end items-center gap-3">
                {saved && (
                    <span className="inline-flex items-center gap-1 text-metadata text-primary">
                        <Check className="size-4" aria-hidden />
                        تم الحفظ
                    </span>
                )}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90 disabled:opacity-50"
                >
                    <Save className="size-4" aria-hidden />
                    {isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </button>
            </div>
        </div>
    );
}