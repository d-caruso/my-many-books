import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ManageAuthorsDialog } from '../../../components/Author/ManageAuthorsDialog';

const mockAuthorApi = {
  getAuthors: vi.fn(),
  createAuthor: vi.fn(),
  updateAuthor: vi.fn(),
  deleteAuthor: vi.fn(),
};

const mockApiContext = { authorAPI: mockAuthorApi };

vi.mock('../../../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
}));

const testI18n = i18n.createInstance();
const i18nReady = testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'dialogs'],
  defaultNS: 'common',
  resources: {
    en: {
      common: { edit: 'Edit', delete: 'Delete', cancel: 'Cancel', close: 'Close', retry: 'Try Again' },
      dialogs: {
        author: {
          manage_title: 'Manage authors',
          search_label: 'Filter authors',
          search_placeholder: 'Type name, surname or nationality',
          loading: 'Loading authors...',
          no_results: 'No authors found',
          name_label: 'Name',
          surname_label: 'Surname',
          nationality_label: 'Nationality',
          update_button: 'Save author',
          update_failed: 'Failed to update author. Please try again.',
          load_failed: 'Failed to load authors. Please try again.',
          delete_confirm_title: 'Delete author?',
          delete_confirm_message:
            'This will remove the author from your author list. This action cannot be undone.',
          delete_button: 'Delete author',
          delete_failed: 'Failed to delete author. Please try again.',
          delete_blocked_has_books:
            'This author cannot be deleted because it is already used by one or more books.',
        },
      },
    },
  },
  interpolation: { escapeValue: false },
});

const renderDialog = (props: Partial<React.ComponentProps<typeof ManageAuthorsDialog>> = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <ManageAuthorsDialog open onClose={vi.fn()} {...props} />
    </I18nextProvider>
  );

describe('ManageAuthorsDialog', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(() => {
    mockAuthorApi.getAuthors.mockReset();
    mockAuthorApi.createAuthor.mockReset();
    mockAuthorApi.updateAuthor.mockReset();
    mockAuthorApi.deleteAuthor.mockReset();
  });

  test('loads authors and updates an author', async () => {
    mockAuthorApi.getAuthors.mockResolvedValue([
      { id: 2, name: 'Virginia', surname: 'Woolf', nationality: 'British' },
      { id: 1, name: 'Jane', surname: 'Austen', nationality: 'British' },
    ]);
    mockAuthorApi.updateAuthor.mockResolvedValue({
      id: 2,
      name: 'Virginia',
      surname: 'WOOLF',
      nationality: 'British',
    });

    const onAuthorUpdated = vi.fn();
    renderDialog({ onAuthorUpdated });

    expect(await screen.findByText('Jane Austen')).toBeInTheDocument();
    expect(screen.getByText('Virginia Woolf')).toBeInTheDocument();

    const virginiaRow = screen.getByText('Virginia Woolf').closest('li');
    expect(virginiaRow).not.toBeNull();
    fireEvent.click(within(virginiaRow as HTMLElement).getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByLabelText('Surname'), { target: { value: 'WOOLF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save author' }));

    await waitFor(() => {
      expect(mockAuthorApi.updateAuthor).toHaveBeenCalledWith(2, {
        name: 'Virginia',
        surname: 'WOOLF',
        nationality: 'British',
      });
    });
    expect(onAuthorUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, surname: 'WOOLF' })
    );
  });

  test('shows conflict error when deleting an author used by books', async () => {
    mockAuthorApi.getAuthors.mockResolvedValue([
      { id: 2, name: 'Virginia', surname: 'Woolf', nationality: 'British' },
    ]);
    mockAuthorApi.deleteAuthor.mockRejectedValue({
      response: { status: 409, data: { error: 'AUTHOR_HAS_BOOKS' } },
    });

    renderDialog();

    expect(await screen.findByText('Virginia Woolf')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete author' }));

    expect(
      await screen.findByText(
        'This author cannot be deleted because it is already used by one or more books.'
      )
    ).toBeInTheDocument();
  });
});
