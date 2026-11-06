"use client";

import { useState, useTransition } from "react";
import { Save, AlertCircle, Check } from "lucide-react";
import { setStationServicesAction } from "@/app/station/[publicId]/owner/actions";
import type { StationDetail } from "@/services/station.services";
import type { ServiceCatalog } from "@/generated/prisma/client";

interface Props {
    station: StationDetail;
    serviceCatalog: ServiceCatalog[];
}

export function ServicesEditor({ station, serviceCatalog }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const [serviceIds, setServiceIds] = useState<string[]>(
        station.services.map((s) => s.serviceCatalogId),
    );

    const toggle = (id: string) => {
        setServiceIds((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
        );
        setSaved(false);
    };

    const handleSave = () => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
            const result = await setStationServicesAction(station.publicId, {
                serviceIds,
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
                <h2 className="text-section-title text-on-surface mb-4">الخدمات</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {serviceCatalog.map((svc) => (
                        <label
                            key={svc.id}
                            className="flex items-center gap-2 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={serviceIds.includes(svc.id)}
                                onChange={() => toggle(svc.id)}
                                className="size-4 rounded border-outline-variant"
                            />
                            <span className="text-metadata text-on-surface">{svc.name}</span>
                        </label>
                    ))}
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