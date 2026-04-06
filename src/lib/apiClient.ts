/**
 * API client wrapper with retry, timeout, and error classification.
 * Use this instead of raw fetch() for external API calls.
 */

import { ApiError, classifyError } from "./apiError";

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  context?: string;
}

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1_000;

/**
 * Enhanced fetch with automatic retry, timeout, and error classification.
 *
 * @example
 * const data = await apiFetch<WeatherData>('/api/weather?lat=35&lon=128', {
 *   context: 'Weather',
 *   timeout: 5000,
 *   retries: 1,
 * });
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    context,
    ...fetchOptions
  } = options;

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const apiErr = ApiError.fromResponse(res, context);
        if (apiErr.retryable && attempt < retries) {
          lastError = apiErr;
          await delay(retryDelay * (attempt + 1));
          continue;
        }
        throw apiErr;
      }

      const data = await res.json();
      return data as T;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.retryable && attempt < retries) {
          lastError = err;
          await delay(retryDelay * (attempt + 1));
          continue;
        }
        throw err;
      }

      const classified = classifyError(err, context);
      if (classified.retryable && attempt < retries) {
        lastError = classified;
        await delay(retryDelay * (attempt + 1));
        continue;
      }
      throw classified;
    }
  }

  throw lastError ?? new ApiError("unknown", "Max retries exceeded");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
