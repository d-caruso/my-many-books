describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/auth');
  });

  it('displays login form by default', () => {
    cy.contains('Sign in to your account').should('be.visible');
    cy.get('[data-testid="login-form"]').should('be.visible');
  });

  it('switches to register form', () => {
    cy.contains('Create account').click();
    cy.get('[data-testid="register-form"]').should('be.visible');
  });

  it('validates required fields on login', () => {
    cy.get('[data-testid="login-button"]').click();
    cy.contains('Username is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
  });

  it('validates password requirements on register', () => {
    cy.contains('Create account').click();
    cy.get('[data-testid="register-button"]').click();
    cy.contains('Password must be at least 8 characters').should('be.visible');
  });

  it('attempts login with invalid credentials', () => {
    cy.get('[data-testid="username-input"]').type('invaliduser');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    cy.contains('Invalid credentials').should('be.visible');
  });
});