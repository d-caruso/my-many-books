/**
 * React hooks for navigation (platform-agnostic)
 * Can be used with React web and React Native
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  NavigationManager, 
  Route, 
  NavigationState, 
  NavigationEvent,
  AppRouteName,
  RouteParams,
  QueryParams,
  NavigationOptions
} from './types';

// Navigation context would be provided by the app
let navigationManagerInstance: NavigationManager | null = null;

export function setNavigationManager(manager: NavigationManager): void {
  navigationManagerInstance = manager;
}

function getNavigationManager(): NavigationManager {
  if (!navigationManagerInstance) {
    throw new Error('NavigationManager not initialized. Call setNavigationManager first.');
  }
  return navigationManagerInstance;
}

// Main navigation hook
export function useNavigation() {
  const manager = getNavigationManager();
  
  const navigate = useCallback(async (
    routeName: AppRouteName,
    params?: RouteParams,
    query?: QueryParams,
    options?: NavigationOptions
  ) => {
    return manager.navigate(routeName, params, query, options);
  }, [manager]);
  
  const goBack = useCallback(async () => {
    return manager.goBack();
  }, [manager]);
  
  const goForward = useCallback(async () => {
    return manager.goForward();
  }, [manager]);
  
  // Navigation shortcuts
  const navigateToBook = useCallback(async (bookId: number) => {
    return manager.navigateToBook(bookId);
  }, [manager]);
  
  const navigateToEditBook = useCallback(async (bookId: number) => {
    return manager.navigateToEditBook(bookId);
  }, [manager]);
  
  const navigateToCategory = useCallback(async (categoryId: number, categoryName?: string) => {
    return manager.navigateToCategory(categoryId, categoryName);
  }, [manager]);
  
  const navigateToAuthor = useCallback(async (authorId: number, authorName?: string) => {
    return manager.navigateToAuthor(authorId, authorName);
  }, [manager]);
  
  const navigateToSearch = useCallback(async (query?: string) => {
    return manager.navigateToSearch(query);
  }, [manager]);
  
  const navigateHome = useCallback(async () => {
    return manager.navigateHome();
  }, [manager]);
  
  const navigateToAuth = useCallback(async (mode: 'login' | 'register' = 'login') => {
    return manager.navigateToAuth(mode);
  }, [manager]);
  
  return {
    navigate,
    goBack,
    goForward,
    
    // Shortcuts
    navigateToBook,
    navigateToEditBook,
    navigateToCategory,
    navigateToAuthor,
    navigateToSearch,
    navigateHome,
    navigateToAuth,
    
    // State access
    canGoBack: manager.canGoBack(),
    canGoForward: manager.canGoForward()
  };
}

// Current route hook with state management
export function useCurrentRoute(): Route | null {
  const manager = getNavigationManager();
  const [currentRoute, setCurrentRoute] = useState<Route | null>(manager.getCurrentRoute());
  
  useEffect(() => {
    const unsubscribe = manager.addEventListener((event: NavigationEvent) => {
      if (event.type === 'ROUTE_CHANGED') {
        setCurrentRoute(event.route);
      }
    });
    
    return unsubscribe;
  }, [manager]);
  
  return currentRoute;
}

// Navigation state hook
export function useNavigationState(): NavigationState {
  const manager = getNavigationManager();
  const [state, setState] = useState<NavigationState>(manager.getNavigationState());
  
  useEffect(() => {
    const unsubscribe = manager.addEventListener((event: NavigationEvent) => {
      if (event.type === 'ROUTE_CHANGED') {
        setState(manager.getNavigationState());
      }
    });
    
    return unsubscribe;
  }, [manager]);
  
  return state;
}

// Route parameters hook
export function useNavigationParams<T extends RouteParams = RouteParams>(): T | undefined {
  const currentRoute = useCurrentRoute();
  return currentRoute?.params as T | undefined;
}

// Query parameters hook
export function useQueryParams<T extends QueryParams = QueryParams>(): T | undefined {
  const currentRoute = useCurrentRoute();
  return currentRoute?.query as T | undefined;
}

// Specific parameter hooks for type safety
export function useBookId(): number | undefined {
  const params = useNavigationParams<{ bookId?: number }>();
  return params?.bookId;
}

export function useCategoryId(): number | undefined {
  const params = useNavigationParams<{ categoryId?: number }>();
  return params?.categoryId;
}

export function useAuthorId(): number | undefined {
  const params = useNavigationParams<{ authorId?: number }>();
  return params?.authorId;
}

export function useSearchQuery(): string | undefined {
  const query = useQueryParams<{ q?: string }>();
  return query?.q;
}

// Route matching hooks
export function useIsRoute(routeName: AppRouteName): boolean {
  const currentRoute = useCurrentRoute();
  return currentRoute?.name === routeName;
}

export function useIsAuthRequired(): boolean {
  const manager = getNavigationManager();
  const currentRoute = useCurrentRoute();
  return manager.isAuthRequired(currentRoute || undefined);
}

// Navigation event hook
export function useNavigationEvents(
  listener: (event: NavigationEvent) => void,
  deps: any[] = []
): void {
  const manager = getNavigationManager();
  
  useEffect(() => {
    const unsubscribe = manager.addEventListener(listener);
    return unsubscribe;
  }, [manager, ...deps]);
}

// Breadcrumb hook
export function useBreadcrumb(): string[] {
  const currentRoute = useCurrentRoute();
  const params = useNavigationParams();
  
  return useMemo(() => {
    if (!currentRoute) return [];
    
    // Import generateBreadcrumb here to avoid circular dependency
    const { generateBreadcrumb } = require('./routes');
    return generateBreadcrumb(currentRoute, params);
  }, [currentRoute, params]);
}

// Navigation guard hooks
export function useNavigationGuard(
  guard: (route: Route) => boolean | Promise<boolean>,
  redirectTo?: AppRouteName
): void {
  const manager = getNavigationManager();
  const navigation = useNavigation();
  
  useEffect(() => {
    const unsubscribe = manager.addEventListener(async (event: NavigationEvent) => {
      if (event.type === 'NAVIGATE') {
        const canNavigate = await guard(event.route);
        
        if (!canNavigate && redirectTo) {
          setTimeout(() => {
            navigation.navigate(redirectTo);
          }, 0);
        }
      }
    });
    
    return unsubscribe;
  }, [manager, navigation, guard, redirectTo]);
}

// Auth guard hook
export function useAuthGuard(redirectTo: AppRouteName = 'login'): void {
  useNavigationGuard((route) => {
    const manager = getNavigationManager();
    return !manager.isAuthRequired(route);
  }, redirectTo);
}

// Deep linking hook for mobile/web URLs
export function useDeepLink(): {
  parseDeepLink: (url: string) => Route | null;
  createDeepLink: (routeName: AppRouteName, params?: RouteParams, query?: QueryParams) => string;
} {
  const parseDeepLink = useCallback((url: string): Route | null => {
    try {
      const { matchRoute } = require('./routes');
      const urlObj = new URL(url);
      const match = matchRoute(urlObj.pathname);
      
      if (match) {
        // Merge URL query params with matched route
        const urlQuery: QueryParams = {};
        urlObj.searchParams.forEach((value, key) => {
          const numValue = Number(value);
          urlQuery[key] = isNaN(numValue) ? value : numValue;
        });
        
        return {
          ...match.route,
          query: { ...match.query, ...urlQuery }
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }, []);
  
  const createDeepLink = useCallback((
    routeName: AppRouteName,
    params?: RouteParams,
    query?: QueryParams
  ): string => {
    const { buildUrl } = require('./routes');
    return buildUrl(routeName, params, query);
  }, []);
  
  return {
    parseDeepLink,
    createDeepLink
  };
}