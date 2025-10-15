import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UsersList } from "../_components/users-list";

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
        <div className="flex flex-col w-full max-w-7xl mx-auto gap-4">
            <div className="flex flex-col">
                <Label className="text-xl font-bold">Admin Panel</Label>
                <Label className="text-sm font-normal">Manage users and permissions</Label>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>Manage users and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersList />
                </CardContent>
            </Card>
        </div>
    )
}