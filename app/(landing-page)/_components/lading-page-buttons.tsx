"use client"

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function LandingPageButtons() {
    return (
        <div className="flex items-center justify-center gap-2">
            <Link href="/login">
                <Button variant="outline">
                    Login
                </Button>
            </Link>
            <Link href="/register">
                <Button variant="default" className="group">
                    Register
                    <ArrowRight className="size-4 translate-x-0 transition-transform group-hover:translate-x-1" />
                </Button>
            </Link>

        </div>
    )
}