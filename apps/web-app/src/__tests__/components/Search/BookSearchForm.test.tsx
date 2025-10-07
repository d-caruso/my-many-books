import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BookSearchForm } from '../../../components/Search/BookSearchForm';
import { useCategories } from '../../../hooks/useCategories';

// Mock the useCategories hook
vi.mock('../../../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

// Mock AuthorAutocomplete component
vi.mock('../../../components/Search/AuthorAutocomplete', () => ({
  AuthorAutocomplete: ({ value, onChange, placeholder, disabled, size }: any) => (
    <div data-testid="author-autocomplete">
      <input
        data-testid="author-input"
        placeholder={placeholder}
        disabled={disabled}
        data-size={size}
        onChange={(e) => onChange({ id: 1, name: 'Test', surname: 'Author' })}
      />
      <div data-testid="author-value">{value ? `${value.name} ${value.surname}` : ''}</div>
    </div>
  ),
}));

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Paper: ({ children, sx, ...props }: any) => (
    <div data-testid="paper" style={sx} {...props}>{children}</div>
  ),
  TextField: ({ 
    label, 
    value, 
    onChange, 
    placeholder, 
    fullWidth, 
    disabled,
    error,
    InputProps,
    ...props 
  }: any) => (
    <div data-testid="text-field-container">
      <input
        data-testid="search-input"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange?.(e)}
        disabled={disabled}
        data-error={error}
        data-fullwidth={fullWidth}
        {...props}
      />
      {InputProps?.startAdornment && (
        <div data-testid="input-adornment">{InputProps.startAdornment}</div>
      )}
    </div>
  ),
  Button: ({ 
    children, 
    onClick, 
    variant, 
    disabled, 
    type, 
    color,
    size,
    startIcon, 
    endIcon,
    sx,
    ...props 
  }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-color={color}
      data-size={size}
      style={sx}
      {...props}
    >
      {startIcon && <span data-testid="start-icon">{startIcon}</span>}
      {children}
      {endIcon && <span data-testid="end-icon">{endIcon}</span>}
    </button>
  ),
  Box: ({ children, component, sx, display, gap, mb, ...props }: any) => (
    <div 
      data-testid="box" 
      data-component={component}
      style={{ display, gap, marginBottom: mb, ...sx }}
      {...props}
    >
      {children}
    </div>
  ),
  FormControl: ({ children, fullWidth, size, ...props }: any) => (
    <div data-testid="form-control" data-fullwidth={fullWidth} data-size={size} {...props}>
      {children}
    </div>
  ),
  InputLabel: ({ children, id, ...props }: any) => (
    <label data-testid="input-label" id={id} {...props}>{children}</label>
  ),
  Select: ({ 
    children, 
    value, 
    onChange, 
    label, 
    disabled,
    labelId,
    ...props 
  }: any) => (
    <div data-testid="select-container">
      <select
        data-testid="select"
        value={value || ''}
        onChange={(e) => onChange?.({ target: { value: e.target.value } })}
        disabled={disabled}
        data-label-id={labelId}
        aria-label={label}
        {...props}
      >
        {children}
      </select>
    </div>
  ),
  MenuItem: ({ children, value, ...props }: any) => (
    <option data-testid="menu-item" value={value} {...props}>{children}</option>
  ),
  Collapse: ({ children, in: isIn, ...props }: any) => (
    isIn ? <div data-testid="collapse" {...props}>{children}</div> : null
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  InputAdornment: ({ children, position, ...props }: any) => (
    <div data-testid={`input-adornment-${position}`} {...props}>{children}</div>
  ),
  Alert: ({ children, severity, icon, ...props }: any) => (
    <div data-testid={`alert-${severity}`} {...props}>
      {icon && <span data-testid="alert-icon">{icon}</span>}
      {children}
    </div>
  ),
  Stack: ({ children, spacing, ...props }: any) => (
    <div data-testid="stack" data-spacing={spacing} {...props}>{children}</div>
  ),
}));

// Mock Material-UI icons
vi.mock('@mui/icons-material', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  ExpandMore: () => <div data-testid="expand-more-icon">Expand</div>,
  Clear: () => <div data-testid="clear-icon">Clear</div>,
  Warning: () => <div data-testid="warning-icon">Warning</div>,
}));

const mockUseCategories = vi.mocked(useCategories);

