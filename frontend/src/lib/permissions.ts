import type { Role } from "../types/crm";

export const isAgencyAdmin = (role: Role) => role === "owner" || role === "admin";
export const isAgencyStaff = (role: Role) => isAgencyAdmin(role) || role === "team";
