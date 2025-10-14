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
        await tx.transaction.create({
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