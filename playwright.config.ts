import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    headless: true,
    baseURL: "http://localhost:1420",
    acceptDownloads: true,
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 1420",
    port: 1420,
    reuseExistingServer: !process.env.CI,
  },
});
