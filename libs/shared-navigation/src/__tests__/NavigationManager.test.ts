import { NavigationManager } from '../NavigationManager';
import type { NavigationAdapter, NavigationEvent, Route } from '../types';

const createAdapter = (overrides: Partial<NavigationAdapter> = {}): NavigationAdapter => {
  let canBack = false;
  let canForward = false;

  const adapter: NavigationAdapter = {
    navigate: jest.fn(async () => {}),
    goBack: jest.fn(async () => {}),
    goForward: jest.fn(async () => {}),
    getCurrentRoute: jest.fn(() => null),
    canGoBack: jest.fn(() => canBack),
    canGoForward: jest.fn(() => canForward),
    ...overrides,
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

describe('NavigationManager', () => {
  test('navigate builds a route and delegates to adapter.navigate', async () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);

    const events: NavigationEvent[] = [];
    manager.addEventListener((event) => events.push(event));

    await manager.navigate('book-details', { bookId: 123 }, { q: 'abc' }, { replace: true });

    expect(adapter.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'book-details',
        path: '/books/123',
        params: { bookId: 123 },
        query: { q: 'abc' },
      }),
      { replace: true }
    );
    expect(events.some((e) => e.type === 'NAVIGATE')).toBe(true);
  });

  test('navigate emits NAVIGATION_ERROR and rethrows on adapter errors', async () => {
    const adapter = createAdapter({
      navigate: jest.fn(async () => {
        throw new Error('fail');
      }),
    });
    const manager = new NavigationManager(adapter);

    const errors: Error[] = [];
    manager.addEventListener((event) => {
      if (event.type === 'NAVIGATION_ERROR') errors.push(event.error);
    });

    await expect(manager.navigate('home')).rejects.toThrow('fail');
    expect(errors[0]?.message).toBe('fail');
  });

  test('adapter route changes update navigation state and history', () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);

    (adapter as any).__setCanGoBack(true);
    (adapter as any).__setCanGoForward(false);

    const route: Route = { id: 'r1', name: 'home', path: '/', metadata: { breadcrumb: 'Home' } };
    adapter.onRouteChange?.(route);

    expect(manager.getCurrentRoute()).toEqual(route);
    expect(manager.getNavigationState().history).toHaveLength(1);
    expect(manager.canGoBack()).toBe(true);
    expect(manager.canGoForward()).toBe(false);
  });

  test('goBack and goForward enforce canGoBack/canGoForward', async () => {
    const adapter = createAdapter();
    const manager = new NavigationManager(adapter);

    await expect(manager.goBack()).rejects.toThrow('Cannot go back');
    await expect(manager.goForward()).rejects.toThrow('Cannot go forward');

    (adapter as any).__setCanGoBack(true);
    (adapter as any).__setCanGoForward(true);
    adapter.onRouteChange?.({ id: 'r1', name: 'home', path: '/' });

    await manager.goBack();
    await manager.goForward();
    expect(adapter.goBack).toHaveBeenCalled();
    expect(adapter.goForward).toHaveBeenCalled();
  });

  test('role checks and guard helpers behave as expected', () => {
    const manager = new NavigationManager(createAdapter());

    expect(manager.hasRequiredRole(undefined, undefined)).toBe(true);
    expect(manager.hasRequiredRole(['admin'], [])).toBe(false);
    expect(manager.hasRequiredRole(['admin'], ['user', 'admin'])).toBe(true);

    const publicRoute: Route = { id: 'r', name: 'home', path: '/', metadata: { requiresAuth: false } };
    const protectedRoute: Route = { id: 'r', name: 'books', path: '/books', metadata: { requiresAuth: true } };
    const roleRoute: Route = {
      id: 'r',
      name: 'books',
      path: '/books',
      metadata: { allowedRoles: ['admin'] },
    };

    expect(manager.canAccessRoute(publicRoute, ['user'])).toBe(true);
    expect(manager.canAccessRoute(protectedRoute, ['user'])).toBe(true);
    expect(manager.canAccessRoute(roleRoute, ['user'])).toBe(false);
    expect(manager.canAccessRoute(roleRoute, ['admin'])).toBe(true);
  });
});

