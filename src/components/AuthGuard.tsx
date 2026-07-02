"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/**
 * Client-side auth guard: no SSR session middleware for MVP (see plan),
 * so protected pages briefly render nothing while auth state resolves.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
