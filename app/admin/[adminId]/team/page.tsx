// import { requireSuperAdmin } from "@/access/guards";
import { listAdminsService } from "@/services/user.services";
import { promoteAdminAction, demoteAdminAction } from "@/app/admin/actions";
import { AppError } from "@/errors/base.error";

export default async function AdminTeamPage() {
    // const user = await requireSuperAdmin();
    const result = await listAdminsService();
    const admins = result instanceof AppError ? [] : result;

    return (
        <div className="space-y-stack-lg max-w-container-max">
            <div>
                <h1 className="text-hero-title-mobile md:text-hero-title text-on-surface">
                    فريق المشرفين
                </h1>
                <p className="text-body-main text-on-surface-variant mt-2">
                    إدارة المشرفين على المنصة.
                </p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
                <h2 className="text-section-title text-on-surface mb-4">
                    ترقية مستخدم إلى مشرف
                </h2>
                <form
                    action={async (formData) => {
                        "use server";
                        const publicId = String(formData.get("publicId") ?? "");
                        await promoteAdminAction(publicId);
                    }}
                    className="flex gap-2 flex-wrap"
                >
                    <input
                        name="publicId"
                        required
                        placeholder="Public User ID (مثال: A7K9P2X4)"
                        className="flex-1 min-w-50 px-3 py-2 rounded-lg border border-outline-variant bg-surface text-metadata"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-metadata hover:opacity-90"
                    >
                        ترقية
                    </button>
                </form>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-surface-container-low">
                        <tr>
                            <th className="p-3 text-start text-metadata text-on-surface-variant">
                                الاسم
                            </th>
                            <th className="p-3 text-start text-metadata text-on-surface-variant">
                                Public ID
                            </th>
                            <th className="p-3 text-start text-metadata text-on-surface-variant">
                                الدور
                            </th>
                            <th className="p-3 text-end text-metadata text-on-surface-variant">
                                إجراء
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                        {admins.map((admin) => (
                            <tr key={admin.id}>
                                <td className="p-3 text-body-main text-on-surface">
                                    {[admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
                                        admin.email}
                                </td>
                                <td className="p-3 text-metadata text-on-surface-variant font-mono">
                                    {admin.publicId}
                                </td>
                                <td className="p-3 text-metadata text-on-surface">
                                    {admin.isSuperAdmin ? "Super Admin" : "Admin"}
                                </td>
                                <td className="p-3 text-end">
                                    {admin.isSuperAdmin ? (
                                        <span className="text-metadata text-on-surface-variant">
                                            محمي
                                        </span>
                                    ) : (
                                        <form
                                            action={async () => {
                                                "use server";
                                                await demoteAdminAction(admin.publicId);
                                            }}
                                        >
                                            <button
                                                type="submit"
                                                className="text-error hover:underline text-metadata"
                                            >
                                                إزالة
                                            </button>
                                        </form>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}