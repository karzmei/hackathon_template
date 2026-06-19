import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Vitest unit/component layer. Mirrors the inc-b2c-mvp frontend setup: jsdom env,
// shared setup file, threads pool, opt-in v8 coverage. The "@" alias matches the
// tsconfig paths so component imports like "@/lib/api" resolve under Vitest.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [".next/**", "test/**", "**/*.config.*", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
