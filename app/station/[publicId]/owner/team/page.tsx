import { notFound } from "next/navigation";
import { requireStationRole } from "@/access/guards";
import {
    listInvitationsForStationService,
    type StationInvitationView,
} from "@/services/invitation.services";
import {
    listStationMembersService,
    type StationMemberDetail,
} from "@/services/stationMembership.services";
import { TeamPanel } from "@/components/station/owner/team-panel";
import { AppError } from "@/errors/base.error";

export default async function OwnerTeamPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const { user, station } = await requireStationRole(publicId, ["OWNER"]);

    const [members, invitations] = await Promise.all([
        listStationMembersService(station.id),
        listInvitationsForStationService(user, publicId),
    ]);

    if (members instanceof AppError || invitations instanceof AppError) {
        notFound();
    }

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    الفريق
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    ادعُ أعضاء جدد وأدر أدوار الفريق.
                </p>
            </div>

            <TeamPanel
                stationPublicId={publicId}
                currentUserPublicId={user.publicId}
                members={members as StationMemberDetail[]}
                pendingInvitations={invitations as StationInvitationView[]}
            />
        </div>
    );
}