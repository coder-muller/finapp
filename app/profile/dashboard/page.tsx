import { Label } from "@/components/ui/label";
import { ConstructionIcon } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="flex flex-col w-full max-w-7xl mx-auto items-center justify-center">
            <ConstructionIcon className="size-12 mb-6" />
            <Label className="text-2xl font-bold text-center">Coming soon...</Label>
            <Label className="text-md text-muted-foreground text-center">The dashboard you are looking for is being built</Label>
        </div>
    )
}