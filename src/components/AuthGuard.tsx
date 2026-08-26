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
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ minHeight: "100dvh" }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Waiting for approval</h1>
      <p className="text-secondary" style={{ maxWidth: 360, fontSize: 14, margin: 0 }}>
        Your account has been created but hasn&apos;t been approved yet. An admin needs to grant
        you access before you can use Plant Care.
      </p>
      <div className="flex gap-[var(--space-2)]">
        <button type="button" onClick={handleRefresh} disabled={checking} className="btn btn-primary">
          {checking ? "Checking…" : "Check again"}
        </button>
        <button type="button" onClick={handleSignOut} className="btn btn-secondary">
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
      <div
        role="status"
        aria-label="Loading"
        className="flex flex-col gap-[var(--space-3)] p-5"
        style={{ minHeight: "100dvh" }}
      >
        <div className="skeleton-row" style={{ height: 68 }} />
        <div className="skeleton-row" style={{ height: 68 }} />
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
      <div className="flex items-center justify-center text-secondary" style={{ minHeight: "100dvh", fontSize: 14 }}>
        You don&apos;t have access to this page.
      </div>
    );
  }

  return <>{children}</>;
}
