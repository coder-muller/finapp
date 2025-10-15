"use client"

import { Dividend, Currency } from "@/lib/generated/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { MoreHorizontalIcon, TrashIcon } from "lucide-react";
import { useDividends } from "@/hooks/use-dividends";
import { useState } from "react";

interface DividendsTableProps {
    dividends: Dividend[];
    currency: Currency;
}

export default function DividendsTable({ dividends, currency }: DividendsTableProps) {
    const [selected, setSelected] = useState<Dividend | null>(null);
    const investmentId = dividends[0]?.investmentId ?? "";
    const { deleteDividend, isLoadingDeleteDividend } = useDividends(investmentId);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <Label className="text-sm font-normal">All Dividends</Label>
                    <Label className="text-xs text-muted-foreground">View dividends for this investment</Label>
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-left">Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-left">Observation</TableHead>
                        <TableHead className="text-center w-[80px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {dividends.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">
                                <div className="w-full h-12 flex items-center justify-center">
                                    <Label className="text-sm text-muted-foreground">No dividends found</Label>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        dividends.map((d) => (
                            <TableRow key={d.id}>
                                <TableCell className="font-medium">{formatDate(d.date, currency)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(Number(d.amount), currency)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(Number(d.tax ?? 0), currency)}</TableCell>
                                <TableCell className="text-left">{d.observation ?? "—"}</TableCell>
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
                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSelected(d); }} className="text-destructive focus:text-destructive">
                                                        <TrashIcon className="text-destructive" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Dividend</AlertDialogTitle>
                                                        <AlertDialogDescription>Are you sure you want to delete this dividend?</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={async () => { if (!selected) return; await deleteDividend({ dividendId: selected.id }); setSelected(null); }} disabled={isLoadingDeleteDividend}>
                                                            {isLoadingDeleteDividend ? <Spinner className="size-4" /> : "Delete"}
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