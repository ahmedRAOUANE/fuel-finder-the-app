import { notFound } from "next/navigation";
import { AppError } from "@/errors/base.error";
import { getStationDetailService } from "@/services/station.services";
import { StationDetail } from "@/components/station/station-detail";

export default async function PublicStationPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const station = await getStationDetailService(publicId);
    if (station instanceof AppError || !station) notFound();

    return <StationDetail station={station} />;
}