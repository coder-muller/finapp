import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { convertCurrency, getMonthlyEquitySeries } from "@/lib/yahoo-finance";
import { Currency } from "@/lib/generated/prisma";

// Cache structure
interface CachedData {
    data: any;
    timestamp: number;
    ttl: number;
}

const dashboardCache = new Map<string, CachedData>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Cleanup expired cache entries periodically
setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    dashboardCache.forEach((cached, key) => {
        if (now - cached.timestamp > cached.ttl) {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach(key => dashboardCache.delete(key));
}, CACHE_TTL);

function parseMonthKey(monthStr: string): Date {
    // Input format: "MM/YYYY"
    const [month, year] = monthStr.split("/");
    return new Date(parseInt(year), parseInt(month) - 1, 1);
}

function getDateRangeForPeriod(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let startDate: Date;
    const endDate = now;

    switch (period) {
        case "6-months":
            startDate = new Date(currentYear, currentMonth - 5, 1);
            break;
        case "current-year":
            startDate = new Date(currentYear, 0, 1);
            break;
        case "last-year":
            startDate = new Date(currentYear - 1, 0, 1);
            return {
                startDate,
                endDate: new Date(currentYear - 1, 11, 31, 23, 59, 59)
            };
        case "5-years":
            startDate = new Date(currentYear - 5, currentMonth, 1);
            break;
        case "all-time":
            startDate = new Date(1970, 0, 1);
            break;
        default:
            startDate = new Date(currentYear, currentMonth - 5, 1);
    }

    return { startDate, endDate };
}

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
    const period = searchParams.get("period") || "6-months";
    const currency = (searchParams.get("currency") || "USD") as Currency;

    // Validate period
    const validPeriods = ["6-months", "current-year", "last-year", "5-years", "all-time"];
    if (!validPeriods.includes(period)) {
        return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    // Check cache
    const cacheKey = `${session.user.id}:${period}:${currency}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return NextResponse.json({ data: cached.data }, { status: 200 });
    }

    try {
        // Get all user investments with relations
        const investments = await prisma.investment.findMany({
            where: {
                userId: session.user.id,
            },
            include: {
                transactions: {
                    orderBy: { date: "asc" },
                },
                dividends: {
                    orderBy: { date: "asc" },
                },
            },
        });

        if (investments.length === 0) {
            return NextResponse.json({
                data: {
                    currency,
                    values: [],
                },
            }, { status: 200 });
        }

        // Get date range for period
        const { startDate, endDate } = getDateRangeForPeriod(period);

        // Get monthly equity series for each investment
        const investmentSeries = await Promise.all(
            investments.map(async (investment) => {
                const series = await getMonthlyEquitySeries(
                    investment.symbol,
                    investment.transactions,
                    investment.dividends,
                    { stopWhenZero: false }
                );
                return {
                    currency: investment.currency,
                    series,
                };
            })
        );

        // Aggregate by month
        const monthlyData = new Map<string, { valueUSD: number; valueBRL: number; investedUSD: number; investedBRL: number }>();

        for (const { currency: invCurrency, series } of investmentSeries) {
            for (const dataPoint of series) {
                const monthDate = parseMonthKey(dataPoint.month);

                // Filter by period
                if (monthDate < startDate || monthDate > endDate) {
                    continue;
                }

                if (!monthlyData.has(dataPoint.month)) {
                    monthlyData.set(dataPoint.month, {
                        valueUSD: 0,
                        valueBRL: 0,
                        investedUSD: 0,
                        investedBRL: 0,
                    });
                }

                const monthData = monthlyData.get(dataPoint.month)!;

                // Sum by original currency (dividends not included in value)
                if (invCurrency === "USD") {
                    monthData.valueUSD += dataPoint.value;
                    monthData.investedUSD += dataPoint.invested;
                } else {
                    monthData.valueBRL += dataPoint.value;
                    monthData.investedBRL += dataPoint.invested;
                }
            }
        }

        // Convert to target currency and create final array
        const values = await Promise.all(
            Array.from(monthlyData.entries())
                .sort((a, b) => {
                    const dateA = parseMonthKey(a[0]);
                    const dateB = parseMonthKey(b[0]);
                    return dateA.getTime() - dateB.getTime();
                })
                .map(async ([month, data]) => {
                    const monthDate = parseMonthKey(month);

                    let totalValue: number;
                    let totalInvested: number;

                    if (currency === "USD") {
                        // Convert BRL to USD
                        const convertedValue = data.valueBRL > 0
                            ? await convertCurrency(data.valueBRL, "BRL", "USD", monthDate)
                            : 0;
                        const convertedInvested = data.investedBRL > 0
                            ? await convertCurrency(data.investedBRL, "BRL", "USD", monthDate)
                            : 0;

                        totalValue = data.valueUSD + convertedValue;
                        totalInvested = data.investedUSD + convertedInvested;
                    } else {
                        // Convert USD to BRL
                        const convertedValue = data.valueUSD > 0
                            ? await convertCurrency(data.valueUSD, "USD", "BRL", monthDate)
                            : 0;
                        const convertedInvested = data.investedUSD > 0
                            ? await convertCurrency(data.investedUSD, "USD", "BRL", monthDate)
                            : 0;

                        totalValue = data.valueBRL + convertedValue;
                        totalInvested = data.investedBRL + convertedInvested;
                    }

                    return {
                        month,
                        value: Number(totalValue.toFixed(2)),
                        invested: Number(totalInvested.toFixed(2)),
                    };
                })
        );

        const responseData = {
            currency,
            values,
        };

        // Cache the result
        dashboardCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now(),
            ttl: CACHE_TTL,
        });

        return NextResponse.json({
            data: responseData,
        }, { status: 200 });
    } catch (error) {
        console.error("Error fetching dashboard chart:", error);
        return NextResponse.json({
            error: "Failed to fetch dashboard chart data",
        }, { status: 500 });
    }
}
