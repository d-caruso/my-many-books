// Global type declarations for React Native environment

/// <reference types="react" />
/// <reference types="react-native" />

// Console API for React Native
declare let console: {
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

declare let setTimeout: (callback: () => void, ms: number) => NodeJS.Timeout;
declare let clearTimeout: (id: NodeJS.Timeout) => void;
declare let setInterval: (callback: () => void, ms: number) => NodeJS.Timeout;
declare let clearInterval: (id: NodeJS.Timeout) => void;

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
declare let jest: any;
declare let test: any;
declare let describe: any;
declare let it: any;
declare let expect: any;
declare let beforeAll: any;
declare let beforeEach: any;
declare let afterAll: any;
declare let afterEach: any;