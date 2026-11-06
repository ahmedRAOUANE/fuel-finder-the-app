import { requireStationRole } from "@/access/guards";

export default async function OwnerTeamPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    await requireStationRole(publicId, ["OWNER"]);

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                الفريق
            </h1>
            <p className="text-body-main text-on-surface-variant">
                Phase 4 will deliver invitation and member management.
            </p>
        </div>
    );
}