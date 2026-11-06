import { notFound } from "next/navigation";
import { requireStationRole } from "@/access/guards";
import {
    getStationDetailService,
    listServiceCatalogService,
} from "@/services/station.services";
import { ServicesEditor } from "@/components/station/owner/services-editor";
import { AppError } from "@/errors/base.error";

export default async function OwnerServicesPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    await requireStationRole(publicId, ["OWNER"]);

    const [detail, serviceCatalog] = await Promise.all([
        getStationDetailService(publicId),
        listServiceCatalogService(),
    ]);

    if (
        detail instanceof AppError ||
        !detail ||
        serviceCatalog instanceof AppError
    ) {
        notFound();
    }

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    إدارة الخدمات
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    اختر الخدمات التي تقدمها محطتك.
                </p>
            </div>

            <ServicesEditor station={detail} serviceCatalog={serviceCatalog} />
        </div>
    );
}