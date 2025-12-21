import { defineConfig } from "cypress";

const baseUrl = process.env["CYPRESS_BASE_URL"] || "http://localhost:3000";
const apiBaseUrl = process.env["CYPRESS_API_BASE_URL"] || "http://localhost:3001/api/v1";

const adminEmail = process.env["E2E_ADMIN_EMAIL"] || "admin@example.com";
const adminName = process.env["E2E_ADMIN_NAME"] || "Admin";
const adminSurname = process.env["E2E_ADMIN_SURNAME"] || "User";
const adminPassword = process.env["E2E_ADMIN_PASSWORD"] || "password123";

const userEmail = process.env["E2E_USER_EMAIL"] || "reader@example.com";
const userName = process.env["E2E_USER_NAME"] || "Reader";
const userSurname = process.env["E2E_USER_SURNAME"] || "User";
const userPassword = process.env["E2E_USER_PASSWORD"] || "password123";

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    videosFolder: "cypress/videos",
    screenshotsFolder: "cypress/screenshots",
    video: Boolean(process.env["CYPRESS_VIDEO"]),
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    experimentalStudio: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    requestTimeout: 10000,
    responseTimeout: 15000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },

  env: {
    apiUrl: apiBaseUrl,
    apiBaseUrl,
    adminEmail,
    adminName,
    adminSurname,
    adminPassword,
    userEmail,
    userName,
    userSurname,
    userPassword,
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: require("./vite.config.ts"),
    },
    specPattern: "cypress/component/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.ts",
  },
});
