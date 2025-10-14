"use client"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useEffect } from "react";

const formSchema = z.object({
    email: z.email({ message: "Invalid email address" }),
    name: z.string().min(1, { message: "Name is required" }),
    image: z.string().optional().nullable(),
})

export function UserForm() {

    // Hooks
    const { data: session } = authClient.useSession()

    // Form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: session?.user?.name ?? "",
            email: session?.user?.email ?? "",
            image: session?.user?.image ?? "",
        },
    })

    useEffect(() => {
        if (session) {
            form.reset({
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
            })
        }
    }, [session])

    // Functions
    async function onSubmit(values: z.infer<typeof formSchema>) {
        await authClient.updateUser({
            name: values.name,
            image: values.image,
        }, {
            onSuccess: () => {
                toast.success("User updated successfully")
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
            }
        })
    }

    // Render
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="Email"
                                {...field}
                                disabled
                            />
                        </FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="Name"
                                {...field}
                                disabled={form.formState.isSubmitting}
                            />
                        </FormControl>
                    </FormItem>
                )} />
                <FormField control={form.control} name="image" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="Image URL"
                                {...field}
                                value={field.value ?? ""}
                                disabled={form.formState.isSubmitting}
                            />
                        </FormControl>
                    </FormItem>
                )} />
                <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting || form.formState.isDirty}>
                    {form.formState.isSubmitting ? <Spinner className="size-4" /> : "Save Changes"}
                </Button>
            </form>
        </Form>
    )
}