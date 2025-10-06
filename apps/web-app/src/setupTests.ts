// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock IntersectionObserver
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
};

// Mock navigator.getUserMedia for camera tests
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [{ stop: vi.fn() }]
    })),
  },
});

// Mock ZXing library
vi.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice: vi.fn(),
    reset: vi.fn(),
    getVideoInputDevices: vi.fn(() => Promise.resolve([])),
  })),
  NotFoundException: class NotFoundException extends Error {},
}));

// Mock AWS Amplify Auth (old import path)
vi.mock('@aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  confirmSignUp: vi.fn(),
  fetchAuthSession: vi.fn(() => Promise.resolve(null)),
}));

// Mock AWS Amplify Auth (new import path)
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(() => Promise.resolve({ isSignedIn: true })),
  signUp: vi.fn(() => Promise.resolve({ isSignUpComplete: true, userId: 'test-user-id' })),
  signOut: vi.fn(() => Promise.resolve()),
  getCurrentUser: vi.fn(() => Promise.reject(new Error('Auth UserPool not configured'))),
  confirmSignUp: vi.fn(() => Promise.resolve({ isSignUpComplete: true })),
  fetchAuthSession: vi.fn(() => Promise.resolve({ tokens: { idToken: { toString: () => 'mock-token' } } })),
}));

// Mock AWS Amplify
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));
