import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const newDividendSchema = z.object({
    amount: z.number().min(0, { message: "Amount is required" }),
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
        return NextResponse.redirect(new URL("/login", request.url));
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

    // Get dividends
    const dividends = await prisma.dividend.findMany({
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
    const total = await prisma.dividend.count({
        where: {
            investmentId: investmentId,
        },
    });

    return NextResponse.json({ data: dividends, total }, { status: 200 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ investmentId: string }> }) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.redirect(new URL("/login", request.url));
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
    const { data, error, success } = newDividendSchema.safeParse(body);

    if (!success) {
        return NextResponse.json({ error: error.message }, { status: 422 });
    }

    // Create dividend
    await prisma.dividend.create({
        data: {
            investmentId: investmentId,
            amount: data.amount,
            date: data.date,
            tax: data.tax ?? null,
            observation: data.observation ?? null,
        },
    });

    return NextResponse.json({ message: "Dividend created successfully" }, { status: 201 });
}

