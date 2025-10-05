import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveButton } from '../../../components/UI/ResponsiveButton';

describe('ResponsiveButton', () => {
  test('renders with default props', () => {
    render(<ResponsiveButton>Click me</ResponsiveButton>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-500', 'text-white'); // primary variant
    expect(button).toHaveClass('px-4', 'py-2.5', 'min-h-[44px]'); // md size
  });

  test('renders different variants correctly', () => {
    const { rerender } = render(
      <ResponsiveButton variant="secondary">Secondary</ResponsiveButton>
    );
    
    expect(screen.getByRole('button')).toHaveClass('bg-secondary-100', 'text-text-primary');
    
    rerender(<ResponsiveButton variant="danger">Danger</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-semantic-error', 'text-white');
    
    rerender(<ResponsiveButton variant="ghost">Ghost</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveClass('text-text-secondary');
  });

  test('renders different sizes correctly', () => {
    const { rerender } = render(
      <ResponsiveButton size="xs">Extra Small</ResponsiveButton>
    );
    
    expect(screen.getByRole('button')).toHaveClass('px-2', 'py-1.5', 'min-h-[32px]');
    
    rerender(<ResponsiveButton size="sm">Small</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-2', 'min-h-[36px]');
    
    rerender(<ResponsiveButton size="lg">Large</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'min-h-[48px]');
    
    rerender(<ResponsiveButton size="xl">Extra Large</ResponsiveButton>);
    expect(screen.getByRole('button')).toHaveClass('px-8', 'py-4', 'min-h-[52px]');
  });

  test('shows loading state correctly', () => {
    render(
      <ResponsiveButton loading>Loading Button</ResponsiveButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    // Check for spinner
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    
    expect(screen.getByText('Loading Button')).toBeInTheDocument();
  });

  test('renders with icon', () => {
    const icon = <span data-testid="test-icon">🚀</span>;
    
    render(
      <ResponsiveButton icon={icon}>With Icon</ResponsiveButton>
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  test('hides icon when loading', () => {
    const icon = <span data-testid="test-icon">🚀</span>;
    
    render(
      <ResponsiveButton icon={icon} loading>Loading</ResponsiveButton>
    );
    
    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    
    // But spinner should be visible
    const button = screen.getByRole('button');
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = vi.fn();
    
    render(
      <ResponsiveButton onClick={handleClick}>Click me</ResponsiveButton>
    );
    
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
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('does not trigger click when loading', () => {
    const handleClick = vi.fn();
    
    render(
      <ResponsiveButton onClick={handleClick} loading>
        Loading
      </ResponsiveButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('applies custom className', () => {
    render(
      <ResponsiveButton className="custom-class">
        Custom Button
      </ResponsiveButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
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

  test('has touch-friendly interaction classes', () => {
    render(<ResponsiveButton>Touch Friendly</ResponsiveButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('touch-manipulation');
    expect(button).toHaveClass('min-h-[44px]'); // Default md size meets touch target
  });

  test('maintains accessibility with focus states', () => {
    render(<ResponsiveButton>Accessible</ResponsiveButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus:outline-none');
    expect(button).toHaveClass('focus:ring-2');
    expect(button).toHaveClass('focus:ring-offset-1');
  });
});