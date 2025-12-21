// ================================================================
// src/config/securityHeaders.ts
// Helmet configuration for API security headers
// ================================================================

import type { HelmetOptions } from 'helmet';

const isProduction = process.env['NODE_ENV'] === 'production';

const parseOrigin = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const connectSrc = ["'self'"] as string[];
const frontendOrigin = parseOrigin(process.env['FRONTEND_URL']);
if (frontendOrigin) {
  connectSrc.push(frontendOrigin);
}
if (!isProduction) {
  connectSrc.push('http://localhost:*', 'ws://localhost:*');
}

const imgSrc = ["'self'", 'data:', 'https:'] as string[];
if (!isProduction) {
  imgSrc.push('http://localhost:*');
}

const cspDirectives: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
  objectSrc: ["'none'"],
  imgSrc,
  scriptSrc: ["'self'"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  fontSrc: ["'self'", 'data:', 'https:'],
  connectSrc,
};

if (isProduction) {
  cspDirectives['upgradeInsecureRequests'] = [];
}

export const securityHeadersConfig: HelmetOptions = {
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
  frameguard: {
    action: 'deny',
  },
  referrerPolicy: {
    policy: 'same-origin',
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};
