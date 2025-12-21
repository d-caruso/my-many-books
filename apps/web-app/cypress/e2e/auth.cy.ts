describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/auth');
  });

  describe('Initial State and Navigation', () => {
    it('displays login form by default', () => {
      cy.get('[data-testid="auth-container"]').should('be.visible');
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="register-form"]').should('not.exist');
      cy.contains('Sign in to your account').should('be.visible');
    });

    it('shows application branding and title', () => {
      cy.contains('My Many Books').should('be.visible');
      cy.get('[data-testid="app-logo"]').should('be.visible');
    });

    it('switches to register form', () => {
      cy.get('[data-testid="switch-to-register"]').click();
      cy.get('[data-testid="register-form"]').should('be.visible');
      cy.get('[data-testid="login-form"]').should('not.exist');
      cy.contains('Create your account').should('be.visible');
    });

    it('switches back to login from register', () => {
      cy.get('[data-testid="switch-to-register"]').click();
      cy.get('[data-testid="switch-to-login"]').click();
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="register-form"]').should('not.exist');
    });
  });

  describe('Login Form Validation', () => {
    it('validates required fields on empty submission', () => {
      cy.get('[data-testid="login-submit"]').click();
      cy.get('[data-testid="username-error"]').should('contain', 'Username is required');
      cy.get('[data-testid="password-error"]').should('contain', 'Password is required');
    });

    it('validates username format', () => {
      cy.get('[data-testid="username-input"]').type('a');
      cy.get('[data-testid="login-submit"]').click();
      cy.get('[data-testid="username-error"]').should('contain', 'Username must be at least 3 characters');
    });

    it('validates password minimum length', () => {
      cy.get('[data-testid="username-input"]').type('testuser');
      cy.get('[data-testid="password-input"]').type('123');
      cy.get('[data-testid="login-submit"]').click();
      cy.get('[data-testid="password-error"]').should('contain', 'Password must be at least 6 characters');
    });

    it('clears errors when user starts typing', () => {
      cy.get('[data-testid="login-submit"]').click();
      cy.get('[data-testid="username-error"]').should('be.visible');
      
      cy.get('[data-testid="username-input"]').type('test');
      cy.get('[data-testid="username-error"]').should('not.exist');
    });
  });

  describe('Register Form Validation', () => {
    beforeEach(() => {
      cy.get('[data-testid="switch-to-register"]').click();
    });

    it('validates all required fields', () => {
      cy.get('[data-testid="register-submit"]').click();
      cy.get('[data-testid="username-error"]').should('contain', 'Username is required');
      cy.get('[data-testid="email-error"]').should('contain', 'Email is required');
      cy.get('[data-testid="password-error"]').should('contain', 'Password is required');
      cy.get('[data-testid="confirm-password-error"]').should('contain', 'Confirm password is required');
    });

    it('validates email format', () => {
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="register-submit"]').click();
      cy.get('[data-testid="email-error"]').should('contain', 'Please enter a valid email');
    });

    it('validates password strength', () => {
      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="register-submit"]').click();
      cy.get('[data-testid="password-error"]').should('contain', 'Password must be at least 8 characters');
    });

    it('validates password confirmation match', () => {
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="confirm-password-input"]').type('different123');
      cy.get('[data-testid="register-submit"]').click();
      cy.get('[data-testid="confirm-password-error"]').should('contain', 'Passwords do not match');
    });

    it('shows password strength indicator', () => {
      cy.get('[data-testid="password-input"]').type('weak');
      cy.get('[data-testid="password-strength"]').should('contain', 'Weak');
      
      cy.get('[data-testid="password-input"]').clear().type('StrongPassword123!');
      cy.get('[data-testid="password-strength"]').should('contain', 'Strong');
    });
  });

  describe('Authentication Attempts', () => {
    it('handles invalid login credentials', () => {
      cy.get('[data-testid="username-input"]').type('invaliduser');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-submit"]').click();
      
      cy.get('[data-testid="auth-error"]').should('contain', 'Invalid username or password');
      cy.get('[data-testid="login-form"]').should('be.visible');
    });

    it('shows loading state during login', () => {
      cy.get('[data-testid="username-input"]').type('testuser');
      cy.get('[data-testid="password-input"]').type('testpass123');
      cy.get('[data-testid="login-submit"]').click();
      
      cy.get('[data-testid="login-submit"]').should('be.disabled');
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
    });

    it('successfully logs in with valid credentials', () => {
      cy.fixture('books').then((data) => {
        const { testUser } = data;
        
        cy.get('[data-testid="username-input"]').type(testUser.username);
        cy.get('[data-testid="password-input"]').type(testUser.password);
        cy.get('[data-testid="login-submit"]').click();
        
        cy.url().should('not.include', '/auth');
        cy.url().should('include', '/books');
        cy.get('[data-testid="user-menu"]').should('be.visible');
      });
    });

    it('handles registration attempt with existing username', () => {
      cy.get('[data-testid="switch-to-register"]').click();
      
      cy.get('[data-testid="username-input"]').type('existinguser');
      cy.get('[data-testid="email-input"]').type('new@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="confirm-password-input"]').type('password123');
      cy.get('[data-testid="register-submit"]').click();
      
      cy.get('[data-testid="auth-error"]').should('contain', 'Username already exists');
    });

    it('successfully registers new user', () => {
      cy.get('[data-testid="switch-to-register"]').click();
      
      const timestamp = Date.now();
      cy.get('[data-testid="username-input"]').type(`newuser${timestamp}`);
      cy.get('[data-testid="email-input"]').type(`newuser${timestamp}@example.com`);
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="confirm-password-input"]').type('password123');
      cy.get('[data-testid="register-submit"]').click();
      
      cy.url().should('not.include', '/auth');
      cy.url().should('include', '/books');
      cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome');
    });
  });

  describe('Password Reset Flow', () => {
    it('displays forgot password link', () => {
      cy.get('[data-testid="forgot-password-link"]').should('be.visible');
      cy.get('[data-testid="forgot-password-link"]').should('contain', 'Forgot password?');
    });

    it('opens forgot password modal', () => {
      cy.get('[data-testid="forgot-password-link"]').click();
      cy.get('[data-testid="forgot-password-modal"]').should('be.visible');
      cy.get('[data-testid="reset-email-input"]').should('be.visible');
    });

    it('validates email for password reset', () => {
      cy.get('[data-testid="forgot-password-link"]').click();
      cy.get('[data-testid="reset-submit"]').click();
      cy.get('[data-testid="reset-email-error"]').should('contain', 'Email is required');
      
      cy.get('[data-testid="reset-email-input"]').type('invalid-email');
      cy.get('[data-testid="reset-submit"]').click();
      cy.get('[data-testid="reset-email-error"]').should('contain', 'Please enter a valid email');
    });

    it('sends password reset request', () => {
      cy.get('[data-testid="forgot-password-link"]').click();
      cy.get('[data-testid="reset-email-input"]').type('user@example.com');
      cy.get('[data-testid="reset-submit"]').click();
      
      cy.get('[data-testid="reset-success"]').should('contain', 'Password reset email sent');
      cy.get('[data-testid="forgot-password-modal"]').should('not.exist');
    });
  });

  describe('Accessibility and UX', () => {
    it('supports keyboard navigation', () => {
      cy.get('[data-testid="username-input"]').focus();
      cy.get('[data-testid="username-input"]').type('{tab}');
      cy.focused().should('have.attr', 'data-testid', 'password-input');
      
      cy.focused().type('{tab}');
      cy.focused().should('have.attr', 'data-testid', 'login-submit');
    });

    it('shows password visibility toggle', () => {
      cy.get('[data-testid="password-input"]').type('secret123');
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
      
      cy.get('[data-testid="password-toggle"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'text');
      
      cy.get('[data-testid="password-toggle"]').click();
      cy.get('[data-testid="password-input"]').should('have.attr', 'type', 'password');
    });

    it('preserves form data when switching between forms', () => {
      cy.get('[data-testid="username-input"]').type('testuser');
      cy.get('[data-testid="switch-to-register"]').click();
      cy.get('[data-testid="switch-to-login"]').click();
      
      cy.get('[data-testid="username-input"]').should('have.value', 'testuser');
    });

    it('has proper ARIA labels and roles', () => {
      cy.get('[data-testid="login-form"]').should('have.attr', 'role', 'form');
      cy.get('[data-testid="username-input"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="password-input"]').should('have.attr', 'aria-label');
    });
  });
});