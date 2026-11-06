"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { resubmitStationAction } from "@/app/station/actions";
import type { StationDetail } from "@/services/station.services";
import type { FuelCatalog, ServiceCatalog } from "@/generated/prisma/client";

interface FuelRow {
    id?: string;
    fuelCatalogId: string;
    displayName: string;
    priceDZD: string;
    availability: "AVAILABLE" | "UNAVAILABLE";
}

interface HourRow {
    dayOfWeek: string;
    isClosed: boolean;
    openTime: string;
    closeTime: string;
}

interface Props {
    station: StationDetail;
    fuelCatalog: FuelCatalog[];
    serviceCatalog: ServiceCatalog[];
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

export function ResubmitForm({ station, fuelCatalog, serviceCatalog }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(station.name);
    const [description, setDescription] = useState(station.description ?? "");
    const [phone, setPhone] = useState(station.phone ?? "");
    const [address, setAddress] = useState(station.address);
    const [latitude, setLatitude] = useState(station.latitude.toString());
    const [longitude, setLongitude] = useState(station.longitude.toString());

    const [fuels, setFuels] = useState<FuelRow[]>(
        station.fuels.map((f) => ({
            id: f.id,
            fuelCatalogId: f.fuelCatalogId,
            displayName: f.displayName,
            priceDZD: f.priceDZD.toString(),
            availability: f.availability,
        })),
    );

    const [serviceIds, setServiceIds] = useState<string[]>(
        station.services.map((s) => s.serviceCatalogId),
    );

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

    const addFuelRow = () => {
        const available = fuelCatalog.find(
            (f) => !fuels.some((row) => row.fuelCatalogId === f.id),
        );
        if (!available) return;
        setFuels([
            ...fuels,
            {
                fuelCatalogId: available.id,
                displayName: available.name,
                priceDZD: "0",
                availability: "AVAILABLE",
            },
        ]);
    };

    const removeFuelRow = (index: number) => {
        setFuels(fuels.filter((_, i) => i !== index));
    };

    const updateFuelRow = (index: number, patch: Partial<FuelRow>) => {
        setFuels(fuels.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const toggleService = (id: string) => {
        setServiceIds((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
        );
    };

    const updateHour = (index: number, patch: Partial<HourRow>) => {
        setHours(hours.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const handleSubmit = () => {
        setError(null);
        startTransition(async () => {
            const payload = {
                name: name.trim(),
                description: description.trim() || undefined,
                phone: phone.trim() || undefined,
                address: address.trim(),
                latitude: Number(latitude),
                longitude: Number(longitude),
                fuels: fuels.map((f) => ({
                    fuelCatalogId: f.fuelCatalogId,
                    displayName: f.displayName.trim(),
                    priceDZD: Number(f.priceDZD),
                    availability: f.availability,
                })),
                services: serviceIds,
                openingHours: hours.map((h) => ({
                    dayOfWeek: h.dayOfWeek,
                    isClosed: h.isClosed,
                    openTime: h.isClosed ? null : h.openTime,
                    closeTime: h.isClosed ? null : h.closeTime,
                })),
            };

            const result = await resubmitStationAction(station.publicId, payload);

            if (result.ok) {
                router.push(`/station/${station.publicId}/status`);
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

            {/* Basic info */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                <h2 className="text-section-title text-on-surface">المعلومات الأساسية</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
                    <div>
                        <label className="block text-metadata text-on-surface-variant mb-1">
                            اسم المحطة
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-main"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-metadata text-on-surface-variant mb-1">
                            رقم الهاتف
                        </label>
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-main"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-metadata text-on-surface-variant mb-1">
                            الوصف
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-main"
                        />
                    </div>
                </div>
            </section>

            {/* Location */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                <h2 className="text-section-title text-on-surface">الموقع</h2>

                <div>
                    <label className="block text-metadata text-on-surface-variant mb-1">
                        العنوان
                    </label>
                    <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-main"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
                    <div>
                        <label className="block text-metadata text-on-surface-variant mb-1">
                            خط العرض
                        </label>
                        <input
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            type="number"
                            step="0.000001"
                            min="-90"
                            max="90"
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-main font-mono"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-metadata text-on-surface-variant mb-1">
                            خط الطول
                        </label>
                        <input
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            type="number"
                            step="0.000001"
                            min="-180"
                            max="180"
                            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-main font-mono"
                            required
                        />
                    </div>
                </div>
            </section>

            {/* Fuels */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                <div className="flex items-center justify-between">
                    <h2 className="text-section-title text-on-surface">الوقود</h2>
                    <button
                        type="button"
                        onClick={addFuelRow}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low"
                    >
                        <Plus className="size-4" aria-hidden />
                        إضافة
                    </button>
                </div>

                {fuels.length === 0 ? (
                    <p className="text-metadata text-on-surface-variant">
                        يجب إضافة نوع وقود واحد على الأقل.
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
                                        onChange={(e) =>
                                            updateFuelRow(i, { displayName: e.target.value })
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-outline-variant bg-surface text-metadata"
                                    />
                                </div>
                                <div>
                                    <label className="block text-label-caps text-on-surface-variant mb-1">
                                        السعر (دج/ل)
                                    </label>
                                    <input
                                        value={fuel.priceDZD}
                                        onChange={(e) =>
                                            updateFuelRow(i, { priceDZD: e.target.value })
                                        }
                                        type="number"
                                        step="0.01"
                                        min="0"
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
                                            updateFuelRow(i, {
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
                                    onClick={() => removeFuelRow(i)}
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

            {/* Services */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                <h2 className="text-section-title text-on-surface">الخدمات</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {serviceCatalog.map((svc) => (
                        <label
                            key={svc.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={serviceIds.includes(svc.id)}
                                onChange={() => toggleService(svc.id)}
                                className="size-4 rounded border-outline-variant"
                            />
                            <span className="text-metadata text-on-surface">{svc.name}</span>
                        </label>
                    ))}
                </div>
            </section>

            {/* Hours */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                <h2 className="text-section-title text-on-surface">ساعات العمل</h2>
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
                                                    updateHour(i, { isClosed: e.target.checked })
                                                }
                                                className="size-4"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="time"
                                                value={h.openTime}
                                                onChange={(e) =>
                                                    updateHour(i, { openTime: e.target.value })
                                                }
                                                disabled={h.isClosed}
                                                className="px-2 py-1 rounded border border-outline-variant bg-surface text-metadata disabled:opacity-50"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="time"
                                                value={h.closeTime}
                                                onChange={(e) =>
                                                    updateHour(i, { closeTime: e.target.value })
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

            {/* Submit */}
            <div className="flex justify-end gap-3">
                <a
                    href={`/station/${station.publicId}/status`}
                    className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low"
                >
                    إلغاء
                </a>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90 disabled:opacity-50"
                >
                    <Save className="size-4" aria-hidden />
                    {isPending ? "جارٍ الإرسال..." : "إعادة التقديم للمراجعة"}
                </button>
            </div>
        </div>
    );
}