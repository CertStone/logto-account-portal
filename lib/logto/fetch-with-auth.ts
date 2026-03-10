/**
 * Authenticated fetch helper for Logto API calls
 * Eliminates repeated fetch+error patterns and sanitizes error messages
 */

import { logger } from "@/lib/logger";

export class LogtoApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly userMessage: string,
    public readonly upstreamDetail?: string,
  ) {
    super(userMessage);
    this.name = "LogtoApiError";
  }
}

/**
 * Sanitize upstream error text to avoid leaking internal details
 */
function sanitizeUpstreamError(errorText: string): string {
  if (errorText.length > 200) {
    return "服务端错误";
  }

  try {
    const parsed: unknown = JSON.parse(errorText);
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.message === "string") return obj.message;
      if (typeof obj.code === "string") return obj.code;
      return "服务端错误";
    }
  } catch {
    // Not JSON — return as-is if short enough
  }

  return errorText;
}

interface FetchWithAuthOptions {
  url: string;
  accessToken: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Human-readable operation name for error messages */
  operationName: string;
}

/**
 * Perform an authenticated fetch to Logto API with standardized error handling.
 * Returns the Response object for callers that need custom parsing.
 */
export async function fetchWithAuth({
  url,
  accessToken,
  method = "GET",
  body,
  headers = {},
  operationName,
}: FetchWithAuthOptions): Promise<Response> {
  const fetchHeaders: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
    ...headers,
  };

  if (body !== undefined) {
    fetchHeaders["Content-Type"] = fetchHeaders["Content-Type"] ?? "application/json";
  }

  const res = await fetch(url, {
    method,
    headers: fetchHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    logger.warn(`${operationName} upstream failed`, {
      status: res.status,
      errorText,
    });
    const sanitized = sanitizeUpstreamError(errorText);
    throw new LogtoApiError(res.status, `${operationName}失败: ${sanitized}`);
  }

  return res;
}

/**
 * fetchWithAuth + parse JSON response
 */
export async function fetchJsonWithAuth<T = unknown>(
  options: FetchWithAuthOptions,
): Promise<T> {
  const res = await fetchWithAuth(options);
  return res.json() as Promise<T>;
}

/**
 * fetchWithAuth for void responses (204 No Content or similar)
 */
export async function fetchVoidWithAuth(options: FetchWithAuthOptions): Promise<void> {
  await fetchWithAuth(options);
}
