import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthorAutocomplete } from '../../../components/Search/AuthorAutocomplete';
import { authorAPI } from '../../../services/api';
import { Author } from '../../../types';

// Mock the API service
jest.mock('../../../services/api', () => ({
  authorAPI: {
    searchAuthors: jest.fn(),
  },
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
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

const mockAuthorAPI = authorAPI as jest.Mocked<typeof authorAPI>;

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
  const mockOnChange = jest.fn();

  const defaultProps = {
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAuthorAPI.searchAuthors.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders with default props', () => {
    render(<AuthorAutocomplete {...defaultProps} />);

    expect(screen.getByTestId('autocomplete')).toBeInTheDocument();
    expect(screen.getByTestId('text-field')).toBeInTheDocument();
    expect(screen.getByText('Author')).toBeInTheDocument();
  });

  test('renders with custom placeholder', () => {
    render(
      <AuthorAutocomplete
        {...defaultProps}
        placeholder="Custom placeholder"
      />
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  test('renders with custom size', () => {
    render(
      <AuthorAutocomplete
        {...defaultProps}
        size="small"
      />
    );

    const input = screen.getByTestId('text-field').querySelector('input');
    expect(input).toHaveAttribute('data-size', 'small');
  });

  test('can be disabled', () => {
    render(
      <AuthorAutocomplete
        {...defaultProps}
        disabled={true}
      />
    );

    const input = screen.getByTestId('text-field').querySelector('input');
    expect(input).toBeDisabled();
  });

  test('displays current value', () => {
    render(
      <AuthorAutocomplete
        {...defaultProps}
        value={mockAuthors[0]}
      />
    );

    const input = screen.getByTestId('autocomplete-input');
    expect(input).toHaveValue('Jane Austen');
  });

  test('clears input when value is null', () => {
    const { rerender } = render(
      <AuthorAutocomplete
        {...defaultProps}
        value={mockAuthors[0]}
      />
    );

    let input = screen.getByTestId('autocomplete-input');
    expect(input).toHaveValue('Jane Austen');

    rerender(
      <AuthorAutocomplete
        {...defaultProps}
        value={null}
      />
    );

    input = screen.getByTestId('autocomplete-input');
    expect(input).toHaveValue('');
  });

  test('performs search with debounce', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'Jane' } });

    // Should not search immediately
    expect(mockAuthorAPI.searchAuthors).not.toHaveBeenCalled();

    // Advance timers to trigger debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockAuthorAPI.searchAuthors).toHaveBeenCalledWith('Jane');
    });
  });

  test('does not search for terms shorter than 2 characters', async () => {
    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'J' } });

    act(() => {
      jest.advanceTimersByTime(300);
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

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'Jane' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

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

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'author' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Austen')).toBeInTheDocument();
    expect(screen.getByText('Charles Dickens')).toBeInTheDocument();
    expect(screen.getByText('Ernest Hemingway')).toBeInTheDocument();
  });

  test('calls onChange when author is selected', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'Jane' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    const firstOption = screen.getByTestId('option-0');
    fireEvent.click(firstOption);

    expect(mockOnChange).toHaveBeenCalledWith(mockAuthors[0]);
  });

  test('handles search errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockAuthorAPI.searchAuthors.mockRejectedValue(new Error('Search failed'));

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'Jane' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Author search failed:', expect.any(Error));
    });

    expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading');

    consoleErrorSpy.mockRestore();
  });

  test('clears search results when input is cleared', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    // First search
    fireEvent.change(input, { target: { value: 'Jane' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    // Clear input
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
  });

  test('shows correct no options text based on search term length', () => {
    render(<AuthorAutocomplete {...defaultProps} />);

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

    const { container } = render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'Jane' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

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

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'Jane' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

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

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    // First search
    fireEvent.change(input, { target: { value: 'Jane' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Second search before first completes
    fireEvent.change(input, { target: { value: 'Charles' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });

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
    const { unmount } = render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.change(input, { target: { value: 'Jane' } });

    expect(() => unmount()).not.toThrow();
  });

  test('handles rapid typing correctly', async () => {
    mockAuthorAPI.searchAuthors.mockResolvedValue(mockAuthors);

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    // Rapid typing
    fireEvent.change(input, { target: { value: 'J' } });
    fireEvent.change(input, { target: { value: 'Ja' } });
    fireEvent.change(input, { target: { value: 'Jan' } });
    fireEvent.change(input, { target: { value: 'Jane' } });

    // Only the last search should be executed after debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockAuthorAPI.searchAuthors).toHaveBeenCalledTimes(1);
    expect(mockAuthorAPI.searchAuthors).toHaveBeenCalledWith('Jane');
  });

  test('maintains focus state correctly', () => {
    render(<AuthorAutocomplete {...defaultProps} />);

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

    render(<AuthorAutocomplete {...defaultProps} />);

    const input = screen.getByTestId('autocomplete-input');
    
    fireEvent.change(input, { target: { value: 'Jane' } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

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
  });
});