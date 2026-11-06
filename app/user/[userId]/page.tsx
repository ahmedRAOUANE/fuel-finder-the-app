import { requireSelf } from "@/access/guards";

export default async function UserDashboardPage({
    params,
}: PageProps<"/user/[userId]">) {
    const { userId } = await params;
    const user = await requireSelf(userId);

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    مرحباً بعودتك
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    هذه لوحة التحكم الخاصة بك.
                </p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
                <p className="text-metadata text-on-surface-variant">Public User ID</p>
                <p className="text-section-title font-mono text-primary mt-1">
                    {user.publicId}
                </p>
                <p className="text-metadata text-on-surface-variant mt-3">
                    شارك هذا المعرّف مع مالكي المحطات لدعوتك إلى فرقهم.
                </p>
            </div>
        </div>
    );
}