const normalizePathPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (!trimmed) {
    return '';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '');
};

const normalizePathSegment = (segment: string): string => segment.trim().replace(/^\/+|\/+$/g, '');

export const API_PREFIX = normalizePathPrefix(import.meta.env.VITE_API_PREFIX || '/api');
export const API_VERSION = normalizePathSegment(import.meta.env.VITE_API_VERSION || 'v1');

export const API_BASE_PATH = `${API_PREFIX}/${API_VERSION}`;

