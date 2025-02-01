import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // look in src for the files
  root: "./src",
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    setupFiles: ["./test/setup.ts"],
  },
});
