import { act, renderHook } from '@testing-library/react';
import { NavigationManager } from '../NavigationManager';
import type { NavigationAdapter, Route } from '../types';
import {
  setNavigationManager,
  useAuthGuard,
  useBookId,
  useCategoryId,
  useAuthorId,
  useBreadcrumb,
  useCurrentRoute,
  useDeepLink,
  useIsAuthRequired,
  useIsRoute,
  useNavigation,
  useNavigationEvents,
  useNavigationGuard,
  useNavigationParams,
  useNavigationState,
  useQueryParams,
  useSearchQuery,
} from '../hooks';
import { createRoute } from '../routes';

const createAdapter = () => {
  let canBack = false;
  let canForward = false;

  const adapter: NavigationAdapter = {
    navigate: jest.fn(async () => {}),
    goBack: jest.fn(async () => {}),
    goForward: jest.fn(async () => {}),
    getCurrentRoute: jest.fn(() => null),
    canGoBack: jest.fn(() => canBack),
    canGoForward: jest.fn(() => canForward),
  };

  return Object.assign(adapter, {
    __setCanGoBack: (value: boolean) => {
      canBack = value;
    },
    __setCanGoForward: (value: boolean) => {
      canForward = value;
    },
  });
};

describe('shared-navigation hooks', () => {
  beforeEach(() => {
    setNavigationManager(null as unknown as NavigationManager);
  });

  test('useNavigation throws when NavigationManager is not set', () => {
    expect(() => renderHook(() => useNavigation())).toThrow(
      'NavigationManager not initialized. Call setNavigationManager first.'
    );
  });

  test('useCurrentRoute updates on ROUTE_CHANGED events', async () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    const { result } = renderHook(() => useCurrentRoute());
    expect(result.current).toBeNull();

    const route: Route = { id: 'r1', name: 'home', path: '/' };
    await act(async () => {
      adapter.onRouteChange?.(route);
    });

    expect(result.current).toEqual(route);
  });

  test('useNavigation delegates to NavigationManager methods', async () => {
    const adapter = createAdapter();
    (adapter as any).__setCanGoBack(true);
    (adapter as any).__setCanGoForward(true);

    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    const { result } = renderHook(() => useNavigation());

    await act(async () => {
      adapter.onRouteChange?.(createRoute('home'));
      await result.current.navigateHome();
      await result.current.navigateToBook(10);
      await result.current.navigateToEditBook(11);
      await result.current.navigateToCategory(2, 'Fiction');
      await result.current.navigateToAuthor(3, 'Author');
      await result.current.navigateToSearch('abc');
      await result.current.navigateToAuth('register');
      await result.current.goBack();
      await result.current.goForward();
    });

    expect(adapter.navigate).toHaveBeenCalledWith(expect.objectContaining({ name: 'home', path: '/' }), undefined);
    expect(adapter.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'book-details', path: '/books/10' }),
      undefined
    );
    expect(adapter.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'book-edit', path: '/books/11/edit' }),
      undefined
    );
    expect(adapter.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'category-books', path: '/categories/2', params: { categoryId: 2, categoryName: 'Fiction' } }),
      undefined
    );
    expect(adapter.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'author-books', path: '/authors/3', params: { authorId: 3, authorName: 'Author' } }),
      undefined
    );
    expect(adapter.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'search', path: '/search', query: { q: 'abc' } }),
      undefined
    );
    expect(adapter.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'register', path: '/auth/register' }),
      undefined
    );
    expect(adapter.goBack).toHaveBeenCalled();
    expect(adapter.goForward).toHaveBeenCalled();

    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });

  test('useNavigationState/useNavigationParams/useQueryParams update from current route', async () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    const route = createRoute('book-details', { bookId: 42 }, { q: 'hello' });

    const { result: stateHook } = renderHook(() => useNavigationState());
    const { result: paramsHook } = renderHook(() => useNavigationParams());
    const { result: queryHook } = renderHook(() => useQueryParams());
    const { result: bookIdHook } = renderHook(() => useBookId());
    const { result: searchQueryHook } = renderHook(() => useSearchQuery());

    await act(async () => {
      adapter.onRouteChange?.(route);
    });

    expect(stateHook.current.currentRoute?.name).toBe('book-details');
    expect(paramsHook.current).toEqual({ bookId: 42 });
    expect(queryHook.current).toEqual({ q: 'hello' });
    expect(bookIdHook.current).toBe(42);
    expect(searchQueryHook.current).toBe('hello');
  });

  test('useCategoryId and useAuthorId extract route params', async () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    const { result: categoryId } = renderHook(() => useCategoryId());
    const { result: authorId } = renderHook(() => useAuthorId());

    await act(async () => {
      adapter.onRouteChange?.(createRoute('category-books', { categoryId: 7 }));
    });
    expect(categoryId.current).toBe(7);

    await act(async () => {
      adapter.onRouteChange?.(createRoute('author-books', { authorId: 9 }));
    });
    expect(authorId.current).toBe(9);
  });

  test('useIsRoute and useIsAuthRequired reflect route metadata', async () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    const { result: isBooks } = renderHook(() => useIsRoute('books'));
    const { result: authRequired } = renderHook(() => useIsAuthRequired());

    await act(async () => {
      adapter.onRouteChange?.(createRoute('books'));
    });

    expect(isBooks.current).toBe(true);
    expect(authRequired.current).toBe(true);
  });

  test('useNavigationEvents attaches listener and receives events', async () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    const listener = jest.fn();
    renderHook(() => useNavigationEvents(listener));

    await act(async () => {
      adapter.onRouteChange?.(createRoute('home'));
    });

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'ROUTE_CHANGED' }));
  });

  test('useBreadcrumb returns breadcrumbs for current route', async () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    const { result } = renderHook(() => useBreadcrumb());

    await act(async () => {
      adapter.onRouteChange?.(createRoute('book-edit', { bookId: 1 }));
    });

    expect(result.current).toEqual(['Home', 'Books', 'Book Details', 'Edit']);
  });

  test('useNavigationGuard redirects when guard denies navigation', async () => {
    jest.useFakeTimers();
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    renderHook(() =>
      useNavigationGuard(async (route: Route) => route.name !== 'books', 'home')
    );

    await act(async () => {
      await manager.navigate('books');
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(adapter.navigate).toHaveBeenCalledWith(expect.objectContaining({ name: 'books' }), undefined);
    expect(adapter.navigate).toHaveBeenCalledWith(expect.objectContaining({ name: 'home' }), undefined);

    jest.useRealTimers();
  });

  test('useAuthGuard redirects protected routes to login', async () => {
    jest.useFakeTimers();
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);
    setNavigationManager(manager);

    renderHook(() => useAuthGuard());

    await act(async () => {
      await manager.navigate('books');
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(adapter.navigate).toHaveBeenCalledWith(expect.objectContaining({ name: 'books' }), undefined);
    expect(adapter.navigate).toHaveBeenCalledWith(expect.objectContaining({ name: 'login' }), undefined);

    jest.useRealTimers();
  });

  test('useDeepLink parses URLs and merges query params', () => {
    const { result } = renderHook(() => useDeepLink());
    const route = result.current.parseDeepLink('https://example.com/books/10?q=abc&page=2');

    expect(route?.name).toBe('book-details');
    expect(route?.params?.['bookId']).toBe(10);
    expect(route?.query).toEqual({ q: 'abc', page: 2 });
  });

  test('useDeepLink createDeepLink builds a URL', () => {
    const { result } = renderHook(() => useDeepLink());
    expect(result.current.createDeepLink('book-details', { bookId: 2 }, { foo: 'bar' })).toBe('/books/2?foo=bar');
  });

  test('useDeepLink returns null for invalid URLs', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useDeepLink());
    expect(result.current.parseDeepLink('not a url')).toBeNull();

    expect(errorSpy).toHaveBeenCalledWith('Error parsing deep link:', expect.anything());
    errorSpy.mockRestore();
  });
});
