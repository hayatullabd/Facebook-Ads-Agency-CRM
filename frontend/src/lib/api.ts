export const SESSION_EXPIRED_EVENT = "adflow:session-expired";

interface ApiEnvelope<T> {
  data?: T;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE_URL = (configuredApiUrl || "/api").replace(/\/+$/, "");

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError("The server returned invalid JSON", response.status, text);
    }
  }

  throw new ApiError(response.ok ? "The server returned an unexpected response" : `Request failed (${response.status})`, response.status, text.slice(0, 200));
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("adflow_token");
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new DOMException("The request timed out. Check the result before retrying a payment.", "TimeoutError")), 60000);
  try {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal: controller.signal, headers });
    // An old request must not expire a newer login in another tab.
    if (response.status === 401 && token && localStorage.getItem("adflow_token") === token) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    const payload = await parseResponse(response);
    const envelope = payload && typeof payload === "object" ? payload as ApiEnvelope<T> : null;
    if (!response.ok) throw new ApiError(envelope?.message || `Request failed (${response.status})`, response.status, payload);
    return (envelope && "data" in envelope ? envelope.data : payload) as T;
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : "Could not reach the server", 0);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}
