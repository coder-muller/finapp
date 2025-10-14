import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { auth } from "@/lib/auth"
import { Bitcoin } from "lucide-react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function ProfilePage() {

    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        return redirect("/login")
    }

    return (
        <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="flex items-center justify-center gap-2 mb-4">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bitcoin className="size-5" />
                </div>
                <Label className="text-2xl font-bold">Finapp</Label>
            </div>
            <Label className="text-md font-normal">Hello, {session.user.name || <Skeleton className="w-20 h-4" />}!</Label>
        </div>
    )
}