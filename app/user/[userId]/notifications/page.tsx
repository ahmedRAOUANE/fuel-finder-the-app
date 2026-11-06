import { requireSelf } from "@/access/guards";

export default async function NotificationsPage({
    params,
}: PageProps<"/user/[userId]/notifications">) {
    const { userId } = await params;
    await requireSelf(userId);

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                الإشعارات
            </h1>
            <p className="text-body-main text-on-surface-variant">
                Phase 6 will render the notification list here.
            </p>
        </div>
    );
}