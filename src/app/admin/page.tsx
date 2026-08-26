"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { ErrorBlock } from "@/components/ErrorBlock";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import type { Role } from "@/lib/firebase/roles";

interface AdminUser {
  uid: string;
  email: string | null;
  role: Role | null;
}

const ASSIGNABLE_ROLES: Role[] = ["PENDING", "USER", "ADMIN", "SUPERADMIN"];

function AdminContent() {
  const { user, role: viewerRole } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? `Request failed with status ${res.status}`);
      }
      setUsers(json.users);
    } catch (err) {
      setError(err);
    }
  }, [user]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (ignore) return;
      await loadUsers();
    })();
    return () => {
      ignore = true;
    };
  }, [loadUsers]);

  async function handleRoleChange(targetUid: string, newRole: Role) {
    if (!user) return;
    setError(null);
    setUpdatingUid(targetUid);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ uid: targetUid, role: newRole }),
      });
      const json = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? `Request failed with status ${res.status}`);
      }
      await loadUsers();
    } catch (err) {
      setError(err);
    } finally {
      setUpdatingUid(null);
    }
  }

  // SUPERADMIN accounts can only be viewed, promoted, or demoted by another
  // SUPERADMIN — mirrors the server-side check in /api/admin/users/role.
  function canEdit(target: AdminUser): boolean {
    if (target.uid === user?.uid) return false;
    if (target.role === "SUPERADMIN" && viewerRole !== "SUPERADMIN") return false;
    return true;
  }

  const assignableRoles =
    viewerRole === "SUPERADMIN" ? ASSIGNABLE_ROLES : ASSIGNABLE_ROLES.filter((r) => r !== "SUPERADMIN");

  return (
    <div className="p-5">
      <h1 style={{ fontSize: 27, fontWeight: 500, margin: 0 }}>User approvals</h1>

      {error !== null && (
        <div className="mt-[var(--space-4)]">
          <ErrorBlock error={error} title="Admin request failed" />
        </div>
      )}

      {error === null && users === null && (
        <div role="status" aria-label="Loading" className="flex flex-col gap-[var(--space-1)] mt-[var(--space-4)]">
          <div className="skeleton-row" style={{ height: 32 }} />
          <div className="skeleton-row" style={{ height: 32 }} />
        </div>
      )}

      {users !== null && (
        <table className="table mt-[var(--space-4)]">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid}>
                <td>{u.email ?? u.uid}</td>
                <td>{u.role ?? "PENDING"}</td>
                <td>
                  {canEdit(u) ? (
                    <select
                      aria-label={`Role for ${u.email ?? u.uid}`}
                      value={u.role ?? "PENDING"}
                      disabled={updatingUid === u.uid}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as Role)}
                      className="input"
                      style={{ minHeight: 30, width: "auto" }}
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-tertiary" style={{ fontSize: 11 }}>
                      {u.uid === user?.uid ? "This is you" : "Superadmin only"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AppShell>
        <AdminContent />
      </AppShell>
    </AuthGuard>
  );
}
