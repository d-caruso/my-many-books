import type { AxeResults, RunOptions } from 'axe-core';

type AxeInput = Element | Document | string | null;
type AxeRun = (html?: AxeInput, options?: RunOptions) => Promise<AxeResults>;

declare module 'jest-axe' {
  export function configureAxe(options?: RunOptions & Record<string, unknown>): AxeRun;
  export const axe: AxeRun;
  export const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): jest.CustomMatcherResult;
  };
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

export {};
