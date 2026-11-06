import { requireGlobalRole } from "@/access/guards";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireGlobalRole(["ADMIN"]);
    return <>{children}</>;
}