import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserForm } from "../_components/forms/user-form";

export default function AccountPage() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col">
                <Label className="text-xl font-bold">Account</Label>
                <Label className="text-sm font-normal">Manage your account settings</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="h-max">
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Manage your personal information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <UserForm />
                    </CardContent>
                </Card>
                <Card className="h-max">
                    <CardHeader>
                        <CardTitle>Password and Security</CardTitle>
                        <CardDescription>Manage your password and security settings</CardDescription>
                    </CardHeader>
                    <CardContent>

                    </CardContent>
                </Card>
            </div>

        </div>
    );
}