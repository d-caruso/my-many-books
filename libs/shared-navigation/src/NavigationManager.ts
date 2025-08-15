/**
 * Platform-agnostic navigation manager
 * Handles routing logic, state management, and navigation flow
 */

import { 
  NavigationAdapter, 
  Route, 
  NavigationState, 
  NavigationOptions, 
  NavigationEvent,
  AppRouteName,
  RouteParams,
  QueryParams
} from './types';

export class NavigationManager {
  private adapter: NavigationAdapter;
  private state: NavigationState;
  private eventListeners: ((event: NavigationEvent) => void)[] = [];

  constructor(adapter: NavigationAdapter) {
    this.adapter = adapter;
    this.state = {
      currentRoute: null,
      previousRoute: null,
      canGoBack: false,
      canGoForward: false,
      history: []
    };

    // Set up adapter event handlers
    this.adapter.onRouteChange = (route: Route) => {
      this.handleRouteChange(route);
    };

    this.adapter.onNavigationError = (error: Error) => {
      this.emit({ type: 'NAVIGATION_ERROR', error });
    };
  }

  // Core navigation methods
  async navigate(
    routeName: AppRouteName, 
    params?: RouteParams, 
    query?: QueryParams,
    options?: NavigationOptions
  ): Promise<void> {
    const route: Route = {
      id: this.generateRouteId(),
      path: this.buildPath(routeName, params),
      name: routeName,
      params,
      query
    };

    this.emit({ type: 'NAVIGATE', route, options });
    
    try {
      await this.adapter.navigate(route, options);
    } catch (error) {
      this.emit({ type: 'NAVIGATION_ERROR', error: error as Error });
      throw error;
    }
  }

  async goBack(): Promise<void> {
    if (!this.state.canGoBack) {
      throw new Error('Cannot go back');
    }

    this.emit({ type: 'GO_BACK' });
    
    try {
      await this.adapter.goBack();
    } catch (error) {
      this.emit({ type: 'NAVIGATION_ERROR', error: error as Error });
      throw error;
    }
  }

  async goForward(): Promise<void> {
    if (!this.state.canGoForward) {
      throw new Error('Cannot go forward');
    }

    this.emit({ type: 'GO_FORWARD' });
    
    try {
      await this.adapter.goForward();
    } catch (error) {
      this.emit({ type: 'NAVIGATION_ERROR', error: error as Error });
      throw error;
    }
  }

  // Navigation shortcuts for common patterns
  async navigateToBook(bookId: number): Promise<void> {
    return this.navigate('book-details', { bookId });
  }

  async navigateToEditBook(bookId: number): Promise<void> {
    return this.navigate('book-edit', { bookId });
  }

  async navigateToCategory(categoryId: number, categoryName?: string): Promise<void> {
    return this.navigate('category-books', { categoryId, categoryName });
  }

  async navigateToAuthor(authorId: number, authorName?: string): Promise<void> {
    return this.navigate('author-books', { authorId, authorName });
  }

  async navigateToSearch(query?: string): Promise<void> {
    return this.navigate('search', undefined, query ? { q: query } : undefined);
  }

  async navigateHome(): Promise<void> {
    return this.navigate('home');
  }

  async navigateToAuth(mode: 'login' | 'register' = 'login'): Promise<void> {
    return this.navigate(mode === 'login' ? 'login' : 'register');
  }

  // State access
  getCurrentRoute(): Route | null {
    return this.state.currentRoute;
  }

  getNavigationState(): NavigationState {
    return { ...this.state };
  }

  canGoBack(): boolean {
    return this.state.canGoBack;
  }

  canGoForward(): boolean {
    return this.state.canGoForward;
  }

  // Event system
  addEventListener(listener: (event: NavigationEvent) => void): () => void {
    this.eventListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  // Route building and validation
  private buildPath(routeName: AppRouteName, params?: RouteParams): string {
    const routePatterns: Record<AppRouteName, string> = {
      home: '/',
      books: '/books',
      'book-details': '/books/:bookId',
      'book-edit': '/books/:bookId/edit',
      'book-add': '/books/add',
      search: '/search',
      categories: '/categories',
      'category-books': '/categories/:categoryId',
      authors: '/authors',
      'author-books': '/authors/:authorId',
      profile: '/profile',
      settings: '/settings',
      auth: '/auth',
      login: '/auth/login',
      register: '/auth/register'
    };

    let path = routePatterns[routeName];
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, String(value));
      });
    }

    return path;
  }

  private generateRouteId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleRouteChange(route: Route): void {
    const previousRoute = this.state.currentRoute;
    
    this.state = {
      currentRoute: route,
      previousRoute,
      canGoBack: this.adapter.canGoBack(),
      canGoForward: this.adapter.canGoForward(),
      history: [...this.state.history, route]
    };

    this.emit({ type: 'ROUTE_CHANGED', route });
  }

  private emit(event: NavigationEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Navigation event listener error:', error);
      }
    });
  }

  // Utility methods for navigation guards and middleware
  isAuthRequired(route?: Route): boolean {
    const currentRoute = route || this.state.currentRoute;
    return currentRoute?.metadata?.requiresAuth === true;
  }

  hasRequiredRole(requiredRoles?: string[], userRoles?: string[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!userRoles || userRoles.length === 0) return false;
    return requiredRoles.some(role => userRoles.includes(role));
  }

  canAccessRoute(route: Route, userRoles?: string[]): boolean {
    if (this.isAuthRequired(route)) {
      // Auth check would be handled by the app
      return true; // Assume auth is valid for this utility
    }
    
    if (route.metadata?.allowedRoles) {
      return this.hasRequiredRole(route.metadata.allowedRoles, userRoles);
    }
    
    return true;
  }
}