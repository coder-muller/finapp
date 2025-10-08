import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="relative flex flex-col items-center justify-center h-screen">
            <header className="absolute top-0 right-0 left-0 p-4 flex items-center justify-between">
                <Link href="/">
                    <Button variant="outline" className="group">
                        <ArrowLeft className="size-4 translate-x-0 transition-transform group-hover:-translate-x-1" />
                        Back
                    </Button>
                </Link>
                <ModeToggle />
            </header>
            {children}
        </main>
    )
}