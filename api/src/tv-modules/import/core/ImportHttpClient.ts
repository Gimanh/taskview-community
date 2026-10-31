import axios, { type AxiosInstance, isAxiosError } from 'axios';
import type { Readable } from 'stream';
import { delay } from '../../../utils/helpers';
import { $logger } from '../../../modules/logget';
import { ImportProviderError } from './ImportProviderError';
import type { ImportHttpClientConfig, ImportHttpRequestArgs } from './import-provider.types';

const RATE_LIMIT_BACKOFF_MS = 10_000;
const MAX_RETRY_AFTER_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 3;

export class ImportHttpClient {
    private readonly http: AxiosInstance;
    private readonly config: ImportHttpClientConfig;
    private lastRequestAt = 0;

    constructor(config: ImportHttpClientConfig) {
        this.config = config;
        this.http = axios.create({
            baseURL: config.baseUrl,
            timeout: 30_000,
            maxRedirects: config.maxRedirects ?? 5,
            headers: { Accept: 'application/json', ...config.headers },
        });
    }

    async get<T>(args: ImportHttpRequestArgs): Promise<T> {
        return this.withRetries(async () => {
            const response = await this.http.get<T>(args.path, { params: args.params });
            return response.data;
        });
    }

    async stream(path: string): Promise<Readable> {
        return this.withRetries(async () => {
            const response = await this.http.get<Readable>(path, { responseType: 'stream', timeout: 120_000 });
            return response.data;
        });
    }

    private async withRetries<T>(request: () => Promise<T>): Promise<T> {
        for (let attempt = 0; ; attempt++) {
            await this.throttle();
            try {
                return await request();
            } catch (err) {
                const status = isAxiosError(err) ? err.response?.status : undefined;
                if (status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
                    await delay(this.retryAfterMs(err));
                    continue;
                }
                throw this.toProviderError(err);
            }
        }
    }

    private retryAfterMs(err: unknown): number {
        const header = isAxiosError(err) ? err.response?.headers?.['retry-after'] : undefined;
        const seconds = Number(header);
        if (!Number.isFinite(seconds) || seconds <= 0) return RATE_LIMIT_BACKOFF_MS;
        return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
    }

    private async throttle(): Promise<void> {
        const wait = this.lastRequestAt + this.config.minRequestIntervalMs - Date.now();
        if (wait > 0) await delay(wait);
        this.lastRequestAt = Date.now();
    }

    private toProviderError(err: unknown): ImportProviderError {
        const name = this.config.providerName;
        if (!isAxiosError(err)) {
            return new ImportProviderError('unavailable', err instanceof Error ? err.message : `${name} request failed`);
        }
        const status = err.response?.status;
        $logger.warn(`[${name}Client] request failed: status=${status ?? 'none'} message=${err.message}`);
        if (status === 401 || status === 403) return new ImportProviderError('invalid_credentials', `${name} rejected the credentials`);
        if (status === 400 || status === 404) return new ImportProviderError('not_found', `${name} resource not found`);
        if (status === 429) return new ImportProviderError('rate_limited', `${name} rate limit exceeded`);
        return new ImportProviderError('unavailable', `${name} is unavailable`);
    }
}
