"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useInvestment } from "@/hooks/use-investments";
import { Currency } from "@/lib/generated/prisma";
import { formatCurrency, calculateInvestmentMetrics } from "@/lib/utils";
import { TriangleAlertIcon } from "lucide-react";
import { use } from "react";
import { Bar, ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts";
import TransactionsTable from "../../_components/transactions-table";
import DividendsTable from "../../_components/dividends-table";

const valueChartConfig = {
    value: {
        label: "Total Value",
        color: "var(--chart-1)",
    },
    invested: {
        label: "Total Invested",
        color: "var(--color-muted-foreground)",
    },
} satisfies ChartConfig;

const dividendsChartConfig = {
    dividends: {
        label: "Dividends",
        color: "var(--chart-3)",
    },
} satisfies ChartConfig;

const ValueTooltip = ({ active, payload, label, currency }: {
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
                                {item.dataKey === "value" ? "Total Value" : "Total Invested"}
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

const DividendsTooltip = ({ active, payload, label, currency }: {
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
                            <span className="text-sm capitalize text-foreground">Dividends</span>
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

export default function InvestmentPage({ params }: { params: Promise<{ investmentId: string }> }) {
    const { investmentId } = use(params);

    const {
        investment,
        isLoadingInvestment,
        isErrorInvestment,
        refetchInvestment,
    } = useInvestment(investmentId);

    if (isLoadingInvestment) {
        return (
            <div className="flex flex-col items-center justify-center">
                <Spinner className="size-6 mb-6" />
                <Label className="text-xl font-bold text-center">Loading investment...</Label>
                <Label className="text-sm text-muted-foreground text-center">The investment you are looking for is being loaded</Label>
            </div>
        );
    }

    if (isErrorInvestment || !investment) {
        return (
            <div className="flex flex-col items-center justify-center">
                <TriangleAlertIcon className="size-6 mb-6" />
                <Label className="text-xl font-bold text-center">Investment not found</Label>
                <Label className="text-sm text-muted-foreground text-center">The investment you are looking for does not exist</Label>
            </div>
        );
    }

    // Calculate all investment metrics using the centralized function
    const metrics = calculateInvestmentMetrics({
        transactions: investment.data.transactions,
        dividends: investment.data.dividends,
        sellGainLoss: investment.data.sellGainLoss,
        currentPrice: investment.data.currentPrice,
        shares: investment.data.shares,
    });

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col">
                <Label className="text-xl font-bold">{investment.data.symbol}</Label>
                <Label className="text-sm text-muted-foreground">{investment.data.name}</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Current Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Label className="text-2xl font-mono">{formatCurrency(metrics.currentValue, investment.data.currency)}</Label>
                    </CardContent>
                    <CardFooter>
                        <Label className="text-sm text-muted-foreground">{formatCurrency(metrics.totalInvested, investment.data.currency)} invested</Label>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Current Price</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Label className="text-2xl font-mono">{formatCurrency(metrics.currentPrice, investment.data.currency)}</Label>
                    </CardContent>
                    <CardFooter>
                        <Label className="text-sm text-muted-foreground">{metrics.shares} shares</Label>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Profit/Loss</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Label className={`text-2xl font-mono ${metrics.totalProfitLoss >= 0 ? "text-primary" : "text-destructive"}`}>
                            {formatCurrency(metrics.totalProfitLoss, investment.data.currency)}
                        </Label>
                    </CardContent>
                    <CardFooter>
                        <Label className="text-sm text-muted-foreground">{metrics.totalDividends > 0 ? `${formatCurrency(metrics.totalDividends, investment.data.currency)} in dividends` : `This value includes dividends`}</Label>
                    </CardFooter>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historical Value</CardTitle>
                    <CardDescription>
                        View the historical value of the investment month by month
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={valueChartConfig} className="w-full h-[350px]">
                        <ComposedChart data={investment.data.equitySeries} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: "primary" }}
                            />
                            <YAxis hide />
                            <Tooltip content={<ValueTooltip currency={investment.data.currency} />} />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={valueChartConfig.value.color}
                                strokeWidth={3}
                                dot={{ fill: valueChartConfig.value.color, strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="invested"
                                stroke={valueChartConfig.invested.color}
                                strokeWidth={2}
                                strokeDasharray="7 7"
                                dot={false}
                            />
                        </ComposedChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>
                        View the transactions for this investment
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {investment.data.transactions.length > 0 ? (
                        <TransactionsTable transactions={investment.data.transactions} currency={investment.data.currency} />
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <Label className="text-sm text-muted-foreground text-center my-6">No transactions found</Label>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Dividends History</CardTitle>
                    <CardDescription>
                        View the monthly dividends received from this investment
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {investment.data.dividends.length > 0 ? (
                        <>
                            <ChartContainer config={dividendsChartConfig} className="w-full h-[350px]">
                                <ComposedChart data={investment.data.equitySeries} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 12, fill: "primary" }}
                                    />
                                    <YAxis hide />
                                    <Tooltip content={<DividendsTooltip currency={investment.data.currency} />} />
                                    <Bar dataKey="dividends" fill={dividendsChartConfig.dividends.color} radius={[4, 4, 0, 0]} />
                                </ComposedChart>
                            </ChartContainer>
                            <DividendsTable dividends={investment.data.dividends} currency={investment.data.currency} />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center">
                            <Label className="text-sm text-muted-foreground text-center my-6">No dividends received yet</Label>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}