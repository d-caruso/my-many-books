// Environment configuration for Vite compatibility
// Vite uses import.meta.env instead of process.env

interface EnvironmentConfig {
  NODE_ENV: string;
  API_URL: string;
  API_ORIGIN: string;
  API_PREFIX: string;
  API_VERSION: string;
  API_BASE_URL: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_USER_POOL_CLIENT_ID: string;
  COGNITO_IDENTITY_POOL_ID: string;
  AWS_REGION: string;
  BOOKS_PAGINATION_DEFAULT: number;
}

// Helper function to get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Use Vite environment variables
  return (import.meta.env as Record<string, string | undefined>)[`VITE_${key}`] || fallback;
};

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, '');

const normalizePathPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return '';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '');
};

const buildApiBaseUrl = (origin: string, prefix: string, version: string): string => {
  const cleanOrigin = normalizeOrigin(origin);
  const cleanPrefix = normalizePathPrefix(prefix);
  const cleanVersion = version.trim().replace(/^\/+|\/+$/g, '');

  if (!cleanPrefix) {
    return `${cleanOrigin}/${cleanVersion}`;
  }

  return `${cleanOrigin}${cleanPrefix}/${cleanVersion}`;
};

const apiOrigin = getEnvVar('API_ORIGIN', getEnvVar('API_URL', 'http://localhost:3001'));
const apiPrefix = getEnvVar('API_PREFIX', '/api');
const apiVersion = getEnvVar('API_VERSION', 'v1');
const apiBaseUrl = getEnvVar('API_BASE_URL') || buildApiBaseUrl(apiOrigin, apiPrefix, apiVersion);

export const env: EnvironmentConfig = {
  NODE_ENV: import.meta.env.MODE || 'development',
  API_URL: apiBaseUrl,
  API_ORIGIN: apiOrigin,
  API_PREFIX: apiPrefix,
  API_VERSION: apiVersion,
  API_BASE_URL: apiBaseUrl,
  COGNITO_USER_POOL_ID: getEnvVar('COGNITO_USER_POOL_ID', ''),
  COGNITO_USER_POOL_CLIENT_ID: getEnvVar('COGNITO_USER_POOL_CLIENT_ID', ''),
  COGNITO_IDENTITY_POOL_ID: getEnvVar('COGNITO_IDENTITY_POOL_ID', ''),
  AWS_REGION: getEnvVar('AWS_REGION', 'us-east-1'),
  BOOKS_PAGINATION_DEFAULT: parseInt(getEnvVar('BOOKS_PAGINATION_DEFAULT', '5'), 10),
};

// For backwards compatibility, also export individual values
export const {
  NODE_ENV,
  API_URL,
  API_ORIGIN,
  API_PREFIX,
  API_VERSION,
  API_BASE_URL,
  COGNITO_USER_POOL_ID,
  COGNITO_USER_POOL_CLIENT_ID,
  COGNITO_IDENTITY_POOL_ID,
  AWS_REGION,
  BOOKS_PAGINATION_DEFAULT,
} = env;

export default env;
