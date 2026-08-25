/**
 * Parses a fetch Response as JSON, raising a readable error (naming the HTTP
 * status) instead of letting a non-JSON body — an HTML error page from a
 * gateway timeout or platform-level 502/504, for example — reach `res.json()`
 * and throw an opaque native parse error (e.g. Safari's generic
 * "The string did not match the expected pattern.").
 */
export async function parseJsonResponse(res: Response) {
  try {
    return await res.json();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Server returned a non-JSON response (status ${res.status}): ${detail}`);
  }
}
