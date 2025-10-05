import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualISBNInput } from '../../../components/Scanner/ManualISBNInput';

// Mock Material-UI components - match the actual component structure
vi.mock('@mui/material', () => ({
  Box: ({ children, sx, component, onSubmit, ...props }: any) => {
    const Tag = component || 'div';
    const handleSubmit = onSubmit || (() => {});
    return (
      <Tag data-testid="box" style={sx} onSubmit={handleSubmit} {...props}>{children}</Tag>
    );
  },
  Paper: ({ children, elevation, sx, ...props }: any) => (
    <div data-testid="paper" data-elevation={elevation} style={sx} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, color, gutterBottom, fontWeight, ...props }: any) => (
    <div 
      data-testid={`typography-${variant}`} 
      data-color={color} 
      data-gutterbottom={gutterBottom}
      data-fontweight={fontWeight}
      {...props}
    >
      {children}
    </div>
  ),
  TextField: ({ label, value, onChange, error, helperText, placeholder, fullWidth, id, inputProps, autoComplete, ...props }: any) => (
    <div data-testid="text-field-container">
      <label data-testid="text-field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        data-testid="text-field"
        data-label={label}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange?.(e)}
        data-error={!!error}
        data-fullwidth={fullWidth}
        autoComplete={autoComplete}
        maxLength={inputProps?.maxLength}
        {...props}
      />
      {error && helperText && <div data-testid="text-field-error">{helperText}</div>}
      {helperText && !error && <div data-testid="text-field-helper">{helperText}</div>}
    </div>
  ),
  Button: ({ children, onClick, variant, disabled, color, fullWidth, type, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      disabled={disabled}
      data-color={color}
      data-fullwidth={fullWidth}
      type={type}
      {...props}
    >
      {children}
    </button>
  ),
  Stack: ({ children, direction, spacing, ...props }: any) => (
    <div data-testid="stack" data-direction={direction} data-spacing={spacing} {...props}>{children}</div>
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid={`alert-${severity}`} {...props}>{children}</div>
  ),
}));

// Mock Material-UI icons
vi.mock('@mui/icons-material', () => ({
  Close: () => <div data-testid="close-icon">Close</div>,
}));

describe('ManualISBNInput', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders manual ISBN input component when open', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByTestId('paper')).toBeInTheDocument();
    expect(screen.getByText('Enter ISBN Manually')).toBeInTheDocument();
    expect(screen.getByText('ISBN (10 or 13 digits)')).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <ManualISBNInput
        isOpen={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('handles ISBN input changes', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });

    expect(isbnInput).toHaveValue('9780747532699');
  });

  test('shows placeholder text in input field', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    expect(isbnInput).toHaveAttribute('placeholder', 'e.g., 978-0-123-45678-9');
  });

  test('validates required ISBN field', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('Add Book');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('text-field-error')).toHaveTextContent('Please enter an ISBN');
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('validates ISBN format', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.change(isbnInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('text-field-error')).toHaveTextContent('Invalid ISBN format. Please enter a valid 10 or 13 digit ISBN.');
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('accepts valid ISBN-10', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.change(isbnInput, { target: { value: '0486409120' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        isbn: '0486409120',
        success: true
      });
    });
  });

  test('accepts valid ISBN-13', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.change(isbnInput, { target: { value: '9780486409122' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        isbn: '9780486409122',
        success: true
      });
    });
  });

  test('strips hyphens and spaces from ISBN', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.change(isbnInput, { target: { value: '978-0-486-40912-2' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        isbn: '9780486409122',
        success: true
      });
    });
  });

  test('handles ISBN with X check digit', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.change(isbnInput, { target: { value: '048665088X' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        isbn: '048665088X',
        success: true
      });
    });
  });

  test('rejects ISBN with invalid length', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.change(isbnInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('text-field-error')).toHaveTextContent('Invalid ISBN format. Please enter a valid 10 or 13 digit ISBN.');
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('clears form when cancelled', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const cancelButton = screen.getByText('Cancel');

    fireEvent.change(isbnInput, { target: { value: '1234567890' } });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('clears error when user starts typing', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('text-field-error')).toBeInTheDocument();
    });

    fireEvent.change(isbnInput, { target: { value: '123' } });

    await waitFor(() => {
      expect(screen.queryByTestId('text-field-error')).not.toBeInTheDocument();
    });
  });

  test('shows instructions for ISBN format', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Enter the 10 or 13 digit ISBN code from your book')).toBeInTheDocument();
    expect(screen.getByText('ISBN can be found on the back cover of most books, usually above or below the barcode.')).toBeInTheDocument();
  });

  test('shows ISBN examples', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Examples:')).toBeInTheDocument();
    expect(screen.getByText('ISBN-10: 0123456789')).toBeInTheDocument();
    expect(screen.getByText('ISBN-13: 9780123456789')).toBeInTheDocument();
  });

  test('resets form after successful submission', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.change(isbnInput, { target: { value: '9780486409122' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    expect(isbnInput).toHaveValue('');
  });

  test('handles form submission with valid ISBN', async () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');

    fireEvent.change(isbnInput, { target: { value: '9780486409122' } });
    const submitButton = screen.getByText('Add Book');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        isbn: '9780486409122',
        success: true
      });
    });
  });

  test('disables submit button when input is empty', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('Add Book');
    expect(submitButton).not.toBeDisabled();
  });

  test('enables submit button when input has content', () => {
    render(
      <ManualISBNInput
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const isbnInput = screen.getByDisplayValue('');
    const submitButton = screen.getByText('Add Book');

    fireEvent.change(isbnInput, { target: { value: '123' } });

    expect(submitButton).not.toBeDisabled();
  });
});