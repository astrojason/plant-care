import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { isRole, type Role } from "./roles";

/**
 * Server-only. Used to verify Firebase ID tokens sent from the client before
 * calling OpenAI (protects the API key / token budget from unauthenticated
 * abuse), and to manage the role custom claim that gates access everywhere
 * else (Firestore/Storage rules read request.auth.token.role directly).
 * Never used to bypass Firestore/Storage security rules for plant data —
 * those writes happen client-side under the authenticated user.
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

export interface UserWithRole {
  uid: string;
  email: string | null;
  role: Role | null;
}

function toUserWithRole(user: UserRecord): UserWithRole {
  const role = user.customClaims?.role;
  return {
    uid: user.uid,
    email: user.email ?? null,
    role: isRole(role) ? role : null,
  };
}

export async function setUserRole(uid: string, role: Role): Promise<void> {
  await getAuth(getAdminApp()).setCustomUserClaims(uid, { role });
}

export async function getUserByEmail(email: string): Promise<UserWithRole> {
  const user = await getAuth(getAdminApp()).getUserByEmail(email);
  return toUserWithRole(user);
}

export async function getUserById(uid: string): Promise<UserWithRole> {
  const user = await getAuth(getAdminApp()).getUser(uid);
  return toUserWithRole(user);
}

/**
 * Enumerates every Firebase Auth user for the admin page's approval list.
 * Firebase's listUsers is paginated (max 1000/page); this app's user count
 * is small enough that a single caller-side loop is fine.
 */
export async function listAllUsers(): Promise<UserWithRole[]> {
  const auth = getAuth(getAdminApp());
  const users: UserWithRole[] = [];
  let pageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users.map(toUserWithRole));
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}
