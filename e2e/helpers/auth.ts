import type { BrowserContext, Page } from "@playwright/test";

/**
 * Signs in via the Firebase Auth Emulator's fake Google IDP popup — no real
 * Google OAuth involved. Selectors (#add-account-button, #email-input,
 * #sign-in) come from the emulator's built-in "Auth Emulator IDP Login
 * Widget" HTML, confirmed by inspecting the popup directly against a
 * running emulator.
 */
export async function signInWithEmulator(page: Page, context: BrowserContext, email: string) {
  await page.goto("/login");
  await page.waitForSelector("button:has-text('Sign in with Google')");

  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.click("button:has-text('Sign in with Google')"),
  ]);

  await popup.waitForLoadState();
  await popup.click("#add-account-button");
  await popup.fill("#email-input", email);
  await popup.click("#sign-in");

  await page.waitForURL("**/dashboard");
}
