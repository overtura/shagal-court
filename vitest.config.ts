import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/client/**/*.test.{ts,tsx}", "tests/shared/**/*.test.ts"],
    setupFiles: ["./tests/client/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
