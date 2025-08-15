/**
 * Shared navigation system for My Many Books monorepo
 * Platform-agnostic routing and navigation patterns
 */

// Navigation interfaces and types
export { NavigationAdapter, Route, NavigationState, NavigationOptions } from './types';

// Platform-agnostic navigation manager
export { NavigationManager } from './NavigationManager';

// Route definitions and utilities
export { createRoute, createRoutes, matchRoute } from './routes';

// Navigation hooks for React (web/mobile)
export { useNavigation, useCurrentRoute, useNavigationParams } from './hooks';