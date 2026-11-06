import { requireSelf } from "@/access/guards";
import {
    listInvitationsForUserService,
    type UserInvitationView,
} from "@/services/invitation.services";
import { InvitationsPanel } from "@/components/user/invitations-panel";
import { AppError } from "@/errors/base.error";

export default async function InvitationsPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    const user = await requireSelf(userId);

    const invitations = await listInvitationsForUserService(user);
    const list = invitations instanceof AppError ? [] : invitations;

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    الدعوات
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    الدعوات المعلّقة للانضمام إلى فرق المحطات.
                </p>
            </div>

            <InvitationsPanel initialInvitations={list as UserInvitationView[]} />
        </div>
    );
}