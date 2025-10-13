"use client"

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";
import { AreaChart, BadgeCheck, Bitcoin, ListTree, LogOut, Moon, Sun } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronsUpDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useEffect } from "react";

const navItems = [
    { title: "Dashboard", href: "/profile/dashboard", icon: <AreaChart /> },
    { title: "Investments", href: "/profile/investments", icon: <ListTree /> },
]

export default function AppSidebar() {
    const pathname = usePathname()
    const isMobile = useIsMobile()
    const { setTheme, theme } = useTheme()
    const router = useRouter()

    const { data: session, isPending } = authClient.useSession()

    useEffect(() => {
        if (!session && !isPending) {
            onSignOut()
        }
    }, [session, isPending])

    const user = {
        name: session?.user?.name,
        email: session?.user?.email,
        avatar: session?.user?.image ?? undefined,
    }

    function onSignOut() {
        authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login")
                },
            },
        })
    }

    return (
        <Sidebar variant="inset" collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full"
                        >
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <Bitcoin className="size-5" />
                            </div>
                            <div className="flex flex-col gap-0.5 leading-none truncate">
                                <span className="font-semibold truncate leading-tight tracking-tighter select-none">Finapp</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((navItem) => (
                                <SidebarMenuItem key={navItem.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={navItem.href === pathname}
                                    >
                                        <a href={navItem.href} className="flex items-center gap-2 truncate">
                                            {navItem.icon}
                                            <span>{navItem.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user.avatar || ""} alt={user.name || ""} />
                                        <AvatarFallback className="rounded-lg">{user.name?.charAt(0) || <User className="size-4 text-muted-foreground" />}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user.name || <Skeleton className="h-4 w-20" />}</span>
                                        <span className="truncate text-xs">{user.email || <Skeleton className="h-4 w-32" />}</span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                                side={isMobile ? "bottom" : "right"}
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarImage src={user.avatar || ""} alt={user.name || ""} />
                                            <AvatarFallback className="rounded-lg">{user.name?.charAt(0) || <User className="size-4 text-muted-foreground" />}</AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">{user.name || <Skeleton className="h-4 w-20" />}</span>
                                            <span className="truncate text-xs">{user.email || <Skeleton className="h-4 w-32" />}</span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <Link href="/profile/account">
                                        <DropdownMenuItem>
                                            <BadgeCheck />
                                            Conta
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                                        <Sun className="dark:flex hidden" />
                                        <Moon className="flex dark:hidden" />
                                        Mudar tema
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="group hover:bg-destructive focus:text-destructive transition-colors duration-200" onClick={onSignOut}>
                                    <LogOut className="text-muted-foreground group-hover:text-destructive transition-colors duration-200" />
                                    Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}