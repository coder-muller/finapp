import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Currency, Transaction, Dividend, SellGainLoss } from "./generated/prisma"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

interface InvestmentMetricsInput {
  transactions: Transaction[];
  dividends: Dividend[];
  sellGainLoss: SellGainLoss[];
  currentPrice: number | string | any;
  shares: number | string | any;
}

export interface InvestmentMetrics {
  // Buy metrics
  avgBuyPrice: number;
  totalInvested: number;
  totalQuantityBought: number;
  
  // Current position
  currentPrice: number;
  shares: number;
  currentValue: number;
  
  // Returns
  totalDividends: number;
  realizedGainLoss: number;
  unrealizedGainLoss: number;
  totalProfitLoss: number;
  
  // Percentages
  profitLossPercentage: number;
  returnOnInvestment: number;
}

/**
 * Calculate all investment metrics from transactions, dividends, and sell records
 * @param investment - Investment data with transactions, dividends, sellGainLoss, currentPrice, and shares
 * @returns Object with all calculated metrics
 */
export function calculateInvestmentMetrics(investment: InvestmentMetricsInput): InvestmentMetrics {
  // Calculate average buy price and total invested
  const buyTotals = investment.transactions
    .filter((t) => t.type === "BUY")
    .reduce(
      (acc, t) => {
        const qty = Number(t.quantity);
        const price = Number(t.price);
        const tax = Number(t.tax || 0);
        acc.totalQty += qty;
        acc.totalCost += (qty * price) + tax;
        return acc;
      },
      { totalQty: 0, totalCost: 0 }
    );

  const avgBuyPrice = buyTotals.totalQty > 0 ? buyTotals.totalCost / buyTotals.totalQty : 0;
  const totalInvested = buyTotals.totalCost;
  const totalQuantityBought = buyTotals.totalQty;

  // Current position
  const shares = Number(investment.shares || 0);
  const currentPrice = Number(investment.currentPrice || 0);
  const currentValue = shares * currentPrice;

  // Calculate Total Dividends received (amount - tax)
  const totalDividends = investment.dividends.reduce((sum, d) => {
    const amount = Number(d.amount);
    const tax = Number(d.tax || 0);
    return sum + amount - tax;
  }, 0);

  // Calculate Realized Gain/Loss from sells
  const realizedGainLoss = investment.sellGainLoss.reduce(
    (sum, sgl) => sum + Number(sgl.realizedProfitLoss),
    0
  );

  // Calculate Unrealized Gain/Loss (current position vs cost basis)
  const unrealizedGainLoss = currentValue - (avgBuyPrice * shares);

  // Calculate Total Profit/Loss
  // unrealized + dividends + realized from sells
  const totalProfitLoss = unrealizedGainLoss + totalDividends + realizedGainLoss;

  // Calculate percentages
  const profitLossPercentage = totalInvested > 0 
    ? (totalProfitLoss / totalInvested) * 100 
    : 0;

  const returnOnInvestment = totalInvested > 0
    ? ((currentValue + totalDividends + realizedGainLoss) / totalInvested - 1) * 100
    : 0;

  return {
    avgBuyPrice,
    totalInvested,
    totalQuantityBought,
    currentPrice,
    shares,
    currentValue,
    totalDividends,
    realizedGainLoss,
    unrealizedGainLoss,
    totalProfitLoss,
    profitLossPercentage,
    returnOnInvestment,
  };
}
