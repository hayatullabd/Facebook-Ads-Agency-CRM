import { apiRequest } from "../../lib/api";
import type { Role, UserAccount } from "../../types/crm";

export const createUser = (agencyId: string, payload: { name: string; email: string; password: string; role: Role; client?: string }) => {
  return apiRequest<UserAccount>(`/users/${agencyId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateUser = (agencyId: string, userId: string, payload: { name?: string; email?: string; role?: Role; client?: string | null; isActive?: boolean }) => apiRequest<UserAccount>(`/users/${agencyId}/${userId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const removeUser = (agencyId: string, userId: string) => {
  return apiRequest<null>(`/users/${agencyId}/${userId}`, {
    method: "DELETE",
  });
};
