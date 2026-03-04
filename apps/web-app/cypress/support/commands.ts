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
  return buildAuthTokens(profile).then((tokens) => {
    const response = buildLoginResponse(profile, tokens);

    const authTokens = {
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    };

    const authUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      surname: profile.surname,
      role: profile.role,
      isActive: true,
    };

    // Set up intercept for refresh endpoint
    cy.intercept('POST', '**/auth/refresh', {
      statusCode: 200,
      body: response,
    }).as('refresh');

    // Use cy.session to persist authentication across page visits
    cy.session(
      [profile.email, profile.role],
      () => {
        cy.visit('/', {
          onBeforeLoad(win) {
            // Enable localStorage storage adapter for E2E tests
            win.useLocalStorage = true;
          }
        });
        cy.window().then((win) => {
          win.localStorage.setItem('auth_tokens', JSON.stringify(authTokens));
          win.localStorage.setItem('auth_user', JSON.stringify(authUser));
        });
        cy.reload();
        cy.url().should('not.include', '/auth');
      },
      {
        validate() {
          cy.window().then((win) => {
            const storedTokens = win.localStorage.getItem('auth_tokens');
            const storedUser = win.localStorage.getItem('auth_user');
            if (!storedTokens || !storedUser) {
              throw new Error('Auth not persisted');
            }
          });
        },
      }
    );

    return cy.wrap({ user: profile, tokens });
  });
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
