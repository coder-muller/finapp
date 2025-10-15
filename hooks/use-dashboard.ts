import { useQuery } from "@tanstack/react-query";
import { Currency } from "@/lib/generated/prisma";

// Types
interface DashboardCardsData {
    totalValue: number;
    totalInvested: number;
    gainLoss: number;
    dividends: number;
    bestPerformingInvestment: {
        symbol: string;
        profit: number;
        profitPercentage: number;
    };
}

interface DashboardChartData {
    currency: Currency;
    values: Array<{
        month: string;
        value: number;
        invested: number;
    }>;
}

// Hook to get dashboard cards data
export function useDashboardCards(currency: Currency) {
    return useQuery({
        queryKey: ["dashboard-cards", currency],
        queryFn: async () => {
            const response = await fetch(`/api/dashbord?currency=${currency}`);
            if (!response.ok) {
                throw new Error("Failed to fetch dashboard cards");
            }
            const json = await response.json();
            return json.data as DashboardCardsData;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}

// Hook to get dashboard chart data
export function useDashboardChart(period: string, currency: Currency) {
    return useQuery({
        queryKey: ["dashboard-chart", period, currency],
        queryFn: async () => {
            const response = await fetch(`/api/dashbord/chart?period=${period}&currency=${currency}`);
            if (!response.ok) {
                throw new Error("Failed to fetch dashboard chart");
            }
            const json = await response.json();
            return json.data as DashboardChartData;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}