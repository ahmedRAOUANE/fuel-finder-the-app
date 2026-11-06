"use client";

import { StationResultCard } from "./station-result-card";
import type { StationSearchResult } from "@/services/station.services";

interface Props {
    results: StationSearchResult[];
    total: number;
    isPending: boolean;
}

export function ResultsList({ results, total, isPending }: Props) {
    if (isPending && results.length === 0) {
        return (
            <div className="p-stack-lg text-center text-metadata text-on-surface-variant">
                جارٍ البحث...
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="p-stack-lg text-center">
                <p className="text-body-main text-on-surface">
                    لا توجد محطات مطابقة.
                </p>
                <p className="text-metadata text-on-surface-variant mt-2">
                    جرّب تعديل الفلاتر أو البحث بموقع مختلف.
                </p>
            </div>
        );
    }

    return (
        <div
            className={`p-stack-md space-y-stack-md transition-opacity ${isPending ? "opacity-50" : "opacity-100"
                }`}
        >
            <p className="text-label-caps text-on-surface-variant">
                {total} محطة
            </p>
            {results.map((r) => (
                <StationResultCard key={r.publicId} station={r} />
            ))}
        </div>
    );
}