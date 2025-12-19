import { NavigationManager } from '../NavigationManager';
import { APP_ROUTES } from '../routes';

describe('shared-navigation exports', () => {
  test('exports NavigationManager and APP_ROUTES', () => {
    expect(NavigationManager).toBeDefined();
    expect(APP_ROUTES.home.path).toBe('/');
  });
});

