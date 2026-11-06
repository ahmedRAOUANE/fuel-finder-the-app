import { redirect } from "next/navigation";
import { requireStationAccess } from "@/access/guards";
import {
    getStationDetailService,
    listFuelCatalogService,
    listServiceCatalogService,
} from "@/services/station.services";
import { ResubmitForm } from "@/components/station/resubmit-form";
import { AppError } from "@/errors/base.error";

export default async function ResubmitPage({
    params,
}: {
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const { membership, station } = await requireStationAccess(publicId);

    if (membership.role !== "OWNER") {
        redirect(`/station/${publicId}/status`);
    }

    if (station.status !== "REJECTED") {
        redirect(
            station.status === "ACTIVE"
                ? `/station/${publicId}/owner`
                : `/station/${publicId}/status`,
        );
    }

    const [detail, fuelCatalog, serviceCatalog] = await Promise.all([
        getStationDetailService(publicId),
        listFuelCatalogService(),
        listServiceCatalogService(),
    ]);

    if (
        detail instanceof AppError ||
        !detail ||
        fuelCatalog instanceof AppError ||
        serviceCatalog instanceof AppError
    ) {
        redirect(`/station/${publicId}/status`);
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-container-max mx-auto p-margin-mobile md:p-margin-desktop">
                <div className="mb-stack-lg">
                    <a
                        href={`/station/${publicId}/status`}
                        className="inline-flex items-center gap-2 text-metadata text-on-surface-variant hover:text-on-surface"
                    >
                        <span aria-hidden>←</span>
                        عودة إلى الحالة
                    </a>
                </div>

                <div className="mb-stack-lg">
                    <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                        تعديل وإعادة التقديم
                    </h1>
                    <p className="text-body-main text-on-surface-variant mt-2">
                        راجع الحقول التالية وصحّح المعلومات، ثم أعد تقديم الطلب للمراجعة.
                    </p>
                </div>

                <ResubmitForm
                    station={detail}
                    fuelCatalog={fuelCatalog}
                    serviceCatalog={serviceCatalog}
                />
            </div>
        </div>
    );
}