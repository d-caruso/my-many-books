/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(members: any[]): R;
    }
  }
}

export {};