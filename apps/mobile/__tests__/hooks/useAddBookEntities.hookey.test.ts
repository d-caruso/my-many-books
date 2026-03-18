import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAddBookEntities } from '../../src/hooks/useAddBookEntities';
import { authorAPI, categoryAPI } from '../../src/services/api';
import { mobileHooks, MOBILE_EVENTS } from '../../src/services/hooks/mobileHooks';

jest.mock('../../src/services/api', () => ({
  authorAPI: {
    getAuthors: jest.fn(),
    createAuthor: jest.fn(),
  },
  categoryAPI: {
    getCategories: jest.fn(),
    createCategory: jest.fn(),
  },
}));

jest.mock('../../src/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('../../src/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
    RESOURCE_TYPES: actual.RESOURCE_TYPES,
  };
});

const mockAuthorAPI = authorAPI as jest.Mocked<typeof authorAPI>;
const mockCategoryAPI = categoryAPI as jest.Mocked<typeof categoryAPI>;
const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;

describe('useAddBookEntities hookey lifecycle emits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthorAPI.getAuthors.mockResolvedValue([]);
    mockCategoryAPI.getCategories.mockResolvedValue([]);
  });

  it('emits author create lifecycle events in the add-book flow', async () => {
    const createdAuthor = { id: 7, name: 'Jane', surname: 'Austen', nationality: 'British' };
    mockAuthorAPI.createAuthor.mockResolvedValue(createdAuthor as never);

    const { result } = renderHook(() => useAddBookEntities());

    await waitFor(() => {
      expect(mockAuthorAPI.getAuthors).toHaveBeenCalled();
      expect(mockCategoryAPI.getCategories).toHaveBeenCalled();
    });

    jest.clearAllMocks();
    mockAuthorAPI.createAuthor.mockResolvedValue(createdAuthor as never);
    mockAuthorAPI.getAuthors.mockResolvedValue([createdAuthor] as never);

    await act(async () => {
      await result.current.createAuthorAndSelect({
        name: 'Jane',
        surname: 'Austen',
        nationality: 'British',
      });
    });

    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.AUTHOR.CREATE.BEFORE,
      expect.objectContaining({
        resourceType: 'author',
        metadata: expect.objectContaining({
          name: 'Jane',
          surname: 'Austen',
          nationality: 'British',
        }),
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.AUTHOR.CREATE.AFTER,
      expect.objectContaining({
        resourceType: 'author',
        result: { author: createdAuthor },
      })
    );
  });

  it('emits category create lifecycle events in the add-book flow', async () => {
    const createdCategory = { id: 9, name: 'Fantasy' };
    mockCategoryAPI.createCategory.mockResolvedValue(createdCategory as never);

    const { result } = renderHook(() => useAddBookEntities());

    await waitFor(() => {
      expect(mockAuthorAPI.getAuthors).toHaveBeenCalled();
      expect(mockCategoryAPI.getCategories).toHaveBeenCalled();
    });

    jest.clearAllMocks();
    mockCategoryAPI.createCategory.mockResolvedValue(createdCategory as never);
    mockCategoryAPI.getCategories.mockResolvedValue([createdCategory] as never);

    await act(async () => {
      await result.current.createCategoryAndSelect({ name: 'Fantasy' });
    });

    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.CATEGORY.CREATE.BEFORE,
      expect.objectContaining({
        resourceType: 'category',
        metadata: { name: 'Fantasy' },
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.CATEGORY.CREATE.AFTER,
      expect.objectContaining({
        resourceType: 'category',
        result: { category: createdCategory },
      })
    );
  });
});
