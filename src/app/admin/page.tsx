"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { ErrorBlock } from "@/components/ErrorBlock";
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
      const json = await res.json();
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
      const json = await res.json();
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
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">User approvals</h1>

      {error !== null && (
        <div className="mt-6">
          <ErrorBlock error={error} title="Admin request failed" />
        </div>
      )}

      {error === null && users === null && <p className="mt-6 text-sm text-gray-500">Loading…</p>}

      {users !== null && (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-b border-gray-100">
                <td className="py-2">{u.email ?? u.uid}</td>
                <td className="py-2">{u.role ?? "PENDING"}</td>
                <td className="py-2">
                  {canEdit(u) ? (
                    <select
                      aria-label={`Role for ${u.email ?? u.uid}`}
                      value={u.role ?? "PENDING"}
                      disabled={updatingUid === u.uid}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as Role)}
                      className="rounded-md border border-gray-300 px-2 py-1"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400">
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
      <AdminContent />
    </AuthGuard>
  );
}
