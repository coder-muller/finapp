"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { authClient } from "@/lib/auth-client"
import { Session } from "better-auth"
import { useEffect, useMemo, useState } from "react"
import { UAParser } from "ua-parser-js"
import { Phone, Computer, Smartphone } from "lucide-react"
import { toast } from "sonner"

export function UserSessions() {

    // Hooks
    const { data: session } = authClient.useSession()

    // Effects
    useEffect(() => {
        fetchSessions()
    }, [])

    // States
    const [isLoading, setIsLoading] = useState(true)
    const [sessions, setSessions] = useState<Session[]>([])

    // Functions
    const fetchSessions = async () => {
        const sessions = await authClient.listSessions()
        setSessions(sessions.data ?? [])
        setIsLoading(false)
    }

    const revokeSessions = async () => {
        await authClient.revokeOtherSessions(
            {}, {
            onSuccess: () => {
                toast.success("Session revoked successfully")
                fetchSessions()
            },
            onError: () => {
                toast.error("Failed to revoke sessions")
            }
        }
        )
    }

    const revokeSession = async (token: string) => {
        await authClient.revokeSession({ token: token }, {
            onSuccess: () => {
                toast.success("Session revoked successfully")
                fetchSessions()
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
            }
        })
    }

    const currentSessionId = useMemo(() => {
        // better-auth session id may be at data.session.id depending on config
        return (session as any)?.session?.id ?? (session as any)?.id ?? null
    }, [session])

    const parsedSessions = useMemo(() => {
        return sessions.map((s) => {
            const parser = new UAParser(s.userAgent || "")
            const result = parser.getResult()
            const deviceType = result.device.type || (result.device.model ? "mobile" : "desktop")
            const isMobile = deviceType === "mobile" || deviceType === "tablet"
            const browser = [result.browser.name, result.browser.version].filter(Boolean).join(" ")
            const os = [result.os.name, result.os.version].filter(Boolean).join(" ")
            const device = result.device.model || (isMobile ? "Mobile" : "Desktop")
            return { ...s, browser, os, device, isMobile }
        })
    }, [sessions])

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Active Session</CardTitle>
                        <CardDescription>Your current device and recent activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="w-full h-24" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>All Sessions</CardTitle>
                        <CardDescription>Devices currently logged into your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="w-full h-24" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (sessions.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Active Session</CardTitle>
                        <CardDescription>Your current device and recent activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No session information available.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const currentSession = parsedSessions.find((s) => s.id === currentSessionId)

    return (
        <div className="flex flex-col gap-4">
            {currentSession && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            {currentSession.isMobile ? (
                                <Smartphone className="size-5" />
                            ) : (
                                <Computer className="size-5" />
                            )}
                            <div className="flex flex-col">
                                <CardTitle className="text-base">Current Session</CardTitle>
                                <CardDescription className="text-xs">This device is currently logged in</CardDescription>
                            </div>
                        </div>
                        <Badge>Active</Badge>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Device</span>
                            <span className="text-sm font-medium">{currentSession.device}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">OS</span>
                            <span className="text-sm font-medium">{currentSession.os || "Unknown"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Browser</span>
                            <span className="text-sm font-medium">{currentSession.browser || "Unknown"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">IP</span>
                            <span className="text-sm font-mono">{currentSession.ipAddress || "—"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Created</span>
                            <span className="text-sm">{new Date(currentSession.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Updated</span>
                            <span className="text-sm">{new Date(currentSession.updatedAt).toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex flex-col">
                        <CardTitle className="text-base">All Sessions</CardTitle>
                        <CardDescription className="text-xs">Devices currently logged into your account</CardDescription>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline">Revoke All Sessions</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Revoke All Sessions</AlertDialogTitle>
                                <AlertDialogDescription>This will sign out your account from all devices. Are you sure?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeSessions()}>
                                    Revoke All
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardHeader>
                <Separator />
                <CardContent className="flex flex-col gap-2">
                    {parsedSessions.filter((s) => s.id !== currentSessionId).length > 0 ? (
                        parsedSessions.filter((s) => s.id !== currentSessionId).map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2 border rounded-md p-3">
                                <div className="flex items-center gap-3">
                                    {s.isMobile ? <Smartphone className="size-4" /> : <Computer className="size-4" />}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{s.device}</span>
                                        <span className="text-xs text-muted-foreground">{s.os} • {s.browser}</span>
                                        <span className="text-xs text-muted-foreground">IP: <span className="font-mono">{s.ipAddress || "—"}</span></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {s.id === currentSessionId ? (
                                        <Badge variant="secondary">Current</Badge>
                                    ) : null}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" className="text-destructive">Revoke</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Revoke Session</AlertDialogTitle>
                                                <AlertDialogDescription>Are you sure you want to revoke this session?</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => revokeSession(s.token)}>
                                                    Revoke
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center p-4">
                            <p className="text-sm text-muted-foreground">No other sessions found</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter />
            </Card>
        </div>
    )
}