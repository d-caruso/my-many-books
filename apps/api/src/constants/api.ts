export const API_PREFIX = process.env['API_PREFIX'] || '/api';
export const API_ROUTE_VERSION = process.env['API_ROUTE_VERSION'] || 'v1';
export const BASE_PATH = `${API_PREFIX}/${API_ROUTE_VERSION}`;
export const AUTH_COOKIE_PATH = `${BASE_PATH}/auth`;
