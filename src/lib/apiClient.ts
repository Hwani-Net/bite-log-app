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
    // controller/timer live outside the try so the catch block can also
    // clear it. 헤더 도착(fetch resolve) 후 res.json()이 멈추면 그동안
    // 아무 타임아웃 보호도 없었다(2026-08-31 Codex 교차검수 발견, retryFetch.ts
    // 에서 이미 같은 클래스로 고친 버그) — 그래서 본문을 다 읽을 때까지는
    // 지우지 않고, 응답이 실패라 본문을 안 읽는 경로와 catch에서만 지운다.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal });

      if (!res.ok) {
        clearTimeout(timer);
        const apiErr = ApiError.fromResponse(res, context);
        if (apiErr.retryable && attempt < retries) {
          lastError = apiErr;
          await delay(retryDelay * (attempt + 1));
          continue;
        }
        throw apiErr;
      }

      const data = await res.json();
      clearTimeout(timer);
      return data as T;
    } catch (err) {
      clearTimeout(timer);
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
