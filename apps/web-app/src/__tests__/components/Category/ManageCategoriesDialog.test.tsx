import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ManageCategoriesDialog } from '../../../components/Category/ManageCategoriesDialog';
import { enCommon, enDialogs } from '@my-many-books/shared-i18n';

const mockCategoryApi = {
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
};

const mockApiContext = { categoryAPI: mockCategoryApi };

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
      common: enCommon,
      dialogs: enDialogs,
    },
  },
  interpolation: { escapeValue: false },
});

const renderDialog = (props: Partial<React.ComponentProps<typeof ManageCategoriesDialog>> = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <ManageCategoriesDialog open onClose={vi.fn()} {...props} />
    </I18nextProvider>
  );

describe('ManageCategoriesDialog', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(() => {
    mockCategoryApi.getCategories.mockReset();
    mockCategoryApi.createCategory.mockReset();
    mockCategoryApi.updateCategory.mockReset();
    mockCategoryApi.deleteCategory.mockReset();
  });

  test('loads categories and updates a category', async () => {
    mockCategoryApi.getCategories.mockResolvedValue([
      { id: 2, name: 'Mystery' },
      { id: 1, name: 'Classics' },
    ]);
    mockCategoryApi.updateCategory.mockResolvedValue({ id: 2, name: 'Mystery & Crime' });

    const onCategoryUpdated = vi.fn();
    renderDialog({ onCategoryUpdated });

    expect(await screen.findByText('Classics')).toBeInTheDocument();
    expect(screen.getByText('Mystery')).toBeInTheDocument();

    const mysteryRow = screen.getByText('Mystery').closest('li');
    expect(mysteryRow).not.toBeNull();
    fireEvent.click(within(mysteryRow as HTMLElement).getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.change(screen.getByLabelText('Category name'), {
      target: { value: 'Mystery & Crime' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save category' }));

    await waitFor(() => {
      expect(mockCategoryApi.updateCategory).toHaveBeenCalledWith(2, { name: 'Mystery & Crime' });
    });
    expect(onCategoryUpdated).toHaveBeenCalledWith({ id: 2, name: 'Mystery & Crime' });
  });

  test('marks the dialog root with the guided tour target id', async () => {
    mockCategoryApi.getCategories.mockResolvedValue([]);

    renderDialog();

    await waitFor(() => {
      expect(mockCategoryApi.getCategories).toHaveBeenCalled();
    });
    expect(document.querySelector('[data-tour-id="entity-manage-dialog"]')).not.toBeNull();
  });

  test('shows conflict error when deleting a category used by books', async () => {
    mockCategoryApi.getCategories.mockResolvedValue([{ id: 1, name: 'Classics' }]);
    mockCategoryApi.deleteCategory.mockRejectedValue({
      response: { status: 409, data: { error: { code: 'CATEGORY_HAS_BOOKS' } } },
    });

    renderDialog();

    expect(await screen.findByText('Classics')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete category' }));

    expect(
      await screen.findByText(testI18n.t('dialogs:category.delete_blocked_has_books'))
    ).toBeInTheDocument();
  });
});
