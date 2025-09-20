/**
 * Basic Jest setup for testing
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for MSW and Node 18+ compatibility  
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Stream API polyfills for Node.js < 18 compatibility
if (typeof global.ReadableStream === 'undefined') {
  try {
    const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
    global.ReadableStream = ReadableStream;
    global.WritableStream = WritableStream;
    global.TransformStream = TransformStream;
  } catch (error) {
    // Fallback for older Node versions
    const { Readable } = require('stream');
    global.ReadableStream = Readable;
  }
}

// Fetch polyfill for testing environment
import 'whatwg-fetch';

// Mock window.location for tests
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});