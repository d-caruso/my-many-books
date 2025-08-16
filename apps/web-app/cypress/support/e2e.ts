/// <reference types="cypress" />

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      addBook(book: { title: string; author: string; isbn?: string }): Chainable<void>;
      searchBooks(query: string): Chainable<void>;
    }
  }
}

// Prevent TypeScript from reading file as legacy script
export {};