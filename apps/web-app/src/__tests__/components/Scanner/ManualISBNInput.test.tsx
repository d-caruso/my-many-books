import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualISBNInput } from '../../../components/Scanner/ManualISBNInput';

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Paper: ({ children, elevation, ...props }: any) => (
    <div data-testid="paper" data-elevation={elevation} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, color, ...props }: any) => (
    <div data-testid={`typography-${variant}`} data-color={color} {...props}>{children}</div>
  ),
  TextField: ({ label, value, onChange, error, helperText, placeholder, fullWidth, variant, ...props }: any) => (
    <div data-testid="text-field-container">
      <label data-testid="text-field-label">{label}</label>
      <input
        data-testid="text-field"
        data-label={label}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange?.(e)}
        data-error={!!error}
        data-fullwidth={fullWidth}
        data-variant={variant}
        {...props}
      />
      {error && <div data-testid="text-field-error">{error}</div>}
      {helperText && <div data-testid="text-field-helper">{helperText}</div>}
    </div>
  ),
  Button: ({ children, onClick, variant, disabled, color, fullWidth, startIcon, endIcon, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      disabled={disabled}
      data-color={color}
      data-fullwidth={fullWidth}
      {...props}
    >
      {startIcon && <span data-testid="start-icon">{startIcon}</span>}
      {children}
      {endIcon && <span data-testid="end-icon">{endIcon}</span>}
    </button>
  ),
  Dialog: ({ children, open, onClose, maxWidth, fullWidth, ...props }: any) => (
    open ? (
      <div data-testid="dialog" data-maxwidth={maxWidth} data-fullwidth={fullWidth} {...props}>
        {children}
        <button data-testid="dialog-backdrop" onClick={onClose} />
      </div>
    ) : null
  ),
  DialogTitle: ({ children, ...props }: any) => (
    <div data-testid="dialog-title" {...props}>{children}</div>
  ),
  DialogContent: ({ children, ...props }: any) => (
    <div data-testid="dialog-content" {...props}>{children}</div>
  ),
  DialogActions: ({ children, ...props }: any) => (
    <div data-testid="dialog-actions" {...props}>{children}</div>
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid={`alert-${severity}`} {...props}>{children}</div>
  ),
  IconButton: ({ children, onClick, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} {...props}>{children}</button>
  ),
}));

// Mock Material-UI icons
jest.mock('@mui/icons-material', () => ({
  Close: () => <div data-testid="close-icon">Close</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
}));

describe('ManualISBNInput', () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders manual ISBN input dialog', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Enter ISBN Manually')).toBeInTheDocument();
    expect(screen.getByLabelText('ISBN')).toBeInTheDocument();
  });

  test('does not render when open is false', () => {
    const { container } = render(
      <ManualISBNInput
        open={false}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('handles ISBN input changes', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });

    expect(isbnInput).toHaveValue('9780747532699');
  });

  test('shows placeholder text in input field', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    expect(isbnInput).toHaveAttribute('placeholder', 'Enter 10 or 13 digit ISBN');
  });

  test('validates required ISBN field', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const submitButton = screen.getByTestId('button-contained');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ISBN is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('validates ISBN format', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(isbnInput, { target: { value: 'invalid-isbn' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid ISBN (10 or 13 digits)')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('accepts valid ISBN-10', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(isbnInput, { target: { value: '0747532699' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('0747532699');
    });
  });

  test('accepts valid ISBN-13', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('9780747532699');
    });
  });

  test('strips hyphens and spaces from ISBN', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(isbnInput, { target: { value: '978-0-7475-3269-9' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('9780747532699');
    });
  });

  test('handles ISBN with spaces', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(isbnInput, { target: { value: '978 0 7475 3269 9' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('9780747532699');
    });
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByTestId('close-icon').parentElement;
    fireEvent.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when cancel button is clicked', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByTestId('button-text');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when backdrop is clicked', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const backdrop = screen.getByTestId('dialog-backdrop');
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('submits form on Enter key press', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');

    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });
    fireEvent.keyDown(isbnInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('9780747532699');
    });
  });

  test('does not submit on non-Enter key press', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');

    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });
    fireEvent.keyDown(isbnInput, { key: 'Tab' });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('shows helper text for ISBN format', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Enter ISBN with or without hyphens/spaces')).toBeInTheDocument();
  });

  test('clears validation error when valid input is entered', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    // Trigger validation error
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ISBN is required')).toBeInTheDocument();
    });

    // Enter valid input
    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });

    expect(screen.queryByText('ISBN is required')).not.toBeInTheDocument();
  });

  test('shows correct dialog title', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Enter ISBN Manually');
  });

  test('has proper dialog actions layout', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId('dialog-actions')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  test('handles ISBN with X check digit (ISBN-10)', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(isbnInput, { target: { value: '123456789X' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('123456789X');
    });
  });

  test('rejects ISBN with invalid length', async () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(isbnInput, { target: { value: '123456' } }); // Too short
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid ISBN (10 or 13 digits)')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('has responsive dialog layout', () => {
    render(
      <ManualISBNInput
        open={true}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const dialog = screen.getByTestId('dialog');
    expect(dialog).toHaveAttribute('data-maxwidth', 'sm');
    expect(dialog).toHaveAttribute('data-fullwidth', 'true');
  });
});