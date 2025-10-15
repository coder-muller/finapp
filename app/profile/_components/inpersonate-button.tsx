"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { UserX } from "lucide-react"
import { toast } from "sonner"

export function InpersonateButton() {
    const router = useRouter()
    const { data: session, isPending, refetch: refetchSession } = authClient.useSession()

    const handleStopImpersonating = async () => {
        await authClient.admin.stopImpersonating(undefined,{
            onSuccess: () => {
                refetchSession()
                router.push("/profile/admin")
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
            }
        })
    }

    if (!session?.session.impersonatedBy || isPending) return null

    return (
        <div className="fixed bottom-4 right-4">
            <Button onClick={handleStopImpersonating} variant="destructive" size="icon">
                <UserX />
            </Button>
        </div>
    )
}