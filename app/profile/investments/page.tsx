"use client"

import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PlusIcon, RefreshCcwIcon, SearchIcon, MoreHorizontalIcon, PencilIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, CoinsIcon, InfoIcon, SortAscIcon, SortDescIcon, FilterIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, calculateInvestmentMetrics } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useInvestments } from "@/hooks/use-investments";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Currency, Investment, InvestmentType } from "@/lib/generated/prisma";
import { useTransactions } from "@/hooks/use-transactions";
import { useDividends } from "@/hooks/use-dividends";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

const newInvestmentSchema = z.object({
    symbol: z.string().min(1, { message: "Symbol is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    type: z.enum(["STOCK", "ETF", "CRYPTO", "FUND", "REAL_ESTATE", "OTHER"]),
    buyPrice: z.coerce.number().min(0, { message: "Buy price is required" }),
    buyDate: z.string().min(1, { message: "Buy date is required" }),
    shares: z.coerce.number().min(0, { message: "Shares are required" }),
    fees: z.coerce.number().optional(),
})

const updateInvestmentSchema = z.object({
    symbol: z.string().min(1, { message: "Symbol is required" }),
    name: z.string().min(1, { message: "Name is required" }),
    type: z.enum(["STOCK", "ETF", "CRYPTO", "FUND", "REAL_ESTATE", "OTHER"]),
})

const newTransactionSchema = z.object({
    type: z.enum(["BUY", "SELL"]),
    quantity: z.coerce.number().min(0, { message: "Quantity is required" }),
    price: z.coerce.number().min(0, { message: "Price is required" }),
    date: z.string().min(1, { message: "Date is required" }),
    tax: z.coerce.number().optional(),
    observation: z.string().optional(),
})

const newDividendSchema = z.object({
    amount: z.coerce.number().min(0, { message: "Amount is required" }),
    date: z.string().min(1, { message: "Date is required" }),
    tax: z.coerce.number().optional(),
    observation: z.string().optional(),
})

type newInvestmentFormType = z.infer<typeof newInvestmentSchema>;
type updateInvestmentFormType = z.infer<typeof updateInvestmentSchema>;
type newTransactionFormType = z.infer<typeof newTransactionSchema>;
type newDividendFormType = z.infer<typeof newDividendSchema>;

export default function InvestmentsPage() {

    // Hooks
    const {
        // Queries
        investments,
        isLoadingInvestments,
        isErrorInvestments,
        refetchInvestments,

        // New Mutations
        newInvestment,
        isLoadingNewInvestment,
        isErrorNewInvestment,

        // Update Mutations
        updateInvestment,
        isLoadingUpdateInvestment,
        isErrorUpdateInvestment,

        // Delete Mutations
        deleteInvestment,
        isLoadingDeleteInvestment,
        isErrorDeleteInvestment,

        // Update Investments
        updateInvestments,
        isLoadingUpdateInvestments,
        isErrorUpdateInvestments,

        // States
        search,
        limit,
        page,
        orderBy,
        type,
        status,
        currency,

        // Computed Values
        hasInvestments,
        hasNextPage,
        hasPreviousPage,

        // Handlers
        handleSearch,
        handleLimit,
        handlePage,
        handleOrderBy,
        handleType,
        handleStatus,
        handleCurrency,
    } = useInvestments()

    // New Investment Form
    const newInvestmentForm = useForm<newInvestmentFormType>({
        resolver: zodResolver(newInvestmentSchema) as any,
        defaultValues: {
            symbol: "",
            name: "",
            type: "STOCK",
            buyPrice: 0,
            buyDate: "",
            shares: 0,
            fees: undefined,
        },
    })

    // Update Investment Form
    const updateInvestmentForm = useForm<updateInvestmentFormType>({
        resolver: zodResolver(updateInvestmentSchema) as any,
        defaultValues: {
            symbol: "",
            name: "",
            type: "STOCK",
        },
    })

    // New Transaction Form
    const newTransactionForm = useForm<newTransactionFormType>({
        resolver: zodResolver(newTransactionSchema) as any,
        defaultValues: {
            type: "BUY",
            quantity: 0,
            price: 0,
            date: "",
            tax: undefined,
            observation: undefined,
        },
    })

    // New Dividend Form
    const newDividendForm = useForm<newDividendFormType>({
        resolver: zodResolver(newDividendSchema) as any,
        defaultValues: {
            amount: 0,
            date: "",
            tax: undefined,
            observation: undefined,
        },
    })

    // States
    const [isNewInvestmentOpen, setIsNewInvestmentOpen] = useState(false);
    const [isUpdateInvestmentOpen, setIsUpdateInvestmentOpen] = useState(false);
    const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
    const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
    const [isNewDividendOpen, setIsNewDividendOpen] = useState(false);
    const [selectedTransactionInvestmentId, setSelectedTransactionInvestmentId] = useState<string | null>(null);
    const [selectedDividendInvestmentId, setSelectedDividendInvestmentId] = useState<string | null>(null);
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    // Hooks for mutations dependent on selected investment
    const {
        newTransaction,
        isLoadingNewTransaction,
    } = useTransactions(selectedTransactionInvestmentId ?? "");

    const {
        newDividend,
        isLoadingNewDividend,
    } = useDividends(selectedDividendInvestmentId ?? "");

    // New Investment Submit
    const newInvestmentSubmit = newInvestmentForm.handleSubmit(async (data) => {
        try {
            await newInvestment({
                symbol: data.symbol,
                name: data.name,
                type: data.type,
                buyPrice: data.buyPrice,
                buyDate: data.buyDate, // API coerces to Date
                shares: data.shares,
                fees: data.fees ?? null,
            });
            setIsNewInvestmentOpen(false);
            newInvestmentForm.reset();
        } catch (error) {
            // toast handled in hook onError
        }
    })

    // Update Investment Submit
    const updateInvestmentSubmit = updateInvestmentForm.handleSubmit(async (data) => {
        if (!selectedInvestmentId) return;
        try {
            await updateInvestment({
                params: { investmentId: selectedInvestmentId },
                body: {
                    symbol: data.symbol,
                    name: data.name,
                    type: data.type,
                },
            });
            setIsUpdateInvestmentOpen(false);
        } catch (error) {
            // toast handled in hook onError
        }
    })

    // Handle New Investment Open
    const handleNewInvestmentOpen = () => {
        newInvestmentForm.reset({
            symbol: "",
            name: "",
            type: "STOCK",
            buyPrice: undefined,
            buyDate: "",
            shares: undefined,
            fees: undefined,
        });
        setIsNewInvestmentOpen(true);
    }

    const handleOpenUpdateInvestments = (investment: Investment) => {
        setSelectedInvestmentId(investment.id);
        updateInvestmentForm.reset({
            symbol: investment.symbol,
            name: investment.name,
            type: investment.type as any,
        });
        setIsUpdateInvestmentOpen(true);
    }

    // Handle New Transaction Open
    const handleOpenNewTransaction = (investment: Investment) => {
        setSelectedTransactionInvestmentId(investment.id);
        newTransactionForm.reset({
            type: "BUY",
            quantity: undefined as unknown as number,
            price: undefined as unknown as number,
            date: "",
            tax: undefined,
            observation: undefined,
        });
        setIsNewTransactionOpen(true);
    }

    // Handle New Dividend Open
    const handleOpenNewDividend = (investment: Investment) => {
        setSelectedDividendInvestmentId(investment.id);
        newDividendForm.reset({
            amount: undefined as unknown as number,
            date: "",
            tax: undefined,
            observation: undefined,
        });
        setIsNewDividendOpen(true);
    }

    // New Transaction Submit
    const newTransactionSubmit = newTransactionForm.handleSubmit(async (data) => {
        if (!selectedTransactionInvestmentId) return;
        try {
            await newTransaction({
                type: data.type,
                quantity: data.quantity,
                price: data.price,
                date: data.date, // API coerces to Date
                tax: data.tax ?? null,
                observation: data.observation ?? undefined,
            });
            setIsNewTransactionOpen(false);
            newTransactionForm.reset();
        } catch (error) {
            // toast handled in hook onError
        }
    })

    // New Dividend Submit
    const newDividendSubmit = newDividendForm.handleSubmit(async (data) => {
        if (!selectedDividendInvestmentId) return;
        try {
            await newDividend({
                amount: data.amount,
                date: data.date, // API coerces to Date
                tax: data.tax ?? null,
                observation: data.observation ?? undefined,
            });
            setIsNewDividendOpen(false);
            newDividendForm.reset();
        } catch (error) {
            // toast handled in hook onError
        }
    })

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
                    <InputGroupInput
                        placeholder="Search investments"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </InputGroup>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => updateInvestments()} disabled={isLoadingUpdateInvestments}>
                        {isLoadingUpdateInvestments ? <RefreshCcwIcon className="size-4 animate-spin" /> : <RefreshCcwIcon className="size-4" />}
                        <span className="hidden md:block">Update Data</span>
                    </Button>
                    <Button onClick={handleNewInvestmentOpen}>
                        <PlusIcon className="size-4" />
                        <span className="hidden md:block">Add Investment</span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-4 border border-border rounded-md p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                        <Label className="text-sm font-normal">All Investments</Label>
                        <Label className="text-xs text-muted-foreground">View all your investments</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsFilterSheetOpen(true)}>
                            <FilterIcon className="size-4" />
                            <span className="hidden md:block">Filter</span>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    {orderBy.includes("asc") ? <SortAscIcon /> : <SortDescIcon />}
                                    <span className="hidden md:block">
                                        {orderBy.split(":")[0].charAt(0).toUpperCase() + orderBy.split(":")[0].slice(1)}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOrderBy("symbol:asc")}>
                                    <SortAscIcon />
                                    Symbol
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOrderBy("symbol:desc")}>
                                    <SortDescIcon />
                                    Symbol
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOrderBy("type:asc")}>
                                    <SortAscIcon />
                                    Type
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOrderBy("type:desc")}>
                                    <SortDescIcon />
                                    Type
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOrderBy("currentPrice:asc")}>
                                    <SortAscIcon />
                                    Current Price
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOrderBy("currentPrice:desc")}>
                                    <SortDescIcon />
                                    Current Price
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOrderBy("shares:asc")}>
                                    <SortAscIcon />
                                    Shares
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOrderBy("shares:desc")}>
                                    <SortDescIcon />
                                    Shares
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center">Symbol</TableHead>
                            <TableHead className="text-right">Buy Price</TableHead>
                            <TableHead className="text-right">Current Price</TableHead>
                            <TableHead className="text-right">Shares</TableHead>
                            <TableHead className="text-right">Dividends</TableHead>
                            <TableHead className="text-right">Gain/Loss</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingInvestments ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center">
                                    <div className="w-full h-12 flex items-center justify-center">
                                        <Spinner className="size-4" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : isErrorInvestments ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center">
                                    <div className="w-full h-12 flex items-center justify-center">
                                        <p className="text-sm text-destructive">Error loading investments</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : !hasInvestments ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center">
                                    <div className="w-full h-12 flex items-center justify-center">
                                        <p className="text-sm text-muted-foreground">No investments found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : investments?.data.map((investment) => {
                            // Calculate all metrics using the centralized function
                            const metrics = calculateInvestmentMetrics({
                                transactions: investment.transactions,
                                dividends: investment.dividends,
                                sellGainLoss: investment.sellGainLoss,
                                currentPrice: investment.currentPrice,
                                shares: investment.shares,
                            });

                            return (
                                <TableRow key={investment.id} className={cn(metrics.shares === 0 && "text-muted-foreground opacity-65")}>
                                    <TableCell className="font-medium text-center">{investment.symbol}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(metrics.avgBuyPrice, investment.currency)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(metrics.currentPrice, investment.currency)}</TableCell>
                                    <TableCell className="text-right">{metrics.shares}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(metrics.totalDividends, investment.currency)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(metrics.totalProfitLoss, investment.currency)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(metrics.currentValue, investment.currency)}</TableCell>
                                    <TableCell className=" text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontalIcon />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <Link href={`/profile/investments/${investment.id}`}>
                                                    <DropdownMenuItem>
                                                        <InfoIcon />
                                                        More Info
                                                    </DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleOpenNewTransaction(investment)}>
                                                    <PlusCircleIcon />
                                                    Add Transaction
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenNewDividend(investment)}>
                                                    <CoinsIcon />
                                                    Add Dividend
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleOpenUpdateInvestments(investment)}>
                                                    <PencilIcon />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem className={cn("text-destructive focus:text-destructive", isLoadingDeleteInvestment && "opacity-50 animate-pulse")} onSelect={(e) => e.preventDefault()} disabled={isLoadingDeleteInvestment}>
                                                            <TrashIcon className="text-destructive" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Investment</AlertDialogTitle>
                                                            <AlertDialogDescription>Are you sure you want to delete this investment?</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteInvestment({ investmentId: investment.id })}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>

                <div className="flex items-center justify-between">
                    <Select value={limit.toString()} onValueChange={(value) => handleLimit(Number(value))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Items per page" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10 Items per page</SelectItem>
                            <SelectItem value="20">20 Items per page</SelectItem>
                            <SelectItem value="50">50 Items per page</SelectItem>
                            <SelectItem value="100">100 Items per page</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" disabled={!hasPreviousPage} onClick={() => handlePage(page - 1)}>
                            <ChevronLeftIcon className="size-4" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={!hasNextPage} onClick={() => handlePage(page + 1)}>
                            <ChevronRightIcon className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isNewInvestmentOpen} onOpenChange={setIsNewInvestmentOpen}>
                <DialogContent className="w-full max-w-sm md:max-w-lg lg:max-w-xl xl:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Investment</DialogTitle>
                        <DialogDescription>Add a new investment to your portfolio</DialogDescription>
                    </DialogHeader>
                    <Form {...newInvestmentForm}>
                        <form onSubmit={newInvestmentSubmit} className="space-y-4">
                            <FormField control={newInvestmentForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field}
                                            placeholder="Apple"
                                            disabled={newInvestmentForm.formState.isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <FormField control={newInvestmentForm.control} name="symbol" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Symbol</FormLabel>
                                        <FormControl>
                                            <Input {...field}
                                                placeholder="APPL"
                                                disabled={newInvestmentForm.formState.isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={newInvestmentForm.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={newInvestmentForm.formState.isSubmitting}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="STOCK">Stock</SelectItem>
                                                    <SelectItem value="ETF">ETF</SelectItem>
                                                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                                                    <SelectItem value="FUND">Fund</SelectItem>
                                                    <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                                                    <SelectItem value="OTHER">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <FormField control={newInvestmentForm.control} name="buyDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Buy Date</FormLabel>
                                        <FormControl>
                                            <Input {...field}
                                                placeholder="Buy date"
                                                type="date"
                                                disabled={newInvestmentForm.formState.isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={newInvestmentForm.control} name="shares" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Shares</FormLabel>
                                        <FormControl>
                                            <Input {...field}
                                                placeholder="22.92736549"
                                                type="number"
                                                min={0}
                                                step={0.0000000001}
                                                disabled={newInvestmentForm.formState.isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={newInvestmentForm.control} name="buyPrice" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Buy Price</FormLabel>
                                        <FormControl>
                                            <Input {...field}
                                                placeholder="$8.91"
                                                type="number"
                                                min={0}
                                                step={0.0000000001}
                                                disabled={newInvestmentForm.formState.isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={newInvestmentForm.control} name="fees" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fees</FormLabel>
                                    <FormControl>
                                        <Input {...field}
                                            placeholder="$1.23"
                                            type="number"
                                            min={0}
                                            step={0.0000000001}
                                            disabled={newInvestmentForm.formState.isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="submit" disabled={newInvestmentForm.formState.isSubmitting}>
                                    {newInvestmentForm.formState.isSubmitting ? (
                                        <Spinner className="size-4" />
                                    ) : (
                                        "Add Investment"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={isUpdateInvestmentOpen} onOpenChange={setIsUpdateInvestmentOpen}>
                <DialogContent className="w-full max-w-sm md:max-w-lg lg:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Investment</DialogTitle>
                        <DialogDescription>Update the basic info of this investment</DialogDescription>
                    </DialogHeader>
                    <Form {...updateInvestmentForm}>
                        <form onSubmit={updateInvestmentSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <FormField control={updateInvestmentForm.control} name="symbol" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Symbol</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={updateInvestmentForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={updateInvestmentForm.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={updateInvestmentForm.formState.isSubmitting}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="STOCK">Stock</SelectItem>
                                                    <SelectItem value="ETF">ETF</SelectItem>
                                                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                                                    <SelectItem value="FUND">Fund</SelectItem>
                                                    <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                                                    <SelectItem value="OTHER">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={updateInvestmentForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={updateInvestmentForm.formState.isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="submit" disabled={updateInvestmentForm.formState.isSubmitting}>
                                    {isLoadingUpdateInvestment ? <Spinner className="size-4" /> : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* New Transaction Dialog */}
            <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
                <DialogContent className="w-full max-w-sm md:max-w-lg lg:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Add Transaction</DialogTitle>
                        <DialogDescription>Create a new transaction for this investment</DialogDescription>
                    </DialogHeader>
                    <Form {...newTransactionForm}>
                        <form onSubmit={newTransactionSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <FormField control={newTransactionForm.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={newTransactionForm.formState.isSubmitting}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="BUY">Buy</SelectItem>
                                                    <SelectItem value="SELL">Sell</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={newTransactionForm.control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="date" disabled={newTransactionForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <FormField control={newTransactionForm.control} name="quantity" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="22.92736549" type="number" min={0} step={0.0000000001} disabled={newTransactionForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={newTransactionForm.control} name="price" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="$8.91" type="number" min={0} step={0.0000000001} disabled={newTransactionForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={newTransactionForm.control} name="tax" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tax</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="$1.23" type="number" min={0} step={0.0000000001} disabled={newTransactionForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={newTransactionForm.control} name="observation" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observation</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Optional" disabled={newTransactionForm.formState.isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="submit" disabled={newTransactionForm.formState.isSubmitting}>
                                    {newTransactionForm.formState.isSubmitting || isLoadingNewTransaction ? <Spinner className="size-4" /> : "Add Transaction"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* New Dividend Dialog */}
            <Dialog open={isNewDividendOpen} onOpenChange={setIsNewDividendOpen}>
                <DialogContent className="w-full max-w-sm md:max-w-lg lg:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Add Dividend</DialogTitle>
                        <DialogDescription>Add a new dividend to this investment</DialogDescription>
                    </DialogHeader>
                    <Form {...newDividendForm}>
                        <form onSubmit={newDividendSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <FormField control={newDividendForm.control} name="amount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="$1.23" type="number" min={0} step={0.0000000001} disabled={newDividendForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={newDividendForm.control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="date" disabled={newDividendForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <FormField control={newDividendForm.control} name="tax" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tax</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="$1.23" type="number" min={0} step={0.0000000001} disabled={newDividendForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={newDividendForm.control} name="observation" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Observation</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Optional" disabled={newDividendForm.formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={newDividendForm.formState.isSubmitting}>
                                    {newDividendForm.formState.isSubmitting || isLoadingNewDividend ? <Spinner className="size-4" /> : "Add Dividend"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Filter</SheetTitle>
                        <SheetDescription>Filter your investments</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 px-4">
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">Investment Type</Label>
                            <Select value={type} onValueChange={(value) => handleType(value as "all" | InvestmentType)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="STOCK">Stock</SelectItem>
                                    <SelectItem value="ETF">ETF</SelectItem>
                                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                                    <SelectItem value="FUND">Fund</SelectItem>
                                    <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">Status</Label>
                            <Select value={status} onValueChange={(value) => handleStatus(value as "all" | "active" | "inactive")}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">Currency</Label>
                            <Select value={currency} onValueChange={(value) => handleCurrency(value as "all" | Currency)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="BRL">BRL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    );
}