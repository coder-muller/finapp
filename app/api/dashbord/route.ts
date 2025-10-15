import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { convertCurrency } from "@/lib/yahoo-finance";
import { calculateInvestmentMetrics } from "@/lib/utils";
import { Currency } from "@/lib/generated/prisma";

export async function GET(request: NextRequest) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get params
    const { searchParams } = new URL(request.url);
    const currency = (searchParams.get("currency") || "USD") as Currency;

    try {
        // Get all user investments with relations
        const investments = await prisma.investment.findMany({
            where: {
                userId: session.user.id,
            },
            include: {
                transactions: true,
                dividends: true,
                sellGainLoss: true,
            },
        });

        let totalValue = 0;
        let totalInvested = 0;
        let totalDividends = 0;
        let totalRealizedGains = 0;
        let bestInvestment: { symbol: string; profit: number; profitPercentage: number } | null = null;
        let bestROI = -Infinity;

        // Process each investment
        for (const investment of investments) {
            const metrics = calculateInvestmentMetrics({
                transactions: investment.transactions,
                dividends: investment.dividends,
                sellGainLoss: investment.sellGainLoss,
                currentPrice: investment.currentPrice,
                shares: investment.shares,
            });

            // Only include investments with shares > 0 for current value and invested
            if (metrics.shares > 0) {
                // Calculate proportional invested amount
                const proportionalInvested = metrics.totalQuantityBought > 0
                    ? (metrics.shares / metrics.totalQuantityBought) * metrics.totalInvested
                    : 0;

                // Convert to target currency
                const convertedValue = investment.currency !== currency
                    ? await convertCurrency(metrics.currentValue, investment.currency, currency)
                    : metrics.currentValue;

                const convertedInvested = investment.currency !== currency
                    ? await convertCurrency(proportionalInvested, investment.currency, currency)
                    : proportionalInvested;

                totalValue += convertedValue;
                totalInvested += convertedInvested;

                // Track best performing investment
                if (metrics.profitLossPercentage > bestROI) {
                    bestROI = metrics.profitLossPercentage;
                    bestInvestment = {
                        symbol: investment.symbol,
                        profit: metrics.totalProfitLoss,
                        profitPercentage: metrics.profitLossPercentage,
                    };
                }
            }

            // Include dividends from all investments (active and sold)
            const convertedDividends = investment.currency !== currency
                ? await convertCurrency(metrics.totalDividends, investment.currency, currency)
                : metrics.totalDividends;
            totalDividends += convertedDividends;

            // Include realized gains from sold investments
            const convertedRealizedGains = investment.currency !== currency
                ? await convertCurrency(metrics.realizedGainLoss, investment.currency, currency)
                : metrics.realizedGainLoss;
            totalRealizedGains += convertedRealizedGains;
        }

        // Calculate total gain/loss
        // gainLoss = (currentValue - invested) + dividends + realizedGains
        const gainLoss = (totalValue - totalInvested) + totalDividends + totalRealizedGains;

        return NextResponse.json({
            data: {
                totalValue: Number(totalValue.toFixed(2)),
                totalInvested: Number(totalInvested.toFixed(2)),
                gainLoss: Number(gainLoss.toFixed(2)),
                dividends: Number(totalDividends.toFixed(2)),
                bestPerformingInvestment: bestInvestment || {
                    symbol: "N/A",
                    profit: 0,
                    profitPercentage: 0,
                },
            },
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching dashboard cards:", error);
        return NextResponse.json({
            error: "Failed to fetch dashboard data",
        }, { status: 500 });
    }
}