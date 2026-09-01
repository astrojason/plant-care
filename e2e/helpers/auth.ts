import type { BrowserContext, Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Points the Admin SDK at the same Auth Emulator instance the app under
// test uses (see playwright.config.ts's e2eEnv / firebase.json). Must be
// set before the first getAuth() call initializes the admin app.
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";

function adminAuth() {
  const app = getApps()[0] ?? initializeApp({ projectId: "demo-plant-care" });
  return getAuth(app);
}

/** Sets a user's role custom claim directly via the Admin SDK, as an admin approving a user would. */
export async function approveUserRole(email: string, role: "USER" | "ADMIN" | "SUPERADMIN") {
  const user = await adminAuth().getUserByEmail(email);
  await adminAuth().setCustomUserClaims(user.uid, { role });
}

/**
 * Signs in via the Firebase Auth Emulator's fake Google IDP popup — no real
 * Google OAuth involved. Selectors (#add-account-button, #email-input,
 * #sign-in) come from the emulator's built-in "Auth Emulator IDP Login
 * Widget" HTML, confirmed by inspecting the popup directly against a
 * running emulator.
 *
 * New accounts have no role claim (PENDING) and are blocked by Firestore/
 * Storage rules and the API routes. Unless `role` is explicitly "PENDING"
 * (for testing the approval-gate itself), this approves the account via the
 * Admin SDK right after sign-in and reloads the page to force the client to
 * pick up a fresh ID token carrying that claim — mirrors how a real admin
 * approving a user takes effect without requiring sign-out/sign-in.
 */
export async function signInWithEmulator(
  page: Page,
  context: BrowserContext,
  email: string,
  role: "PENDING" | "USER" | "ADMIN" | "SUPERADMIN" = "USER"
) {
  await page.goto("/login");
  await page.waitForSelector("button:has-text('Continue with Google')");

  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.click("button:has-text('Continue with Google')"),
  ]);

  await popup.waitForLoadState();
  await popup.click("#add-account-button");
  await popup.fill("#email-input", email);
  await popup.click("#sign-in");

  await page.waitForURL("**/dashboard");

  if (role === "PENDING") return;

  await approveUserRole(email, role);
  await page.reload();
  await page.waitForURL("**/dashboard");
}
