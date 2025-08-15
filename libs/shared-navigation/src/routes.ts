/**
 * Route utilities and definitions
 * Platform-agnostic route matching and building
 */

import { Route, AppRoute, AppRouteName, RouteMatch, RouteParams, QueryParams } from './types';

// App route definitions
export const APP_ROUTES: Record<AppRouteName, AppRoute> = {
  home: {
    name: 'home',
    path: '/',
    metadata: {
      title: 'My Many Books - Home',
      breadcrumb: 'Home'
    }
  },
  
  books: {
    name: 'books',
    path: '/books',
    metadata: {
      title: 'My Books',
      breadcrumb: 'Books',
      requiresAuth: true
    }
  },
  
  'book-details': {
    name: 'book-details',
    path: '/books/:bookId',
    metadata: {
      title: 'Book Details',
      breadcrumb: 'Book Details',
      requiresAuth: true
    }
  },
  
  'book-edit': {
    name: 'book-edit',
    path: '/books/:bookId/edit',
    metadata: {
      title: 'Edit Book',
      breadcrumb: 'Edit',
      requiresAuth: true
    }
  },
  
  'book-add': {
    name: 'book-add',
    path: '/books/add',
    metadata: {
      title: 'Add Book',
      breadcrumb: 'Add Book',
      requiresAuth: true
    }
  },
  
  search: {
    name: 'search',
    path: '/search',
    metadata: {
      title: 'Search Books',
      breadcrumb: 'Search'
    }
  },
  
  categories: {
    name: 'categories',
    path: '/categories',
    metadata: {
      title: 'Categories',
      breadcrumb: 'Categories'
    }
  },
  
  'category-books': {
    name: 'category-books',
    path: '/categories/:categoryId',
    metadata: {
      title: 'Category Books',
      breadcrumb: 'Category'
    }
  },
  
  authors: {
    name: 'authors',
    path: '/authors',
    metadata: {
      title: 'Authors',
      breadcrumb: 'Authors'
    }
  },
  
  'author-books': {
    name: 'author-books',
    path: '/authors/:authorId',
    metadata: {
      title: 'Author Books',
      breadcrumb: 'Author'
    }
  },
  
  profile: {
    name: 'profile',
    path: '/profile',
    metadata: {
      title: 'Profile',
      breadcrumb: 'Profile',
      requiresAuth: true
    }
  },
  
  settings: {
    name: 'settings',
    path: '/settings',
    metadata: {
      title: 'Settings',
      breadcrumb: 'Settings',
      requiresAuth: true
    }
  },
  
  auth: {
    name: 'auth',
    path: '/auth',
    metadata: {
      title: 'Authentication',
      breadcrumb: 'Auth'
    }
  },
  
  login: {
    name: 'login',
    path: '/auth/login',
    metadata: {
      title: 'Login',
      breadcrumb: 'Login'
    }
  },
  
  register: {
    name: 'register',
    path: '/auth/register',
    metadata: {
      title: 'Register',
      breadcrumb: 'Register'
    }
  }
};

// Route creation utilities
export function createRoute(
  name: AppRouteName, 
  params?: RouteParams, 
  query?: QueryParams
): Route {
  const appRoute = APP_ROUTES[name];
  const path = buildPath(appRoute.path, params);
  
  return {
    id: generateRouteId(),
    path,
    name,
    params,
    query,
    metadata: appRoute.metadata
  };
}

export function createRoutes(routes: Array<{
  name: AppRouteName;
  params?: RouteParams;
  query?: QueryParams;
}>): Route[] {
  return routes.map(({ name, params, query }) => 
    createRoute(name, params, query)
  );
}

// Route matching
export function matchRoute(path: string, routeName?: AppRouteName): RouteMatch | null {
  const routes = routeName ? [APP_ROUTES[routeName]] : Object.values(APP_ROUTES);
  
  for (const appRoute of routes) {
    const match = matchRoutePattern(path, appRoute);
    if (match) {
      return match;
    }
  }
  
  return null;
}

export function matchRoutePattern(path: string, appRoute: AppRoute): RouteMatch | null {
  const pattern = appRoute.path;
  const patternParts = pattern.split('/');
  const pathParts = path.split('?')[0].split('/'); // Remove query string
  
  if (patternParts.length !== pathParts.length) {
    return null;
  }
  
  const params: RouteParams = {};
  let isExact = true;
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    
    if (patternPart.startsWith(':')) {
      // Parameter
      const paramName = patternPart.slice(1);
      params[paramName] = isNaN(Number(pathPart)) ? pathPart : Number(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }
  
  // Parse query parameters
  const query: QueryParams = {};
  const queryString = path.split('?')[1];
  if (queryString) {
    const queryParams = new URLSearchParams(queryString);
    for (const [key, value] of queryParams.entries()) {
      const numValue = Number(value);
      query[key] = isNaN(numValue) ? value : numValue;
    }
  }
  
  const route: Route = {
    id: generateRouteId(),
    path: buildPath(pattern, params),
    name: appRoute.name,
    params,
    query,
    metadata: appRoute.metadata
  };
  
  return {
    route,
    params,
    query,
    isExact
  };
}

// Route building utilities
export function buildPath(pattern: string, params?: RouteParams): string {
  if (!params) return pattern;
  
  let path = pattern;
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, String(value));
  });
  
  return path;
}

export function buildUrl(
  routeName: AppRouteName, 
  params?: RouteParams, 
  query?: QueryParams,
  baseUrl?: string
): string {
  const route = createRoute(routeName, params, query);
  let url = route.path;
  
  if (query && Object.keys(query).length > 0) {
    const queryString = new URLSearchParams(
      Object.entries(query).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    url += `?${queryString}`;
  }
  
  if (baseUrl) {
    url = baseUrl.replace(/\/$/, '') + url;
  }
  
  return url;
}

// Route validation
export function isValidRoute(routeName: string): routeName is AppRouteName {
  return routeName in APP_ROUTES;
}

export function getRouteMetadata(routeName: AppRouteName) {
  return APP_ROUTES[routeName].metadata;
}

// Breadcrumb generation
export function generateBreadcrumb(route: Route, params?: RouteParams): string[] {
  const breadcrumbs: string[] = [];
  
  // Always start with Home
  if (route.name !== 'home') {
    breadcrumbs.push('Home');
  }
  
  // Add intermediate breadcrumbs based on route hierarchy
  switch (route.name) {
    case 'book-details':
    case 'book-edit':
      breadcrumbs.push('Books');
      if (route.name === 'book-edit') {
        breadcrumbs.push('Book Details');
      }
      break;
      
    case 'book-add':
      breadcrumbs.push('Books');
      break;
      
    case 'category-books':
      breadcrumbs.push('Categories');
      break;
      
    case 'author-books':
      breadcrumbs.push('Authors');
      break;
      
    case 'login':
    case 'register':
      breadcrumbs.push('Auth');
      break;
  }
  
  // Add current route breadcrumb
  if (route.metadata?.breadcrumb) {
    breadcrumbs.push(route.metadata.breadcrumb);
  }
  
  return breadcrumbs;
}

// Helper functions
function generateRouteId(): string {
  return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Route guards and utilities
export function getAuthRoutes(): AppRouteName[] {
  return Object.entries(APP_ROUTES)
    .filter(([, route]) => route.metadata?.requiresAuth)
    .map(([name]) => name as AppRouteName);
}

export function getPublicRoutes(): AppRouteName[] {
  return Object.entries(APP_ROUTES)
    .filter(([, route]) => !route.metadata?.requiresAuth)
    .map(([name]) => name as AppRouteName);
}