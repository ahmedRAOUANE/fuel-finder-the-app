import { requireSelf } from "@/access/guards";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { buildUserNavItems } from "@/components/layout/nav-items";

export default async function UserIdLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    const user = await requireSelf(userId);

    const navItems = buildUserNavItems(userId);
    const displayName = user.firstName ?? user.email;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 h-screen">
            <div className="md:col-span-1">
                <AppSidebar title="وقودي" items={navItems} />
            </div>
            <div className="md:col-span-3 flex flex-col overflow-hidden">
                <TopBar title="حسابي" userId={user.publicId} userName={displayName} />
                <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop bg-background">
                    {children}
                </main>
            </div>
        </div>
    );
}