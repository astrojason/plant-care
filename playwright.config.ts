import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3100;
const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

const e2eEnv = {
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: "true",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-plant-care.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-plant-care",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-plant-care.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "0",
  NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app-id",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
  OPENAI_MOCK: "true",
  OPENAI_API_KEY: "unused-in-mock-mode",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "firebase emulators:start --project demo-plant-care",
      url: "http://127.0.0.1:4000",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Production build+start rather than `next dev`: NEXT_PUBLIC_* vars
      // must be present at build time to be inlined, and dev mode's HMR
      // websocket is unreliable in some sandboxed/proxied environments
      // (observed hydration silently failing under `next dev` + Turbopack
      // HMR here — confirmed working once switched to a production build).
      command: `next build && next start --port ${E2E_PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: e2eEnv,
    },
  ],
});
