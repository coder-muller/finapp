import yahooFinance from "yahoo-finance2";

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

class YahooFinanceService {
    private cache = new Map<string, CachedPrice>();
    private pendingRequests = new Map<string, Promise<number | null>>();
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

// Export types and utilities for advanced usage
export type { YahooFinanceConfig };
export { YahooFinanceService };