// Vitest setup file for additional globals and polyfills

// Add TextEncoder/TextDecoder for Node.js environment
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock window.location for tests
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
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Note: localStorage and sessionStorage are mocked in setupTests.ts

// Note: Individual test files should handle their own beforeEach setup
// This file only sets up global mocks and polyfills