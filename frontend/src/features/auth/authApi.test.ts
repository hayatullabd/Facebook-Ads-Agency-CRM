import { beforeEach, describe, expect, it } from "vitest";
import { getSavedSession, saveSession, isAuthUser, clearSession } from "./authApi";
import { getWorkspaceRequests } from "../../app/workspaceRepository";
import type { Role } from "../../types/crm";
const user = { _id: "u", agency: "a", name: "Owner", email: "owner@example.test", role: "owner" as Role };
beforeEach(() => localStorage.clear());
describe("role and session regressions", () => {
  for (const role of ["owner", "admin", "team", "client", "moderator"] as Role[]) {
    it(`accepts and restores ${role} sessions`, () => {
      saveSession({ token: "test", user: { ...user, role } });
      expect(getSavedSession()?.user.role).toBe(role);
    });
  }
  it("rejects malformed roles and clears corrupted cache", () => {
    expect(isAuthUser({ ...user, role: "superuser" })).toBe(false);
    localStorage.setItem("adflow_token", "test"); localStorage.setItem("adflow_user", "{broken");
    expect(getSavedSession()).toBeNull(); expect(localStorage.length).toBe(0);
  });
  it("loads owner clients and campaigns", () => {
    const keys = getWorkspaceRequests("agency", "owner").map(request => request.key);
    expect(keys).toContain("clients"); expect(keys).toContain("campaigns");
  });
  it("clears both credentials on logout", () => {
    saveSession({ token: "test", user }); clearSession(); expect(getSavedSession()).toBeNull();
  });
});
