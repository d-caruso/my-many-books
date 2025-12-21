describe('Books Management', () => {
  beforeEach(() => {
    // Login first using custom command
    cy.login('testuser', 'testpass123');
    cy.visit('/books');
  });

  it('displays books page', () => {
    cy.contains('My Books').should('be.visible');
    cy.get('[data-testid="book-list"]').should('be.visible');
  });

  it('opens add book modal', () => {
    cy.get('[data-testid="add-book-button"]').click();
    cy.get('[data-testid="book-form"]').should('be.visible');
  });

  it('adds a new book', () => {
    cy.addBook({
      title: 'Test Book',
      author: 'Test Author',
      isbn: '1234567890'
    });
    
    cy.contains('Test Book').should('be.visible');
    cy.contains('Test Author').should('be.visible');
  });

  it('searches for books', () => {
    cy.searchBooks('gatsby');
    cy.get('[data-testid="search-results"]').should('be.visible');
    cy.contains('The Great Gatsby').should('be.visible');
  });

  it('filters books by status', () => {
    cy.get('[data-testid="status-filter"]').select('read');
    cy.get('[data-testid="book-list"]').should('contain', 'To Kill a Mockingbird');
  });

  it('switches between grid and list view', () => {
    cy.get('[data-testid="grid-view-button"]').click();
    cy.get('[data-testid="book-list"]').should('have.class', 'grid-view');
    
    cy.get('[data-testid="list-view-button"]').click();
    cy.get('[data-testid="book-list"]').should('have.class', 'list-view');
  });

  it('opens book details', () => {
    cy.contains('The Great Gatsby').click();
    cy.get('[data-testid="book-details"]').should('be.visible');
    cy.contains('F. Scott Fitzgerald').should('be.visible');
  });

  it('updates book status', () => {
    cy.contains('Clean Code').within(() => {
      cy.get('[data-testid="status-dropdown"]').select('completed');
    });
    
    cy.contains('Status updated successfully').should('be.visible');
  });
});