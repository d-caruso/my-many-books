// Global type declarations for React Native environment

/// <reference types="react" />
/// <reference types="react-native" />

// Console API for React Native
declare var console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  debug(...args: any[]): void;
};

// Node.js globals for React Native environment
declare namespace NodeJS {
  interface Timeout {}
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare var setTimeout: (callback: () => void, ms: number) => NodeJS.Timeout;
declare var clearTimeout: (id: NodeJS.Timeout) => void;
declare var setInterval: (callback: () => void, ms: number) => NodeJS.Timeout;
declare var clearInterval: (id: NodeJS.Timeout) => void;

// URLSearchParams for React Native
declare class URLSearchParams {
  constructor(init?: string | string[][] | Record<string, string> | URLSearchParams);
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  toString(): string;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
}

// Jest globals for testing
declare var jest: any;
declare var test: any;
declare var describe: any;
declare var it: any;
declare var expect: any;
declare var beforeAll: any;
declare var beforeEach: any;
declare var afterAll: any;
declare var afterEach: any;