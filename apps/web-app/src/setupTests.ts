// Testing Library DOM matchers
import '@testing-library/jest-dom';

// jest-axe for accessibility testing (compatible with vitest)
import { toHaveNoViolations } from 'jest-axe';

// i18n setup for tests (synchronous version for test environment)
import './i18n.testing';

// Browser fetch/stream polyfills needed by MSW
import 'whatwg-fetch';
import { TransformStream } from 'web-streams-polyfill/dist/ponyfill';

import type { SetupServerApi } from 'msw/node';

if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = TransformStream as any;
}

// Extend expect with accessibility matchers
expect.extend(toHaveNoViolations);

let serverInstance: SetupServerApi | null = null;

beforeAll(async () => {
  const module = await import('./__tests__/mocks/server');
  serverInstance = module.server;
  serverInstance.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => serverInstance?.resetHandlers());

afterAll(() => serverInstance?.close());

const vitestGlobals = globalThis as typeof globalThis & {
  vi?: {
    fn: () => {
      mockImplementation?: (impl: (...args: unknown[]) => unknown) => unknown;
      mockReturnValue?: (value: unknown) => unknown;
      mockResolvedValue?: (value: unknown) => unknown;
      mockRejectedValue?: (value: unknown) => unknown;
      mockReset?: () => unknown;
    };
  };
};
const safeVi = vitestGlobals.vi ?? {
  fn: () => {
    const stub: any = () => undefined;
    stub.mockImplementation = () => stub;
    stub.mockReturnValue = () => stub;
    stub.mockResolvedValue = () => stub;
    stub.mockRejectedValue = () => stub;
    stub.mockReset = () => stub;
    stub.mockReturnValueOnce = () => stub;
    stub.mockResolvedValueOnce = () => stub;
    return stub;
  },
};

// Browser API polyfills for jsdom environment
// These are global browser APIs that don't exist in Node/jsdom

// matchMedia API (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: safeVi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: safeVi.fn(),
    removeListener: safeVi.fn(),
    addEventListener: safeVi.fn(),
    removeEventListener: safeVi.fn(),
    dispatchEvent: safeVi.fn(),
  })),
});

// localStorage API (if not already available in jsdom)
if (typeof window.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: safeVi.fn(),
    setItem: safeVi.fn(),
    removeItem: safeVi.fn(),
    clear: safeVi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

// IntersectionObserver API (used by lazy loading, infinite scroll, etc.)
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {
      return null;
    }
    disconnect() {
      return null;
    }
    unobserve() {
      return null;
    }
  } as any;
}

// MediaDevices API (used by camera/scanner components)
if (typeof navigator.mediaDevices === 'undefined') {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: safeVi.fn(() => Promise.resolve({
        getTracks: () => [{ stop: safeVi.fn() }]
      } as any)),
    },
  });
}
