import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPrice } from "@/lib/yahoo-finance";

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
    }

    // If errors symbols, return error
    if (errorsSymbols.length > 0) {
        return NextResponse.json({ error: "Some symbols were not found: " + errorsSymbols.join(", ") }, { status: 400 });
    }

    // Return success
    return NextResponse.json({ message: "Investments updated successfully" }, { status: 200 });
}