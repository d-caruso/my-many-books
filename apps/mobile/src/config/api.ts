import Constants from 'expo-constants';

type ApiConfigParts = {
  origin: string;
  prefix: string;
  version: string;
};

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, '');

const normalizePathPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return '';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '');
};

const normalizePathSegment = (segment: string): string => segment.trim().replace(/^\/+|\/+$/g, '');

const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '');

const buildApiBaseUrl = ({ origin, prefix, version }: ApiConfigParts): string => {
  const cleanOrigin = normalizeOrigin(origin);
  const cleanPrefix = normalizePathPrefix(prefix);
  const cleanVersion = normalizePathSegment(version);

  if (!cleanPrefix) {
    return `${cleanOrigin}/${cleanVersion}`;
  }

  return `${cleanOrigin}${cleanPrefix}/${cleanVersion}`;
};

const getLegacyApiUrlFromExpoExtra = (): string | undefined => {
  try {
    const apiUrl = Constants?.expoConfig?.extra?.apiUrl;
    return typeof apiUrl === 'string' && apiUrl.trim() ? apiUrl : undefined;
  } catch {
    return undefined;
  }
};

export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || 'http://localhost:3001';
export const API_PREFIX = process.env.EXPO_PUBLIC_API_PREFIX || '/api';
export const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION || 'v1';

export const API_BASE_PATH = `${normalizePathPrefix(API_PREFIX)}/${normalizePathSegment(API_VERSION)}`;

export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_URL ||
    getLegacyApiUrlFromExpoExtra() ||
    buildApiBaseUrl({
      origin: API_ORIGIN,
      prefix: API_PREFIX,
      version: API_VERSION,
    })
);
