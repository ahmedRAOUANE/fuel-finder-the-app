import { redirect } from "next/navigation";
import { getCurrentUser } from "@/access/context";
import { AppError } from "@/errors/base.error";

export default async function DashboardPage() {
    const user = await getCurrentUser();
    if (user instanceof AppError) redirect("/api/auth/login");
    if (user.globalRole === "ADMIN") redirect(`/admin/${user.publicId}`);
    redirect(`/user/${user.publicId}`);
}