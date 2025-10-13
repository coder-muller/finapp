"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 0,
            staleTime: 0,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            refetchOnReconnect: true,
        }
    }
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}