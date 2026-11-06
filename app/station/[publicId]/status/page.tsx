import { requireStationAccess } from "@/access/guards";
import {
    getLatestStatusHistoryService,
} from "@/services/station.services";
import { StationStatusPanel } from "@/components/station/station-status-panel";
import { AppError } from "@/errors/base.error";

export default async function StatusPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const { user, station, membership } = await requireStationAccess(publicId);

    const history = await getLatestStatusHistoryService(station.id);

    return (
        <div className="max-w-container-max mx-auto p-margin-mobile md:p-margin-desktop">
            <StationStatusPanel
                station={station}
                membership={membership}
                isSuperAdmin={user.isSuperAdmin}
                latestHistory={history instanceof AppError ? null : history}
            />
        </div>
    );
}