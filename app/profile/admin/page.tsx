import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {

    // Get session and redirect if not authenticated
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return redirect("/login")

    // Check if user is admin
    const hasPermission = await auth.api.userHasPermission({
        headers: await headers(),
        body: {
            permission: { user: ["list"] }
        }
    })

    if (!hasPermission.success || hasPermission.error) return redirect("/profile")

    return (
        <div className="flex flex-col w-full h-full max-w-7xl mx-auto">
            <div className="flex flex-col">
                <Label className="text-xl font-bold">Admin</Label>
                <Label className="text-sm font-normal">Manage the admin panel</Label>
            </div>
        </div>
    )
}