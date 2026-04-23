describe('How To - Phase 4 (Guided tour)', () => {
  const dismissAboutDialog = (): void => {
    cy.contains('[role="dialog"]', 'What this app is for', { timeout: 10000 }).should('be.visible');
    cy.contains('[role="dialog"] button', /^OK$/).click();
    cy.contains('[role="dialog"]', 'What this app is for').should('not.exist');
  };

  const warmLibraryRoute = (): void => {
    cy.visit('/');
    dismissAboutDialog();
    cy.get('[data-tour-id="add-book-btn"]').should('be.visible');
  };

  const visitHowToPage = (): void => {
    cy.visit('/how-to');
    dismissAboutDialog();
    cy.get('[data-testid="how-to-tour-add-book"]').should('be.visible');
  };

  const launchAddBookTour = (): void => {
    cy.get('[data-testid="how-to-tour-add-book"]').click({ scrollBehavior: 'center' });
    cy.get('.driver-overlay').should('be.visible');
    cy.get('.driver-popover').should('be.visible');
  };

  beforeEach((): void => {
    cy.loginAsUser();
    warmLibraryRoute();
  });

  it('launches the Add Book tour and shows the Driver.js overlay', () => {
    visitHowToPage();
    launchAddBookTour();

    cy.location('pathname').should('eq', '/');
    cy.get('[data-tour-id="add-book-btn"]').should('be.visible');
    cy.get('.driver-popover-title').should('not.be.empty');
  });

  it('advances through steps with the Next button', () => {
    visitHowToPage();
    launchAddBookTour();

    cy.get('.driver-popover-next-btn').click();

    cy.location('pathname').should('eq', '/');
    cy.location('search').should('eq', '?mode=add');
    cy.get('[data-tour-id="isbn-field"]').should('exist');
    cy.get('.driver-popover').should('be.visible');
  });

  it('closes the tour with the close button', () => {
    visitHowToPage();
    launchAddBookTour();

    cy.get('.driver-popover-close-btn').click();
    cy.get('.driver-overlay').should('not.exist');
    cy.get('.driver-popover').should('not.exist');
  });
});
