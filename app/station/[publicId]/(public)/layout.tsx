import { notFound, redirect } from "next/navigation";
import { AppError } from "@/errors/base.error";
import { getCurrentUser } from "@/access/context";
import { getStationByPublicIdService } from "@/services/station.services";
import { getActiveMembershipService } from "@/services/stationMembership.services";

export default async function PublicStationLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;

    const station = await getStationByPublicIdService(publicId);
    if (station instanceof AppError || !station) notFound();
    if (station.status !== "ACTIVE") notFound();

    const user = await getCurrentUser();
    if (!(user instanceof AppError)) {
        const membership = await getActiveMembershipService(user.id, station.id);
        if (membership && !(membership instanceof AppError)) {
            redirect(`/station/${publicId}/${membership.role.toLowerCase()}`);
        }
    }

    return <>{children}</>;
}