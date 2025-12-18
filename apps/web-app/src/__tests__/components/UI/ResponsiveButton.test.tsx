import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveButton } from '../../../components/UI/ResponsiveButton';

describe('ResponsiveButton', () => {
  test('renders with default props', () => {
    render(<ResponsiveButton>Click me</ResponsiveButton>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).toHaveAttribute('data-size', 'md');
  });

  test('renders different variants correctly', () => {
    const { rerender } = render(<ResponsiveButton variant="secondary">Secondary</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary');

    rerender(<ResponsiveButton variant="danger">Danger</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger');

    rerender(<ResponsiveButton variant="ghost">Ghost</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'ghost');
  });

  test('renders different sizes correctly', () => {
    const { rerender } = render(<ResponsiveButton size="xs">XS</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'xs');

    rerender(<ResponsiveButton size="lg">LG</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  test('shows loading state correctly', () => {
    render(<ResponsiveButton loading>Loading Button</ResponsiveButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-loading', 'true');
  });

  test('renders with icon', () => {
    const icon = <span data-testid="test-icon">🚀</span>;
    render(<ResponsiveButton icon={icon}>With Icon</ResponsiveButton>);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  test('hides icon when loading', () => {
    const icon = <span data-testid="test-icon">🚀</span>;
    render(
      <ResponsiveButton icon={icon} loading>
        Loading
      </ResponsiveButton>
    );
    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('handles click events', () => {
    const handleClick = vi.fn();
    render(<ResponsiveButton onClick={handleClick}>Click me</ResponsiveButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('does not trigger click when disabled', () => {
    const handleClick = vi.fn();
    render(
      <ResponsiveButton onClick={handleClick} disabled>
        Disabled
      </ResponsiveButton>
    );
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('forwards other props correctly', () => {
    render(
      <ResponsiveButton type="submit" data-testid="submit-button">
        Submit
      </ResponsiveButton>
    );
    const button = screen.getByTestId('submit-button');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
