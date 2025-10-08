import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Header() {
    return (
        <div className="flex items-center justify-between w-full p-2">
            <SidebarTrigger />
        </div>
    )
}