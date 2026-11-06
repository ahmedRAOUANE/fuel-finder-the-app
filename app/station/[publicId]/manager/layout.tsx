import { requireStationRole } from "@/access/guards";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { buildManagerNavItems } from "@/components/layout/nav-items";

export default async function ManagerLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ publicId: string }>;
}) {
    const { publicId } = await params;
    const { user, station } = await requireStationRole(publicId, ["MANAGER"]);
    const navItems = buildManagerNavItems(publicId);
    const displayName = user.firstName ?? user.email;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 h-screen">
            <div className="md:col-span-1">
                <AppSidebar title={station.name} items={navItems} />
            </div>
            <div className="md:col-span-3 flex flex-col overflow-hidden">
                <TopBar
                    title="إدارة المحطة"
                    userId={user.publicId}
                    userName={displayName}
                />
                <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop bg-background">
                    {children}
                </main>
            </div>
        </div>
    );
}