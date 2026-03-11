declare module 'jest-axe' {
  type AxeResults = import('axe-core').AxeResults;
  type RunOptions = import('axe-core').RunOptions;
  type AxeInput = Element | Document | string | null;
  type AxeRun = (html?: AxeInput, options?: RunOptions) => Promise<AxeResults>;

  export function configureAxe(options?: RunOptions & Record<string, unknown>): AxeRun;
  export const axe: AxeRun;
  export const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): {
      pass: boolean;
      message(): string;
    };
  };
}
