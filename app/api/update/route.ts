import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPrice } from "@/lib/yahoo-finance";
import yahooFinance from "yahoo-finance2";
import { toast } from "sonner";

// Function to update the investment current price using the Yahoo Finance
export async function PATCH(request: NextRequest) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all investments from the current user
    const investments = await prisma.investment.findMany({
        where: {
            userId: session.user.id,
        },
        include: {
            dividends: {
                orderBy: {
                    date: "desc",
                },
            },
            transactions: {
                orderBy: {
                    date: "asc",
                },
            },
        },
    });

    // Errors symbols
    const errorsSymbols = [];

    for (const investment of investments) {
        // Get current price
        const currentPrice = await getCurrentPrice(investment.symbol);

        // If current price is not found, add to errors symbols
        if (!currentPrice) {
            errorsSymbols.push(investment.symbol);
            continue;
        }

        // Update investment
        await prisma.investment.update({
            where: {
                id: investment.id,
            },
            data: {
                currentPrice: currentPrice,
            },
        });

        // Update dividends
        const lastDividendDate = investment.dividends.length
            ? new Date(investment.dividends[0].date)
            : new Date(investment.transactions[0].date);

        const period1 = Math.floor(lastDividendDate.getTime() / 1000);
        const period2 = Math.floor(Date.now() / 1000);

        // Get dividends from Yahoo Finance
        const result = await yahooFinance.chart(investment.symbol, {
            period1,
            period2,
            events: "dividends",
        })

        const dividends = result.events?.dividends
            ? Object.values(result.events.dividends)
            : [];

        if (dividends.length > 0) {
            for (const dividend of dividends) {

                const existingDividend = await prisma.dividend.findFirst({
                    where: {
                        investmentId: investment.id,
                        date: new Date(Number(dividend.date) * 1000),
                        amount: dividend.amount * Number(investment.shares),
                    },
                });

                if (existingDividend) {
                    console.log(`Dividend for ${investment.symbol} on ${new Date(Number(dividend.date) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} already exists`);
                    continue;
                }

                const newDividend = await prisma.dividend.create({
                    data: {
                        investmentId: investment.id,
                        amount: dividend.amount * Number(investment.shares),
                        date: new Date(Number(dividend.date) * 1000),
                        tax: (dividend.amount * Number(investment.shares)) * 0.30, // TODO: 30% of the dividend amount for brazilian taxes
                        observation: `Dividend from ${investment.symbol} on ${new Date(Number(dividend.date) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
                    }
                })

                if (!newDividend) {
                    errorsSymbols.push(investment.symbol);
                    continue;
                }
            }   
        }
    }

    // If errors symbols, return error
    if (errorsSymbols.length > 0) {
        return NextResponse.json({ error: "Some symbols were not found: " + errorsSymbols.join(", ") }, { status: 400 });
    }

    // Return success
    return NextResponse.json({ message: "Investments updated successfully" }, { status: 200 });
}