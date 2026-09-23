"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { User, Gear, MapPin, SignOut } from "@phosphor-icons/react";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";
import { ManageLocationsSheet } from "@/components/ManageLocationsSheet";
import { renameLocation, saveLocations, useLocations } from "@/lib/firestore/locations";
import { isAdminRole } from "@/lib/firebase/roles";
import pkg from "../../../package.json";

function YouContent() {
  const { user, role } = useAuth();
  const router = useRouter();
  const locations = useLocations(user?.uid);
  const [managingLocations, setManagingLocations] = useState(false);

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)] p-5" style={{ paddingBottom: 90 }}>
      <h1 style={{ fontSize: 27, fontWeight: 500, margin: 0 }}>You</h1>

      <div className="flex items-center gap-[var(--space-3)] card">
        <div
          className="flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-accent-800)", flex: "none" }}
        >
          <User size={20} weight="regular" style={{ color: "var(--color-accent-100)" }} />
        </div>
        <div className="flex flex-col" style={{ minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.displayName ?? user?.email ?? "Signed in"}
          </span>
          {user?.displayName && user?.email && (
            <span className="text-tertiary" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {isAdminRole(role) && (
          <Link
            href="/admin"
            className="flex items-center gap-[var(--space-3)] row-rule"
            style={{ padding: "12px 4px", textDecoration: "none", color: "inherit" }}
          >
            <Gear size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
            <span style={{ fontSize: 14 }}>Manage users</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setManagingLocations(true)}
          className="flex items-center gap-[var(--space-3)] row-rule"
          style={{ padding: "12px 4px", background: "none", border: 0, cursor: "pointer", textAlign: "left", width: "100%" }}
        >
          <MapPin size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
          <span style={{ fontSize: 14 }}>Manage locations</span>
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-[var(--space-3)] row-rule"
          style={{ padding: "12px 4px", background: "none", border: 0, cursor: "pointer", textAlign: "left", width: "100%" }}
        >
          <SignOut size={16} weight="regular" style={{ color: "var(--color-accent)" }} />
          <span style={{ fontSize: 14 }}>Sign out</span>
        </button>
      </div>

      {managingLocations && user && (
        <ManageLocationsSheet
          locations={locations}
          onAdd={(name) => saveLocations(user.uid, [...locations, name])}
          onRename={(from, to) => renameLocation(user.uid, locations, from, to)}
          onRemove={(name) => saveLocations(user.uid, locations.filter((l) => l !== name))}
          onClose={() => setManagingLocations(false)}
        />
      )}

      <Link href="/changelog" className="text-tertiary" style={{ fontSize: 11 }}>
        Plant Care v{pkg.version}
      </Link>
    </div>
  );
}

export default function YouPage() {
  return (
    <AuthGuard>
      <AppShell>
        <YouContent />
      </AppShell>
    </AuthGuard>
  );
}
