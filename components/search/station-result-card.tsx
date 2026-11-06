"use client";

import Link from "next/link";
import { MapPin, Fuel, Tag } from "lucide-react";
import type { StationSearchResult } from "@/services/station.services";

interface Props {
    station: StationSearchResult;
}

const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)} م`;
    return `${km.toFixed(1)} كم`;
};

export function StationResultCard({ station }: Props) {
    const availableFuels = station.fuels.filter(
        (f) => f.availability === "AVAILABLE",
    );
    const displayFuels = (
        availableFuels.length > 0 ? availableFuels : station.fuels
    ).slice(0, 3);

    return (
        <Link
            href={`/station/${station.publicId}`}
            className="block bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md hover:border-primary hover:shadow-md transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-body-main font-semibold text-on-surface">
                    {station.name}
                </h3>
                {station.distanceKm !== null && (
                    <span className="text-label-caps text-primary flex items-center gap-1 shrink-0 ms-2">
                        <MapPin className="size-3" aria-hidden />
                        {formatDistance(station.distanceKm)}
                    </span>
                )}
            </div>

            <p className="text-metadata text-on-surface-variant mb-3 truncate">
                {station.address}
            </p>

            {displayFuels.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {displayFuels.map((f) => (
                        <div
                            key={f.code}
                            className="bg-surface-container-low rounded p-2 text-center"
                        >
                            <p className="text-[10px] text-on-surface-variant uppercase font-semibold truncate">
                                {f.displayName}
                            </p>
                            <p
                                className={`text-metadata font-bold ${f.availability === "AVAILABLE"
                                        ? "text-primary"
                                        : "text-on-surface-variant line-through"
                                    }`}
                            >
                                {f.priceDZD.toFixed(2)} دج
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {station.services.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {station.services.slice(0, 3).map((s) => (
                        <span
                            key={s.code}
                            className="text-label-caps px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant inline-flex items-center gap-1"
                        >
                            <Tag className="size-2.5" aria-hidden />
                            {s.name}
                        </span>
                    ))}
                    {station.services.length > 3 && (
                        <span className="text-label-caps px-2 py-0.5 text-on-surface-variant">
                            +{station.services.length - 3}
                        </span>
                    )}
                </div>
            )}

            {station.fuels.length === 0 && (
                <p className="text-label-caps text-on-surface-variant inline-flex items-center gap-1">
                    <Fuel className="size-3" aria-hidden />
                    لا توجد أسعار متاحة
                </p>
            )}
        </Link>
    );
}