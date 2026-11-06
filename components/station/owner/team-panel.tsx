"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    UserPlus,
    Trash2,
    Crown,
    ShieldCheck,
    User as UserIcon,
    AlertCircle,
    Check,
} from "lucide-react";
import {
    createInvitationAction,
    promoteMemberAction,
    removeMemberAction,
} from "@/app/station/[publicId]/owner/team/actions";
import type { StationMemberDetail } from "@/services/stationMembership.services";
import type { StationInvitationView } from "@/services/invitation.services";

interface Props {
    stationPublicId: string;
    currentUserPublicId: string;
    members: StationMemberDetail[];
    pendingInvitations: StationInvitationView[];
}

const roleLabel: Record<string, string> = {
    OWNER: "المالك",
    MANAGER: "مدير",
    STAFF: "موظف",
};

const roleIcon = (role: string) => {
    if (role === "OWNER") return Crown;
    if (role === "MANAGER") return ShieldCheck;
    return UserIcon;
};

const formatName = (m: {
    firstName: string | null;
    lastName: string | null;
    email?: string;
}): string => {
    const parts = [m.firstName, m.lastName].filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
    );
    return parts.length > 0 ? parts.join(" ").trim() : m.email ?? "—";
};

export function TeamPanel({
    stationPublicId,
    currentUserPublicId,
    members,
    pendingInvitations,
}: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [invitePublicId, setInvitePublicId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const runAction = <T,>(
        action: () => Promise<{ ok: true; data: T } | { ok: false; error: { message: string } }>,
        successMessage: string,
        onSuccess?: () => void,
    ) => {
        setError(null);
        setSuccess(null);
        startTransition(async () => {
            const result = await action();
            if (result.ok) {
                setSuccess(successMessage);
                onSuccess?.();
                router.refresh();
            } else {
                setError(result.error.message);
            }
        });
    };

    const handleInvite = () => {
        const trimmed = invitePublicId.trim();
        if (!trimmed) return;
        runAction(
            () =>
                createInvitationAction(stationPublicId, {
                    inviteePublicId: trimmed,
                }),
            "تم إرسال الدعوة",
            () => setInvitePublicId(""),
        );
    };

    const handlePromote = (memberPublicId: string) => {
        runAction(
            () =>
                promoteMemberAction(stationPublicId, { memberPublicId }),
            "تمت الترقية إلى مدير",
        );
    };

    const handleRemove = (memberPublicId: string) => {
        runAction(
            () =>
                removeMemberAction(stationPublicId, { memberPublicId }),
            "تمت إزالة العضو",
        );
    };

    return (
        <div className="space-y-stack-lg">
            {error && (
                <div className="flex items-start gap-2 p-stack-md bg-error-container/40 border border-error/30 rounded-xl text-error">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" aria-hidden />
                    <p className="text-body-main">{error}</p>
                </div>
            )}
            {success && (
                <div className="flex items-start gap-2 p-stack-md bg-primary-container/10 border border-primary/30 rounded-xl text-primary">
                    <Check className="size-5 shrink-0 mt-0.5" aria-hidden />
                    <p className="text-body-main">{success}</p>
                </div>
            )}

            {/* Invite form */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-stack-md">
                <div>
                    <h2 className="text-section-title text-on-surface">
                        دعوة عضو جديد
                    </h2>
                    <p className="text-metadata text-on-surface-variant mt-1">
                        أدخل معرّف المستخدم العام (Public ID) الخاص بالعضو.
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <input
                        value={invitePublicId}
                        onChange={(e) => setInvitePublicId(e.target.value)}
                        placeholder="مثال: A7K9P2X4"
                        className="flex-1 min-w-50 px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-main font-mono"
                    />
                    <button
                        type="button"
                        onClick={handleInvite}
                        disabled={isPending || invitePublicId.trim().length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90 disabled:opacity-50"
                    >
                        <UserPlus className="size-4" aria-hidden />
                        إرسال الدعوة
                    </button>
                </div>
            </section>

            {/* Members list */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                <div className="p-stack-md border-b border-outline-variant">
                    <h2 className="text-section-title text-on-surface">
                        الأعضاء ({members.length})
                    </h2>
                </div>
                <table className="w-full">
                    <thead className="bg-surface-container-low">
                        <tr>
                            <th className="p-3 text-start text-metadata text-on-surface-variant">
                                العضو
                            </th>
                            <th className="p-3 text-start text-metadata text-on-surface-variant">
                                المعرّف العام
                            </th>
                            <th className="p-3 text-start text-metadata text-on-surface-variant">
                                الدور
                            </th>
                            <th className="p-3 text-end text-metadata text-on-surface-variant">
                                إجراء
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                        {members.map((m) => {
                            const Icon = roleIcon(m.role);
                            const isSelf = m.publicId === currentUserPublicId;
                            const isOwnerRole = m.role === "OWNER";
                            const isManager = m.role === "MANAGER";
                            return (
                                <tr key={m.publicId}>
                                    <td className="p-3 text-body-main text-on-surface">
                                        {formatName(m)}
                                        {isSelf && (
                                            <span className="text-metadata text-on-surface-variant ms-2">
                                                (أنت)
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-metadata text-on-surface-variant font-mono">
                                        {m.publicId}
                                    </td>
                                    <td className="p-3">
                                        <span className="inline-flex items-center gap-1 text-metadata text-on-surface">
                                            <Icon className="size-4" aria-hidden />
                                            {roleLabel[m.role] ?? m.role}
                                        </span>
                                    </td>
                                    <td className="p-3 text-end">
                                        {isOwnerRole ? (
                                            <span className="text-metadata text-on-surface-variant">
                                                —
                                            </span>
                                        ) : (
                                            <div className="inline-flex gap-2">
                                                {!isManager && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePromote(m.publicId)}
                                                        disabled={isPending}
                                                        className="text-primary hover:underline text-metadata disabled:opacity-50"
                                                    >
                                                        ترقية إلى مدير
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(m.publicId)}
                                                    disabled={isPending}
                                                    className="inline-flex items-center gap-1 text-error hover:underline text-metadata disabled:opacity-50"
                                                >
                                                    <Trash2 className="size-3.5" aria-hidden />
                                                    إزالة
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            {/* Pending invitations */}
            {pendingInvitations.length > 0 && (
                <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                    <div className="p-stack-md border-b border-outline-variant">
                        <h2 className="text-section-title text-on-surface">
                            دعوات معلّقة ({pendingInvitations.length})
                        </h2>
                    </div>
                    <ul className="divide-y divide-outline-variant">
                        {pendingInvitations.map((inv) => (
                            <li
                                key={inv.id}
                                className="p-3 flex items-center justify-between gap-3"
                            >
                                <div>
                                    <p className="text-metadata text-on-surface font-mono">
                                        {inv.inviteePublicId}
                                    </p>
                                    <p className="text-label-caps text-on-surface-variant">
                                        {inv.inviteeName ?? "بانتظار الانضمام"} — أُرسلت في{" "}
                                        {inv.createdAt.toLocaleDateString("ar-DZ")}
                                    </p>
                                </div>
                                <span className="text-label-caps px-2 py-0.5 rounded-full bg-tertiary-container/10 text-tertiary">
                                    معلّقة
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}