import { act, renderHook, waitFor } from '@testing-library/react';
import { useManageCategories } from '../useManageCategories';

const now = new Date().toISOString();

describe('useManageCategories', () => {
  it('auto-loads and sorts categories by name', async () => {
    const api = {
      getCategories: jest.fn().mockResolvedValue([
        { id: 2, name: 'Zed', creationDate: now, updateDate: now },
        { id: 1, name: 'Alpha', creationDate: now, updateDate: now },
      ]),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    };

    const { result } = renderHook(() => useManageCategories(api));

    await waitFor(() => expect(api.getCategories).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.categories.map((c) => c.name)).toEqual(['Alpha', 'Zed']);
  });

  it('creates category with trimmed name and updates local list', async () => {
    const api = {
      getCategories: jest.fn().mockResolvedValue([]),
      createCategory: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Fiction',
        creationDate: now,
        updateDate: now,
      }),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    };

    const { result } = renderHook(() => useManageCategories(api, { autoLoad: false }));

    await act(async () => {
      const response = await result.current.createCategory({ name: '  Fiction  ' });
      expect(response.success).toBe(true);
    });

    expect(api.createCategory).toHaveBeenCalledWith({ name: 'Fiction' });
    expect(result.current.categories.map((c) => c.name)).toEqual(['Fiction']);
  });

  it('maps delete conflict when category has books', async () => {
    const api = {
      getCategories: jest.fn().mockResolvedValue([
        { id: 1, name: 'Fiction', creationDate: now, updateDate: now },
      ]),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn().mockRejectedValue({
        response: { status: 409, data: { error: 'CATEGORY_HAS_BOOKS', message: 'Blocked' } },
      }),
    };

    const { result } = renderHook(() => useManageCategories(api));
    await waitFor(() => expect(result.current.categories).toHaveLength(1));

    await act(async () => {
      const response = await result.current.deleteCategory(1);
      expect(response.success).toBe(false);
    });

    expect(result.current.error?.code).toBe('HAS_BOOKS');
    expect(result.current.error?.i18nKey).toBe('dialogs:category.delete_blocked_has_books');
    expect(result.current.categories).toHaveLength(1);
  });
});
