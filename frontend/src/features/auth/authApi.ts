import { apiRequest } from "../../lib/api";
import type { Role } from "../../types/crm";

export interface AuthUser {
  _id: string;
  agency: string;
  client?: string | null;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  user: AuthUser;
  agency?: {
    _id: string;
    name: string;
    slug: string;
  };
  token: string;
}

export interface PendingRegistrationResponse {
  status: "pending";
  message?: string;
  user?: Pick<AuthUser, "_id" | "name" | "email" | "role">;
}

export type RegistrationResponse = AuthResponse | PendingRegistrationResponse;
export type RegistrationMode = "create" | "join";

const roles: Role[] = ["owner", "admin", "team", "client", "moderator"];

const isAuthUser = (value: unknown): value is AuthUser => {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user._id === "string"
    && typeof user.agency === "string"
    && typeof user.name === "string"
    && typeof user.email === "string"
    && roles.includes(user.role as Role)
    && (user.client === undefined || user.client === null || typeof user.client === "string");
};

export const isAuthResponse = (response: RegistrationResponse): response is AuthResponse => "token" in response;

export const login = (payload: { email: string; password: string }) => apiRequest<AuthResponse>("/auth/login", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const register = (payload: { agencyName: string; name: string; email: string; password: string; mode?: RegistrationMode }) => apiRequest<RegistrationResponse>("/auth/register", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const saveSession = (session: AuthResponse) => {
  if (!session.token || !isAuthUser(session.user)) throw new Error("Invalid session response");
  localStorage.setItem("adflow_user", JSON.stringify(session.user));
  localStorage.setItem("adflow_token", session.token);
};

export const clearSession = () => {
  localStorage.removeItem("adflow_token");
  localStorage.removeItem("adflow_user");
};

export const getSavedSession = (): AuthResponse | null => {
  const token = localStorage.getItem("adflow_token");
  const cachedUser = localStorage.getItem("adflow_user");
  if (!token || !cachedUser) {
    clearSession();
    return null;
  }

  try {
    const user: unknown = JSON.parse(cachedUser);
    if (!isAuthUser(user)) throw new Error("Invalid cached user");
    return { token, user };
  } catch {
    clearSession();
    return null;
  }
};
