import { describe, it, expect } from "vitest";
import { ApiError, classifyError } from "@/lib/apiError";

describe("ApiError", () => {
  it("creates error with correct type and message", () => {
    const err = new ApiError("network", "Connection refused");
    expect(err.type).toBe("network");
    expect(err.message).toBe("Connection refused");
    expect(err.name).toBe("ApiError");
  });

  it("fromResponse classifies 401 as auth error", () => {
    const res = { status: 401 } as Response;
    const err = ApiError.fromResponse(res, "Test");
    expect(err.type).toBe("auth");
    expect(err.retryable).toBe(false);
  });

  it("fromResponse classifies 429 as rate_limit (retryable)", () => {
    const res = { status: 429 } as Response;
    const err = ApiError.fromResponse(res);
    expect(err.type).toBe("rate_limit");
    expect(err.retryable).toBe(true);
  });

  it("fromResponse classifies 500+ as server error (retryable)", () => {
    const res = { status: 502 } as Response;
    const err = ApiError.fromResponse(res);
    expect(err.type).toBe("server");
    expect(err.retryable).toBe(true);
  });

  it("fromResponse classifies 404 as not_found", () => {
    const res = { status: 404 } as Response;
    const err = ApiError.fromResponse(res);
    expect(err.type).toBe("not_found");
    expect(err.retryable).toBe(false);
  });

  it("static network() creates retryable network error", () => {
    const err = ApiError.network("Failed to fetch");
    expect(err.type).toBe("network");
    expect(err.retryable).toBe(true);
  });

  it("static timeout() creates retryable timeout error", () => {
    const err = ApiError.timeout("Timed out");
    expect(err.type).toBe("timeout");
    expect(err.retryable).toBe(true);
  });
});

describe("classifyError", () => {
  it("passes through existing ApiError", () => {
    const original = new ApiError("auth", "test");
    expect(classifyError(original)).toBe(original);
  });

  it("classifies TypeError with fetch as network error", () => {
    const err = new TypeError("Failed to fetch");
    const classified = classifyError(err, "Weather");
    expect(classified.type).toBe("network");
    expect(classified.message).toContain("Weather");
  });

  it("classifies AbortError as timeout", () => {
    const err = new DOMException("Aborted", "AbortError");
    const classified = classifyError(err);
    expect(classified.type).toBe("timeout");
  });

  it("classifies unknown errors as unknown type", () => {
    const classified = classifyError("string error");
    expect(classified.type).toBe("unknown");
    expect(classified.message).toBe("string error");
  });
});
