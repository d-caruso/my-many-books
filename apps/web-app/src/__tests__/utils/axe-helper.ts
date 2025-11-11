/**
 * Accessibility Testing Utility
 *
 * Helper functions for running axe accessibility tests with jest-axe (compatible with vitest)
 */

import { axe, toHaveNoViolations } from 'jest-axe';
import { RenderResult } from '@testing-library/react';

// Re-export for convenience
export { axe, toHaveNoViolations };

/**
 * Run axe accessibility audit on a rendered component
 *
 * @example
 * const { container } = render(<MyComponent />);
 * await expectNoA11yViolations(container);
 */
export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

/**
 * Run axe accessibility audit with custom configuration
 *
 * @example
 * const { container } = render(<MyComponent />);
 * await runAxeTest(container, {
 *   rules: {
 *     'color-contrast': { enabled: true }
 *   }
 * });
 */
export async function runAxeTest(
  container: HTMLElement,
  options?: any
) {
  const results = await axe(container, options);
  expect(results).toHaveNoViolations();
}

/**
 * Run axe on a React Testing Library render result
 *
 * @example
 * const renderResult = render(<MyComponent />);
 * await expectNoA11yViolationsFromRender(renderResult);
 */
export async function expectNoA11yViolationsFromRender(
  renderResult: RenderResult
) {
  const results = await axe(renderResult.container);
  expect(results).toHaveNoViolations();
}
