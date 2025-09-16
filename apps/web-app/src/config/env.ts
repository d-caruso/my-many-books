// Environment configuration for Vite compatibility
// Vite uses import.meta.env instead of process.env

interface EnvironmentConfig {
  NODE_ENV: string;
  API_URL: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_USER_POOL_CLIENT_ID: string;
  COGNITO_IDENTITY_POOL_ID: string;
}

// Helper function to get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Use Create React App environment variables
  return process.env[`REACT_APP_${key}`] || fallback;
};

export const env: EnvironmentConfig = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  API_URL: getEnvVar('API_URL', 'http://localhost:3001'),
  COGNITO_USER_POOL_ID: getEnvVar('COGNITO_USER_POOL_ID', ''),
  COGNITO_USER_POOL_CLIENT_ID: getEnvVar('COGNITO_USER_POOL_CLIENT_ID', ''),
  COGNITO_IDENTITY_POOL_ID: getEnvVar('COGNITO_IDENTITY_POOL_ID', ''),
};

// For backwards compatibility, also export individual values
export const {
  NODE_ENV,
  API_URL,
  COGNITO_USER_POOL_ID,
  COGNITO_USER_POOL_CLIENT_ID,
  COGNITO_IDENTITY_POOL_ID,
} = env;

export default env;