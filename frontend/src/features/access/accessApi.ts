import { apiRequest } from "../../lib/api";

export type AccessMatrix = {
  roles: Record<string, string[]>;
};

export async function getAccessMatrix() {
  return apiRequest<AccessMatrix>("/access/matrix");
}
