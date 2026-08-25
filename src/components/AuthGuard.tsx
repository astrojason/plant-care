"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { isAdminRole, isAuthorizedRole } from "@/lib/firebase/roles";
import { useAuth } from "./AuthProvider";

function PendingApproval({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setChecking(true);
    await onRefresh();
    setChecking(false);
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Waiting for approval</h1>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Your account has been created but hasn&apos;t been approved yet. An admin needs to grant
        you access before you can use Plant Care.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={checking}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check again"}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

/**
 * Client-side auth guard: no SSR session middleware for MVP (see plan),
 * so protected pages briefly render nothing while auth state resolves.
 * Authorization itself is enforced server-side (Firestore/Storage rules,
 * API routes) via the role custom claim — this only controls what's shown.
 */
export function AuthGuard({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, role, loading, refreshRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAuthorizedRole(role)) {
    return <PendingApproval onRefresh={refreshRole} />;
  }

  if (requireAdmin && !isAdminRole(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        You don&apos;t have access to this page.
      </div>
    );
  }

  return <>{children}</>;
}
