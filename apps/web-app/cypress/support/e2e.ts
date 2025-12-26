/// <reference types="cypress" />

// Import commands.js using ES2015 syntax:
import './commands';
import type { E2EAuthTokens, E2EUserProfile } from './auth';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global setup: Enable localStorage storage adapter for all E2E tests
Cypress.on('window:before:load', (win) => {
  win.useLocalStorage = true;
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<{ user: E2EUserProfile; tokens: E2EAuthTokens }>;
      loginAsAdmin(): Chainable<{ user: E2EUserProfile; tokens: E2EAuthTokens }>;
      loginAsUser(): Chainable<{ user: E2EUserProfile; tokens: E2EAuthTokens }>;
      resetDatabase(): Chainable<null>;
      seedDatabase(): Chainable<null>;
      logout(): Chainable<void>;
      addBook(book: { title: string; author: string; isbn?: string }): Chainable<void>;
      searchBooks(query: string): Chainable<void>;
    }
  }
}

// Prevent TypeScript from reading file as legacy script
export {};
