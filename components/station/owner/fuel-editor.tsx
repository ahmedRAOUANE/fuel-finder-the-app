"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save, AlertCircle, Check } from "lucide-react";
import { setStationFuelsAction } from "@/app/station/[publicId]/owner/actions";
import type { StationDetail } from "@/services/station.services";
import type { FuelCatalog } from "@/generated/prisma/client";

interface FuelRow {
    fuelCatalogId: string;
    displayName: string;
    priceDZD: string;
    availability: "AVAILABLE" | "UNAVAILABLE";
}

interface Props {
    station: StationDetail;
    fuelCatalog: FuelCatalog[];
}

export function FuelEditor({ station, fuelCatalog }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const [fuels, setFuels] = useState<FuelRow[]>(
        station.fuels.map((f) => ({
            fuelCatalogId: f.fuelCatalogId,
            displayName: f.displayName,
            priceDZD: f.priceDZD.toString(),
            availability: f.availability,
        })),
    );

    const addRow = () => {
        const next = fuelCatalog.find(
            (f) => !fuels.some((row) => row.fuelCatalogId === f.id),
        );
        if (!next) return;
        setFuels([
            ...fuels,
            {
                fuelCatalogId: next.id,
                displayName: next.name,
                priceDZD: "0",
                availability: "AVAILABLE",
            },
        ]);
        setSaved(false);
    };

    const removeRow = (index: number) => {
        setFuels(fuels.filter((_, i) => i !== index));
        setSaved(false);
    };

    const updateRow = (index: number, patch: Partial<FuelRow>) => {
        setFuels(fuels.map((row, i) => (i === index ? { ...row, ...patch } : row)));
        setSaved(false);
    };

    const handleSave = () => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
            const result = await setStationFuelsAction(station.publicId, {
                fuels: fuels.map((f) => ({
                    fuelCatalogId: f.fuelCatalogId,
                    displayName: f.displayName.trim(),
                    priceDZD: Number(f.priceDZD),
                    availability: f.availability,
                })),
            });
            if (result.ok) {
                setSaved(true);
            } else {
                setError(result.error.message);
            }
        });
    };

    const availableToAdd = fuelCatalog.length - fuels.length;

    return (
        <div className="space-y-stack-lg">
            {error && (
                <div className="flex items-start gap-2 p-stack-md bg-error-container/40 border border-error/30 rounded-xl text-error">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" aria-hidden />
                    <p className="text-body-main">{error}</p>
                </div>
            )}

            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                <div className="flex items-center justify-between">
                    <h2 className="text-section-title text-on-surface">أنواع الوقود</h2>
                    <button
                        type="button"
                        onClick={addRow}
                        disabled={availableToAdd === 0}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low disabled:opacity-50"
                    >
                        <Plus className="size-4" aria-hidden />
                        إضافة
                    </button>
                </div>

                {fuels.length === 0 ? (
                    <p className="text-metadata text-on-surface-variant">
                        أضف نوع وقود واحداً على الأقل.
                    </p>
                ) : (
                    <div className="space-y-stack-sm">
                        {fuels.map((fuel, i) => (
                            <div
                                key={fuel.fuelCatalogId}
                                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-3 rounded-lg bg-surface-container-low"
                            >
                                <div>
                                    <label className="block text-label-caps text-on-surface-variant mb-1">
                                        الاسم المعروض
                                    </label>
                                    <input
                                        value={fuel.displayName}
                                        onChange={(e) => updateRow(i, { displayName: e.target.value })}
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-surface text-metadata"
                                    />
                                </div>
                                <div>
                                    <label className="block text-label-caps text-on-surface-variant mb-1">
                                        السعر (دج/ل)
                                    </label>
                                    <input
                                        value={fuel.priceDZD}
                                        onChange={(e) => updateRow(i, { priceDZD: e.target.value })}
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-surface text-metadata font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-label-caps text-on-surface-variant mb-1">
                                        التوفر
                                    </label>
                                    <select
                                        value={fuel.availability}
                                        onChange={(e) =>
                                            updateRow(i, {
                                                availability: e.target.value as
                                                    | "AVAILABLE"
                                                    | "UNAVAILABLE",
                                            })
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-surface text-metadata"
                                    >
                                        <option value="AVAILABLE">متوفر</option>
                                        <option value="UNAVAILABLE">غير متوفر</option>
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeRow(i)}
                                    className="p-2 text-error hover:bg-error-container/30 rounded"
                                    aria-label="حذف"
                                >
                                    <Trash2 className="size-4" aria-hidden />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
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
                    disabled={isPending || fuels.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90 disabled:opacity-50"
                >
                    <Save className="size-4" aria-hidden />
                    {isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </button>
            </div>
        </div>
    );
}