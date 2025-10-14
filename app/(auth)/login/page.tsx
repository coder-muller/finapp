import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { LoginForm } from "../_components/login-form";

export default function LoginPage() {
    return (
        <Card className="w-full max-w-sm md:max-w-md">
            <CardHeader>
                <CardTitle>Welcome back!</CardTitle>
                <CardDescription>Please enter your email to access your account</CardDescription>
            </CardHeader>
            <CardContent>
                <LoginForm />
            </CardContent>
            <div className="flex items-center justify-center">
                <Label className="text-sm">Don&apos;t have an account? <Link href="/register" className="text-primary underline-offset-4 hover:underline">Register</Link></Label>
            </div>
        </Card>
    )
}