"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getIdTokenResult, onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { isRole, type Role } from "@/lib/firebase/roles";

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  loading: boolean;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  refreshRole: async () => {},
});

/**
 * Force-refreshes the ID token so a role change made by an admin (a custom
 * claim, set server-side) is picked up without requiring sign-out/sign-in.
 * A missing claim means the account hasn't been approved yet — PENDING.
 */
async function resolveRole(user: User): Promise<Role> {
  const tokenResult = await getIdTokenResult(user, true);
  const claim = tokenResult.claims.role;
  return isRole(claim) ? claim : "PENDING";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setRole(nextUser ? await resolveRole(nextUser) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshRole = useCallback(async () => {
    if (!auth.currentUser) return;
    setRole(await resolveRole(auth.currentUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
