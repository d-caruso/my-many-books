// Vitest setup file for additional globals and polyfills
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';

// Add TextEncoder/TextDecoder for Node.js environment if not available
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = NodeTextEncoder;
  global.TextDecoder = NodeTextDecoder as unknown as typeof TextDecoder;
}

// Mock window.location for tests
type ViMock = {
  fn: () => (...args: unknown[]) => void;
};

const vitestGlobals = globalThis as typeof globalThis & { vi?: ViMock };
const safeVi = vitestGlobals.vi ?? { fn: () => () => undefined };
const mockLocation = {
  href: '',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: safeVi.fn(),
  replace: safeVi.fn(),
  reload: safeVi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Note: localStorage and sessionStorage are mocked in setupTests.ts

// Note: Individual test files should handle their own beforeEach setup
// This file only sets up global mocks and polyfills
