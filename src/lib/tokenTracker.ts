export const TOKEN_TRACKER_URL = "https://token-tracker-roan.vercel.app/api/tokens";
export const DAILY_TOKEN_LIMIT = 250000;
export const NEAR_LIMIT_THRESHOLD = 225000;

export async function getTokensUsed(): Promise<number | null> {
  try {
    const res = await fetch(TOKEN_TRACKER_URL);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.tokens === "number" ? data.tokens : null;
  } catch {
    return null;
  }
}

export async function reportTokens(count: number): Promise<void> {
  try {
    await fetch(TOKEN_TRACKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: count }),
    });
  } catch {
    // Fail open: reporting failure must never break the caller's flow.
  }
}

export type TokenGateResult =
  | { allowed: true }
  | { allowed: false; reason: "limit_reached"; tokensUsed: number }
  | { allowed: false; reason: "needs_confirmation"; tokensUsed: number };

/**
 * Global budget shared across all of the user's apps reporting to the tracker.
 * `confirmNearLimit` must be explicitly passed by the caller once the user has
 * confirmed they want to proceed despite being near the daily cap.
 */
export async function checkTokenGate(confirmNearLimit: boolean): Promise<TokenGateResult> {
  const tokensUsed = await getTokensUsed();

  if (tokensUsed === null) {
    return { allowed: true };
  }

  if (tokensUsed >= DAILY_TOKEN_LIMIT) {
    return { allowed: false, reason: "limit_reached", tokensUsed };
  }

  if (tokensUsed >= NEAR_LIMIT_THRESHOLD && !confirmNearLimit) {
    return { allowed: false, reason: "needs_confirmation", tokensUsed };
  }

  return { allowed: true };
}
