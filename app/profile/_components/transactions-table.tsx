"use client"

import { Transaction, Currency } from "@/lib/generated/prisma";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { TrashIcon } from "lucide-react";

interface TransactionsTableProps {
    transactions: Transaction[];
    currency: Currency;
}

export default function TransactionsTable({ transactions, currency }: TransactionsTableProps) {
    const [selected, setSelected] = useState<Transaction | null>(null);
    const investmentId = transactions[0]?.investmentId ?? "";
    const { deleteTransaction, isLoadingDeleteTransaction } = useTransactions(investmentId);

    return (
        <div className="flex flex-col gap-2">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-left">Type</TableHead>
                        <TableHead className="text-left">Date</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center w-[80px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center">
                                <div className="w-full h-12 flex items-center justify-center">
                                    <Label className="text-sm text-muted-foreground">No transactions found</Label>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((t) => (
                            <TableRow key={t.id} className={cn(t.type === "SELL" && "text-destructive")}>
                                <TableCell className={cn("font-medium")}>{t.type === "BUY" ? "Buy" : "Sell"}</TableCell>
                                <TableCell className="text-left">{formatDate(t.date, currency)}</TableCell>
                                <TableCell className="text-right font-mono">{Number(t.quantity)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(Number(t.price), currency)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(Number(t.tax ?? 0), currency)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(Number(t.price) * Number(t.quantity) + Number(t.tax ?? 0), currency)}</TableCell>
                                <TableCell className="text-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontalIcon />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelected(t); }} className="text-destructive focus:text-destructive">
                                                        <TrashIcon className="text-destructive" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                                        <AlertDialogDescription>Are you sure you want to delete this transaction?</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={async () => { if (!selected) return; await deleteTransaction({ transactionId: selected.id }); setSelected(null); }} disabled={isLoadingDeleteTransaction}>
                                                            {isLoadingDeleteTransaction ? <Spinner className="size-4" /> : "Delete"}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}