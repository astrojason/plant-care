import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The real package throws when imported outside Next.js's server
      // compilation; tests run in plain Node/jsdom, so stub it out.
      "server-only": path.resolve(__dirname, "./src/test/empty-module.ts"),
    },
  },
});
