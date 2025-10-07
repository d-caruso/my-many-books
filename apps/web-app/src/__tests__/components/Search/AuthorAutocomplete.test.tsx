import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthorAutocomplete } from '../../../components/Search/AuthorAutocomplete';
import { ApiProvider } from '../../../contexts/ApiContext';
import { Author } from '../../../types';

// Create mock API service
const mockAuthorAPI = {
  searchAuthors: vi.fn(),
};

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Autocomplete: ({ 
    value,
    onChange,
    inputValue,
    onInputChange,
    options,
    getOptionLabel,
    renderOption,
    renderInput,
    loading,
    noOptionsText,
    open,
    onOpen,
    onClose,
    isOptionEqualToValue,
    filterOptions,
    ...props 
  }: any) => (
    <div data-testid="autocomplete" {...props}>
      <input
        data-testid="autocomplete-input"
        value={inputValue || ''}
        onChange={(e) => onInputChange?.(e, e.target.value)}
        onFocus={() => onOpen?.()}
        onBlur={() => onClose?.()}
      />
      <div data-testid="loading-state">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="no-options-text">{noOptionsText}</div>
      <div data-testid="open-state">{open ? 'open' : 'closed'}</div>
      {open && options.length > 0 && (
        <ul data-testid="options-list">
          {options.map((option: Author, index: number) => (
            <li 
              key={option.id}
              data-testid={`option-${index}`}
              onClick={() => onChange?.(null, option)}
            >
              {renderOption ? renderOption({}, option) : getOptionLabel(option)}
            </li>
          ))}
        </ul>
      )}
      {renderInput && renderInput({
        InputProps: {
          endAdornment: loading ? <div data-testid="loading-icon">Loading</div> : null,
        }
      })}
    </div>
  ),
  TextField: ({ label, placeholder, disabled, size, InputProps, ...props }: any) => (
    <div data-testid="text-field">
      <label>{label}</label>
      <input
        placeholder={placeholder}
        disabled={disabled}
        data-size={size}
        {...props}
      />
      {InputProps?.endAdornment && (
        <div data-testid="input-adornment">{InputProps.endAdornment}</div>
      )}
    </div>
  ),
  CircularProgress: ({ color, size }: any) => (
    <div data-testid="circular-progress" data-color={color} data-size={size}>
      Loading
    </div>
  ),
  Box: ({ children, component, ...props }: any) => (
    <div data-testid="box" data-component={component} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, fontWeight, color, ...props }: any) => (
    <div 
      data-testid={`typography-${variant}`}
      data-fontweight={fontWeight}
      data-color={color}
      {...props}
    >
      {children}
    </div>
  ),
}));

// Create mock API service instance
const mockApiService = {
  searchAuthors: mockAuthorAPI.searchAuthors,
  getBooks: vi.fn(),
  getBook: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  searchBooks: vi.fn(),
  searchByISBN: vi.fn(),
  getCategories: vi.fn(),
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getAuthors: vi.fn(),
  getAuthor: vi.fn(),
  createAuthor: vi.fn(),
  updateAuthor: vi.fn(),
  deleteAuthor: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
} as any;

const mockAuthors: Author[] = [
  {
    id: 1,
    name: 'Jane',
    surname: 'Austen',
    nationality: 'British',
  },
  {
    id: 2,
    name: 'Charles',
    surname: 'Dickens',
    nationality: 'British',
  },
  {
    id: 3,
    name: 'Ernest',
    surname: 'Hemingway',
    nationality: 'American',
  },
];

