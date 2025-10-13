import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInvestmentSchema = z.object({
    symbol: z.string().min(1, { message: "Symbol is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    type: z.enum(["STOCK", "ETF", "CRYPTO", "FUND"]),
})

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