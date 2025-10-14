import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncInvestmentDividends } from "@/lib/yahoo-finance";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ investmentId: string, transactionId: string }> }) {
    // Get session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { investmentId, transactionId } = await params;

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

    // Get transaction
    const transaction = await prisma.transaction.findFirst({
        where: {
            id: transactionId,
            investmentId: investmentId,
        },
    });

    if (!transaction) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {

        // Delete transaction
        await tx.transaction.delete({
            where: {
                id: transactionId,
            },
        });

        // Update investment shares
        await tx.investment.update({
            where: {
                id: investmentId,
            },
            data: {
                shares: { increment: transaction.type === "BUY" ? -transaction.quantity : transaction.quantity },
            },
        });

        // Remove all future dividends
        await tx.dividend.deleteMany({
            where: {
                investmentId: investmentId,
                date: { gt: transaction.date },
            },
        });

    });

    // Sync dividends
    await syncInvestmentDividends(prisma, investmentId);

    return NextResponse.json({ message: "Transaction deleted successfully" }, { status: 200 });
}