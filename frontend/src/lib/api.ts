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

  return text;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("adflow_token");
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Could not reach the server", 0);
  }

  const payload = await parseResponse(response);
  const envelope = payload && typeof payload === "object" ? payload as ApiEnvelope<T> : null;

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    const message = envelope?.message || (typeof payload === "string" && payload) || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  return (envelope && "data" in envelope ? envelope.data : payload) as T;
}
