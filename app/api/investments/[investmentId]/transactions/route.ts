import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { syncInvestmentDividends } from "@/lib/yahoo-finance";

const newTransactionSchema = z.object({
    type: z.enum(["BUY", "SELL"], { message: "Type is required" }),
    quantity: z.number().min(0, { message: "Quantity is required" }),
    price: z.number().min(0, { message: "Price is required" }),
    date: z.coerce.date({ message: "Date is required" }),
    tax: z.number().optional().nullable(),
    observation: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ investmentId: string }> }) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get params
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "10";
    const page = searchParams.get("page") || "1";

    // Get transactions
    const transactions = await prisma.transaction.findMany({
        where: {
            investmentId: investmentId,
        },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        orderBy: {
            date: "desc",
        },
    });

    // Get total count
    const total = await prisma.transaction.count({
        where: {
            investmentId: investmentId,
        },
    });

    return NextResponse.json({ data: transactions, total }, { status: 200 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ investmentId: string }> }) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const { data, error, success } = newTransactionSchema.safeParse(body);

    if (!success) {
        return NextResponse.json({ error: error.message }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
        // Create transaction
        const transaction = await tx.transaction.create({
            data: {
                investmentId: investmentId,
                type: data.type,
                quantity: data.quantity,
                price: data.price,
                date: data.date,
                tax: data.tax ?? null,
                observation: data.observation ?? null,
            },
        });

        // Update investment shares
        await tx.investment.update({
            where: {
                id: investmentId,
            },
            data: {
                shares: { increment: data.type === "BUY" ? data.quantity : -data.quantity },
            },
        });

        // Create a sell gain loss if the transaction is a sell
        if (data.type === "SELL") {
            // Get all BUY transactions up to this date to calculate average buy price
            const buyTransactions = await tx.transaction.findMany({
                where: {
                    investmentId: investmentId,
                    type: "BUY",
                    date: { lte: data.date },
                },
                orderBy: {
                    date: "asc",
                },
            });

            // Calculate weighted average buy price
            let totalCost = 0;
            let totalQuantity = 0;
            for (const buyTx of buyTransactions) {
                const qty = Number(buyTx.quantity);
                const price = Number(buyTx.price);
                const tax = Number(buyTx.tax || 0);
                totalCost += (qty * price) + tax;
                totalQuantity += qty;
            }

            const avgBuyPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

            // Calculate realized profit/loss
            // (sell price × quantity) - (avg buy price × quantity) - sell tax
            const sellRevenue = Number(data.price) * Number(data.quantity);
            const sellCost = avgBuyPrice * Number(data.quantity);
            const sellTax = Number(data.tax || 0);
            const realizedProfitLoss = sellRevenue - sellCost - sellTax;

            await tx.sellGainLoss.create({
                data: {
                    investmentId: investmentId,
                    transactionId: transaction.id,
                    realizedProfitLoss: realizedProfitLoss,
                },
            });
        }

        // Remove all future dividends
        await tx.dividend.deleteMany({
            where: {
                investmentId: investmentId,
                date: { gt: data.date },
            },
        });
    })

    // Sync dividends
    await syncInvestmentDividends(prisma, investmentId);

    return NextResponse.json({ message: "Transaction created successfully" }, { status: 201 });
}