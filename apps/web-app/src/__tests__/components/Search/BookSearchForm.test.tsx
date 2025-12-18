import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BookSearchForm } from '../../../components/Search/BookSearchForm';
import { useCategories } from '../../../hooks/useCategories';
import { setupMuiMock } from '../../test-utils/setupMuiMock';

vi.mock('../../../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

vi.mock('../../../components/Search/AuthorAutocomplete', () => ({
  AuthorAutocomplete: ({ value, onChange, placeholder, disabled, size }: any) => (
    <div data-testid="author-autocomplete">
      <input
        data-testid="author-input"
        placeholder={placeholder}
        disabled={disabled}
        data-size={size}
        onChange={() => onChange({ id: 1, name: 'Test', surname: 'Author' })}
      />
      <div data-testid="author-value">{value ? `${value.name} ${value.surname}` : ''}</div>
    </div>
  ),
}));

setupMuiMock();

vi.mock('@mui/icons-material/Search', () => ({
  default: () => <div data-testid="search-icon">Search</div>,
}));

vi.mock('@mui/icons-material/ExpandMore', () => ({
  default: () => <div data-testid="expand-more-icon">Expand</div>,
}));

vi.mock('@mui/icons-material/Clear', () => ({
  default: () => <div data-testid="clear-icon">Clear</div>,
}));

vi.mock('@mui/icons-material/Warning', () => ({
  default: () => <div data-testid="warning-icon">Warning</div>,
}));

const mockUseCategories = vi.mocked(useCategories);

const mockCategories = [
  { id: 1, name: 'Fiction' },
  { id: 2, name: 'Non-Fiction' },
  { id: 3, name: 'Science Fiction' },
];

const getSearchInput = () =>
  screen.getByPlaceholderText('Search by title, author, ISBN...');

const getSearchButton = () =>
  screen.getByRole('button', { name: /Search/i });

const openAdvancedFilters = () => {
  fireEvent.click(screen.getByRole('button', { name: /Advanced Filters/i }));
};

const normalizeSelectText = (element: HTMLElement) =>
  element.textContent?.replace(/\u200b/g, '').trim() ?? '';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const openSelectListbox = async (labelText: string) => {
  const trigger = screen.getByLabelText(labelText);
  fireEvent.mouseDown(trigger);
  const nameMatcher = new RegExp(`^${escapeRegExp(labelText)}$`, 'i');
  return await screen.findByRole('listbox', { name: nameMatcher });
};

const selectOption = async (labelText: string, optionText: string | RegExp) => {
  const listbox = await openSelectListbox(labelText);
  const matcher =
    typeof optionText === 'string'
      ? new RegExp(`^${escapeRegExp(optionText)}$`, 'i')
      : optionText;
  const option = within(listbox).getByRole('option', { name: matcher });
  fireEvent.click(option);
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
};

const getSelectDisplayText = (labelText: string) => {
  const trigger = screen.getByLabelText(labelText);
  return normalizeSelectText(trigger);
};

describe('BookSearchForm', () => {
  const mockOnSearch = vi.fn();
  const defaultProps = { onSearch: mockOnSearch };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCategories.mockReturnValue({
      categories: mockCategories,
      loading: false,
    });
  });

  test('renders search form elements', () => {
    render(<BookSearchForm {...defaultProps} />);

    expect(getSearchInput()).toBeInTheDocument();
    expect(getSearchButton()).toBeInTheDocument();
    expect(screen.getAllByText('Search').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: /Advanced Filters/i })).toBeInTheDocument();
  });

  test('handles search input changes', () => {
    render(<BookSearchForm {...defaultProps} />);

    const searchInput = getSearchInput();
    fireEvent.change(searchInput, { target: { value: 'Harry Potter' } });
    expect(searchInput).toHaveValue('Harry Potter');
  });

  test('shows initial query when provided', () => {
    render(<BookSearchForm {...defaultProps} initialQuery="Initial Query" />);

    expect(getSearchInput()).toHaveValue('Initial Query');
  });

  test('calls onSearch when form is submitted with valid query', () => {
    render(<BookSearchForm {...defaultProps} />);

    const searchInput = getSearchInput();
    fireEvent.change(searchInput, { target: { value: 'Test Book' } });
    fireEvent.click(getSearchButton());

    expect(mockOnSearch).toHaveBeenCalledWith('Test Book', {});
  });

  test('prevents submission with query shorter than 2 characters', async () => {
    render(<BookSearchForm {...defaultProps} />);

    fireEvent.change(getSearchInput(), { target: { value: 'T' } });
    fireEvent.click(getSearchButton());

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Please enter at least 2 characters/i);
    });
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  test('allows submission with filters but no query', async () => {
    render(<BookSearchForm {...defaultProps} />);

    openAdvancedFilters();
    await selectOption('Category', 'Fiction');
    fireEvent.click(getSearchButton());

    expect(mockOnSearch).toHaveBeenCalledWith('', { categoryId: 1 });
  });

  test('toggles advanced filters visibility', async () => {
    render(<BookSearchForm {...defaultProps} />);

    const categorySelect = screen.getByLabelText('Category');
    expect(categorySelect).not.toBeVisible();

    openAdvancedFilters();

    await waitFor(() => {
      expect(screen.getByLabelText('Category')).toBeVisible();
    });
  });

  test('handles category selection', async () => {
    render(<BookSearchForm {...defaultProps} />);

    openAdvancedFilters();
    await selectOption('Category', 'Non-Fiction');
    await waitFor(() => {
      expect(getSelectDisplayText('Category')).toBe('Non-Fiction');
    });
  });

  test('handles reading status selection', async () => {
    render(<BookSearchForm {...defaultProps} />);

    openAdvancedFilters();
    await selectOption('Reading Status', 'Finished');
    await waitFor(() => {
      expect(getSelectDisplayText('Reading Status')).toBe('Finished');
    });
  });

  test('handles sort by selection', async () => {
    render(<BookSearchForm {...defaultProps} />);

    openAdvancedFilters();
    await selectOption('Sort By', 'Author (A-Z)');
    await waitFor(() => {
      expect(getSelectDisplayText('Sort By')).toBe('Author (A-Z)');
    });
  });

  test('handles author selection', () => {
    render(<BookSearchForm {...defaultProps} />);

    openAdvancedFilters();
    fireEvent.change(screen.getByTestId('author-input'), { target: { value: 'test' } });
    expect(screen.getByTestId('author-value')).toHaveTextContent('Test Author');
  });

  test('clears all filters and query', async () => {
    render(<BookSearchForm {...defaultProps} initialQuery="test query" />);

    expect(getSearchInput()).toHaveValue('test query');
    openAdvancedFilters();
    await selectOption('Category', 'Fiction');

    fireEvent.click(screen.getByRole('button', { name: /Clear all/i }));
    expect(getSearchInput()).toHaveValue('');

    const listbox = await openSelectListbox('Category');
    const selectedOption = within(listbox).getByRole('option', { selected: true });
    expect(selectedOption).toHaveTextContent('All Categories');
    fireEvent.click(selectedOption);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  test('shows loading state', () => {
    render(<BookSearchForm {...defaultProps} loading />);

    expect(getSearchButton()).toBeDisabled();
    expect(getSearchInput()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Searching...' })).toBeDisabled();
  });

  test('clears validation error when typing in search box', async () => {
    render(<BookSearchForm {...defaultProps} />);

    fireEvent.change(getSearchInput(), { target: { value: 'T' } });
    fireEvent.click(getSearchButton());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(getSearchInput(), { target: { value: 'Test' } });
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  test('clears validation error when changing filters', async () => {
    render(<BookSearchForm {...defaultProps} />);

    fireEvent.change(getSearchInput(), { target: { value: 'T' } });
    fireEvent.click(getSearchButton());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    openAdvancedFilters();
    await selectOption('Category', 'Fiction');
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  test('handles categories loading state', () => {
    mockUseCategories.mockReturnValue({ categories: [], loading: true });
    render(<BookSearchForm {...defaultProps} />);

    openAdvancedFilters();
    const categorySelect = screen.getByLabelText('Category');
    expect(categorySelect).toHaveAttribute('aria-disabled', 'true');
  });

  test('sorts categories alphabetically', async () => {
    mockUseCategories.mockReturnValue({
      categories: [
        { id: 1, name: 'Zebra' },
        { id: 2, name: 'Apple' },
        { id: 3, name: 'Banana' },
      ],
      loading: false,
    });

    render(<BookSearchForm {...defaultProps} />);
    openAdvancedFilters();

    const listbox = await openSelectListbox('Category');
    const optionTexts = within(listbox)
      .getAllByRole('option')
      .map((option) => option.textContent?.trim());
    expect(optionTexts.slice(1)).toEqual(['Apple', 'Banana', 'Zebra']);
    const closeOption = within(listbox).getByRole('option', { name: /All Categories/i });
    fireEvent.click(closeOption);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  test('handles form submission via button click', () => {
    render(<BookSearchForm {...defaultProps} />);

    fireEvent.change(getSearchInput(), { target: { value: 'Test Book' } });
    fireEvent.click(getSearchButton());
    expect(mockOnSearch).toHaveBeenCalledWith('Test Book', {});
  });

  test('shows clear button only when form has values', () => {
    render(<BookSearchForm {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /Clear all/i })).not.toBeInTheDocument();
    fireEvent.change(getSearchInput(), { target: { value: 'test' } });
    expect(screen.getByRole('button', { name: /Clear all/i })).toBeInTheDocument();
  });

  test('includes all form values in search call', async () => {
    render(<BookSearchForm {...defaultProps} />);

    fireEvent.change(getSearchInput(), { target: { value: 'test query' } });
    openAdvancedFilters();
    await selectOption('Category', 'Fiction');
    await selectOption('Reading Status', 'Finished');
    await selectOption('Sort By', 'Author (A-Z)');
    fireEvent.click(getSearchButton());

    expect(mockOnSearch).toHaveBeenCalledWith('test query', {
      categoryId: 1,
      status: 'finished',
      sortBy: 'author',
    });
  });

  test('renders advanced filter controls when requested', () => {
    render(<BookSearchForm {...defaultProps} />);
    openAdvancedFilters();

    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Reading Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
    expect(screen.getByTestId('author-autocomplete')).toBeInTheDocument();
  });

  test('renders search input placeholder', () => {
    render(<BookSearchForm {...defaultProps} />);
    expect(getSearchInput()).toHaveAttribute('placeholder', 'Search by title, author, ISBN...');
  });

  test('renders search icon and expand icon', () => {
    render(<BookSearchForm {...defaultProps} />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('expand-more-icon')).toBeInTheDocument();
  });

  test('handles component mount and unmount cleanly', () => {
    const { unmount } = render(<BookSearchForm {...defaultProps} />);
    expect(() => unmount()).not.toThrow();
  });
});
