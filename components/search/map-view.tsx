"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
} from "react-leaflet";
import type {
    SearchResponse,
    StationSearchResult,
} from "@/services/station.services";

interface Props {
    results: StationSearchResult[];
    userLocation: SearchResponse["userLocation"];
}

const ALGIERS: [number, number] = [36.7538, 3.0588];

const priceIcon = (label: string) =>
    L.divIcon({
        className: "",
        html: `<div style="background:#004ac6;color:#fff;padding:4px 10px;border-radius:9999px;font-weight:600;font-size:12px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid #fff;">${label}</div>`,
        iconSize: [60, 30],
        iconAnchor: [30, 28],
    });

const userIcon = () =>
    L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,0.25);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });

const cheapestPrice = (station: StationSearchResult): string | null => {
    const available = station.fuels.filter(
        (f) => f.availability === "AVAILABLE",
    );
    if (available.length === 0) return null;
    const min = Math.min(...available.map((f) => f.priceDZD));
    return `${min.toFixed(0)} دج`;
};

function MapCenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 12);
    }, [center, map]);
    return null;
}

export function MapView({ results, userLocation }: Props) {
    const initialCenter: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : results.length > 0
            ? [results[0].latitude, results[0].longitude]
            : ALGIERS;

    return (
        <div className="w-full h-full">
            <MapContainer
                center={initialCenter}
                zoom={12}
                scrollWheelZoom
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapCenter center={initialCenter} />

                {userLocation && (
                    <Marker
                        position={[userLocation.lat, userLocation.lng]}
                        icon={userIcon()}
                    >
                        <Popup>موقعك الحالي</Popup>
                    </Marker>
                )}

                {results.map((station) => {
                    const price = cheapestPrice(station);
                    return (
                        <Marker
                            key={station.publicId}
                            position={[station.latitude, station.longitude]}
                            icon={priceIcon(price ?? station.name.slice(0, 10))}
                        >
                            <Popup>
                                <div style={{ minWidth: 180 }}>
                                    <strong>{station.name}</strong>
                                    <br />
                                    <small>{station.address}</small>
                                    {station.distanceKm !== null && (
                                        <>
                                            <br />
                                            <small>{station.distanceKm.toFixed(1)} كم</small>
                                        </>
                                    )}
                                    <br />
                                    <a
                                        href={`/station/${station.publicId}`}
                                        style={{ color: "#004ac6", fontWeight: 600 }}
                                    >
                                        عرض التفاصيل →
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}