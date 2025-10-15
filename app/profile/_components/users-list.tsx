"use client"

import { authClient } from "@/lib/auth-client"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, CircleCheckIcon, CircleSlashIcon, MoreHorizontalIcon, TrashIcon, UserMinusIcon, UsersIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { UserWithRole } from "better-auth/plugins/admin"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"

export const Empty = () => {
    return (
        <div className="w-full flex items-center justify-center p-4 border rounded-md">
            <Label className="text-sm text-muted-foreground">No users found</Label>
        </div>
    )
}

export const UserCardSkeleton = () => {
    return (
        <div className="w-full flex flex-col gap-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
        </div>
    )
}

export const UserCard = ({ user, onSuccess }: { user: UserWithRole, onSuccess: () => void }) => {
    // Hooks
    const router = useRouter()
    const { data: session, refetch: refetchSession } = authClient.useSession()

    // Computed Values
    const currentUser = session?.user.id === user.id

    // Handlers
    const handleBanUser = async (userId: string) => {
        if (currentUser) return

        await authClient.admin.banUser({
            userId,
        }, {
            onSuccess: () => {
                toast.success("User banned successfully")
                onSuccess()
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
            }
        })
    }

    const handleUnbanUser = async (userId: string) => {
        if (currentUser) return

        await authClient.admin.unbanUser({
            userId,
        }, {
            onSuccess: () => {
                toast.success("User unbanned successfully")
                onSuccess()
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
            }
        })
    }

    const handleDeleteUser = async (userId: string) => {
        if (currentUser) return

        await authClient.admin.removeUser({
            userId,
        }, {
            onSuccess: () => {
                toast.success("User deleted successfully")
                onSuccess()
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
            }
        })
    }
    const handleRevokeAllSessions = async (userId: string) => {
        if (currentUser) return

        await authClient.admin.revokeUserSessions({
            userId,
        }, {
            onSuccess: () => {
                toast.success("All sessions revoked successfully")
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
            }
        })
    }
    const handleInpersonateUser = async (userId: string) => {
        if (currentUser) return

        await authClient.admin.impersonateUser({
            userId,
        }, {
            onSuccess: () => {
                refetchSession()
                router.push("/profile")
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
            }
        })
    }

    return (
        <div className="w-full flex items-center justify-between p-4 border rounded-md">
            <div className="flex flex-col items-start justify-center gap-2">
                <div className="flex flex-col">
                    <Label className="text-sm font-bold">{user.name}</Label>
                    <Label className="text-sm text-muted-foreground">{user.email}</Label>
                </div>
                <div className="flex items-center gap-2">
                    {user.role && (
                        <Badge variant={user.role === "admin" ? "default" : "outline"}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                    )}
                    {!user.emailVerified && (
                        <Badge variant="secondary">
                            Email Not Verified
                        </Badge>
                    )}
                    {user.banned && (
                        <Badge variant="destructive">
                            Banned
                        </Badge>
                    )}
                </div>
            </div>
            {!currentUser && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleInpersonateUser(user.id)}>
                            <UsersIcon />
                            Inpersonate User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRevokeAllSessions(user.id)}>
                            <CircleSlashIcon />
                            Revoke All Sessions
                        </DropdownMenuItem>
                        {!user.banned ? (
                            <DropdownMenuItem className="group hover:text-destructive focus:text-destructive transition-colors duration-200" onClick={() => handleBanUser(user.id)}>
                                <UserMinusIcon className="text-muted-foreground group-hover:text-destructive transition-colors duration-200" />
                                Ban User
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => handleUnbanUser(user.id)}>
                                <CircleCheckIcon />
                                Unban User
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                    <TrashIcon className="text-destructive" />
                                    Delete User
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Permanently Delete User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        <span className="font-bold text-destructive block mb-1">
                                            This action is <u>irreversible</u>.
                                        </span>
                                        The user <span className="font-semibold">{user.name || user.email}</span> and all their data will be <span className="text-destructive font-bold">permanently erased</span>.
                                        <br />
                                        <span className="text-sm text-muted-foreground block mt-2">
                                            Are you absolutely sure you want to continue?
                                        </span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive text-white hover:bg-red-700"
                                        onClick={() => handleDeleteUser(user.id)}
                                    >
                                        Yes, delete forever
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )
}

export function UsersList() {

    // States
    const [isLoading, setIsLoading] = useState(true)

    const [users, setUsers] = useState<UserWithRole[]>([])
    const [total, setTotal] = useState(0)
    const [limit, setLimit] = useState(10)
    const [page, setPage] = useState(1)

    // Effects
    useEffect(() => {
        getUsers()
    }, [page, limit])

    const getUsers = async () => {
        setIsLoading(true)
        const users = await authClient.admin.listUsers({
            query: {
                limit,
                offset: (page - 1) * limit,
                sortBy: "name",
            }
        })
        if (users.error) {
            console.error("Error fetching users: ", users.error)
        }
        setUsers(users.data?.users ?? [])
        setTotal(users.data?.total ?? 0)
        setIsLoading(false)
    }


    // Computed Values
    const hasPreviousPage = page > 1
    const hasNextPage = total > (page * limit)

    // Handlers
    const handleSelectLimit = (value: number) => {
        setLimit(value)
        setPage(1)
    }

    const handlePage = (value: number) => {
        setPage(value)
    }

    return (
        <div className="w-full flex flex-col gap-4">

            {/* Users List */}
            <div className="w-full flex flex-col gap-2">
                {isLoading ? (
                    <UserCardSkeleton />
                ) : users.length === 0 ? (
                    <Empty />
                ) : users.map((user: UserWithRole) => (
                    <UserCard key={user.id} user={user} onSuccess={() => getUsers()} />
                ))}
            </div>

            {/* Pagination */}
            {users.length > 0 && (
                <div className="w-full flex items-center justify-between">
                    <Select value={limit.toString()} onValueChange={(value) => handleSelectLimit(Number(value))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Items per page" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10 Items per page</SelectItem>
                            <SelectItem value="20">20 Items per page</SelectItem>
                            <SelectItem value="50">50 Items per page</SelectItem>
                            <SelectItem value="100">100 Items per page</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" disabled={!hasPreviousPage} onClick={() => handlePage(page - 1)}>
                            <ChevronLeftIcon className="size-4" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={!hasNextPage} onClick={() => handlePage(page + 1)}>
                            <ChevronRightIcon className="size-4" />
                        </Button>
                    </div>

                </div>
            )}
        </div>
    )
}