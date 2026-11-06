import { requireStationRole } from "@/access/guards";
import { AppError } from "@/errors/base.error";
import { getLatestStatusHistoryService } from "@/services/station.services";

export default async function OwnerDashboardPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const { station } = await requireStationRole(publicId, ["OWNER"]);

    const history = await getLatestStatusHistoryService(station.id);
    const latest = history instanceof AppError ? null : history;

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    {station.name}
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    معرّف المحطة:{" "}
                    <span className="font-mono">{station.publicId}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
                    <p className="text-metadata text-on-surface-variant">الحالة</p>
                    <p className="text-section-title font-bold text-on-surface mt-1">
                        {station.status}
                    </p>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
                    <p className="text-metadata text-on-surface-variant">
                        آخر تحديث للحالة
                    </p>
                    <p className="text-section-title font-bold text-on-surface mt-1">
                        {latest ? latest.toStatus : "—"}
                    </p>
                </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
                <h2 className="text-section-title text-on-surface mb-4">
                    إدارة المحطة
                </h2>
                <div className="flex flex-wrap gap-3">
                    <a
                        href={`/station/${publicId}/owner/team`}
                        className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low"
                    >
                        الفريق
                    </a>
                    <a
                        href={`/station/${publicId}/owner/fuel`}
                        className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low"
                    >
                        الوقود
                    </a>
                    <a
                        href={`/station/${publicId}/owner/services`}
                        className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low"
                    >
                        الخدمات
                    </a>
                    <a
                        href={`/station/${publicId}/owner/hours`}
                        className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low"
                    >
                        ساعات العمل
                    </a>
                    <a
                        href={`/station/${publicId}/status`}
                        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90"
                    >
                        حالة المحطة
                    </a>
                </div>
            </div>
        </div>
    );
}