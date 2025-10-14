"use client"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Spinner } from "@/components/ui/spinner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

const formSchema = z.object({
    password: z.string().min(1, { message: "Password is required" }),
})

export function DeleteUserForm() {

    // Hooks
    const router = useRouter()

    // Form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: "",
        },
    })

    // Functions
    async function onSubmit(values: z.infer<typeof formSchema>) {
        await authClient.deleteUser({
            password: values.password,
        }, {
            onSuccess: () => {
                toast.success("Account deleted successfully")
                router.push("/")
            },
            onError: (ctx) => {
                if (ctx.error.status === 400) {
                    toast.error("Invalid password")
                } else {
                    toast.error("An unknown error occurred, please try again later")
                }
            }
        })
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                    Delete Account
                </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Delete Account</DialogTitle>
                    <DialogDescription>Are you sure you want to delete your account? This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <Input {...field} type="password" placeholder="Confirm Password" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" type="button">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? (
                                    <Spinner className="size-4" />
                                ) : (
                                    "Delete Account"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}