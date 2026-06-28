import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node", // Server files mostly
    globals: true,
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist", ".git", ".cache", ".dev-backup"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
