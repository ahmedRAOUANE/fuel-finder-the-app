import { notFound } from "next/navigation";
import { requireStationRole } from "@/access/guards";
import {
    getStationDetailService,
    listFuelCatalogService,
} from "@/services/station.services";
import { FuelEditor } from "@/components/station/owner/fuel-editor";
import { AppError } from "@/errors/base.error";

export default async function OwnerFuelPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    await requireStationRole(publicId, ["OWNER"]);

    const [detail, fuelCatalog] = await Promise.all([
        getStationDetailService(publicId),
        listFuelCatalogService(),
    ]);

    if (
        detail instanceof AppError ||
        !detail ||
        fuelCatalog instanceof AppError
    ) {
        notFound();
    }

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    إدارة الوقود
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    حدّث أسعار الوقود والتوفر لعملائك.
                </p>
            </div>

            <FuelEditor station={detail} fuelCatalog={fuelCatalog} />
        </div>
    );
}