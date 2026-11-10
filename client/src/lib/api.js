const unauthorizedListeners = new Set();

export class ApiError extends Error {
  constructor(message, status = 0, code = "NETWORK_ERROR") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export async function apiRequest(
  path,
  { method = "GET", body, signal, notifyUnauthorized = true } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15000);

  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Proxy errors may return HTML; use the fallback message below.
    }

    if (!response.ok) {
      if (response.status === 401 && notifyUnauthorized) {
        unauthorizedListeners.forEach((listener) => listener());
      }
      throw new ApiError(
        data?.error?.message ||
          "We couldn’t complete your request. Please try again.",
        response.status,
        data?.error?.code || "REQUEST_FAILED",
      );
    }
    if (response.status !== 204 && !data) {
      throw new ApiError(
        "We couldn’t read the server response. Please try again.",
        502,
        "INVALID_RESPONSE",
      );
    }
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "The request took too long. Please try again."
        : "We couldn’t reach Sweety. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
