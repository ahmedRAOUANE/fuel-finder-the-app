import type { StationDetail as StationDetailType } from "@/services/station.services";

interface Props {
    station: StationDetailType;
}

const dayLabels: Record<string, string> = {
    MONDAY: "الإثنين",
    TUESDAY: "الثلاثاء",
    WEDNESDAY: "الأربعاء",
    THURSDAY: "الخميس",
    FRIDAY: "الجمعة",
    SATURDAY: "السبت",
    SUNDAY: "الأحد",
};

export function StationDetail({ station }: Props) {
    return (
        <div className="max-w-container-max mx-auto p-margin-mobile md:p-margin-desktop space-y-stack-lg">
            <header className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                            {station.name}
                        </h1>
                        <p className="text-body-main text-on-surface-variant mt-2">
                            {station.address}
                        </p>
                        {station.phone && (
                            <a
                                href={`tel:${station.phone}`}
                                className="text-primary hover:underline mt-2 inline-block text-metadata"
                            >
                                {station.phone}
                            </a>
                        )}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary-container/10 text-primary text-metadata font-semibold">
                        {station.status === "ACTIVE" ? "نشطة" : station.status}
                    </span>
                </div>
                {station.description && (
                    <p className="text-body-main text-on-surface-variant mt-stack-md pt-stack-md border-t border-outline-variant">
                        {station.description}
                    </p>
                )}
            </header>

            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                <h2 className="text-section-title text-on-surface mb-4">أسعار الوقود</h2>
                {station.fuels.length === 0 ? (
                    <p className="text-on-surface-variant text-metadata">
                        لم يتم تحديد أسعار الوقود بعد.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {station.fuels.map((f) => (
                            <div
                                key={f.id}
                                className="p-4 bg-surface-container-low rounded-lg border border-outline-variant"
                            >
                                <p className="text-metadata text-on-surface-variant">
                                    {f.displayName}
                                </p>
                                <p className="text-section-title font-bold text-primary mt-1">
                                    {f.priceDZD.toString()} <span className="text-metadata">دج/ل</span>
                                </p>
                                {f.availability === "UNAVAILABLE" && (
                                    <p className="text-error text-label-caps mt-1">غير متوفر</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {station.services.length > 0 && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                    <h2 className="text-section-title text-on-surface mb-4">الخدمات</h2>
                    <div className="flex flex-wrap gap-2">
                        {station.services.map((s) => (
                            <span
                                key={s.id}
                                className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface text-metadata"
                            >
                                {s.serviceCatalog.name}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {station.openingHours.length > 0 && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                    <h2 className="text-section-title text-on-surface mb-4">
                        ساعات العمل
                    </h2>
                    <table className="w-full text-metadata">
                        <tbody>
                            {station.openingHours.map((h) => (
                                <tr
                                    key={h.id}
                                    className="border-b border-outline-variant/40 last:border-0"
                                >
                                    <td className="py-2 text-on-surface-variant">
                                        {dayLabels[h.dayOfWeek] ?? h.dayOfWeek}
                                    </td>
                                    <td className="py-2 text-on-surface text-end font-medium">
                                        {h.isClosed
                                            ? "مغلق"
                                            : `${h.openTime} – ${h.closeTime}`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
        </div>
    );
}