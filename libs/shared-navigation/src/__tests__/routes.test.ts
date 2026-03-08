import {
  APP_ROUTES,
  buildPath,
  buildUrl,
  createRoute,
  generateBreadcrumb,
  getAuthRoutes,
  getPublicRoutes,
  isValidRoute,
  matchRoute,
} from '../routes';

describe('shared-navigation routes', () => {
  test('buildPath replaces params in patterns', () => {
    expect(buildPath('/books/:bookId/edit', { bookId: 12 })).toBe('/books/12/edit');
  });

  test('createRoute uses APP_ROUTES metadata and builds path', () => {
    const route = createRoute('book-details', { bookId: 42 });
    expect(route.name).toBe('book-details');
    expect(route.path).toBe('/books/42');
    expect(route.metadata?.requiresAuth).toBe(true);
  });

  test('buildUrl encodes query parameters and supports baseUrl', () => {
    const url = buildUrl('search', undefined, { q: 'abc', page: 2 }, 'https://example.com/');
    expect(url).toBe('https://example.com/search?q=abc&page=2');
  });

  test('buildUrl omits undefined query params and handles array values', () => {
    const url = buildUrl('search', undefined, { q: 'abc', page: undefined, tags: ['a', 'b'] });
    expect(url).toBe('/search?q=abc&tags=a%2Cb');
  });

  test('matchRoute parses params and query values', () => {
    const match = matchRoute('/books/10?foo=1&bar=baz');
    expect(match?.route.name).toBe('book-details');
    expect(match?.params['bookId']).toBe(10);
    expect(match?.query['foo']).toBe(1);
    expect(match?.query['bar']).toBe('baz');
  });

  test('matchRoute returns null for unknown paths', () => {
    expect(matchRoute('/nope')).toBeNull();
    expect(matchRoute('/books/10/extra')).toBeNull();
  });

  test('isValidRoute checks known route names', () => {
    expect(isValidRoute('home')).toBe(true);
    expect(isValidRoute('does-not-exist')).toBe(false);
  });

  test('getAuthRoutes and getPublicRoutes partition routes by requiresAuth', () => {
    const authRoutes = getAuthRoutes();
    const publicRoutes = getPublicRoutes();

    expect(authRoutes).toContain('books');
    expect(authRoutes).toContain('profile');
    expect(authRoutes).toContain('account');
    expect(publicRoutes).toContain('home');
    expect(publicRoutes).toContain('search');
    expect(publicRoutes).toContain('forgot-password');
    expect(authRoutes).not.toContain('home');
  });

  test('generateBreadcrumb builds a stable route hierarchy', () => {
    const route = createRoute('book-edit', { bookId: 1 });
    expect(route.metadata?.breadcrumb).toBe(APP_ROUTES['book-edit'].metadata?.breadcrumb);

    const crumbs = generateBreadcrumb(route);
    expect(crumbs).toEqual(['Home', 'Books', 'Book Details', 'Edit']);
  });

  test('generateBreadcrumb handles auth routes and home', () => {
    expect(generateBreadcrumb(createRoute('home'))).toEqual(['Home']);
    expect(generateBreadcrumb(createRoute('login'))).toEqual(['Home', 'Auth', 'Login']);
    expect(generateBreadcrumb(createRoute('reset-password'))).toEqual([
      'Home',
      'Auth',
      'Reset Password',
    ]);
  });
});
