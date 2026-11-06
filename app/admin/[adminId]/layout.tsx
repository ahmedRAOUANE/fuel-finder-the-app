import { requireGlobalRole } from "@/access/guards";
import { isSelf } from "@/access/predicates";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { buildAdminNavItems } from "@/components/layout/nav-items";

export default async function AdminIdLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ adminId: string }>;
}) {
    const { adminId } = await params;
    const user = await requireGlobalRole(["ADMIN"]);

    if (!isSelf(user, adminId)) {
        redirect(`/admin/${user.publicId}`);
    }

    const navItems = buildAdminNavItems(adminId);
    const displayName = user.firstName ?? user.email;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 h-screen">
            <div className="md:col-span-1">
                <AppSidebar title="وقودي" items={navItems} />
            </div>
            <div className="md:col-span-3 flex flex-col overflow-hidden">
                <TopBar title="لوحة التحكم" userId={user.publicId} userName={displayName} />
                <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop bg-background">
                    {children}
                </main>
            </div>
        </div>
    );
}