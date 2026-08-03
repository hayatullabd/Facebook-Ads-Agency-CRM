import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const GRAPH_HOST = "graph.facebook.com";
const GRAPH_BASE = `https://${GRAPH_HOST}/${env.facebookGraphVersion}`;

export class GraphApiError extends ApiError {
  constructor(statusCode, message, category = "request", writeAttempted = false) {
    super(statusCode, message);
    this.category = category;
    this.writeAttempted = writeAttempted;
  }
}

function graphError(status, payload) {
  const code = Number(payload?.error?.code);
  if (code === 190 || status === 401) return new GraphApiError(502, "Facebook access token is invalid or expired", "invalid-token");
  if (status === 429 || [4, 17, 32, 613].includes(code)) return new GraphApiError(502, "Facebook Graph API rate limit reached; please try again later", "rate-limit");
  if (status === 403) return new GraphApiError(502, "Facebook access is insufficient", "permission");
  if (status >= 500) return new GraphApiError(502, "Facebook Graph API is temporarily unavailable", "temporary");
  return new GraphApiError(502, "Facebook Graph API request failed");
}

function safeUrl(input, params) {
  const url = new URL(input.startsWith("http") ? input : `${GRAPH_BASE}/${input.replace(/^\//, "")}`);
  if (url.protocol !== "https:" || url.hostname !== GRAPH_HOST) {
    throw new GraphApiError(502, "Invalid Facebook pagination URL");
  }
  for (const key of [...url.searchParams.keys()]) {
    if (["access_token", "token"].includes(key.toLowerCase())) url.searchParams.delete(key);
  }
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url;
}

export async function graphRequest(input, accessToken, { method = "GET", params, form } = {}) {
  const url = safeUrl(input, params);
  const writeAttempted = method !== "GET";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.facebookRequestTimeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: form ? new URLSearchParams(Object.entries(form).map(([key, value]) => [key, String(value)])) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const timeoutError = error?.name === "AbortError";
    throw new GraphApiError(timeoutError ? 504 : 502, timeoutError ? "Facebook Graph API request timed out" : "Facebook Graph API is unavailable", timeoutError ? "timeout" : "temporary", writeAttempted);
  } finally {
    clearTimeout(timeout);
  }
  let payload;
  try {
    const text = await response.text();
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new GraphApiError(502, "Facebook Graph API returned an invalid response", "request", writeAttempted);
  }
  if (!response.ok || payload?.error) {
    const error = graphError(response.status, payload);
    error.writeAttempted = writeAttempted;
    throw error;
  }
  return payload;
}

export async function graphFetchAll(path, accessToken, params) {
  const rows = [];
  let next = path;
  let nextParams = params;
  for (let page = 0; next && page < env.facebookSyncMaxPages; page += 1) {
    const payload = await graphRequest(next, accessToken, { params: nextParams });
    if (Array.isArray(payload.data)) rows.push(...payload.data);
    next = payload.paging?.next || null;
    nextParams = undefined;
  }
  if (next) throw new GraphApiError(502, "Facebook pagination limit reached");
  return rows;
}
