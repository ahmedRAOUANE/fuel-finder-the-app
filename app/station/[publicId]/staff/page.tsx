import { requireStationRole } from "@/access/guards";

export default async function StaffDashboardPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const { station } = await requireStationRole(publicId, ["STAFF"]);

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                {station.name}
            </h1>
            <p className="text-body-main text-on-surface-variant">
                لوحة تحكم الموظف — للقراءة فقط في هذا الإصدار.
            </p>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
                <p className="text-metadata text-on-surface-variant">الحالة</p>
                <p className="text-section-title font-bold text-on-surface mt-1">
                    {station.status}
                </p>
            </div>
        </div>
    );
}