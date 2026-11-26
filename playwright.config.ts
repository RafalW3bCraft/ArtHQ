import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5000",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5000/health",
    reuseExistingServer: false,
    env: {
      APP_ENV_DIR: "./tests/env",
      FIREBASE_PROJECT_ID: "demo-rafal",
      FIREBASE_SERVICE_ACCOUNT_KEY: "",
      GOOGLE_APPLICATION_CREDENTIALS: "/nonexistent/rafal-e2e-credentials.json",
      FEATHERLESS_API_KEY: "",
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      RAZORPAY_WEBHOOK_SECRET: "",
      VITE_FIREBASE_API_KEY: "test-browser-key",
      VITE_FIREBASE_PROJECT_ID: "demo-rafal",
      VITE_FIREBASE_APP_ID: "1:123:web:browser",
      VITE_FIREBASE_AUTH_DOMAIN: "demo-rafal.firebaseapp.com",
      VITE_USE_FIREBASE_EMULATOR: "false",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
