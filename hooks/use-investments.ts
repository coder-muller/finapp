import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useState } from "react";
import {
    Investment,
    Transaction,
    Dividend,
    InvestmentType,
    SellGainLoss,
    Currency,
} from "@/lib/generated/prisma";
import { toast } from "sonner";

type InvestmentWithTransactionsAndDividendsGainLoss = Investment & {
    transactions: Transaction[];
    dividends: Dividend[];
    sellGainLoss: SellGainLoss[];
}

// Single Investment types
type InvestmentWithRelations = Investment & {
    transactions: Transaction[];
    dividends: Dividend[];
    sellGainLoss: SellGainLoss[];
    equitySeries?: Array<{ month: string; value: number; invested: number; dividends: number }>;
}

interface getInvestmentResponse {
    data: InvestmentWithRelations;
}

// Types
interface getInvestmentsParams {
    type: "all" | InvestmentType;
    status: "all" | "active" | "inactive";
    currency: "all" | Currency;
    orderBy: "symbol:asc" | "symbol:desc" | "type:asc" | "type:desc" | "currentPrice:asc" | "currentPrice:desc" | "shares:asc" | "shares:desc";
    search: string;
    limit: number;
    page: number;
}

interface getInvestmentsResponse {
    data: InvestmentWithTransactionsAndDividendsGainLoss[];
    total: number;
}

interface newInvestmentBody {
    symbol: string;
    name: string;
    type: InvestmentType;
    buyPrice: number;
    buyDate: string;
    shares: number;
    fees: number | null;
}

interface newInvestmentResponse {
    message: string;
}

interface updateInvestmentParams {
    investmentId: string;
}

interface updateInvestmentBody {
    symbol: string;
    name: string;
    type: InvestmentType;
}

interface updateInvestmentResponse {
    message: string;
}


interface deleteInvestmentParams {
    investmentId: string;
}

interface deleteInvestmentResponse {
    message: string;
}

interface updateInvestmentsResponse {
    message: string;
}


// API Functions
const getInvestmentsApi = async (params: getInvestmentsParams) => {
    const response = await axios.get<getInvestmentsResponse>("/api/investments", {
        params,
    });

    return response.data;
}

const newInvestmentApi = async (body: newInvestmentBody) => {
    const response = await axios.post<newInvestmentResponse>("/api/investments", body);

    return response.data;
}

const updateInvestmentApi = async (params: updateInvestmentParams, body: updateInvestmentBody) => {
    const response = await axios.patch<updateInvestmentResponse>(`/api/investments/${params.investmentId}`, body);

    return response.data;
}

const deleteInvestmentApi = async (params: deleteInvestmentParams) => {
    const response = await axios.delete<deleteInvestmentResponse>(`/api/investments/${params.investmentId}`);

    return response.data;
}

// Update Investments
const updateInvestmentsApi = async () => {
    const response = await axios.patch<updateInvestmentsResponse>("/api/update");

    return response.data;
}

const getInvestmentApi = async (investmentId: string) => {
    const response = await axios.get<getInvestmentResponse>(`/api/investments/${investmentId}`);

    return response.data;
}

// Single Investment
export const useInvestment = (investmentId: string) => {
    const {
        data: investment,
        isLoading: isLoadingInvestment,
        isError: isErrorInvestment,
        refetch: refetchInvestment,
    } = useQuery({
        queryKey: ["investment", investmentId],
        queryFn: () => getInvestmentApi(investmentId),
        enabled: !!investmentId,
    })

    return {
        investment,
        isLoadingInvestment,
        isErrorInvestment,
        refetchInvestment,
    }
}

// Main Hook
export const useInvestments = () => {
    // Query Client
    const queryClient = useQueryClient();

    // States
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [orderBy, setOrderBy] = useState<"symbol:asc" | "symbol:desc" | "type:asc" | "type:desc" | "currentPrice:asc" | "currentPrice:desc" | "shares:asc" | "shares:desc">("symbol:asc");
    const [type, setType] = useState<"all" | InvestmentType>("all");
    const [status, setStatus] = useState<"all" | "active" | "inactive">("active");
    const [currency, setCurrency] = useState<"all" | Currency>("all");

    // Get Investments
    const {
        data: investments,
        isLoading: isLoadingInvestments,
        isError: isErrorInvestments,
        refetch: refetchInvestments,
    } = useQuery({
        queryKey: ["investments", { search, limit, page, orderBy, type, status, currency }],
        queryFn: () => getInvestmentsApi({
            search,
            limit,
            page,
            orderBy,
            type,
            status,
            currency,
        }),
    })

    // New Investment
    const {
        mutateAsync: newInvestment,
        isPending: isLoadingNewInvestment,
        isError: isErrorNewInvestment,
    } = useMutation({
        mutationFn: newInvestmentApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["investments"] });
        },
        onError: (error: unknown) => {
            console.error("Error creating investment: ", error);
            toast.error(error instanceof AxiosError ? error.response?.data.error : "An unknown error occurred");
        },
    })

    // Update Investment
    const {
        mutateAsync: updateInvestment,
        isPending: isLoadingUpdateInvestment,
        isError: isErrorUpdateInvestment,
    } = useMutation<{ message: string }, unknown, { params: updateInvestmentParams; body: updateInvestmentBody }>({
        mutationFn: ({ params, body }) => updateInvestmentApi(params, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["investments"] });
        },
        onError: (error: unknown) => {
            console.error("Error updating investment: ", error);
            toast.error(error instanceof AxiosError ? error.response?.data.error : "An unknown error occurred");
        },
    })

    // Delete Investment
    const {
        mutateAsync: deleteInvestment,
        isPending: isLoadingDeleteInvestment,
        isError: isErrorDeleteInvestment,
    } = useMutation({
        mutationFn: deleteInvestmentApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["investments"] });
        },
        onError: (error: unknown) => {
            console.error("Error deleting investment: ", error);
            toast.error(error instanceof AxiosError ? error.response?.data.error : "An unknown error occurred");
        },
    })

    // Update Investments
    const {
        mutateAsync: updateInvestments,
        isPending: isLoadingUpdateInvestments,
        isError: isErrorUpdateInvestments,
    } = useMutation({
        mutationFn: updateInvestmentsApi,
        onSuccess: () => {
            toast.success("Investments updated successfully");
            queryClient.invalidateQueries({ queryKey: ["investments"] });
        },
        onError: (error: unknown) => {
            console.error("Error updating investments: ", error);
            toast.error(error instanceof AxiosError ? error.response?.data.error : "An unknown error occurred");
        },
    })

    // Computed Values
    const hasInvestments = Boolean(investments?.data && investments.data.length > 0);
    const hasNextPage = Boolean(investments?.total && investments.total > (page * limit));
    const hasPreviousPage = page > 1;

    // Handlers
    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(1);
    }

    const handleLimit = (value: number) => {
        setLimit(value);
        setPage(1);
    }

    const handlePage = (value: number) => {
        setPage(value);
    }

    const handleOrderBy = (value: "symbol:asc" | "symbol:desc" | "type:asc" | "type:desc" | "currentPrice:asc" | "currentPrice:desc" | "shares:asc" | "shares:desc") => {
        setOrderBy(value);
        setPage(1);
    }

    const handleType = (value: "all" | InvestmentType) => {
        setType(value);
        setPage(1);
    }

    const handleStatus = (value: "all" | "active" | "inactive") => {
        setStatus(value);
        setPage(1);
    }

    const handleCurrency = (value: "all" | Currency) => {
        setCurrency(value);
        setPage(1);
    }

    return {
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
    }

}
