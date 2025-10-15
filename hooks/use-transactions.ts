import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { Transaction, TransactionType } from "@/lib/generated/prisma";
import { toast } from "sonner";

// Types
interface getTransactionsParams {
    investmentId: string;
    limit: number;
    page: number;
    
}

interface getTransactionsResponse {
    data: Transaction[];
    total: number;
}

interface newTransactionParams {
    investmentId: string;
}

interface newTransactionBody {
    type: TransactionType;
    quantity: number;
    price: number;
    date: string;
    tax?: number | null;
    observation?: string;
}

interface newTransactionResponse {
    message: string;
}

interface deleteTransactionParams {
    investmentId: string;
    transactionId: string;
}

interface deleteTransactionResponse {
    message: string;
}

// API Functions
const getTransactionsApi = async (params: getTransactionsParams) => {
    const response = await axios.get<getTransactionsResponse>(`/api/investments/${params.investmentId}/transactions`, {
        params: {
            limit: params.limit,
            page: params.page,
        },
    });

    return response.data;
}

const newTransactionApi = async (params: newTransactionParams, body: newTransactionBody) => {
    const response = await axios.post<newTransactionResponse>(`/api/investments/${params.investmentId}/transactions`, body);

    return response.data;
}

const deleteTransactionApi = async (params: deleteTransactionParams) => {
    const response = await axios.delete<deleteTransactionResponse>(`/api/investments/${params.investmentId}/transactions/${params.transactionId}`);

    return response.data;
}

// Main Hook
export const useTransactions = (investmentId: string) => {
    // Query Client
    const queryClient = useQueryClient();

    // Get Transactions
    const {
        data: transactions,
        isLoading: isLoadingTransactions,
        isError: isErrorTransactions,
        refetch: refetchTransactions,
    } = useQuery({
        queryKey: ["transactions", investmentId],
        queryFn: () => getTransactionsApi({
            investmentId,
            limit: 100,
            page: 1,
        }),
        enabled: !!investmentId,
    })

    // New Transaction
    const {
        mutateAsync: newTransaction,
        isPending: isLoadingNewTransaction,
        isError: isErrorNewTransaction,
    } = useMutation<newTransactionResponse, unknown, newTransactionBody>({
        mutationFn: (body) => newTransactionApi({ investmentId }, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", investmentId] });
            queryClient.invalidateQueries({ queryKey: ["investments"] });
        },
        onError: (error: unknown) => {
            console.error("Error creating transaction: ", error);
            toast.error(error instanceof AxiosError ? error.response?.data.error : "An unknown error occurred");
        },
    })

    // Delete Transaction
    const {
        mutateAsync: deleteTransaction,
        isPending: isLoadingDeleteTransaction,
        isError: isErrorDeleteTransaction,
    } = useMutation<deleteTransactionResponse, unknown, { transactionId: string }>({
        mutationFn: ({ transactionId }) => deleteTransactionApi({ investmentId, transactionId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", investmentId] });
            queryClient.invalidateQueries({ queryKey: ["investments"] });
        },
        onError: (error: unknown) => {
            console.error("Error deleting transaction: ", error);
            toast.error(error instanceof AxiosError ? error.response?.data.error : "An unknown error occurred");
        },
    })

    // Computed Values
    const hasTransactions = Boolean(transactions?.data && transactions.data.length > 0);

    return {
        // Queries
        transactions,
        isLoadingTransactions,
        isErrorTransactions,
        refetchTransactions,

        // New Mutations
        newTransaction,
        isLoadingNewTransaction,
        isErrorNewTransaction,

        // Delete Mutations
        deleteTransaction,
        isLoadingDeleteTransaction,
        isErrorDeleteTransaction,

        // Computed Values
        hasTransactions,
    }
}

