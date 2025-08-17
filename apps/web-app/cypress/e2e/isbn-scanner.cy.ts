describe('ISBN Scanner Workflow', () => {
  beforeEach(() => {
    cy.login('testuser', 'testpass123');
    cy.visit('/books');
  });

  describe('Scanner Access', () => {
    it('displays scan ISBN button', () => {
      cy.get('[data-testid="scan-isbn-button"]').should('be.visible');
      cy.get('[data-testid="scan-isbn-button"]').should('contain', 'Scan ISBN');
    });

    it('opens scanner modal on button click', () => {
      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="isbn-scanner-modal"]').should('be.visible');
      cy.get('[data-testid="camera-view"]').should('be.visible');
    });

    it('shows camera permission request', () => {
      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="camera-permission"]').should('be.visible');
    });
  });

  describe('Scanner Interface', () => {
    beforeEach(() => {
      cy.get('[data-testid="scan-isbn-button"]').click();
    });

    it('displays scanner controls', () => {
      cy.get('[data-testid="scanner-close"]').should('be.visible');
      cy.get('[data-testid="scanner-torch"]').should('be.visible');
      cy.get('[data-testid="manual-entry"]').should('be.visible');
    });

    it('shows scanning overlay', () => {
      cy.get('[data-testid="scan-overlay"]').should('be.visible');
      cy.get('[data-testid="scan-instructions"]').should('contain', 'Position the barcode');
    });

    it('toggles torch/flashlight', () => {
      cy.get('[data-testid="scanner-torch"]').click();
      cy.get('[data-testid="scanner-torch"]').should('have.class', 'active');
      
      cy.get('[data-testid="scanner-torch"]').click();
      cy.get('[data-testid="scanner-torch"]').should('not.have.class', 'active');
    });

    it('closes scanner modal', () => {
      cy.get('[data-testid="scanner-close"]').click();
      cy.get('[data-testid="isbn-scanner-modal"]').should('not.exist');
    });
  });

  describe('Manual ISBN Entry', () => {
    beforeEach(() => {
      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="manual-entry"]').click();
    });

    it('opens manual ISBN input', () => {
      cy.get('[data-testid="manual-isbn-input"]').should('be.visible');
      cy.get('[data-testid="isbn-submit"]').should('be.visible');
    });

    it('validates ISBN format', () => {
      cy.get('[data-testid="manual-isbn-input"]').type('invalid');
      cy.get('[data-testid="isbn-submit"]').click();
      cy.get('[data-testid="isbn-error"]').should('contain', 'Invalid ISBN format');
    });

    it('accepts valid ISBN-10', () => {
      cy.get('[data-testid="manual-isbn-input"]').type('0547928227');
      cy.get('[data-testid="isbn-submit"]').click();
      cy.get('[data-testid="isbn-error"]').should('not.exist');
    });

    it('accepts valid ISBN-13', () => {
      cy.get('[data-testid="manual-isbn-input"]').type('9780547928227');
      cy.get('[data-testid="isbn-submit"]').click();
      cy.get('[data-testid="isbn-error"]').should('not.exist');
    });
  });

  describe('ISBN Processing', () => {
    it('processes scanned ISBN successfully', () => {
      // Mock successful scan
      cy.intercept('GET', '**/books/isbn/**', {
        fixture: 'book-by-isbn.json'
      }).as('getBookByISBN');

      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="manual-entry"]').click();
      cy.get('[data-testid="manual-isbn-input"]').type('9780547928227');
      cy.get('[data-testid="isbn-submit"]').click();

      cy.wait('@getBookByISBN');
      cy.get('[data-testid="book-preview"]').should('be.visible');
    });

    it('displays book information from ISBN', () => {
      cy.intercept('GET', '**/books/isbn/**', {
        body: {
          title: 'The Hobbit',
          author: 'J.R.R. Tolkien',
          isbn: '9780547928227',
          publishedDate: '2012',
          description: 'A fantasy novel...'
        }
      }).as('getBookByISBN');

      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="manual-entry"]').click();
      cy.get('[data-testid="manual-isbn-input"]').type('9780547928227');
      cy.get('[data-testid="isbn-submit"]').click();

      cy.wait('@getBookByISBN');
      cy.get('[data-testid="book-title"]').should('contain', 'The Hobbit');
      cy.get('[data-testid="book-author"]').should('contain', 'J.R.R. Tolkien');
    });

    it('handles ISBN not found', () => {
      cy.intercept('GET', '**/books/isbn/**', {
        statusCode: 404,
        body: { error: 'Book not found' }
      }).as('getBookByISBN');

      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="manual-entry"]').click();
      cy.get('[data-testid="manual-isbn-input"]').type('9999999999999');
      cy.get('[data-testid="isbn-submit"]').click();

      cy.wait('@getBookByISBN');
      cy.get('[data-testid="isbn-not-found"]').should('contain', 'Book not found');
      cy.get('[data-testid="manual-add-option"]').should('be.visible');
    });
  });

  describe('Book Addition from Scan', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/books/isbn/**', {
        body: {
          title: 'The Lord of the Rings',
          author: 'J.R.R. Tolkien',
          isbn: '9780544003415',
          publishedDate: '2014'
        }
      }).as('getBookByISBN');

      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="manual-entry"]').click();
      cy.get('[data-testid="manual-isbn-input"]').type('9780544003415');
      cy.get('[data-testid="isbn-submit"]').click();
      cy.wait('@getBookByISBN');
    });

    it('adds book to library from scan', () => {
      cy.get('[data-testid="add-to-library"]').click();
      cy.get('[data-testid="add-book-success"]').should('contain', 'Book added successfully');
      cy.get('[data-testid="isbn-scanner-modal"]').should('not.exist');
    });

    it('allows editing book details before adding', () => {
      cy.get('[data-testid="edit-details"]').click();
      cy.get('[data-testid="book-form"]').should('be.visible');
      
      cy.get('[data-testid="book-title-input"]').clear().type('Edited Title');
      cy.get('[data-testid="save-book-button"]').click();
      
      cy.contains('Edited Title').should('be.visible');
    });

    it('sets reading status during addition', () => {
      cy.get('[data-testid="reading-status"]').select('want-to-read');
      cy.get('[data-testid="add-to-library"]').click();
      
      cy.contains('The Lord of the Rings').within(() => {
        cy.get('[data-testid="book-status"]').should('contain', 'Want to Read');
      });
    });
  });

  describe('Scanner Error Handling', () => {
    it('handles camera access denied', () => {
      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="camera-denied"]').should('contain', 'Camera access denied');
      cy.get('[data-testid="manual-entry-fallback"]').should('be.visible');
    });

    it('handles network errors during ISBN lookup', () => {
      cy.intercept('GET', '**/books/isbn/**', {
        statusCode: 500,
        body: { error: 'Network error' }
      }).as('getBookByISBN');

      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="manual-entry"]').click();
      cy.get('[data-testid="manual-isbn-input"]').type('9780547928227');
      cy.get('[data-testid="isbn-submit"]').click();

      cy.wait('@getBookByISBN');
      cy.get('[data-testid="network-error"]').should('contain', 'Unable to fetch book details');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('retries failed ISBN lookup', () => {
      cy.intercept('GET', '**/books/isbn/**', {
        statusCode: 500
      }).as('getBookByISBNFail');

      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="manual-entry"]').click();
      cy.get('[data-testid="manual-isbn-input"]').type('9780547928227');
      cy.get('[data-testid="isbn-submit"]').click();

      cy.wait('@getBookByISBNFail');

      // Mock successful retry
      cy.intercept('GET', '**/books/isbn/**', {
        fixture: 'book-by-isbn.json'
      }).as('getBookByISBNSuccess');

      cy.get('[data-testid="retry-button"]').click();
      cy.wait('@getBookByISBNSuccess');
      cy.get('[data-testid="book-preview"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation in scanner', () => {
      cy.get('[data-testid="scan-isbn-button"]').focus().type('{enter}');
      cy.get('[data-testid="isbn-scanner-modal"]').should('be.visible');
      
      cy.focused().type('{tab}');
      cy.focused().should('have.attr', 'data-testid', 'scanner-close');
      
      cy.focused().type('{tab}');
      cy.focused().should('have.attr', 'data-testid', 'manual-entry');
    });

    it('has proper ARIA labels for scanner controls', () => {
      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="scanner-torch"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="scanner-close"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="manual-entry"]').should('have.attr', 'aria-label');
    });

    it('announces scan results to screen readers', () => {
      cy.intercept('GET', '**/books/isbn/**', {
        fixture: 'book-by-isbn.json'
      }).as('getBookByISBN');

      cy.get('[data-testid="scan-isbn-button"]').click();
      cy.get('[data-testid="manual-entry"]').click();
      cy.get('[data-testid="manual-isbn-input"]').type('9780547928227');
      cy.get('[data-testid="isbn-submit"]').click();

      cy.wait('@getBookByISBN');
      cy.get('[data-testid="scan-result-announcement"]').should('have.attr', 'aria-live', 'polite');
    });
  });
});