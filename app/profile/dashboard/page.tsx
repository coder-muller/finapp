"use client"

import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/utils";
import { useDashboardCards, useDashboardChart } from "@/hooks/use-dashboard";
import { Currency } from "@/lib/generated/prisma";
import { useState } from "react";
import { ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts";
import { TriangleAlertIcon } from "lucide-react";

const chartConfig = {
    value: {
        label: "Portfolio Value",
        color: "var(--chart-1)",
    },
    invested: {
        label: "Total Invested",
        color: "var(--color-muted-foreground)",
    },
} satisfies ChartConfig;

const PortfolioTooltip = ({ active, payload, label, currency }: {
    active?: boolean,
    payload?: { value: number, color: string, dataKey: string }[],
    label?: string,
    currency?: Currency
}) => {
    if (active && payload && payload.length && currency) {
        return (
            <div className="backdrop-blur-3xl px-4 py-3 rounded-lg shadow-lg border bg-muted border-border">
                <p className="text-xs uppercase tracking-wider mb-2 text-muted-foreground">{label}</p>
                {payload.map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm capitalize text-foreground">
                                {item.dataKey === "value" ? "Portfolio Value" : "Total Invested"}
                            </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                            {formatCurrency(item.value, currency)}
                        </span>
                    </div>
                ))}
            </div>
        )
    }
    return null;
}

export default function DashboardPage() {
    const [currency, setCurrency] = useState<Currency>("USD");
    const [period, setPeriod] = useState("6-months");

    const { data: cardsData, isLoading: isLoadingCards, isError: isErrorCards } = useDashboardCards(currency);
    const { data: chartData, isLoading: isLoadingChart, isError: isErrorChart } = useDashboardChart(period, currency);

    return (
        <div className="flex flex-col gap-4 w-full max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 w-full">
                <div className="flex flex-col">
                    <Label className="text-xl font-bold">Dashboard</Label>
                    <Label className="text-sm font-normal">View a summary of your investments</Label>
                </div>
                <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                    <SelectTrigger className="w-full md:w-fit">
                        <SelectValue placeholder="Select a currency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Top Cards */}
            {isLoadingCards ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Spinner className="size-6 mb-4" />
                    <Label className="text-sm text-muted-foreground">Loading dashboard data...</Label>
                </div>
            ) : isErrorCards ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <TriangleAlertIcon className="size-6 mb-4 text-destructive" />
                    <Label className="text-sm text-destructive">Failed to load dashboard data</Label>
                </div>
            ) : cardsData ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Value</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Label className="text-2xl">{formatCurrency(cardsData.totalValue, currency)}</Label>
                            </CardContent>
                            <CardFooter>
                                <Label className="text-sm text-muted-foreground">{formatCurrency(cardsData.totalInvested, currency)} invested</Label>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Gain/Loss</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Label className={`text-2xl ${cardsData.gainLoss >= 0 ? "text-primary" : "text-destructive"}`}>
                                    {formatCurrency(cardsData.gainLoss, currency)}
                                </Label>
                            </CardContent>
                            <CardFooter>
                                <Label className="text-sm text-muted-foreground">{formatCurrency(cardsData.dividends, currency)} in dividends</Label>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Best Performing Investment</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Label className="text-2xl">{cardsData.bestPerformingInvestment.symbol}</Label>
                            </CardContent>
                            <CardFooter className="flex items-center justify-between">
                                <Label className="text-sm text-muted-foreground">
                                    {formatCurrency(cardsData.bestPerformingInvestment.profit, currency)} {cardsData.bestPerformingInvestment.profit >= 0 ? "profit" : "loss"}
                                </Label>
                                <Label className="text-sm text-muted-foreground">
                                    {cardsData.bestPerformingInvestment.profitPercentage.toFixed(2)}%
                                </Label>
                            </CardFooter>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-col md:flex-row items-center justify-between">
                            <div className="flex flex-col">
                                <CardTitle>Assets Overview</CardTitle>
                                <CardDescription>Monitor your assets performance month over month</CardDescription>
                            </div>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="w-full md:w-fit">
                                    <SelectValue placeholder="Select a period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6-months">Last 6 Months</SelectItem>
                                    <SelectItem value="current-year">Current Year</SelectItem>
                                    <SelectItem value="last-year">Last Year</SelectItem>
                                    <SelectItem value="5-years">Last 5 Years</SelectItem>
                                    <SelectItem value="all-time">All Time</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                            {isLoadingChart ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Spinner className="size-6 mb-4" />
                                    <Label className="text-sm text-muted-foreground">Loading chart data...</Label>
                                </div>
                            ) : isErrorChart ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <TriangleAlertIcon className="size-6 mb-4 text-destructive" />
                                    <Label className="text-sm text-destructive">Failed to load chart data</Label>
                                </div>
                            ) : chartData && chartData.values.length > 0 ? (
                                <ChartContainer config={chartConfig} className="w-full h-[350px]">
                                    <ComposedChart data={chartData.values} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <XAxis
                                            dataKey="month"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 12, fill: "primary" }}
                                        />
                                        <YAxis hide />
                                        <Tooltip content={<PortfolioTooltip currency={currency} />} />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke={chartConfig.value.color}
                                            strokeWidth={3}
                                            dot={{ fill: chartConfig.value.color, strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="invested"
                                            stroke={chartConfig.invested.color}
                                            strokeWidth={2}
                                            strokeDasharray="7 7"
                                            dot={false}
                                        />
                                    </ComposedChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Label className="text-sm text-muted-foreground">No data available for this period</Label>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    )
}