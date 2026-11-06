"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Mail, AlertCircle, Building2 } from "lucide-react";
import {
    acceptInvitationAction,
    rejectInvitationAction,
} from "@/app/user/[userId]/invitations/actions";
import type { UserInvitationView } from "@/services/invitation.services";

interface Props {
    initialInvitations: UserInvitationView[];
}

const formatDate = (d: Date): string =>
    new Intl.DateTimeFormat("ar-DZ", {
        dateStyle: "medium",
    }).format(d);

export function InvitationsPanel({ initialInvitations }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [invitations, setInvitations] =
        useState<UserInvitationView[]>(initialInvitations);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const handleAccept = (invitationId: string) => {
        setError(null);
        setBusyId(invitationId);
        startTransition(async () => {
            const result = await acceptInvitationAction(invitationId);
            setBusyId(null);
            if (result.ok) {
                router.push(`/station/${result.data.stationPublicId}`);
                router.refresh();
            } else {
                setError(result.error.message);
            }
        });
    };

    const handleReject = (invitationId: string) => {
        setError(null);
        setBusyId(invitationId);
        startTransition(async () => {
            const result = await rejectInvitationAction(invitationId);
            setBusyId(null);
            if (result.ok) {
                setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
            } else {
                setError(result.error.message);
            }
        });
    };

    if (invitations.length === 0) {
        return (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg text-center">
                <Mail
                    className="size-10 mx-auto text-on-surface-variant mb-3"
                    aria-hidden
                />
                <p className="text-body-main text-on-surface-variant">
                    لا توجد دعوات معلّقة.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-stack-lg">
            {error && (
                <div className="flex items-start gap-2 p-stack-md bg-error-container/40 border border-error/30 rounded-xl text-error">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" aria-hidden />
                    <p className="text-body-main">{error}</p>
                </div>
            )}

            <ul className="space-y-stack-md">
                {invitations.map((inv) => {
                    const busy = isPending && busyId === inv.id;
                    return (
                        <li
                            key={inv.id}
                            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div className="size-10 rounded-lg bg-primary-container/10 flex items-center justify-center shrink-0">
                                    <Building2 className="size-5 text-primary" aria-hidden />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-section-title text-on-surface">
                                        {inv.stationName}
                                    </h3>
                                    <p className="text-metadata text-on-surface-variant mt-1">
                                        من {inv.inviterName}
                                    </p>
                                    <p className="text-label-caps text-on-surface-variant mt-1">
                                        أُرسلت {formatDate(inv.createdAt)} — تنتهي{" "}
                                        {formatDate(inv.expiresAt)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => handleAccept(inv.id)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90 disabled:opacity-50"
                                >
                                    <Check className="size-4" aria-hidden />
                                    {busy ? "جارٍ..." : "قبول الدعوة"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReject(inv.id)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-error text-metadata hover:bg-error-container/20 disabled:opacity-50"
                                >
                                    <X className="size-4" aria-hidden />
                                    رفض
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}