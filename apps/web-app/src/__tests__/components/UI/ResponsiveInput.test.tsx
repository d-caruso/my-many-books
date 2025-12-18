import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveInput } from '../../../components/UI/ResponsiveInput';

describe('ResponsiveInput', () => {
  test('renders basic input', () => {
    render(<ResponsiveInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('renders with label and required indicator', () => {
    render(<ResponsiveInput label="Test Label" isRequired id="test" />);
    expect(screen.getByLabelText(/Test Label/)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('displays error message', () => {
    render(<ResponsiveInput error="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  test('displays helper text when no error', () => {
    render(<ResponsiveInput helperText="Helper text" />);
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  test('hides helper text when error is present', () => {
    render(<ResponsiveInput helperText="Helper text" error="Error" />);
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  test('handles input changes', () => {
    const onChange = vi.fn();
    render(<ResponsiveInput onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalled();
  });

  test('passes through HTML props', () => {
    render(<ResponsiveInput placeholder="Enter text" type="email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter text');
    expect(input).toHaveAttribute('type', 'email');
  });
});
