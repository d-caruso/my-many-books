/// <reference types="cypress" />

// Custom commands for the My Many Books application

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/auth');
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('not.include', '/auth');
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