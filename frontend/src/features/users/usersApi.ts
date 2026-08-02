import { apiRequest } from "../../lib/api";
import type { Role, UserAccount } from "../../types/crm";

export const getUsers = (agencyId: string) => {
  return apiRequest<UserAccount[]>(`/users/${agencyId}`);
};

export const createUser = (agencyId: string, payload: { name: string; email: string; password: string; role: Role; client?: string }) => {
  return apiRequest<UserAccount>(`/users/${agencyId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const removeUser = (agencyId: string, userId: string) => {
  return apiRequest<null>(`/users/${agencyId}/${userId}`, {
    method: "DELETE",
  });
};
