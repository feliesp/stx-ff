/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // The browser only talks to the Vite origin; /api is forwarded to FastAPI.
    // Same-origin means no CORS setup, and JS can read X-Request-ID.
    proxy: { "/api": process.env.API_URL ?? "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
