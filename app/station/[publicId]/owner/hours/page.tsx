import { requireStationRole } from "@/access/guards";

export default async function OwnerHoursPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    await requireStationRole(publicId, ["OWNER"]);

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                ساعات العمل
            </h1>
            <p className="text-body-main text-on-surface-variant">
                Opening hours management arrives in a follow-up phase.
            </p>
        </div>
    );
}