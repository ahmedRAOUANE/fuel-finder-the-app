import { notFound } from "next/navigation";
import { requireStationRole } from "@/access/guards";
import { getStationDetailService } from "@/services/station.services";
import { HoursEditor } from "@/components/station/owner/hours-editor";
import { AppError } from "@/errors/base.error";

export default async function OwnerHoursPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    await requireStationRole(publicId, ["OWNER"]);

    const detail = await getStationDetailService(publicId);
    if (detail instanceof AppError || !detail) notFound();

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    ساعات العمل
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    حدّد أوقات الفتح والإغلاق لكل يوم.
                </p>
            </div>

            <HoursEditor station={detail} />
        </div>
    );
}