describe('AuthorAutocomplete', () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    onChange: mockOnChange,
  };

  // Helper to render with ApiProvider
  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <ApiProvider apiService={mockApiService}>
        {ui}
      </ApiProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockAuthorAPI.searchAuthors.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders with default props', () => {
    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    expect(screen.getByTestId('autocomplete')).toBeInTheDocument();
    expect(screen.getByTestId('text-field')).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
  });

  test('renders with custom placeholder', () => {
    renderWithProvider(
      <AuthorAutocomplete
        {...defaultProps}
        placeholder="Custom placeholder"
      />
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  test('renders with custom size', () => {
    renderWithProvider(
      <AuthorAutocomplete
        {...defaultProps}
        size="small"
      />
    );

    const input = screen.getByTestId('text-field').querySelector('input');
    expect(input).toHaveAttribute('data-size', 'small');
  });

  test('can be disabled', () => {
    renderWithProvider(
      <AuthorAutocomplete
        {...defaultProps}
        disabled={true}
      />
    );

    const input = screen.getByTestId('text-field').querySelector('input');
    expect(input).toBeDisabled();
  });

  test('displays current value', () => {
    renderWithProvider(
      <AuthorAutocomplete
        {...defaultProps}
        value={mockAuthors[0]}
      />
    );

    const input = screen.getByTestId('autocomplete-input');
    expect(input).toHaveValue('Jane Austen');
  });

  test('clears input when value is null', () => {
    const { rerender } = renderWithProvider(
      <AuthorAutocomplete
        {...defaultProps}
        value={mockAuthors[0]}
      />
    );

    let input = screen.getByTestId('autocomplete-input');
    expect(input).toHaveValue('Jane Austen');

    rerender(
      <ApiProvider apiService={mockApiService}>
        <AuthorAutocomplete
          {...defaultProps}
          value={null}
        />
      </ApiProvider>
    );

    input = screen.getByTestId('autocomplete-input');
    expect(input).toHaveValue('');
  });

  test('performs search with debounce', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    fireEvent.change(input, { target: { value: 'Jane' } });

    // Should not search immediately
    expect(mockAuthorAPI.searchAuthors).not.toHaveBeenCalled();

    // Advance timers to trigger debounce
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockAuthorAPI.searchAuthors).toHaveBeenCalledWith('Jane');
  });

  test('does not search for terms shorter than 2 characters', async () => {
    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'J' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockAuthorAPI.searchAuthors).not.toHaveBeenCalled();
    expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
  });

  test('shows loading state during search', async () => {
    // Create a promise that doesn't resolve immediately
    let resolveSearch: (value: Author[]) => void;
    const searchPromise = new Promise<Author[]>((resolve) => {
      resolveSearch = resolve;
    });
    mockAuthorAPI.searchAuthors.mockReturnValue(searchPromise);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    fireEvent.change(input, { target: { value: 'Jane' } });

    // Advance timers for debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Use real timers for waitFor
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    });

    // Resolve the search
    act(() => {
      resolveSearch!(mockAuthors);
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading');
    });

    // Restore fake timers for cleanup
    vi.useFakeTimers();
  });

  test('displays search results', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    fireEvent.change(input, { target: { value: 'author' } });

    // Advance timers for debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Use real timers for waitFor
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Austen')).toBeInTheDocument();
    expect(screen.getByText('Charles Dickens')).toBeInTheDocument();
    expect(screen.getByText('Ernest Hemingway')).toBeInTheDocument();

    vi.useFakeTimers();
  });

  test('calls onChange when author is selected', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    fireEvent.change(input, { target: { value: 'Jane' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    const firstOption = screen.getByTestId('option-0');
    fireEvent.click(firstOption);

    expect(mockOnChange).toHaveBeenCalledWith(mockAuthors[0]);

    vi.useFakeTimers();
  });

  test('handles search errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
    mockAuthorAPI.searchAuthors.mockRejectedValue(new Error('Search failed'));

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    fireEvent.change(input, { target: { value: 'Jane' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Author search failed:', expect.any(Error));
    });

    expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading');

    consoleErrorSpy.mockRestore();
    vi.useFakeTimers();
  });

  test('clears search results when input is cleared', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    // First search
    fireEvent.change(input, { target: { value: 'Jane' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    vi.useFakeTimers();

    // Clear input
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
  });

  test('shows correct no options text based on search term length', () => {
    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    // Short search term
    const input = screen.getByTestId('autocomplete-input');
    fireEvent.change(input, { target: { value: 'J' } });

    expect(screen.getByTestId('no-options-text')).toHaveTextContent('Type to search authors...');

    // Longer search term with no results
    fireEvent.change(input, { target: { value: 'xyz' } });

    expect(screen.getByTestId('no-options-text')).toHaveTextContent('No authors found for "xyz"');
  });

  test('renders author options with nationality', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue([mockAuthors[0]]);

    const { container } = renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    fireEvent.change(input, { target: { value: 'Jane' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Austen')).toBeInTheDocument();
    expect(screen.getByText('British')).toBeInTheDocument();

    vi.useFakeTimers();
  });

  test('renders author options without nationality', async () => {
    const authorWithoutNationality = {
      ...mockAuthors[0],
      nationality: undefined,
    };
    mockAuthorAPI.searchAuthors.mockResolvedValue([authorWithoutNationality]);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    fireEvent.change(input, { target: { value: 'Jane' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Austen')).toBeInTheDocument();
    expect(screen.queryByText('British')).not.toBeInTheDocument();

    vi.useFakeTimers();
  });

  test('cancels previous search when new search is initiated', async () => {
    let resolveFirstSearch: (value: Author[]) => void;
    let resolveSecondSearch: (value: Author[]) => void;

    const firstSearchPromise = new Promise<Author[]>((resolve) => {
      resolveFirstSearch = resolve;
    });

    const secondSearchPromise = new Promise<Author[]>((resolve) => {
      resolveSecondSearch = resolve;
    });

    mockAuthorAPI.searchAuthors
      .mockReturnValueOnce(firstSearchPromise)
      .mockReturnValueOnce(secondSearchPromise);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    // First search
    fireEvent.change(input, { target: { value: 'Jane' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Second search before first completes
    fireEvent.change(input, { target: { value: 'Charles' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();

    // Resolve first search (should be ignored)
    act(() => {
      resolveFirstSearch!([mockAuthors[0]]);
    });

    // Resolve second search
    act(() => {
      resolveSecondSearch!([mockAuthors[1]]);
    });

    await waitFor(() => {
      expect(screen.getByText('Charles Dickens')).toBeInTheDocument();
    });

    expect(screen.queryByText('Jane Austen')).not.toBeInTheDocument();

    vi.useFakeTimers();
  });

  test('cleans up timeout on unmount', () => {
    const { unmount } = renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.change(input, { target: { value: 'Jane' } });

    expect(() => unmount()).not.toThrow();
  });

  test('handles rapid typing correctly', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    // Rapid typing
    fireEvent.change(input, { target: { value: 'J' } });
    fireEvent.change(input, { target: { value: 'Ja' } });
    fireEvent.change(input, { target: { value: 'Jan' } });
    fireEvent.change(input, { target: { value: 'Jane' } });

    // Only the last search should be executed after debounce
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockAuthorAPI.searchAuthors).toHaveBeenCalledTimes(1);
    expect(mockAuthorAPI.searchAuthors).toHaveBeenCalledWith('Jane');
  });

  test('maintains focus state correctly', () => {
    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.focus(input);
    expect(screen.getByTestId('open-state')).toHaveTextContent('open');

    fireEvent.blur(input);
    expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
  });

  test('shows loading indicator in input adornment', async () => {
    let resolveSearch: (value: Author[]) => void;
    const searchPromise = new Promise<Author[]>((resolve) => {
      resolveSearch = resolve;
    });
    mockAuthorAPI.searchAuthors.mockReturnValue(searchPromise);

    renderWithProvider(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');

    fireEvent.change(input, { target: { value: 'Jane' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByTestId('input-adornment')).toBeInTheDocument();
      expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
    });

    act(() => {
      resolveSearch!(mockAuthors);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
    });

    vi.useFakeTimers();
  });
});