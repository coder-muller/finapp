import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ investmentId: string, dividendId: string }> }) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { investmentId, dividendId } = await params;

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

    // Get dividend
    const dividend = await prisma.dividend.findFirst({
        where: {
            id: dividendId,
            investmentId: investmentId,
        },
    });

    if (!dividend) {
        return NextResponse.json({ error: "Dividend not found" }, { status: 404 });
    }

    // Delete dividend
    await prisma.dividend.delete({
        where: {
            id: dividendId,
        },
    });

    return NextResponse.json({ message: "Dividend deleted successfully" }, { status: 200 });
}

