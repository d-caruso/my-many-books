/// <reference types="cypress" />

import {
  buildAuthTokens,
  buildLoginResponse,
  buildUserFromCredentials,
  getE2EUser,
  type E2EUserProfile,
} from './auth';

// Custom commands for the My Many Books application

const loginWithUser = (profile: E2EUserProfile) => {
  const tokens = buildAuthTokens(profile);
  const response = buildLoginResponse(profile, tokens);

  // Clear any existing session to ensure we start fresh
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });

  // Set up intercepts before visiting any page
  cy.intercept('POST', '**/auth/login', {
    statusCode: 200,
    body: response,
  }).as('login');

  cy.intercept('POST', '**/auth/refresh', {
    statusCode: 200,
    body: response,
  }).as('refresh');

  // Visit auth page - should now show login form since session is cleared
  cy.visit('/auth');
  cy.get('form[aria-label="Login form"]', { timeout: 10000 }).should('be.visible');

  cy.get('form[aria-label="Login form"]').within(() => {
    cy.get('input#email').clear().type(profile.email);
    cy.get('input#password').clear().type(profile.password, { log: false });
    cy.get('button[type="submit"]').click();
  });

  cy.wait('@login');
  cy.location('pathname').should('not.eq', '/auth');

  return cy.wrap({ user: profile, tokens }, { log: false });
};

Cypress.Commands.add('login', (email: string, password: string) => {
  return loginWithUser(buildUserFromCredentials(email, password));
});

Cypress.Commands.add('loginAsAdmin', () => {
  return loginWithUser(getE2EUser('admin'));
});

Cypress.Commands.add('loginAsUser', () => {
  return loginWithUser(getE2EUser('user'));
});

Cypress.Commands.add('resetDatabase', () => {
  return cy.task('db:reset');
});

Cypress.Commands.add('seedDatabase', () => {
  return cy.task('db:seed');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/auth');
});

Cypress.Commands.add('addBook', (book: { title: string; author: string; isbn?: string }) => {
  cy.get('[data-testid="add-book-button"]').click();
  cy.get('[data-testid="book-title-input"]').type(book.title);
  cy.get('[data-testid="book-author-input"]').type(book.author);
  
  if (book.isbn) {
    cy.get('[data-testid="book-isbn-input"]').type(book.isbn);
  }
  
  cy.get('[data-testid="save-book-button"]').click();
  cy.contains(book.title).should('be.visible');
});

Cypress.Commands.add('searchBooks', (query: string) => {
  cy.get('[data-testid="search-input"]').clear().type(query);
  cy.get('[data-testid="search-button"]').click();
  cy.get('[data-testid="search-results"]').should('be.visible');
});
