import { notFound } from "next/navigation";
import { getCurrentUser } from "@/access/context";
import { AppError } from "@/errors/base.error";
import { getStationDetailService } from "@/services/station.services";
import { StationDetail } from "@/components/station/station-detail";
import { ReportModal } from "@/components/station/report-modal";

export default async function PublicStationPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const station = await getStationDetailService(publicId);
    if (station instanceof AppError || !station) notFound();

    const user = await getCurrentUser();
    const isAuthenticated = !(user instanceof AppError);

    return (
        <div>
            <StationDetail station={station} />
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-margin-desktop flex justify-end">
                <ReportModal
                    stationPublicId={station.publicId}
                    isAuthenticated={isAuthenticated}
                />
            </div>
        </div>
    );
}