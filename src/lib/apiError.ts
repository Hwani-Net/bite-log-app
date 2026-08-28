/**
 * Standard API error types for consistent error handling across services.
 */

export type ApiErrorType =
  | "network"
  | "timeout"
  | "auth"
  | "rate_limit"
  | "not_found"
  | "server"
  | "parse"
  | "unknown";

export class ApiError extends Error {
  constructor(
    public readonly type: ApiErrorType,
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromResponse(res: Response, context?: string): ApiError {
    const prefix = context ? `[${context}] ` : "";
    if (res.status === 401 || res.status === 403) {
      return new ApiError(
        "auth",
        `${prefix}Authentication failed (${res.status})`,
        res.status,
        false,
      );
    }
    if (res.status === 429) {
      return new ApiError(
        "rate_limit",
        `${prefix}Rate limited`,
        res.status,
        true,
      );
    }
    if (res.status === 404) {
      return new ApiError("not_found", `${prefix}Not found`, res.status, false);
    }
    if (res.status >= 500) {
      return new ApiError(
        "server",
        `${prefix}Server error (${res.status})`,
        res.status,
        true,
      );
    }
    return new ApiError(
      "unknown",
      `${prefix}HTTP ${res.status}`,
      res.status,
      false,
    );
  }

  static network(message: string): ApiError {
    return new ApiError("network", message, undefined, true);
  }

  static timeout(message: string): ApiError {
    return new ApiError("timeout", message, undefined, true);
  }

  static parse(message: string): ApiError {
    return new ApiError("parse", message, undefined, false);
  }
}

/**
 * Classify an unknown error into an ApiError.
 */
export function classifyError(err: unknown, context?: string): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof TypeError && err.message.includes("fetch")) {
    return ApiError.network(
      context ? `[${context}] ${err.message}` : err.message,
    );
  }
  // AbortError는 브라우저에선 DOMException이지만 다른 런타임(undici/node,
  // 폴리필)에선 그냥 Error다 — 이름으로 판정해야 타임아웃이 "unknown"으로
  // 새지 않는다(5차 GOAL-6 유닛이 잡은 실결함).
  if (err instanceof Error && err.name === "AbortError") {
    return ApiError.timeout(
      context ? `[${context}] Request timed out` : "Request timed out",
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  return new ApiError("unknown", context ? `[${context}] ${msg}` : msg);
}
