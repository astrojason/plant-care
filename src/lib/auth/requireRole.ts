import "server-only";
import { verifyIdToken } from "@/lib/firebase/admin";
import { isAdminRole, isAuthorizedRole } from "@/lib/firebase/roles";

export interface RequireRoleError {
  status: number;
  body: Record<string, unknown>;
}

export interface RequireRoleSuccess {
  uid: string;
  role: "USER" | "ADMIN" | "SUPERADMIN";
}

export type RequireRoleResult = RequireRoleSuccess | RequireRoleError;

function isError(result: RequireRoleResult): result is RequireRoleError {
  return "status" in result;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Verifies the caller's Firebase ID token and requires an authorized role
 * (USER or ADMIN) — PENDING accounts (or tokens issued before approval,
 * which don't carry the claim yet) are rejected with 403.
 */
export async function requireAuthorized(request: Request): Promise<RequireRoleResult> {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const idToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!idToken) {
    return { status: 401, body: { error: { message: "Missing Authorization bearer token." } } };
  }

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch (err) {
    return {
      status: 401,
      body: { error: { message: `Invalid or expired auth token: ${errMessage(err)}` } },
    };
  }

  const role = (decoded as { role?: unknown }).role;
  if (!isAuthorizedRole(role)) {
    return {
      status: 403,
      body: {
        error: {
          message: "This account is pending admin approval and cannot perform this action yet.",
        },
      },
    };
  }

  return { uid: decoded.uid, role };
}

/** ADMIN or SUPERADMIN — either can reach the admin panel and manage users. */
export async function requireAdmin(request: Request): Promise<RequireRoleResult> {
  const result = await requireAuthorized(request);
  if (isError(result)) return result;

  if (!isAdminRole(result.role)) {
    return { status: 403, body: { error: { message: "Admin role required." } } };
  }

  return result;
}

export async function requireSuperAdmin(request: Request): Promise<RequireRoleResult> {
  const result = await requireAuthorized(request);
  if (isError(result)) return result;

  if (result.role !== "SUPERADMIN") {
    return { status: 403, body: { error: { message: "Superadmin role required." } } };
  }

  return result;
}
