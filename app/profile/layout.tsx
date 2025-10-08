import AppSidebar from "@/app/profile/_components/app-sidebar";
import Header from "@/app/profile/_components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider className="w-full h-full">
            <AppSidebar />
            <SidebarInset>
                <div className="flex flex-col items-center justify-center w-full h-full">
                    <Header />
                    <div className="flex-1 w-full md:h-full py-4 px-4 md:px-8 md:overflow-y-auto max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}