const mockCategories = [
  { id: 1, name: 'Fiction' },
  { id: 2, name: 'Non-Fiction' },
  { id: 3, name: 'Science Fiction' },
];

describe('BookSearchForm', () => {
  const mockOnSearch = vi.fn();

  const defaultProps = {
    onSearch: mockOnSearch,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCategories.mockReturnValue({
      categories: mockCategories,
      loading: false,
    });
  });

  test('renders search form elements', () => {
    render(<BookSearchForm {...defaultProps} />);

    expect(screen.getByTestId('paper')).toBeInTheDocument();
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByTestId('button-contained')).toBeInTheDocument();
    // "Search" appears twice: once in the icon and once in the button
    expect(screen.getAllByText('Search').length).toBe(2);
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
  });

  test('handles search input changes', () => {
    render(<BookSearchForm {...defaultProps} />);

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Harry Potter' } });

    expect(searchInput).toHaveValue('Harry Potter');
  });

  test('shows initial query when provided', () => {
    render(<BookSearchForm {...defaultProps} initialQuery="Initial Query" />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toHaveValue('Initial Query');
  });

  test('calls onSearch when form is submitted with valid query', () => {
    const { container } = render(<BookSearchForm {...defaultProps} />);

    const searchInput = screen.getByTestId('search-input');
    const form = container.querySelector('form');

    fireEvent.change(searchInput, { target: { value: 'Test Book' } });
    fireEvent.submit(form!);

    expect(mockOnSearch).toHaveBeenCalledWith('Test Book', {});
  });

  test('prevents submission with query shorter than 2 characters', async () => {
    const { container } = render(<BookSearchForm {...defaultProps} />);

    const searchInput = screen.getByTestId('search-input');
    const form = container.querySelector('form');

    fireEvent.change(searchInput, { target: { value: 'T' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/Please enter at least 2 characters/i)).toBeInTheDocument();
    });
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  test('allows submission with filters but no query', () => {
    render(<BookSearchForm {...defaultProps} />);

    // Expand advanced filters
    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    // Select a category
    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: '1' } });

    const searchButton = screen.getByTestId('button-contained');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('', { categoryId: 1 });
  });

  test('toggles advanced filters visibility', () => {
    render(<BookSearchForm {...defaultProps} />);

    // Initially collapsed
    expect(screen.queryByTestId('collapse')).not.toBeInTheDocument();

    // Expand
    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    expect(screen.getByTestId('collapse')).toBeInTheDocument();
    expect(screen.getByTestId('author-autocomplete')).toBeInTheDocument();

    // Collapse
    fireEvent.click(advancedButton);
    expect(screen.queryByTestId('collapse')).not.toBeInTheDocument();
  });

  test('handles category selection', () => {
    render(<BookSearchForm {...defaultProps} />);

    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: '2' } });

    expect(categorySelect).toHaveValue('2');
  });

  test('handles reading status selection', () => {
    render(<BookSearchForm {...defaultProps} />);

    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    const statusSelect = screen.getByLabelText('Reading Status');
    fireEvent.change(statusSelect, { target: { value: 'finished' } });

    expect(statusSelect).toHaveValue('finished');
  });

  test('handles sort by selection', () => {
    render(<BookSearchForm {...defaultProps} />);

    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    const sortBySelect = screen.getByLabelText('Sort By');
    fireEvent.change(sortBySelect, { target: { value: 'author' } });

    expect(sortBySelect).toHaveValue('author');
  });

  test('handles author selection', () => {
    render(<BookSearchForm {...defaultProps} />);

    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    const authorInput = screen.getByTestId('author-input');
    fireEvent.change(authorInput, { target: { value: 'test' } });

    expect(screen.getByTestId('author-value')).toHaveTextContent('Test Author');
  });

  test('clears all filters and query', () => {
    render(<BookSearchForm {...defaultProps} initialQuery="test query" />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toHaveValue('test query');

    // Expand advanced filters and set some values
    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: '1' } });

    // Clear all should now be visible
    const clearButton = screen.getByText('Clear all');
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(categorySelect).toHaveValue('');
  });

  test('shows loading state', () => {
    render(<BookSearchForm {...defaultProps} loading={true} />);

    const searchButton = screen.getByTestId('button-contained');
    const searchInput = screen.getByTestId('search-input');

    expect(searchButton).toBeDisabled();
    expect(searchInput).toBeDisabled();
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  test('clears validation error when typing in search box', () => {
    render(<BookSearchForm {...defaultProps} />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('button-contained');

    // Trigger validation error
    fireEvent.change(searchInput, { target: { value: 'T' } });
    fireEvent.click(searchButton);

    expect(screen.getByTestId('alert-warning')).toBeInTheDocument();

    // Type more to clear error
    fireEvent.change(searchInput, { target: { value: 'Test' } });

    expect(screen.queryByTestId('alert-warning')).not.toBeInTheDocument();
  });

  test('clears validation error when changing filters', () => {
    render(<BookSearchForm {...defaultProps} />);

    const searchInput = screen.getByTestId('search-input');
    const searchButton = screen.getByTestId('button-contained');

    // Trigger validation error
    fireEvent.change(searchInput, { target: { value: 'T' } });
    fireEvent.click(searchButton);

    expect(screen.getByTestId('alert-warning')).toBeInTheDocument();

    // Expand filters and change category
    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: '1' } });

    expect(screen.queryByTestId('alert-warning')).not.toBeInTheDocument();
  });

  test('handles categories loading state', () => {
    mockUseCategories.mockReturnValue({
      categories: [],
      loading: true,
    });

    render(<BookSearchForm {...defaultProps} />);

    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  test('sorts categories alphabetically', () => {
    const unsortedCategories = [
      { id: 1, name: 'Zebra' },
      { id: 2, name: 'Apple' },
      { id: 3, name: 'Banana' },
    ];

    mockUseCategories.mockReturnValue({
      categories: unsortedCategories,
      loading: false,
    });

    render(<BookSearchForm {...defaultProps} />);

    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    const options = screen.getAllByTestId('menu-item');
    // First option is "All Categories", then sorted categories
    expect(options[1]).toHaveTextContent('Apple');
    expect(options[2]).toHaveTextContent('Banana');
    expect(options[3]).toHaveTextContent('Zebra');
  });

  test('handles form submission via Enter key', () => {
    render(<BookSearchForm {...defaultProps} />);

    const form = screen.getByTestId('box').querySelector('form');
    const searchInput = screen.getByTestId('search-input');

    fireEvent.change(searchInput, { target: { value: 'Test Book' } });
    fireEvent.submit(form!);

    expect(mockOnSearch).toHaveBeenCalledWith('Test Book', {});
  });

  test('shows clear button only when form has values', () => {
    render(<BookSearchForm {...defaultProps} />);

    // Initially no clear button
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();

    // Add search query
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  test('includes all form values in search call', () => {
    render(<BookSearchForm {...defaultProps} />);

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    // Expand advanced filters
    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    // Set multiple filters
    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: '1' } });

    const statusSelect = screen.getByLabelText('Reading Status');
    fireEvent.change(statusSelect, { target: { value: 'finished' } });

    const sortBySelect = screen.getByLabelText('Sort By');
    fireEvent.change(sortBySelect, { target: { value: 'author' } });

    const searchButton = screen.getByTestId('button-contained');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('test query', {
      categoryId: 1,
      status: 'finished',
      sortBy: 'author',
    });
  });

  test('handles responsive layout correctly', () => {
    render(<BookSearchForm {...defaultProps} />);

    expect(screen.getByTestId('paper')).toBeInTheDocument();
    
    const advancedButton = screen.getByText('Advanced Filters');
    fireEvent.click(advancedButton);

    // Should have responsive grid
    const gridBoxes = screen.getAllByTestId('box');
    const responsiveBox = gridBoxes.find(box => 
      box.style.display === 'grid'
    );
    expect(responsiveBox).toBeInTheDocument();
  });

  test('renders search input placeholder', () => {
    render(<BookSearchForm {...defaultProps} />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput).toHaveAttribute('placeholder', 'Search by title, author, ISBN...');
  });

  test('renders search icon in input adornment', () => {
    render(<BookSearchForm {...defaultProps} />);

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  test('renders expand icon with animation', () => {
    render(<BookSearchForm {...defaultProps} />);

    expect(screen.getByTestId('expand-more-icon')).toBeInTheDocument();
  });

  test('handles component mount and unmount cleanly', () => {
    const { unmount } = render(<BookSearchForm {...defaultProps} />);
    
    expect(() => unmount()).not.toThrow();
  });
});