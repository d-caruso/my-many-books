import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveInput } from '../ResponsiveInput';

describe('ResponsiveInput', () => {
  test('renders basic input correctly', () => {
    render(<ResponsiveInput placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText(/enter text/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('w-full', 'px-3', 'py-3', 'min-h-[44px]', 'touch-manipulation');
  });

  test('renders with label', () => {
    render(<ResponsiveInput label="Test Label" id="test-input" />);
    
    const label = screen.getByText('Test Label');
    const input = screen.getByLabelText('Test Label');
    
    expect(label).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'test-input');
  });

  test('shows required indicator', () => {
    render(<ResponsiveInput label="Required Field" isRequired />);
    
    const requiredSpan = screen.getByText('*');
    expect(requiredSpan).toBeInTheDocument();
    expect(requiredSpan).toHaveClass('text-semantic-error');
  });

  test('displays error state correctly', () => {
    render(
      <ResponsiveInput 
        label="Error Field" 
        error="This field is required"
        value="invalid"
        onChange={() => {}}
      />
    );
    
    const input = screen.getByDisplayValue('invalid');
    const errorMessage = screen.getByText('This field is required');
    
    expect(input).toHaveClass('border-semantic-error', 'bg-red-50');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-semantic-error');
  });

  test('shows helper text when no error', () => {
    render(
      <ResponsiveInput 
        label="Helper Field" 
        helperText="This is helpful information"
        value=""
        onChange={() => {}}
      />
    );
    
    const helperText = screen.getByText('This is helpful information');
    expect(helperText).toBeInTheDocument();
    expect(helperText).toHaveClass('text-text-muted');
  });

  test('hides helper text when error is present', () => {
    render(
      <ResponsiveInput 
        label="Field with Error" 
        helperText="This should be hidden"
        error="Error message"
        value=""
        onChange={() => {}}
      />
    );
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('This should be hidden')).not.toBeInTheDocument();
  });

  test('handles input changes', () => {
    const handleChange = jest.fn();
    
    render(
      <ResponsiveInput 
        placeholder="Type here"
        onChange={handleChange}
      />
    );
    
    const input = screen.getByPlaceholderText(/type here/i);
    fireEvent.change(input, { target: { value: 'hello' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('applies different input types correctly', () => {
    const { rerender } = render(
      <ResponsiveInput type="email" data-testid="email-input" />
    );
    
    expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');
    
    rerender(<ResponsiveInput type="password" data-testid="password-input" />);
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
    
    rerender(<ResponsiveInput type="number" data-testid="number-input" />);
    expect(screen.getByTestId('number-input')).toHaveAttribute('type', 'number');
  });

  test('forwards input attributes correctly', () => {
    render(
      <ResponsiveInput 
        placeholder="Test input"
        disabled
        required
        min="0"
        max="100"
        data-testid="test-input"
      />
    );
    
    const input = screen.getByTestId('test-input');
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  test('applies custom className', () => {
    render(
      <ResponsiveInput 
        className="custom-input-class"
        data-testid="custom-input"
      />
    );
    
    const input = screen.getByTestId('custom-input');
    expect(input).toHaveClass('custom-input-class');
  });

  test('has responsive text sizing', () => {
    render(<ResponsiveInput data-testid="responsive-input" />);
    
    const input = screen.getByTestId('responsive-input');
    expect(input).toHaveClass('text-base', 'sm:text-sm');
  });

  test('has proper focus states', () => {
    render(<ResponsiveInput data-testid="focus-input" />);
    
    const input = screen.getByTestId('focus-input');
    expect(input).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-primary-500');
  });

  test('has transition animations', () => {
    render(<ResponsiveInput data-testid="transition-input" />);
    
    const input = screen.getByTestId('transition-input');
    expect(input).toHaveClass('transition-colors', 'duration-200');
  });

  test('supports normal state styling', () => {
    render(
      <ResponsiveInput 
        value="normal text"
        onChange={() => {}}
        data-testid="normal-input"
      />
    );
    
    const input = screen.getByTestId('normal-input');
    expect(input).toHaveClass('border-secondary-300', 'bg-background', 'hover:border-secondary-400');
  });
});