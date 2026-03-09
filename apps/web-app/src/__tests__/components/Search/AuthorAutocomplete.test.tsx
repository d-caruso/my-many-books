import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AuthorAutocomplete } from '../../../components/Search/AuthorAutocomplete';
import { ApiProvider } from '../../../contexts/ApiContext';
import { Author } from '../../../types';

vi.mock('@mui/material', () => {
  const createSimpleWrapper = (testId: string) => {
    const Wrapper = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('div', { 'data-testid': testId, ...props }, children);
    Wrapper.displayName = testId;
    return Wrapper;
  };

  const TextField = ({
    label,
    value = '',
    inputProps = {} as Record<string, unknown>,
    InputProps = {} as { endAdornment?: React.ReactNode },
    placeholder,
    disabled,
    size,
    ...rest
  }: {
    label?: string;
    value?: string;
    inputProps?: Record<string, unknown>;
    InputProps?: { endAdornment?: React.ReactNode };
    placeholder?: string;
    disabled?: boolean;
    size?: string;
    [key: string]: unknown;
  }) => {
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
    disabled,
    renderInput,
    renderOption,
    getOptionLabel,
    onChange,
    onInputChange,
    onOpen,
    onClose,
    ListboxProps,
    size,
  }: {
    value?: unknown;
    inputValue?: string;
    options?: unknown[];
    open?: boolean;
    disabled?: boolean;
    renderInput: (params: unknown) => React.ReactNode;
    renderOption?: (props: unknown, option: unknown, state: unknown) => React.ReactNode;
    getOptionLabel?: (option: unknown) => string;
    onChange?: (event: unknown, value: unknown, reason: string, details?: unknown) => void;
    onInputChange?: (event: unknown, value: string, reason: string) => void;
    onOpen?: () => void;
    onClose?: (event: unknown, reason: string) => void;
    ListboxProps?: Record<string, unknown>;
    size?: string;
  }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputChange?.(e, e.target.value, 'input');
    };

    const handleFocus = () => onOpen?.();
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      onInputChange?.(e, '', 'blur');
      onClose?.(e, 'blur');
    };

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
            {options.map((option, index: number) => {
              const optionId = (option as Record<string, unknown>).id;
              const optionProps = {
                key: optionId != null ? String(optionId) : index,
                'data-testid': `option-${index}`,
                onClick: () => {
                  onInputChange?.(null, getOptionLabel?.(option) ?? '', 'reset');
                  onChange?.(null, option, 'selectOption', { option });
                  onClose?.(null, 'selectOption');
                },
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

  const Typography = ({ children, variant, ...props }: { children?: React.ReactNode; variant?: string; [key: string]: unknown }) => {
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

const mockApiService = {
  searchAuthors: vi.fn(),
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
};

const mockAuthors: Author[] = [
  { id: 3, name: 'Ernest', surname: 'Hemingway', nationality: 'American', userId: 2 },
  { id: 1, name: 'Jane', surname: 'Austen', nationality: 'British', userId: 1 },
  { id: 2, name: 'Charles', surname: 'Dickens', nationality: 'British', userId: 1 },
];

describe('AuthorAutocomplete', () => {
  const mockOnChange = vi.fn();

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(<ApiProvider apiService={mockApiService}>{ui}</ApiProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.getAuthors.mockResolvedValue(mockAuthors);
    mockApiService.searchAuthors.mockResolvedValue([]);
  });

  test('preloads authors on mount and does not use server search while typing', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockApiService.getAuthors).toHaveBeenCalledTimes(1);
    });

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Jane' } });

    expect(mockApiService.searchAuthors).not.toHaveBeenCalled();
    expect(screen.getByTestId('open-state')).toHaveTextContent('open');
  });

  test('shows loading state during preload', async () => {
    let resolveAuthors!: (value: Author[]) => void;
    mockApiService.getAuthors.mockReturnValue(
      new Promise<Author[]>((resolve) => {
        resolveAuthors = resolve;
      })
    );

    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
    });
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();

    resolveAuthors(mockAuthors);

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading');
    });
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  test('renders preloaded authors sorted alphabetically by surname', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);
    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('option-0')).toHaveTextContent('Austen, Jane');
    expect(screen.getByTestId('option-1')).toHaveTextContent('Dickens, Charles');
    expect(screen.getByTestId('option-2')).toHaveTextContent('Hemingway, Ernest');
  });

  test('filters preloaded authors locally by name', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);
    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'char' } });

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Dickens, Charles')).toBeInTheDocument();
    expect(screen.queryByText('Austen, Jane')).not.toBeInTheDocument();
    expect(screen.queryByText('Hemingway, Ernest')).not.toBeInTheDocument();
  });

  test('filters preloaded authors locally by surname-first input', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);
    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'austen jan' } });

    await waitFor(() => {
      expect(screen.getByText('Austen, Jane')).toBeInTheDocument();
    });
    expect(screen.queryByText('Dickens, Charles')).not.toBeInTheDocument();
  });

  test('filters preloaded authors by userId when userIdFilter is provided', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} userIdFilter={1} />);
    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Austen, Jane')).toBeInTheDocument();
    expect(screen.getByText('Dickens, Charles')).toBeInTheDocument();
    expect(screen.queryByText('Hemingway, Ernest')).not.toBeInTheDocument();
  });

  test('reloads preloaded authors when reloadTrigger changes', async () => {
    const newAuthor: Author = { id: 4, name: 'Virginia', surname: 'Woolf', nationality: 'British' };
    mockApiService.getAuthors
      .mockResolvedValueOnce(mockAuthors)
      .mockResolvedValueOnce([...mockAuthors, newAuthor]);

    const { rerender } = renderWithProvider(
      <AuthorAutocomplete onChange={mockOnChange} reloadTrigger={0} />
    );

    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalledTimes(1));

    fireEvent.focus(screen.getByTestId('autocomplete-input'));
    await waitFor(() => expect(screen.getByTestId('options-list')).toBeInTheDocument());
    expect(screen.queryByText('Woolf, Virginia')).not.toBeInTheDocument();

    rerender(
      <ApiProvider apiService={mockApiService}>
        <AuthorAutocomplete onChange={mockOnChange} reloadTrigger={1} />
      </ApiProvider>
    );

    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalledTimes(2));
    fireEvent.focus(screen.getByTestId('autocomplete-input'));
    await waitFor(() => expect(screen.getByText('Woolf, Virginia')).toBeInTheDocument());
  });

  test('calls onChange when selecting an author', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);
    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('option-0'));

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Jane' }));
  });

  test('keeps dropdown closed after selecting an author and blurring the input', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);
    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('option-0'));

    expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
    expect(screen.getByTestId('autocomplete-input')).toHaveValue('Austen, Jane');

    fireEvent.blur(screen.getByTestId('autocomplete-input'));

    expect(screen.getByTestId('open-state')).toHaveTextContent('closed');
    expect(screen.getByTestId('autocomplete-input')).toHaveValue('Austen, Jane');
  });

  test('handles preload errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockApiService.getAuthors.mockRejectedValue(new Error('preload failed'));

    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Author preload failed:', expect.any(Error));
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading');
    consoleErrorSpy.mockRestore();
  });

  test('clearing input keeps dropdown open and shows full preloaded list', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);
    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());

    const input = screen.getByTestId('autocomplete-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Jane' } });

    await waitFor(() => {
      expect(screen.getByText('Austen, Jane')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: '' } });

    expect(screen.getByTestId('open-state')).toHaveTextContent('open');
    expect(screen.getByTestId('option-0')).toHaveTextContent('Austen, Jane');
    expect(screen.getByTestId('option-1')).toHaveTextContent('Dickens, Charles');
    expect(screen.getByTestId('option-2')).toHaveTextContent('Hemingway, Ernest');
  });

  test('renders author nationality when available', async () => {
    renderWithProvider(<AuthorAutocomplete onChange={mockOnChange} />);
    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());

    fireEvent.focus(screen.getByTestId('autocomplete-input'));

    await waitFor(() => {
      expect(screen.getByTestId('options-list')).toBeInTheDocument();
    });

    expect(screen.getAllByText('British')).toHaveLength(2);
    expect(screen.getByText('American')).toBeInTheDocument();
  });

  test('renders with custom placeholder and size and supports disabled state', async () => {
    renderWithProvider(
      <AuthorAutocomplete
        onChange={mockOnChange}
        placeholder="Custom placeholder"
        size="small"
        disabled
      />
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    const textField = screen.getByTestId('text-field');
    const input = within(textField).getByRole('textbox');
    expect(input).toHaveAttribute('data-size', 'small');
    expect(input).toBeDisabled();

    await waitFor(() => expect(mockApiService.getAuthors).toHaveBeenCalled());
  });
});
