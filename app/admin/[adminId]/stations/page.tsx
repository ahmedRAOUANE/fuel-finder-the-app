import { requireGlobalRole } from "@/access/guards";
import { listPendingStationsService } from "@/services/station.services";
import { approveStationAction, rejectStationAction } from "@/app/admin/actions";
import { AppError } from "@/errors/base.error";

export default async function StationsQueuePage() {
    await requireGlobalRole(["ADMIN"]);

    const result = await listPendingStationsService();
    const stations = result instanceof AppError ? [] : result;

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    المحطات المعلقة
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    راجع طلبات إنشاء المحطات الجديدة.
                </p>
            </div>

            {stations.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg text-center text-on-surface-variant">
                    لا توجد محطات معلقة حالياً.
                </div>
            ) : (
                <div className="space-y-stack-md">
                    {stations.map((station) => (
                        <div
                            key={station.id}
                            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-section-title font-semibold text-on-surface">
                                        {station.name}
                                    </h3>
                                    <p className="text-metadata text-on-surface-variant">
                                        {station.address}
                                    </p>
                                    <p className="text-metadata text-on-surface-variant">
                                        {station.publicId}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-start">
                                <form
                                    action={async () => {
                                        "use server";
                                        await approveStationAction(station.publicId);
                                    }}
                                >
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90"
                                    >
                                        موافقة
                                    </button>
                                </form>

                                <form
                                    action={async (formData) => {
                                        "use server";
                                        const reason = String(formData.get("reason") ?? "");
                                        await rejectStationAction(station.publicId, { reason });
                                    }}
                                    className="flex gap-2 flex-1 min-w-75"
                                >
                                    <input
                                        name="reason"
                                        required
                                        placeholder="سبب الرفض"
                                        className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-surface text-metadata"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg bg-error text-on-primary text-metadata hover:opacity-90"
                                    >
                                        رفض
                                    </button>
                                </form>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}