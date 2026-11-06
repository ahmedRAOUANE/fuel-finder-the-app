import { requireAuth } from "@/access/guards";

export default async function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAuth();
    return <>{children}</>;
}