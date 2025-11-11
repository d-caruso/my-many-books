// Testing Library DOM matchers
import '@testing-library/jest-dom';

// vitest-axe for accessibility testing
import { expect } from 'vitest';
import { toHaveNoViolations } from 'vitest-axe/matchers';

// Extend expect with accessibility matchers
expect.extend(toHaveNoViolations);

// i18n setup for tests
import './i18n';

// MSW (Mock Service Worker) setup for HTTP layer mocking
// This is test infrastructure, not application code mocks
import { server } from './__tests__/mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test to ensure test isolation
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

// Browser API polyfills for jsdom environment
// These are global browser APIs that don't exist in Node/jsdom

// matchMedia API (used by responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// localStorage API (if not already available in jsdom)
if (typeof window.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

// IntersectionObserver API (used by lazy loading, infinite scroll, etc.)
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
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
      getUserMedia: vi.fn(() => Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }]
      } as any)),
    },
  });
}
