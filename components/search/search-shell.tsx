"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Fuel, LogIn, User as UserIcon } from "lucide-react";
import { searchStationsAction } from "@/app/search.actions";
import {
    type SearchResponse,
} from "@/services/station.services";
import { FilterBar } from "./filter-bar";
import { ResultsList } from "./results-list";

const MapView = dynamic(
    () => import("./map-view").then((m) => m.MapView),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-metadata">
                جارٍ تحميل الخريطة...
            </div>
        ),
    },
);

export interface FilterState {
    q: string;
    lat?: number;
    lng?: number;
    fuelCode?: string;
    serviceCode?: string;
    availableOnly?: boolean;
    sort: "recommended" | "nearest";
}

interface Props {
    initialResults: SearchResponse;
    fuelCatalogs: { code: string; name: string }[];
    serviceCatalogs: { code: string; name: string }[];
    user: { publicId: string; firstName: string | null } | null;
}

const toSearchInput = (f: FilterState) => {
    const input: Record<string, unknown> = { sort: f.sort };
    if (f.q.trim()) input.q = f.q.trim();
    if (f.lat !== undefined && f.lng !== undefined) {
        input.lat = f.lat;
        input.lng = f.lng;
    }
    if (f.fuelCode) input.fuelCode = f.fuelCode;
    if (f.serviceCode) input.serviceCode = f.serviceCode;
    if (f.availableOnly) input.availableOnly = true;
    return input;
};

export function SearchShell({
    initialResults,
    fuelCatalogs,
    serviceCatalogs,
    user,
}: Props) {
    const [data, setData] = useState<SearchResponse>(initialResults);
    const [filters, setFilters] = useState<FilterState>({
        q: "",
        sort: "recommended",
    });
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const search = (next: FilterState) => {
        setFilters(next);
        setError(null);
        startTransition(async () => {
            const result = await searchStationsAction(toSearchInput(next));
            if (result.ok) {
                setData(result.data);
            } else {
                setError(result.error.message);
            }
        });
    };

    const handleUseLocation = () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setError("خدمة تحديد الموقع غير متاحة في هذا المتصفح.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                search({
                    ...filters,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    sort: "nearest",
                });
            },
            () => {
                setError("تم رفض الوصول إلى الموقع.");
            },
            { timeout: 8000 },
        );
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            <header className="bg-surface border-b border-outline-variant h-16 px-margin-mobile md:px-margin-desktop flex items-center justify-between shrink-0">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-primary"
                >
                    <Fuel className="size-6" aria-hidden />
                    <span className="text-section-title font-bold">وقودي</span>
                </Link>

                <nav className="flex items-center gap-3">
                    {user ? (
                        <Link
                            href={`/user/${user.publicId}`}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant hover:bg-surface-container transition-colors"
                        >
                            <UserIcon className="size-4 text-primary" aria-hidden />
                            <span className="text-metadata text-on-surface hidden md:block">
                                {user.firstName ?? "حسابي"}
                            </span>
                        </Link>
                    ) : (
                        <Link
                            href="/api/auth/login"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity"
                        >
                            <LogIn className="size-4" aria-hidden />
                            <span className="text-metadata">تسجيل الدخول</span>
                        </Link>
                    )}
                </nav>
            </header>

            <main className="flex flex-1 overflow-hidden">
                <aside className="w-full md:w-105 flex flex-col bg-surface-container-low border-e border-outline-variant overflow-hidden">
                    <FilterBar
                        filters={filters}
                        fuelCatalogs={fuelCatalogs}
                        serviceCatalogs={serviceCatalogs}
                        hasLocation={data.userLocation !== null}
                        onChange={search}
                        onUseLocation={handleUseLocation}
                    />

                    <div className="flex-1 overflow-y-auto">
                        {error && (
                            <div className="m-stack-md p-stack-md bg-error-container/40 border border-error/30 rounded-xl text-error text-metadata">
                                {error}
                            </div>
                        )}
                        <ResultsList
                            results={data.results}
                            total={data.total}
                            isPending={isPending}
                        />
                    </div>
                </aside>

                <div className="hidden md:block flex-1 bg-surface-container">
                    <MapView
                        results={data.results}
                        userLocation={data.userLocation}
                    />
                </div>
            </main>
        </div>
    );
}