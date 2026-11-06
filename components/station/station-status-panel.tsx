import type {
    Station,
    StationMembership,
} from "@/generated/prisma/client";

interface LatestHistory {
    fromStatus: Station["status"] | null;
    toStatus: Station["status"];
    reason: string | null;
    createdAt: Date;
}

interface Props {
    station: Station;
    membership: StationMembership;
    isSuperAdmin: boolean;
    latestHistory: LatestHistory | null;
}

export function StationStatusPanel({
    station,
    membership,
    isSuperAdmin,
    latestHistory,
}: Props) {
    const role = membership.role;
    const isOwner = role === "OWNER";
    const publicId = station.publicId;

    const statusLabel: Record<Station["status"], string> = {
        PENDING: "قيد المراجعة",
        ACTIVE: "نشطة",
        REJECTED: "مرفوضة",
        SUSPENDED: "معلّقة",
    };

    const statusTone: Record<Station["status"], string> = {
        PENDING: "bg-tertiary-container/10 text-tertiary border-tertiary/30",
        ACTIVE: "bg-primary-container/10 text-primary border-primary/30",
        REJECTED: "bg-error-container/40 text-error border-error/30",
        SUSPENDED: "bg-error-container/40 text-error border-error/30",
    };

    return (
        <div className="space-y-stack-lg">
            <header className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-metadata text-on-surface-variant">حالة المحطة</p>
                        <h1 className="text-section-title font-semibold text-on-surface mt-1">
                            {station.name}
                        </h1>
                    </div>
                    <span
                        className={`px-4 py-1.5 rounded-full border text-metadata font-semibold ${statusTone[station.status]}`}
                    >
                        {statusLabel[station.status]}
                    </span>
                </div>
            </header>

            {station.status === "PENDING" && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                    <h2 className="text-section-title text-on-surface mb-2">قيد المراجعة</h2>
                    <p className="text-body-main text-on-surface-variant">
                        طلب المحطة في انتظار مراجعة المشرف. سيتم إشعارك عند اتخاذ القرار.
                    </p>
                </section>
            )}

            {station.status === "REJECTED" && latestHistory?.reason && (
                <section className="bg-error-container/20 border border-error/30 rounded-xl p-stack-lg">
                    <h2 className="text-section-title text-error mb-2">سبب الرفض</h2>
                    <p className="text-body-main text-on-surface whitespace-pre-wrap">
                        {latestHistory.reason}
                    </p>
                    {isOwner && (
                        <div className="flex gap-3 mt-stack-md">
                            <a
                                href={`/station/${publicId}/resubmit`}
                                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90"
                            >
                                تعديل وإعادة التقديم
                            </a>
                        </div>
                    )}
                    {!isOwner && (
                        <p className="text-metadata text-on-surface-variant mt-stack-md">
                            يرجى التواصل مع المالك لتحديث الطلب.
                        </p>
                    )}
                </section>
            )}

            {station.status === "SUSPENDED" && (
                <section className="bg-error-container/20 border border-error/30 rounded-xl p-stack-lg">
                    <h2 className="text-section-title text-error mb-2">
                        المحطة معلّقة مؤقتاً
                    </h2>
                    {latestHistory?.reason && (
                        <p className="text-body-main text-on-surface whitespace-pre-wrap">
                            السبب: {latestHistory.reason}
                        </p>
                    )}
                    {isOwner && (
                        <div className="flex gap-3 mt-stack-md">
                            <a
                                href={`/station/${publicId}/owner`}
                                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90"
                            >
                                تصحيح وإعادة التقديم
                            </a>
                        </div>
                    )}
                    {!isOwner && (
                        <p className="text-metadata text-on-surface-variant mt-stack-md">
                            يرجى التواصل مع المالك لحل المشكلة.
                        </p>
                    )}
                </section>
            )}

            {station.status === "ACTIVE" && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                    <h2 className="text-section-title text-on-surface mb-2">
                        المحطة نشطة
                    </h2>
                    <p className="text-body-main text-on-surface-variant">
                        المحطة ظاهرة للجمهور وتعمل بشكل طبيعي.
                    </p>
                </section>
            )}

            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                <h2 className="text-section-title text-on-surface mb-3">معلومات</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-metadata">
                    <div>
                        <dt className="text-on-surface-variant">معرّف المحطة</dt>
                        <dd className="text-on-surface font-mono mt-1">{publicId}</dd>
                    </div>
                    <div>
                        <dt className="text-on-surface-variant">دورك</dt>
                        <dd className="text-on-surface mt-1">{role}</dd>
                    </div>
                    {isSuperAdmin && (
                        <div>
                            <dt className="text-on-surface-variant">الوصول</dt>
                            <dd className="text-primary mt-1">Super Admin</dd>
                        </div>
                    )}
                </dl>
            </section>
        </div>
    );
}