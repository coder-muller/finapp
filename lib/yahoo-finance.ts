import yahooFinance from "yahoo-finance2";
import type { PrismaClient, Prisma } from "@/lib/generated/prisma/client";

interface CachedPrice {
    price: number;
    timestamp: number;
    ttl: number;
}

interface YahooFinanceConfig {
    cacheTtlMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
}

interface YahooFinanceServiceConfig {
    cacheTtlMs: number;
    maxRetries: number;
    retryDelayMs: number;
}

interface DividendEvent {
    date: Date;
    amount: number;
}

class YahooFinanceService {
    private cache = new Map<string, CachedPrice>();
    private pendingRequests = new Map<string, Promise<number | null>>();
    private dividendCache = new Map<string, { events: DividendEvent[]; timestamp: number; ttl: number }>();
    private pendingDividendRequests = new Map<string, Promise<DividendEvent[]>>();
    private config: YahooFinanceServiceConfig;

    constructor(config: YahooFinanceConfig = {}) {
        this.config = {
            cacheTtlMs: config.cacheTtlMs ?? 15 * 60 * 1000, // 15 minutes default
            maxRetries: config.maxRetries ?? 3,
            retryDelayMs: config.retryDelayMs ?? 1000, // 1 second default
        };

        // Periodic cleanup of expired cache entries
        setInterval(() => this.cleanupExpiredCache(), this.config.cacheTtlMs);
    }

    private getValidatedConfig(): YahooFinanceServiceConfig {
        return {
            cacheTtlMs: this.config.cacheTtlMs || 15 * 60 * 1000,
            maxRetries: this.config.maxRetries || 3,
            retryDelayMs: this.config.retryDelayMs || 1000,
        };
    }

    private isCacheValid(cached: CachedPrice): boolean {
        return Date.now() - cached.timestamp < cached.ttl;
    }

