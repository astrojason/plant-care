"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Plant Care</h1>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={signingIn}
        className="rounded-md bg-green-700 px-6 py-3 text-white hover:bg-green-800 disabled:opacity-50"
      >
        {signingIn ? "Signing in…" : "Sign in with Google"}
      </button>
      {error !== null && (
        <div className="w-full max-w-md">
          <ErrorBlock error={error} title="Sign-in failed" />
        </div>
      )}
    </main>
  );
}
