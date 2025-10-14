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
    private monthlyPriceCache = new Map<string, { pricesByMonth: Map<string, number>; timestamp: number; ttl: number }>();
    private pendingMonthlyPriceRequests = new Map<string, Promise<Map<string, number>>>();
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

        const monthlyKeysToDelete: string[] = [];
        this.monthlyPriceCache.forEach((cached, key) => {
            if (!this.isCacheValid({ price: 0, timestamp: cached.timestamp, ttl: cached.ttl })) {
                monthlyKeysToDelete.push(key);
            }
        });
        monthlyKeysToDelete.forEach(key => this.monthlyPriceCache.delete(key));
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

    private buildMonthlyCacheKey(symbol: string, period1: number, period2: number): string {
        return `MON:${symbol}:${period1}:${period2}`;
    }

    private formatMonthKey(date: Date): string {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        return `${y}-${m}`; // YYYY-MM
    }

    private formatMonthLabel(date: Date): string {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        return `${m}/${y}`; // MM/YYYY
    }

    private getMonthEnd(date: Date): Date {
        const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    private getMonthStart(date: Date): Date {
        const d = new Date(date.getFullYear(), date.getMonth(), 1);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    private addMonths(date: Date, count: number): Date {
        const d = new Date(date);
        d.setMonth(d.getMonth() + count);
        return d;
    }

    private async getMonthlyCloses(symbol: string, from: Date, to: Date): Promise<Map<string, number>> {
        if (!symbol?.trim()) return new Map();

        const normalizedSymbol = this.normalizeSymbol(symbol);
        const period1 = Math.floor(this.getMonthStart(from).getTime() / 1000);
        const period2 = Math.floor(new Date(to).getTime() / 1000);
        const cacheKey = this.buildMonthlyCacheKey(normalizedSymbol, period1, period2);

        const cached = this.monthlyPriceCache.get(cacheKey);
        if (cached && this.isCacheValid({ price: 0, timestamp: cached.timestamp, ttl: cached.ttl })) {
            return new Map(cached.pricesByMonth);
        }

        const pending = this.pendingMonthlyPriceRequests.get(cacheKey);
        if (pending) return pending;

        const { cacheTtlMs } = this.getValidatedConfig();

        const req = (async (): Promise<Map<string, number>> => {
            try {
                const result = await yahooFinance.chart(normalizedSymbol, {
                    period1,
                    period2,
                    interval: "1mo",
                    events: "history",
                } as any);

                const quotes = (((result as any)?.quotes) ?? []) as Array<{ date: Date | string | number; close?: number; adjclose?: number }>;
                const byMonth = new Map<string, number>();
                for (const q of quotes) {
                    const dt = new Date((q as any).date);
                    const key = this.formatMonthKey(dt);
                    const close = Number(q.close ?? q.adjclose);
                    if (!Number.isFinite(close)) continue;
                    byMonth.set(key, close);
                }

                this.monthlyPriceCache.set(cacheKey, { pricesByMonth: byMonth, timestamp: Date.now(), ttl: cacheTtlMs });
                return byMonth;
            } catch (e) {
                console.warn(`Failed to fetch monthly closes for ${normalizedSymbol}:`, e);
                return new Map();
            } finally {
                this.pendingMonthlyPriceRequests.delete(cacheKey);
            }
        })();

        this.pendingMonthlyPriceRequests.set(cacheKey, req);
        return req;
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
                const tax = investment.currency === "USD" ? this.roundDecimal(amount * 0.30, 6) : 0;

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

    async getMonthlyEquitySeries(
        symbol: string,
        transactions: Array<{ type: string; quantity: any; date: Date | string | number }>,
        dividends: Array<{ amount: any; date: Date | string | number }>,
        opts: { stopWhenZero?: boolean } = { stopWhenZero: true },
    ): Promise<Array<{ month: string; value: number; dividends: number }>> {
        if (!symbol?.trim()) return [];
        if (!transactions?.length) return [];

        const normalizedSymbol = this.normalizeSymbol(symbol);

        // Normalize and sort transactions ascending by date
        const normalizedTx = [...transactions]
            .map(t => ({ type: String((t as any).type), quantity: (t as any).quantity, date: new Date((t as any).date) }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Normalize dividends
        const normalizedDivs = (dividends || []).map(d => ({
            amount: Number((d as any).amount),
            date: new Date((d as any).date),
        }));

        const firstDate = normalizedTx[0]?.date ? new Date(normalizedTx[0].date) : new Date();
        const now = new Date();

        // Fetch monthly closes once for the entire window
        const monthlyCloses = await this.getMonthlyCloses(normalizedSymbol, firstDate, now);

        const series: Array<{ month: string; value: number; dividends: number }> = [];

        // Iterate month by month starting from the first transaction month
        let cursor = this.getMonthStart(firstDate);
        let hadPositive = false;
        while (cursor.getTime() <= now.getTime()) {
            const monthEnd = (cursor.getMonth() === now.getMonth() && cursor.getFullYear() === now.getFullYear())
                ? now
                : this.getMonthEnd(cursor);

            const shares = this.getSharesAtDate(normalizedTx as any, monthEnd);

            if (shares <= 0) {
                if (opts.stopWhenZero && hadPositive) {
                    break; // stop at the last month with shares > 0
                }
                // If we never had positive shares yet (edge case), just advance
            } else {
                hadPositive = true;
                const key = this.formatMonthKey(cursor);
                let price = monthlyCloses.get(key) ?? null;

                // For current month, monthly close may not exist; fallback to current price
                if ((cursor.getMonth() === now.getMonth() && cursor.getFullYear() === now.getFullYear()) && (price === null || price === undefined)) {
                    price = await this.getCurrentPrice(normalizedSymbol);
                }

                // Calculate dividends for this month
                const monthStart = this.getMonthStart(cursor);
                const monthEndTime = monthEnd.getTime();
                const monthStartTime = monthStart.getTime();
                const monthDividends = normalizedDivs
                    .filter(d => {
                        const divTime = d.date.getTime();
                        return divTime >= monthStartTime && divTime <= monthEndTime;
                    })
                    .reduce((sum, d) => sum + d.amount, 0);

                if (price !== null && price !== undefined) {
                    const value = this.roundDecimal(Number(price) * Number(shares), 2);
                    const dividendsRounded = this.roundDecimal(monthDividends, 2);
                    series.push({ month: this.formatMonthLabel(cursor), value, dividends: dividendsRounded });
                }
            }

            // Advance to next month
            cursor = this.addMonths(cursor, 1);
        }

        return series;
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

// Equity series for a single investment, month by month
export async function getMonthlyEquitySeries(
    symbol: string,
    transactions: Array<{ type: string; quantity: any; date: Date | string | number }>,
    dividends: Array<{ amount: any; date: Date | string | number }>,
    opts: { stopWhenZero?: boolean } = { stopWhenZero: true },
): Promise<Array<{ month: string; value: number; dividends: number }>> {
    return yahooFinanceService.getMonthlyEquitySeries(symbol, transactions, dividends, opts);
}

// Export types and utilities for advanced usage
export type { YahooFinanceConfig };
export { YahooFinanceService };