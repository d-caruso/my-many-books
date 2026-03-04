import { defineConfig } from "cypress";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import jwtPkg from "jsonwebtoken";
const { sign: jwtSign } = jwtPkg;
import viteConfig from "./vite.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = process.env["CYPRESS_BASE_URL"] || "http://localhost:3000";

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, "");

const normalizePathPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
};

const normalizePathSegment = (segment: string): string => segment.trim().replace(/^\/+|\/+$/g, "");

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, "");

const buildApiBaseUrl = (origin: string, prefix: string, version: string): string => {
  const cleanOrigin = normalizeOrigin(origin);
  const cleanPrefix = normalizePathPrefix(prefix);
  const cleanVersion = normalizePathSegment(version);

  if (!cleanPrefix) {
    return `${cleanOrigin}/${cleanVersion}`;
  }

  return `${cleanOrigin}${cleanPrefix}/${cleanVersion}`;
};

const apiBaseUrl = normalizeBaseUrl(
  process.env["CYPRESS_API_BASE_URL"] ||
    process.env["VITE_API_BASE_URL"] ||
    buildApiBaseUrl(
      process.env["CYPRESS_API_ORIGIN"] || process.env["VITE_API_ORIGIN"] || "http://localhost:3001",
      process.env["CYPRESS_API_PREFIX"] || process.env["VITE_API_PREFIX"] || "/api",
      process.env["CYPRESS_API_VERSION"] || process.env["VITE_API_VERSION"] || "v1"
    )
);

const adminEmail = process.env["E2E_ADMIN_EMAIL"] || "admin@example.com";
const adminName = process.env["E2E_ADMIN_NAME"] || "Admin";
const adminSurname = process.env["E2E_ADMIN_SURNAME"] || "User";
const adminPassword = process.env["E2E_ADMIN_PASSWORD"] || "password123";

const userEmail = process.env["E2E_USER_EMAIL"] || "reader@example.com";
const userName = process.env["E2E_USER_NAME"] || "Reader";
const userSurname = process.env["E2E_USER_SURNAME"] || "User";
const userPassword = process.env["E2E_USER_PASSWORD"] || "password123";

const execFileAsync = promisify(execFile);
const apiRoot = path.resolve(__dirname, "..", "api");

const runSeedCommand = async (
  command: string,
  seedEnv: Record<string, string>
): Promise<null> => {
  await execFileAsync(
    "npx",
    ["ts-node", "-r", "tsconfig-paths/register", "tests/fixtures/e2e-seed.ts", command],
    {
      cwd: apiRoot,
      env: { ...process.env, ...seedEnv },
    }
  );
  return null;
};

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    excludeSpecPattern: [
      "cypress/e2e/auth.cy.{js,jsx,ts,tsx}",
      "cypress/e2e/books.cy.{js,jsx,ts,tsx}",
      "cypress/e2e/navigation.cy.{js,jsx,ts,tsx}",
      "cypress/e2e/isbn-scanner.cy.{js,jsx,ts,tsx}",
    ],
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
      const seedEnv = {
        E2E_ADMIN_EMAIL: String(config.env.adminEmail || adminEmail),
        E2E_ADMIN_NAME: String(config.env.adminName || adminName),
        E2E_ADMIN_SURNAME: String(config.env.adminSurname || adminSurname),
        E2E_USER_EMAIL: String(config.env.userEmail || userEmail),
        E2E_USER_NAME: String(config.env.userName || userName),
        E2E_USER_SURNAME: String(config.env.userSurname || userSurname),
      };

      on("task", {
        "auth:signToken": (payload: Record<string, unknown>) => {
          const secret = process.env["LOCAL_JWT_SECRET"] || "e2e-local-dev-secret";
          return jwtSign(payload, secret, { algorithm: "HS256" });
        },
        "db:reset": () => runSeedCommand("reset", seedEnv),
        "db:seed": () => runSeedCommand("seed", seedEnv),
      });

      return config;
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
    localJwtSecret: process.env["LOCAL_JWT_SECRET"] || "e2e-local-dev-secret",
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig,
    },
    specPattern: "cypress/component/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.ts",
  },
});
