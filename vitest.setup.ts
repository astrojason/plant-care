import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Constructing the real Firebase client (getAuth/getFirestore/getStorage)
// throws immediately without valid config, which test env vars don't
// provide. Any module that imports "@/lib/firebase/client" gets this stub
// by default; tests needing specific behavior can vi.mock it themselves —
// a per-file vi.mock takes precedence over this one.
vi.mock("@/lib/firebase/client", () => ({
  auth: {},
  db: {},
  storage: {},
}));
