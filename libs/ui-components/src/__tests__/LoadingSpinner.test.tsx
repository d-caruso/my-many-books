import { render } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';

describe('LoadingSpinner', () => {
  test('renders with default props', () => {
    const { getByTestId } = render(<LoadingSpinner testID="spinner" />);
    const el = getByTestId('spinner') as HTMLDivElement;

    expect(el.style.width).toBe('24px');
    expect(el.style.height).toBe('24px');
    expect(el.style.borderTopColor).toBe('transparent');
    expect(el.style.animation).toContain('spin');
  });

  test('supports size variants', () => {
    const { getByTestId, rerender } = render(<LoadingSpinner testID="spinner" size="sm" />);
    expect((getByTestId('spinner') as HTMLDivElement).style.width).toBe('16px');

    rerender(<LoadingSpinner testID="spinner" size="lg" />);
    expect((getByTestId('spinner') as HTMLDivElement).style.width).toBe('32px');
  });

  test('supports custom color', () => {
    const { getByTestId } = render(<LoadingSpinner testID="spinner" color="#ff0000" />);
    const el = getByTestId('spinner') as HTMLDivElement;
    expect(el.style.border).toContain('#ff0000');
  });
});

