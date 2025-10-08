"use client"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Spinner } from "@/components/ui/spinner";

const formSchema = z.object({
    email: z.email({ message: "Invalid email address" }),
    password: z.string().min(1, { message: "Password is required" })
})

export function LoginForm() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="john.doe@example.com"
                                {...field}
                                type="email"
                                disabled={form.formState.isSubmitting}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                                {...field}
                                type="password"
                                disabled={form.formState.isSubmitting}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                        <Spinner className="size-4" />
                    ) : (
                        "Login"
                    )}
                </Button>
            </form>
        </Form>
    )
}