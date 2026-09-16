import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "bun run dev",
      cwd: "apps/api",
      url: "http://localhost:3002/",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "bun run dev",
      cwd: "apps/app",
      url: "http://localhost:5173/",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
