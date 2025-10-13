"use client"

import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PlusIcon, RefreshCcwIcon, SearchIcon, MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export default function InvestmentsPage() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col">
                <Label className="text-xl font-bold">Investments</Label>
                <Label className="text-sm font-normal">Add, edit, and manage your investments</Label>
            </div>

            <div className="w-full flex items-center justify-between gap-2 border border-border rounded-md p-4">
                <InputGroup className="w-full max-w-sm">
                    <InputGroupAddon>
                        <SearchIcon className="size-4" />
                    </InputGroupAddon>
                    <InputGroupInput placeholder="Search investments" />
                </InputGroup>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <RefreshCcwIcon className="size-4" />
                        <span className="hidden md:block">Update Prices</span>
                    </Button>
                    <Button>
                        <PlusIcon className="size-4" />
                        <span className="hidden md:block">Add Investment</span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-4 border border-border rounded-md p-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center">Symbol</TableHead>
                            <TableHead className="text-right">Buy Price</TableHead>
                            <TableHead className="text-right">Current Price</TableHead>
                            <TableHead className="text-right">Shares</TableHead>
                            <TableHead className="text-right">Dividends</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium text-center">APPL</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(78.91)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(100)}</TableCell>
                            <TableCell className="text-right font-mono">13.92736549</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(12.64)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(1638.70)}</TableCell>
                            <TableCell className=" text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontalIcon />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <PencilIcon />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                                            <TrashIcon className="text-destructive" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}