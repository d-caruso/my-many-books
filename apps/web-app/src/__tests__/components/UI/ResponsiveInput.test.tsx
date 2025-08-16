import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveInput } from '../../../components/UI/ResponsiveInput';

describe('ResponsiveInput', () => {
  test('renders basic input', () => {
    render(<ResponsiveInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('renders with label', () => {
    render(<ResponsiveInput label="Test Label" id="test" />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  test('shows required indicator', () => {
    render(<ResponsiveInput label="Required Field" isRequired />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('displays error message', () => {
    render(<ResponsiveInput error="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  test('displays helper text', () => {
    render(<ResponsiveInput helperText="Helper text" />);
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  test('hides helper text when error is present', () => {
    render(<ResponsiveInput helperText="Helper text" error="Error" />);
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  test('applies error styles', () => {
    render(<ResponsiveInput error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-semantic-error');
  });

  test('applies normal styles without error', () => {
    render(<ResponsiveInput />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-secondary-300');
  });

  test('handles input changes', () => {
    const onChange = jest.fn();
    render(<ResponsiveInput onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(onChange).toHaveBeenCalled();
  });

  test('applies custom className', () => {
    render(<ResponsiveInput className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  test('passes through HTML props', () => {
    render(<ResponsiveInput placeholder="Enter text" type="email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter text');
    expect(input).toHaveAttribute('type', 'email');
  });
});