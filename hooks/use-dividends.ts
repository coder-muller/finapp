import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { Dividend } from "@/lib/generated/prisma";
import { toast } from "sonner";

// Types
interface getDividendsParams {
    investmentId: string;
    limit: number;
    page: number;
}

interface getDividendsResponse {
    data: Dividend[];
    total: number;
}

interface newDividendParams {
    investmentId: string;
}

interface newDividendBody {
    amount: number;
    date: string;
    tax?: number | null;
    observation?: string;
}

interface newDividendResponse {
    message: string;
}

interface deleteDividendParams {
    investmentId: string;
    dividendId: string;
}

interface deleteDividendResponse {
    message: string;
}

// API Functions
const getDividendsApi = async (params: getDividendsParams) => {
    const response = await axios.get<getDividendsResponse>(`/api/investments/${params.investmentId}/dividends`, {
        params: {
            limit: params.limit,
            page: params.page,
        },
    });

    return response.data;
}

const newDividendApi = async (params: newDividendParams, body: newDividendBody) => {
    const response = await axios.post<newDividendResponse>(`/api/investments/${params.investmentId}/dividends`, body);

    return response.data;
}

const deleteDividendApi = async (params: deleteDividendParams) => {
    const response = await axios.delete<deleteDividendResponse>(`/api/investments/${params.investmentId}/dividends/${params.dividendId}`);

    return response.data;
}

// Main Hook
export const useDividends = (investmentId: string) => {
    // Query Client
    const queryClient = useQueryClient();

    // Get Dividends
    const {
        data: dividends,
        isLoading: isLoadingDividends,
        isError: isErrorDividends,
        refetch: refetchDividends,
    } = useQuery({
        queryKey: ["dividends", investmentId],
        queryFn: () => getDividendsApi({
            investmentId,
            limit: 100,
            page: 1,
        }),
        enabled: !!investmentId,
    })

    // New Dividend
    const {
        mutateAsync: newDividend,
        isPending: isLoadingNewDividend,
        isError: isErrorNewDividend,
    } = useMutation<newDividendResponse, unknown, newDividendBody>({
        mutationFn: (body) => newDividendApi({ investmentId }, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dividends", investmentId] });
            queryClient.invalidateQueries({ queryKey: ["investments"] });
        },
        onError: (error: unknown) => {
            console.error("Error creating dividend: ", error);
            toast.error(error instanceof AxiosError ? error.response?.data.error : "An unknown error occurred");
        },
    })

    // Delete Dividend
    const {
        mutateAsync: deleteDividend,
        isPending: isLoadingDeleteDividend,
        isError: isErrorDeleteDividend,
    } = useMutation<deleteDividendResponse, unknown, { dividendId: string }>({
        mutationFn: ({ dividendId }) => deleteDividendApi({ investmentId, dividendId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dividends", investmentId] });
            queryClient.invalidateQueries({ queryKey: ["investments"] });
        },
        onError: (error: unknown) => {
            console.error("Error deleting dividend: ", error);
            toast.error(error instanceof AxiosError ? error.response?.data.error : "An unknown error occurred");
        },
    })

    // Computed Values
    const hasDividends = Boolean(dividends?.data && dividends.data.length > 0);

    return {
        // Queries
        dividends,
        isLoadingDividends,
        isErrorDividends,
        refetchDividends,

        // New Mutations
        newDividend,
        isLoadingNewDividend,
        isErrorNewDividend,

        // Delete Mutations
        deleteDividend,
        isLoadingDeleteDividend,
        isErrorDeleteDividend,

        // Computed Values
        hasDividends,
    }
}

