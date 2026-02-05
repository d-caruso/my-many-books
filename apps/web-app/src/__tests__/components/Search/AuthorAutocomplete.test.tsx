import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthorAutocomplete } from '../../../components/Search/AuthorAutocomplete';
import { ApiProvider } from '../../../contexts/ApiContext';
import { Author } from '../../../types';

// Inline mock to avoid async import issues
vi.mock('@mui/material', () => {
  const React = require('react');

  const createSimpleWrapper = (testId: string) => {
    return ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': testId, ...props }, children);
  };

  const TextField = ({
    label,
    value = '',
    onChange,
    inputProps = {},
    InputProps = {},
    placeholder,
    disabled,
    size,
    ...rest
  }: any) => {
    const inputId = label || 'text-field';
    return (
      <div data-testid="text-field-container">
        {label && <label htmlFor={inputId}>{label}</label>}
        <input
          id={inputId}
          value={inputProps.value ?? value}
          onChange={inputProps.onChange}
          onFocus={inputProps.onFocus}
          onBlur={inputProps.onBlur}
          placeholder={placeholder}
          disabled={inputProps.disabled ?? disabled}
          data-size={inputProps['data-size'] ?? size}
          data-testid={inputProps['data-testid']}
          role="textbox"
          {...rest}
        />
        {InputProps.endAdornment}
      </div>
    );
  };

  const Autocomplete = ({
    value,
    inputValue,
    options = [],
    open,
    loading,
    disabled,
    renderInput,
    renderOption,
    getOptionLabel,
    onChange,
    onInputChange,
    onOpen,
    onClose,
    noOptionsText,
    ListboxProps,
    size,
  }: any) => {
    const handleInputChange = (e: any) => {
      onInputChange?.(e, e.target.value, 'input');
    };

    const handleFocus = () => onOpen?.();
    const handleBlur = () => onClose?.();

    const labelValue = value ? getOptionLabel?.(value) ?? '' : '';
    const displayValue = inputValue ?? labelValue;

    const inputElement = renderInput({
      inputProps: {
        value: displayValue,
        onChange: handleInputChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
        disabled,
        'data-size': size,
      },
      InputProps: { endAdornment: null },
    });

    return (
      <div>
        {inputElement}
        {open && options.length > 0 && (
          <ul data-testid="options-list" {...ListboxProps}>
            {options.map((option: any, index: number) => {
              const optionProps = {
                key: option.id ?? index,
                'data-testid': `option-${index}`,
                onClick: () => onChange?.(null, option, 'selectOption', { option }),
              };
              return renderOption ? (
                renderOption(optionProps, option, { index, selected: false, inputValue: inputValue ?? '' })
              ) : (
                <li {...optionProps}>{getOptionLabel?.(option)}</li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  const Typography = ({ children, variant, ...props }: any) => {
    const headingMap: Record<string, string> = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6' };
    const Component = (variant && headingMap[variant]) || 'p';
    return React.createElement(Component, props, children);
  };

  return {
    Box: createSimpleWrapper('box'),
    TextField,
    Autocomplete,
    Typography,
    CircularProgress: () => <div data-testid="circular-progress" />,
  };
});


// Create mock API service
const mockAuthorAPI = {
  searchAuthors: vi.fn(),
};

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

    const textField = screen.getByTestId('text-field');
    const input = within(textField).getByRole('textbox');
    expect(input).toHaveAttribute('data-size', 'small');
  });

  test('can be disabled', () => {
    renderWithProvider(
      <AuthorAutocomplete
        {...defaultProps}
        disabled={true}
      />
    );

    const textField = screen.getByTestId('text-field');
    const input = within(textField).getByRole('textbox');
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
    expect(screen.getByText('British')).toBeInTheDocument();
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
    });
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();

    act(() => {
      resolveSearch!(mockAuthors);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
    });
  });
});
