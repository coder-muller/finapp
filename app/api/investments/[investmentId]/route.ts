import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInvestmentSchema = z.object({
    symbol: z.string().min(1, { message: "Symbol is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    type: z.enum(["STOCK", "ETF", "CRYPTO", "FUND", "REAL_ESTATE", "OTHER"]),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ investmentId: string }> }) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get investment id
    const { investmentId } = await params;

    // Get investment
    const investment = await prisma.investment.findFirst({
        where: {
            id: investmentId,
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
                    date: "desc",
                },
            },
            sellGainLoss: true,
        },
    });

    if (!investment) {
        return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    // Get total value of the investment by monthly
    const inicialDate = investment.transactions[investment.transactions.length - 1].date;
    const finalDate = Number(investment.shares) === 0 ? investment.transactions[0].date : new Date();

    // Todo: get the last day of every month between the initial and final date(if is the last month, get the final date)

    // Create an array of objects with the month and the total value based on the total sheres the user had at the end of that month

    // Return the array of objects with the month and the total value to present in the chart EX: [{ month: "01/2025", value: 1740.87 }, { month: "02/2025", value: 2041.54 }]

    return NextResponse.json({ data: investment }, { status: 200 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ investmentId: string }> }) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get investment id
    const { investmentId } = await params;

    // Get investment
    const investment = await prisma.investment.findFirst({
        where: {
            id: investmentId,
            userId: session.user.id,
        },
    });

    if (!investment) {
        return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    // Get body
    const body = await request.json();

    // Validate body
    const { data, error, success } = updateInvestmentSchema.safeParse(body);

    if (!success) {
        return NextResponse.json({ error: error.message }, { status: 422 });
    }

    await prisma.investment.update({
        where: {
            id: investmentId,
        },
        data: {
            symbol: data.symbol,
            name: data.name,
            type: data.type,
        },
    });

    return NextResponse.json({ message: "Investment updated successfully" }, { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ investmentId: string }> }) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get investment id
    const { investmentId } = await params;

    // Get investment
    const investment = await prisma.investment.findFirst({
        where: {
            id: investmentId,
            userId: session.user.id,
        },
    });

    if (!investment) {
        return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    await prisma.investment.delete({
        where: {
            id: investmentId,
        },
    });

    return NextResponse.json({ message: "Investment deleted successfully" }, { status: 200 });
}