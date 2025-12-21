describe('Navigation and Routing', () => {
  beforeEach(() => {
    cy.login('testuser', 'testpass123');
  });

  describe('Main Navigation', () => {
    it('displays navigation menu', () => {
      cy.visit('/books');
      cy.get('[data-testid="main-nav"]').should('be.visible');
      cy.get('[data-testid="nav-books"]').should('be.visible');
      cy.get('[data-testid="nav-categories"]').should('be.visible');
      cy.get('[data-testid="nav-authors"]').should('be.visible');
      cy.get('[data-testid="nav-profile"]').should('be.visible');
    });

    it('navigates to books page', () => {
      cy.visit('/');
      cy.get('[data-testid="nav-books"]').click();
      cy.url().should('include', '/books');
      cy.contains('My Books').should('be.visible');
    });

    it('navigates to categories page', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-categories"]').click();
      cy.url().should('include', '/categories');
      cy.contains('Categories').should('be.visible');
    });

    it('navigates to authors page', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-authors"]').click();
      cy.url().should('include', '/authors');
      cy.contains('Authors').should('be.visible');
    });

    it('navigates to profile page', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-profile"]').click();
      cy.url().should('include', '/profile');
      cy.contains('Profile').should('be.visible');
    });

    it('highlights active navigation item', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-books"]').should('have.class', 'active');
      
      cy.get('[data-testid="nav-categories"]').click();
      cy.get('[data-testid="nav-categories"]').should('have.class', 'active');
      cy.get('[data-testid="nav-books"]').should('not.have.class', 'active');
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('displays breadcrumbs on book details page', () => {
      cy.visit('/books');
      cy.contains('The Great Gatsby').click();
      
      cy.get('[data-testid="breadcrumbs"]').should('be.visible');
      cy.get('[data-testid="breadcrumb-books"]').should('contain', 'Books');
      cy.get('[data-testid="breadcrumb-current"]').should('contain', 'The Great Gatsby');
    });

    it('navigates via breadcrumbs', () => {
      cy.visit('/books/1');
      cy.get('[data-testid="breadcrumb-books"]').click();
      cy.url().should('include', '/books');
      cy.url().should('not.include', '/books/1');
    });

    it('displays breadcrumbs on category details', () => {
      cy.visit('/categories/fiction');
      cy.get('[data-testid="breadcrumbs"]').should('be.visible');
      cy.get('[data-testid="breadcrumb-categories"]').should('contain', 'Categories');
      cy.get('[data-testid="breadcrumb-current"]').should('contain', 'Fiction');
    });
  });

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      cy.viewport('iphone-6');
    });

    it('displays mobile menu button', () => {
      cy.visit('/books');
      cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
      cy.get('[data-testid="main-nav"]').should('not.be.visible');
    });

    it('opens mobile menu', () => {
      cy.visit('/books');
      cy.get('[data-testid="mobile-menu-button"]').click();
      cy.get('[data-testid="mobile-nav"]').should('be.visible');
      cy.get('[data-testid="nav-books"]').should('be.visible');
    });

    it('closes mobile menu after navigation', () => {
      cy.visit('/books');
      cy.get('[data-testid="mobile-menu-button"]').click();
      cy.get('[data-testid="nav-categories"]').click();
      
      cy.get('[data-testid="mobile-nav"]').should('not.be.visible');
      cy.url().should('include', '/categories');
    });

    it('closes mobile menu on overlay click', () => {
      cy.visit('/books');
      cy.get('[data-testid="mobile-menu-button"]').click();
      cy.get('[data-testid="mobile-overlay"]').click();
      cy.get('[data-testid="mobile-nav"]').should('not.be.visible');
    });
  });

  describe('Route Guards and Authentication', () => {
    it('redirects to login when not authenticated', () => {
      cy.logout();
      cy.visit('/books');
      cy.url().should('include', '/auth');
    });

    it('redirects to books after login', () => {
      cy.logout();
      cy.visit('/books');
      cy.login('testuser', 'testpass123');
      cy.url().should('include', '/books');
    });

    it('persists intended route after login', () => {
      cy.logout();
      cy.visit('/categories');
      cy.url().should('include', '/auth');
      
      cy.login('testuser', 'testpass123');
      cy.url().should('include', '/categories');
    });

    it('allows access to public routes when not authenticated', () => {
      cy.logout();
      cy.visit('/about');
      cy.url().should('include', '/about');
      cy.url().should('not.include', '/auth');
    });
  });

  describe('Deep Linking and URL Structure', () => {
    it('navigates directly to book details via URL', () => {
      cy.visit('/books/1');
      cy.get('[data-testid="book-details"]').should('be.visible');
      cy.contains('The Great Gatsby').should('be.visible');
    });

    it('handles invalid book ID gracefully', () => {
      cy.visit('/books/999999');
      cy.get('[data-testid="book-not-found"]').should('be.visible');
      cy.contains('Book not found').should('be.visible');
    });

    it('navigates to category with books', () => {
      cy.visit('/categories/fiction');
      cy.get('[data-testid="category-books"]').should('be.visible');
      cy.contains('Fiction Books').should('be.visible');
    });

    it('maintains search parameters in URL', () => {
      cy.visit('/books?search=gatsby&status=read');
      cy.get('[data-testid="search-input"]').should('have.value', 'gatsby');
      cy.get('[data-testid="status-filter"]').should('have.value', 'read');
    });

    it('updates URL when search changes', () => {
      cy.visit('/books');
      cy.searchBooks('tolkien');
      cy.url().should('include', 'search=tolkien');
    });
  });

  describe('Back Button and History', () => {
    it('navigates back to previous page', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-categories"]').click();
      
      cy.go('back');
      cy.url().should('include', '/books');
    });

    it('maintains state when navigating back', () => {
      cy.visit('/books');
      cy.searchBooks('gatsby');
      cy.get('[data-testid="nav-categories"]').click();
      
      cy.go('back');
      cy.get('[data-testid="search-input"]').should('have.value', 'gatsby');
    });

    it('handles forward navigation', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-categories"]').click();
      cy.go('back');
      cy.go('forward');
      
      cy.url().should('include', '/categories');
    });
  });

  describe('Loading States and Transitions', () => {
    it('shows loading state during navigation', () => {
      cy.intercept('GET', '**/books', { delay: 1000, fixture: 'books.json' }).as('getBooks');
      
      cy.visit('/categories');
      cy.get('[data-testid="nav-books"]').click();
      
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      cy.wait('@getBooks');
      cy.get('[data-testid="loading-spinner"]').should('not.exist');
    });

    it('maintains navigation state during slow transitions', () => {
      cy.intercept('GET', '**/categories', { delay: 1000, fixture: 'categories.json' }).as('getCategories');
      
      cy.visit('/books');
      cy.get('[data-testid="nav-categories"]').click();
      
      cy.get('[data-testid="nav-categories"]').should('have.class', 'active');
      cy.wait('@getCategories');
      cy.url().should('include', '/categories');
    });
  });

  describe('Error Boundaries and 404 Handling', () => {
    it('displays 404 page for invalid routes', () => {
      cy.visit('/invalid-route');
      cy.get('[data-testid="not-found"]').should('be.visible');
      cy.contains('Page not found').should('be.visible');
    });

    it('provides navigation back to home from 404', () => {
      cy.visit('/invalid-route');
      cy.get('[data-testid="home-link"]').click();
      cy.url().should('include', '/books');
    });

    it('handles component errors gracefully', () => {
      // Simulate component error
      cy.intercept('GET', '**/books/1', { statusCode: 500 }).as('getBookError');
      
      cy.visit('/books/1');
      cy.wait('@getBookError');
      
      cy.get('[data-testid="error-boundary"]').should('be.visible');
      cy.contains('Something went wrong').should('be.visible');
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('supports keyboard navigation in main menu', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-books"]').focus();
      
      cy.focused().type('{rightarrow}');
      cy.focused().should('have.attr', 'data-testid', 'nav-categories');
      
      cy.focused().type('{enter}');
      cy.url().should('include', '/categories');
    });

    it('maintains focus management during navigation', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-categories"]').focus().click();
      
      // Focus should move to main content after navigation
      cy.focused().should('have.attr', 'data-testid', 'main-content');
    });

    it('announces route changes to screen readers', () => {
      cy.visit('/books');
      cy.get('[data-testid="nav-categories"]').click();
      
      cy.get('[data-testid="route-announcement"]')
        .should('have.attr', 'aria-live', 'polite')
        .should('contain', 'Navigated to Categories');
    });

    it('has proper skip links', () => {
      cy.visit('/books');
      cy.get('body').type('{tab}');
      cy.focused().should('contain', 'Skip to main content');
      
      cy.focused().type('{enter}');
      cy.focused().should('have.attr', 'data-testid', 'main-content');
    });
  });
});