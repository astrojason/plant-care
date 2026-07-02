import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Server-only. Used exclusively to verify Firebase ID tokens sent from the
 * client before calling OpenAI (protects the API key / token budget from
 * unauthenticated abuse). Never used to bypass Firestore/Storage security
 * rules — those writes happen client-side under the authenticated user.
 */

function loadServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Generate a service account key in " +
        "Firebase Console > Project Settings > Service Accounts and set it as a JSON " +
        "string in this env var (see .env.local.example)."
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-plant-care",
    });
  }

  return initializeApp({ credential: cert(loadServiceAccount()) });
}

export async function verifyIdToken(idToken: string) {
  return getAuth(getAdminApp()).verifyIdToken(idToken);
}
