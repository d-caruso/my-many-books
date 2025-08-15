import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AddBookForm } from '../../../components/Book/AddBookForm';

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Paper: ({ children, elevation, ...props }: any) => (
    <div data-testid="paper" data-elevation={elevation} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  TextField: ({ label, value, onChange, error, helperText, multiline, rows, ...props }: any) => (
    <div data-testid="text-field-container">
      <label data-testid="text-field-label">{label}</label>
      {multiline ? (
        <textarea
          data-testid="text-field"
          data-label={label}
          value={value || ''}
          onChange={(e) => onChange?.(e)}
          rows={rows}
          data-error={!!error}
          {...props}
        />
      ) : (
        <input
          data-testid="text-field"
          data-label={label}
          value={value || ''}
          onChange={(e) => onChange?.(e)}
          data-error={!!error}
          {...props}
        />
      )}
      {error && <div data-testid="text-field-error">{error}</div>}
      {helperText && <div data-testid="text-field-helper">{helperText}</div>}
    </div>
  ),
  Button: ({ children, onClick, variant, disabled, loading, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
  Grid: ({ children, item, xs, sm, md, ...props }: any) => (
    <div data-testid="grid" data-item={item} data-xs={xs} data-sm={sm} data-md={md} {...props}>
      {children}
    </div>
  ),
  FormControl: ({ children, fullWidth, ...props }: any) => (
    <div data-testid="form-control" data-fullwidth={fullWidth} {...props}>
      {children}
    </div>
  ),
  InputLabel: ({ children, ...props }: any) => (
    <label data-testid="input-label" {...props}>{children}</label>
  ),
  Select: ({ children, value, onChange, label, ...props }: any) => (
    <div data-testid="select-container">
      <select
        data-testid="select"
        value={value || ''}
        onChange={(e) => onChange?.({ target: { value: e.target.value } })}
        {...props}
      >
        {children}
      </select>
    </div>
  ),
  MenuItem: ({ children, value, ...props }: any) => (
    <option data-testid="menu-item" value={value} {...props}>{children}</option>
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid={`alert-${severity}`} {...props}>{children}</div>
  ),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('AddBookForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockCategories = [
    { id: 1, name: 'Fiction' },
    { id: 2, name: 'Non-Fiction' },
    { id: 3, name: 'Science Fiction' },
  ];

  const mockAuthors = [
    { id: 1, name: 'John', surname: 'Doe' },
    { id: 2, name: 'Jane', surname: 'Smith' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form elements', () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Add New Book')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('ISBN')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Publication Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Pages')).toBeInTheDocument();
    expect(screen.getByLabelText('Publisher')).toBeInTheDocument();
    expect(screen.getByTestId('button-contained')).toBeInTheDocument();
    expect(screen.getByTestId('button-outlined')).toBeInTheDocument();
  });

  test('handles title input changes', () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Test Book Title' } });

    expect(titleInput).toHaveValue('Test Book Title');
  });

  test('handles ISBN input changes', () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const isbnInput = screen.getByLabelText('ISBN');
    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });

    expect(isbnInput).toHaveValue('9780747532699');
  });

  test('handles description input changes', () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'A great book about...' } });

    expect(descriptionInput).toHaveValue('A great book about...');
  });

  test('validates required fields', async () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const submitButton = screen.getByTestId('button-contained');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('ISBN is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('validates ISBN format', async () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText('Title');
    const isbnInput = screen.getByLabelText('ISBN');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(titleInput, { target: { value: 'Test Book' } });
    fireEvent.change(isbnInput, { target: { value: 'invalid-isbn' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid ISBN')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('validates publication year', async () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText('Title');
    const isbnInput = screen.getByLabelText('ISBN');
    const yearInput = screen.getByLabelText('Publication Year');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(titleInput, { target: { value: 'Test Book' } });
    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });
    fireEvent.change(yearInput, { target: { value: '3000' } }); // Future year
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid year')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('validates pages number', async () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText('Title');
    const isbnInput = screen.getByLabelText('ISBN');
    const pagesInput = screen.getByLabelText('Pages');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(titleInput, { target: { value: 'Test Book' } });
    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });
    fireEvent.change(pagesInput, { target: { value: '-10' } }); // Negative number
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Pages must be a positive number')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText('Title');
    const isbnInput = screen.getByLabelText('ISBN');
    const descriptionInput = screen.getByLabelText('Description');
    const yearInput = screen.getByLabelText('Publication Year');
    const pagesInput = screen.getByLabelText('Pages');
    const publisherInput = screen.getByLabelText('Publisher');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(titleInput, { target: { value: 'Test Book' } });
    fireEvent.change(isbnInput, { target: { value: '9780747532699' } });
    fireEvent.change(descriptionInput, { target: { value: 'A test book description' } });
    fireEvent.change(yearInput, { target: { value: '2023' } });
    fireEvent.change(pagesInput, { target: { value: '250' } });
    fireEvent.change(publisherInput, { target: { value: 'Test Publisher' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Test Book',
        isbn: '9780747532699',
        description: 'A test book description',
        publicationYear: 2023,
        pages: 250,
        publisher: 'Test Publisher',
        categoryId: null,
        authorId: null,
      });
    });
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const cancelButton = screen.getByTestId('button-outlined');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('shows loading state when loading prop is true', () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
        loading={true}
      />,
      { wrapper: TestWrapper }
    );

    const submitButton = screen.getByTestId('button-contained');
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Adding Book...')).toBeInTheDocument();
  });

  test('displays error message when error prop is provided', () => {
    const errorMessage = 'Failed to add book';
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
        error={errorMessage}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('populates form fields when initialData is provided', () => {
    const initialData = {
      title: 'Existing Book',
      isbn: '9780747532699',
      description: 'An existing book',
      publicationYear: 2020,
      pages: 300,
      publisher: 'Existing Publisher',
      categoryId: 1,
      authorId: 2,
    };

    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
        initialData={initialData}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByDisplayValue('Existing Book')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9780747532699')).toBeInTheDocument();
    expect(screen.getByDisplayValue('An existing book')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
    expect(screen.getByDisplayValue('300')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Publisher')).toBeInTheDocument();
  });

  test('clears validation errors when valid input is entered', async () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText('Title');
    const submitButton = screen.getByTestId('button-contained');

    // Trigger validation error
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    // Enter valid input
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });

    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
  });

  test('handles category selection', () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const categorySelect = screen.getByTestId('select');
    fireEvent.change(categorySelect, { target: { value: '1' } });

    expect(categorySelect).toHaveValue('1');
  });

  test('handles form reset', () => {
    render(
      <AddBookForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        categories={mockCategories}
        authors={mockAuthors}
      />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText('Title');
    const isbnInput = screen.getByLabelText('ISBN');

    // Fill in some data
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(isbnInput, { target: { value: '1234567890' } });

    expect(titleInput).toHaveValue('Test Title');
    expect(isbnInput).toHaveValue('1234567890');

    // Reset should clear the form
    const cancelButton = screen.getByTestId('button-outlined');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});