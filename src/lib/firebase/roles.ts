export type Role = "PENDING" | "USER" | "ADMIN" | "SUPERADMIN";

export const ROLES: readonly Role[] = ["PENDING", "USER", "ADMIN", "SUPERADMIN"];

/**
 * New sign-ins have no custom claim yet, so the absence of a role means
 * PENDING — never treat a missing claim as authorized.
 */
export function isAuthorizedRole(role: unknown): role is "USER" | "ADMIN" | "SUPERADMIN" {
  return role === "USER" || role === "ADMIN" || role === "SUPERADMIN";
}

export function isAdminRole(role: unknown): role is "ADMIN" | "SUPERADMIN" {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}
