/**
 * Platform-agnostic navigation types and interfaces
 */

export interface Route {
  id: string;
  path: string;
  name: string;
  params?: Record<string, string | number>;
  query?: Record<string, string | number>;
  metadata?: {
    title?: string;
    requiresAuth?: boolean;
    allowedRoles?: string[];
    breadcrumb?: string;
  };
}

export interface NavigationState {
  currentRoute: Route | null;
  previousRoute: Route | null;
  canGoBack: boolean;
  canGoForward: boolean;
  history: Route[];
}

export interface NavigationOptions {
  replace?: boolean;
  animate?: boolean;
  preserveParams?: boolean;
  clearHistory?: boolean;
}

export interface NavigationAdapter {
  // Platform-specific navigation implementation
  navigate(route: Route, options?: NavigationOptions): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  getCurrentRoute(): Route | null;
  canGoBack(): boolean;
  canGoForward(): boolean;
  
  // Event handlers
  onRouteChange?(route: Route): void;
  onNavigationError?(error: Error): void;
}

export interface RouteParams {
  [key: string]: string | number | undefined;
}

export interface QueryParams {
  [key: string]: string | number | string[] | undefined;
}

// Route matching result
export interface RouteMatch {
  route: Route;
  params: RouteParams;
  query: QueryParams;
  isExact: boolean;
}

// Navigation event types
export type NavigationEvent = 
  | { type: 'NAVIGATE'; route: Route; options?: NavigationOptions }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' }
  | { type: 'ROUTE_CHANGED'; route: Route }
  | { type: 'NAVIGATION_ERROR'; error: Error };

// App-specific route names (type-safe navigation)
export type AppRouteName = 
  | 'home'
  | 'books'
  | 'book-details'
  | 'book-edit'
  | 'book-add'
  | 'search'
  | 'categories'
  | 'category-books'
  | 'authors'
  | 'author-books'
  | 'profile'
  | 'settings'
  | 'auth'
  | 'login'
  | 'register';

// Route configuration for the app
export interface AppRoute extends Omit<Route, 'id' | 'name'> {
  name: AppRouteName;
  component?: string; // Component name for lazy loading
}