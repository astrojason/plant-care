"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Leaf, GoogleLogo, Image as ImageIcon } from "@phosphor-icons/react";
import { auth } from "@/lib/firebase/client";
import { ErrorBlock } from "@/components/ErrorBlock";

export default function LoginPage() {
  const [error, setError] = useState<unknown>(null);
  const [signingIn, setSigningIn] = useState(false);
  const router = useRouter();

  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace("/dashboard");
    } catch (err) {
      setError(err);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <div style={{ position: "relative", height: 460, flex: "none" }}>
        <div className="lighten placeholder-tile" style={{ width: "100%", height: "100%" }}>
          <ImageIcon size={48} weight="regular" />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 30%, var(--color-bg) 62%)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div className="flex flex-col" style={{ padding: "0 26px 44px", gap: "var(--space-4)", marginTop: "auto" }}>
        <div className="flex items-center gap-[var(--space-2)]">
          <Leaf size={18} weight="regular" style={{ color: "var(--color-accent)" }} />
          <span className="kicker">Plant Care</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 500, margin: 0 }}>Know what your plants need, and why.</h1>

        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
          Photograph a plant to identify it, get a care schedule you can edit, and ask for a
          diagnosis whenever something looks off.
        </p>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
          className="btn btn-primary btn-block"
          style={{ minHeight: 44 }}
        >
          <GoogleLogo size={18} weight="regular" />
          {signingIn ? "Signing in…" : "Continue with Google"}
        </button>

        {error !== null && <ErrorBlock error={error} title="Sign-in failed" />}

        <p
          className="text-tertiary"
          style={{ fontSize: 11, textAlign: "center", margin: 0 }}
        >
          Diagnoses are AI estimates, not a substitute for a specialist.
        </p>
      </div>
    </main>
  );
}