    private cleanupExpiredCache(): void {
        const keysToDelete: string[] = [];
        this.cache.forEach((cached, symbol) => {
            if (!this.isCacheValid(cached)) {
                keysToDelete.push(symbol);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    private async fetchWithRetry(symbol: string, attempt = 1): Promise<any> {
        const { maxRetries, retryDelayMs } = this.getValidatedConfig();
        try {
            return await yahooFinance.quote(symbol);
        } catch (error) {
            if (attempt < maxRetries) {
                await new Promise(resolve =>
                    setTimeout(resolve, retryDelayMs * attempt)
                );
                return this.fetchWithRetry(symbol, attempt + 1);
            }
            throw error;
        }
    }

    private async fetchPrice(symbol: string): Promise<number | null> {
        const { cacheTtlMs } = this.getValidatedConfig();
        try {
            const symbolData = await this.fetchWithRetry(symbol);

            if (!symbolData?.regularMarketPrice) {
                return null;
            }

            const price = Number(symbolData.regularMarketPrice);

            // Cache the result
            this.cache.set(symbol, {
                price,
                timestamp: Date.now(),
                ttl: cacheTtlMs,
            });

            return price;
        } catch (error) {
            console.warn(`Failed to fetch price for ${symbol}:`, error);
            return null;
        }
    }

    async getCurrentPrice(symbol: string): Promise<number | null> {
        if (!symbol?.trim()) {
            return null;
        }

        const normalizedSymbol = symbol.trim().toUpperCase();

        // Check cache first
        const cached = this.cache.get(normalizedSymbol);
        if (cached && this.isCacheValid(cached)) {
            return cached.price;
        }

        // Check if there's already a pending request for this symbol
        const pendingRequest = this.pendingRequests.get(normalizedSymbol);
        if (pendingRequest) {
            return pendingRequest;
        }

        // Create and cache the pending request
        const requestPromise = this.fetchPrice(normalizedSymbol).finally(() => {
            this.pendingRequests.delete(normalizedSymbol);
        });

        this.pendingRequests.set(normalizedSymbol, requestPromise);
        return requestPromise;
    }

    private buildDividendsCacheKey(symbol: string, period1: number, period2: number): string {
        return `DIV:${symbol}:${period1}:${period2}`;
    }

    private normalizeSymbol(symbol: string): string {
        return symbol.trim().toUpperCase();
    }

    async getDividendEvents(symbol: string, from?: Date, to?: Date): Promise<DividendEvent[]> {
        if (!symbol?.trim()) return [];

        const normalizedSymbol = this.normalizeSymbol(symbol);
        const start = from ? Math.floor(from.getTime() / 1000) : Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000); // default: last 1y
        const end = to ? Math.floor(to.getTime() / 1000) : Math.floor(Date.now() / 1000);

        const cacheKey = this.buildDividendsCacheKey(normalizedSymbol, start, end);

        // Check cache
        const cached = this.dividendCache.get(cacheKey);
        if (cached && this.isCacheValid({ price: 0, timestamp: cached.timestamp, ttl: cached.ttl })) {
            return cached.events;
        }

        // Check pending
        const pending = this.pendingDividendRequests.get(cacheKey);
        if (pending) return pending;

        const { cacheTtlMs } = this.getValidatedConfig();

        const req = (async (): Promise<DividendEvent[]> => {
            try {
                const result = await yahooFinance.chart(normalizedSymbol, {
                    period1: start,
                    period2: end,
                    events: "dividends",
                } as any);

                const rawDivs = result?.events?.dividends ? Object.values(result.events.dividends as any) : [];
                const events: DividendEvent[] = rawDivs.map((d: any) => ({
                    date: new Date(Number(d.date) * 1000),
                    amount: Number(d.amount),
                }));

                // Cache
                this.dividendCache.set(cacheKey, { events, timestamp: Date.now(), ttl: cacheTtlMs });
                return events;
            } catch (e) {
                console.warn(`Failed to fetch dividends for ${normalizedSymbol}:`, e);
                return [];
            }
        })().finally(() => {
            this.pendingDividendRequests.delete(cacheKey);
        });

        this.pendingDividendRequests.set(cacheKey, req);
        return req;
    }

    private getSharesAtDate(transactions: Array<{ type: string; quantity: any; date: Date }>, atDate: Date): number {
        if (!transactions?.length) return 0;
        const cutoff = atDate.getTime();
        let totalShares = 0;
        for (const t of transactions) {
            if (new Date(t.date).getTime() <= cutoff) {
                const qty = Number(t.quantity);
                if (t.type === "BUY") totalShares += qty;
                else if (t.type === "SELL") totalShares -= qty;
            }
        }
        return totalShares;
    }

    private roundDecimal(value: number, places = 6): number {
        const p = Math.pow(10, places);
        return Math.round((value + Number.EPSILON) * p) / p;
    }

    async syncInvestmentDividends(prismaOrTx: PrismaClient | Prisma.TransactionClient, investmentId: string): Promise<{ created: number; updated: number; deleted: number; errors: string[] }> {
        const errors: string[] = [];
        let created = 0;
        let updated = 0;
        let deleted = 0;

        // Load investment with transactions and dividends
        const investment = await prismaOrTx.investment.findUnique({
            where: { id: investmentId },
            include: {
                transactions: {
                    orderBy: { date: "asc" },
                },
                dividends: {
                    orderBy: { date: "desc" },
                },
            },
        });

        if (!investment) {
            return { created, updated, deleted, errors: ["Investment not found"] };
        }

        // Determine window
        const lastDividendDate = investment.dividends.length > 0
            ? new Date(investment.dividends[0].date)
            : (investment.transactions.length > 0 ? new Date(investment.transactions[0].date) : null);

        if (!lastDividendDate) {
            // No transactions, nothing to sync
            return { created, updated, deleted, errors };
        }

        const period1 = lastDividendDate;
        const period2 = new Date();

        // Fetch dividend events with caching
        const events = await this.getDividendEvents(investment.symbol, period1, period2);

        // Build quick index of existing dividends by date (ms)
        const existingByMs = new Map<number, typeof investment.dividends[number]>();
        for (const d of investment.dividends) {
            existingByMs.set(new Date(d.date).getTime(), d);
        }

        for (const ev of events) {
            try {
                const sharesAtDate = this.getSharesAtDate(investment.transactions as any, ev.date);
                const evMs = ev.date.getTime();
                const existing = existingByMs.get(evMs) || null;

                if (sharesAtDate <= 0) {
                    if (existing) {
                        await prismaOrTx.dividend.delete({ where: { id: existing.id } });
                        deleted += 1;
                    }
                    continue;
                }

                const amount = this.roundDecimal(ev.amount * sharesAtDate, 6);
                const tax = this.roundDecimal(amount * 0.30, 6);

                if (existing) {
                    const existingAmount = Number((existing as any).amount);
                    const existingTax = existing.tax ? Number(existing.tax as any) : null;
                    const needUpdate = existingAmount !== amount || (existingTax ?? 0) !== tax;
                    if (needUpdate) {
                        await prismaOrTx.dividend.update({
                            where: { id: existing.id },
                            data: {
                                amount: amount,
                                tax: tax,
                                observation: `Dividend from ${investment.symbol} on ${ev.date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
                            },
                        });
                        updated += 1;
                    }
                } else {
                    await prismaOrTx.dividend.create({
                        data: {
                            investmentId: investment.id,
                            amount: amount,
                            date: new Date(evMs),
                            tax: tax,
                            observation: `Dividend from ${investment.symbol} on ${ev.date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
                        },
                    });
                    created += 1;
                }
            } catch (e: any) {
                errors.push(String(e?.message || e));
            }
        }

        return { created, updated, deleted, errors };
    }

    // Method to manually invalidate cache for a specific symbol
    invalidateCache(symbol: string): void {
        const normalizedSymbol = symbol.trim().toUpperCase();
        this.cache.delete(normalizedSymbol);
    }

    // Method to clear all cache
    clearCache(): void {
        this.cache.clear();
        this.pendingRequests.clear();
    }

    // Method to get cache stats
    getCacheStats() {
        const validEntries = Array.from(this.cache.values()).filter(entry =>
            this.isCacheValid(entry)
        ).length;

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries: this.cache.size - validEntries,
            pendingRequests: this.pendingRequests.size,
        };
    }
}

// Export singleton instance
export const yahooFinanceService = new YahooFinanceService();

// Export the main function for backward compatibility
export async function getCurrentPrice(symbol: string): Promise<number | null> {
    return yahooFinanceService.getCurrentPrice(symbol);
}

export async function getDividendEvents(symbol: string, from?: Date, to?: Date): Promise<DividendEvent[]> {
    return yahooFinanceService.getDividendEvents(symbol, from, to);
}

export async function syncInvestmentDividends(prismaOrTx: PrismaClient | Prisma.TransactionClient, investmentId: string) {
    return yahooFinanceService.syncInvestmentDividends(prismaOrTx, investmentId);
}

// Export types and utilities for advanced usage
export type { YahooFinanceConfig };
export { YahooFinanceService };