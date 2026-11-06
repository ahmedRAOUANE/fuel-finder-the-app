import { requireGlobalRole } from "@/access/guards";
import { listPendingStationsService } from "@/services/station.services";
import { AppError } from "@/errors/base.error";

export default async function AdminDashboardPage() {
    const user = await requireGlobalRole(["ADMIN"]);

    const result = await listPendingStationsService();
    const pending = result instanceof AppError ? [] : result;

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    نظرة عامة
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    لوحة تحكم المشرف.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
                    <p className="text-metadata text-on-surface-variant">
                        محطات بانتظار المراجعة
                    </p>
                    <p className="text-section-title font-bold text-on-surface mt-1">
                        {pending.length}
                    </p>
                </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
                <h2 className="text-section-title text-on-surface mb-4">إجراءات سريعة</h2>
                <div className="flex gap-3 flex-wrap">
                    <a
                        href={`/admin/${user.publicId}/stations`}
                        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90"
                    >
                        مراجعة المحطات المعلقة
                    </a>
                    <a
                        href={`/admin/${user.publicId}/team`}
                        className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-metadata hover:bg-surface-container-low"
                    >
                        إدارة الفريق
                    </a>
                </div>
            </div>
        </div>
    );
}