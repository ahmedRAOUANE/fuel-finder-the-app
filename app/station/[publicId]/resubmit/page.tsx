import { redirect } from "next/navigation";
import { requireStationAccess } from "@/access/guards";
import {
    getStationDetailService,
    getLatestStatusHistoryService,
    listFuelCatalogService,
    listServiceCatalogService,
} from "@/services/station.services";
import { ResubmitForm } from "@/components/station/resubmit-form";
import { AppError } from "@/errors/base.error";

export default async function ResubmitPage({
    params,
}: PageProps<"/station/[publicId]/resubmit">) {
    const { publicId } = await params;
    const { membership, station } = await requireStationAccess(publicId);

    if (membership.role !== "OWNER") {
        redirect(`/station/${publicId}/status`);
    }

    if (station.status !== "REJECTED" && station.status !== "SUSPENDED") {
        redirect(
            station.status === "ACTIVE"
                ? `/station/${publicId}/owner`
                : `/station/${publicId}/status`,
        );
    }

    const [detail, fuelCatalog, serviceCatalog, history] = await Promise.all([
        getStationDetailService(publicId),
        listFuelCatalogService(),
        listServiceCatalogService(),
        getLatestStatusHistoryService(station.id),
    ]);

    if (
        detail instanceof AppError ||
        !detail ||
        fuelCatalog instanceof AppError ||
        serviceCatalog instanceof AppError
    ) {
        redirect(`/station/${publicId}/status`);
    }

    const fromSuspended = station.status === "SUSPENDED";
    const suspensionReason =
        history instanceof AppError || history === null
            ? null
            : history.reason;

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
                        {fromSuspended ? "تصحيح وإعادة التقديم" : "تعديل وإعادة التقديم"}
                    </h1>
                    <p className="text-body-main text-on-surface-variant mt-2">
                        {fromSuspended
                            ? "تم تعليق محطتك. راجع الحقول التالية وصحّح المعلومات، ثم أعد التقديم للمراجعة."
                            : "راجع الحقول التالية وصحّح المعلومات، ثم أعد تقديم الطلب للمراجعة."}
                    </p>
                    <p className="text-metadata text-on-surface-variant mt-2">
                        بعد الإرسال ستُعاد المحطة إلى قائمة المراجعة لدى المشرفين.
                    </p>
                </div>

                {fromSuspended && suspensionReason && (
                    <div className="mb-stack-lg p-stack-md bg-error-container/20 border border-error/30 rounded-xl">
                        <p className="text-label-caps text-error mb-1">
                            سبب التعليق
                        </p>
                        <p className="text-body-main text-on-surface whitespace-pre-wrap">
                            {suspensionReason}
                        </p>
                    </div>
                )}

                <ResubmitForm
                    station={detail}
                    fuelCatalog={fuelCatalog}
                    serviceCatalog={serviceCatalog}
                />
            </div>
        </div>
    );
}