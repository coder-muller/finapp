import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserForm } from "../_components/forms/user-form";
import { PasswordForm } from "../_components/forms/password-form";
import { DeleteUserForm } from "../_components/forms/delete-user-form";
import { UserSessions } from "../_components/user-sessions";

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
                        <PasswordForm />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="grid-cols-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Sessions</CardTitle>
                        <CardDescription>Manage your active sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <UserSessions />
                    </CardContent>
                </Card>
                <Card className="border-destructive/20 shadow-destructive h-max">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>Be careful with these settings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DeleteUserForm />
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}