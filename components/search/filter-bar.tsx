"use client";

import { Search, MapPin, Filter } from "lucide-react";
import type { FilterState } from "./search-shell";

interface Props {
    filters: FilterState;
    fuelCatalogs: { code: string; name: string }[];
    serviceCatalogs: { code: string; name: string }[];
    hasLocation: boolean;
    onChange: (next: FilterState) => void;
    onUseLocation: () => void;
}

export function FilterBar({
    filters,
    fuelCatalogs,
    serviceCatalogs,
    hasLocation,
    onChange,
    onUseLocation,
}: Props) {
    const set = (patch: Partial<FilterState>) =>
        onChange({ ...filters, ...patch });

    return (
        <div className="p-stack-md space-y-stack-sm border-b border-outline-variant bg-surface shrink-0">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search
                        className="absolute inset-s-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant"
                        aria-hidden
                    />
                    <input
                        type="search"
                        value={filters.q}
                        onChange={(e) => set({ q: e.target.value })}
                        placeholder="ابحث باسم المحطة أو الموقع..."
                        className="w-full ps-9 pe-3 py-2 rounded-lg border border-outline-variant bg-surface text-metadata text-on-surface"
                    />
                </div>
                <button
                    type="button"
                    onClick={onUseLocation}
                    className={`px-3 rounded-lg border text-metadata transition-colors ${hasLocation
                            ? "bg-primary text-on-primary border-primary"
                            : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                        }`}
                    aria-label="استخدم موقعي"
                    title="استخدم موقعي"
                >
                    <MapPin className="size-4" aria-hidden />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <select
                    value={filters.fuelCode ?? ""}
                    onChange={(e) =>
                        set({ fuelCode: e.target.value || undefined })
                    }
                    className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-label-caps"
                >
                    <option value="">كل أنواع الوقود</option>
                    {fuelCatalogs.map((f) => (
                        <option key={f.code} value={f.code}>
                            {f.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.serviceCode ?? ""}
                    onChange={(e) =>
                        set({ serviceCode: e.target.value || undefined })
                    }
                    className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-label-caps"
                >
                    <option value="">كل الخدمات</option>
                    {serviceCatalogs.map((s) => (
                        <option key={s.code} value={s.code}>
                            {s.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.sort}
                    onChange={(e) =>
                        set({
                            sort: e.target.value as "recommended" | "nearest",
                        })
                    }
                    className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-label-caps"
                >
                    <option value="recommended">الأنسب</option>
                    <option value="nearest">الأقرب</option>
                </select>

                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface cursor-pointer">
                    <input
                        type="checkbox"
                        checked={filters.availableOnly ?? false}
                        onChange={(e) => set({ availableOnly: e.target.checked })}
                        className="size-3.5"
                    />
                    <span className="text-label-caps text-on-surface inline-flex items-center gap-1">
                        <Filter className="size-3" aria-hidden />
                        متوفر فقط
                    </span>
                </label>
            </div>
        </div>
    );
}