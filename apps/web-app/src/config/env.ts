// Environment configuration for Vite compatibility
// Vite uses import.meta.env instead of process.env

interface EnvironmentConfig {
  NODE_ENV: string;
  API_URL: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_USER_POOL_CLIENT_ID: string;
  COGNITO_IDENTITY_POOL_ID: string;
  AWS_REGION: string;
  BOOKS_PAGINATION_DEFAULT: number;
}

// Helper function to get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Use Vite environment variables
  return import.meta.env[`VITE_${key}`] || fallback;
};

export const env: EnvironmentConfig = {
  NODE_ENV: import.meta.env.MODE || 'development',
  API_URL: getEnvVar('API_URL', 'http://localhost:3001'),
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
  COGNITO_USER_POOL_ID,
  COGNITO_USER_POOL_CLIENT_ID,
  COGNITO_IDENTITY_POOL_ID,
  AWS_REGION,
  BOOKS_PAGINATION_DEFAULT,
} = env;

export default env;