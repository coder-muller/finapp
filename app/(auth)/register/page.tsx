import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { RegisterForm } from "../_components/register-form";

export default function RegisterPage() {
    return (
        <Card className="w-full max-w-sm md:max-w-md">
            <CardHeader>
                <CardTitle>Welcome to Finapp!</CardTitle>
                <CardDescription>Please enter your email to create an account</CardDescription>
            </CardHeader>
            <CardContent>
                <RegisterForm />
            </CardContent>
            <div className="flex items-center justify-center">
                <Label className="text-sm">Already have an account? <Link href="/login" className="text-primary underline-offset-4 hover:underline">Login</Link></Label>
            </div>
        </Card>
    )
}