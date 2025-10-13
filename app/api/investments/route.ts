import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma";

const newInvestmentSchema = z.object({
    // Investment Data
    symbol: z.string().min(1, { message: "Symbol is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    type: z.enum(["STOCK", "ETF", "CRYPTO", "FUND"]),

    // Transaction Data
    buyPrice: z.number().min(0, { message: "Buy price is required" }),
    buyDate: z.coerce.date(),
    shares: z.number().min(0, { message: "Shares are required" }),
    fees: z.number().optional().nullable(),
})

export async function GET(request: NextRequest) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get search params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || "10";
    const page = searchParams.get("page") || "1";

    // Get where conditions
    const whereConditions: Prisma.InvestmentWhereInput = {
        userId: session.user.id,
        ...(search && { OR: [{ name: { contains: search, mode: "insensitive" } }, { symbol: { contains: search, mode: "insensitive" } }] }),
    };

    // Get investments
    const investments = await prisma.investment.findMany({
        where: whereConditions,
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        include: {
            transactions: true,
            dividends: true,
        }
    });

    // Get total count
    const total = await prisma.investment.count({
        where: whereConditions,
    });

    return NextResponse.json({
        data: investments,
        total,
    }, { status: 200 });
}

export async function POST(request: NextRequest) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get body
    const body = await request.json();

    // Validate body
    const { data, error, success } = newInvestmentSchema.safeParse(body);

    if (!success) {
        return NextResponse.json({ error: error.message }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
        const newInvestment = await tx.investment.create({
            data: {
                userId: session.user.id,
                symbol: data.symbol,
                name: data.name,
                type: data.type,
                currentPrice: data.buyPrice,
                shares: data.shares,
            },
        })

        await tx.transaction.create({
            data: {
                investmentId: newInvestment.id,
                type: "BUY",
                quantity: data.shares,
                price: data.buyPrice,
                date: data.buyDate,
                tax: data.fees ? data.fees : null,
            },
        })
    })

    return NextResponse.json({ message: "Investment created successfully" }, { status: 201 });
}