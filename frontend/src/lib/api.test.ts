import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { apiRequest, SESSION_EXPIRED_EVENT } from "./api";
beforeEach(() => localStorage.clear());
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("uses bearer authentication and unwraps API envelopes", async () => {
  localStorage.setItem("adflow_token", "test");
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [1] }), { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetch);
  expect(await apiRequest("/clients/a")).toEqual([1]);
  expect(fetch.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer test");
});
it("expires a session even when a 401 response is not JSON", async () => {
  localStorage.setItem("adflow_token", "test");
  const listener = vi.fn(); window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })));
  await expect(apiRequest("/auth/me")).rejects.toThrow(); expect(listener).toHaveBeenCalledOnce();
  window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
});
it("preserves abort errors instead of converting cancellation to a network failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, options) => Promise.reject(options.signal.reason)));
  const controller = new AbortController(); controller.abort();
  await expect(apiRequest("/reports", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
});
it("does not expire a new session when an old request receives a 401", async () => {
  localStorage.setItem("adflow_token", "old");
  const listener = vi.fn(); window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => { localStorage.setItem("adflow_token", "new"); return new Response("", { status: 401 }); }));
  await expect(apiRequest("/auth/me")).rejects.toThrow(); expect(listener).not.toHaveBeenCalled();
  window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
});
