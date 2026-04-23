describe('Onboarding Tour (P2)', () => {
  const ONBOARDING_COMPLETED_KEY = 'web:setting:onboarding.completed:user:2';

  const visitLibrary = (): void => {
    cy.visit('/');
  };

  const expectOnboardingOverlay = (): void => {
    cy.get('.driver-overlay', { timeout: 5000 }).should('exist');
    cy.get('.driver-popover').should('be.visible');
    cy.get('.driver-popover-title').should('not.be.empty');
  };

  it('auto-starts on first login when onboarding is not completed', () => {
    cy.loginAsNewUser();
    visitLibrary();

    expectOnboardingOverlay();
  });

  it('does not show after skip', () => {
    cy.loginAsNewUser();
    visitLibrary();
    expectOnboardingOverlay();

    cy.get('.driver-popover-close-btn').click();
    cy.get('.driver-overlay').should('not.exist');
    cy.window().its('localStorage').invoke('getItem', ONBOARDING_COMPLETED_KEY).should('eq', 'true');

    cy.reload();
    cy.get('.driver-overlay').should('not.exist');
  });

  it('does not show when onboarding is already completed', () => {
    cy.loginAsExistingUser();
    visitLibrary();

    cy.get('[data-tour-id="add-book-btn"]').should('be.visible');
    cy.get('.driver-overlay').should('not.exist');
  });

  it('completes all 6 steps and marks onboarding done', () => {
    cy.loginAsNewUser();
    visitLibrary();
    expectOnboardingOverlay();

    for (let index = 0; index < 5; index += 1) {
      cy.get('.driver-popover-next-btn').click();
      cy.get('.driver-popover').should('be.visible');
    }

    cy.location('pathname').should('eq', '/');
    cy.location('search').should('eq', '?mode=add');
    cy.get('[data-tour-id="isbn-field"]').should('be.visible');
    cy.get('[data-tour-id="book-form-author-select"]').should('be.visible');
    cy.get('[data-tour-id="book-form-save-btn"]').should('be.visible');

    cy.get('.driver-popover-next-btn').click();
    cy.get('.driver-overlay').should('not.exist');
    cy.window().its('localStorage').invoke('getItem', ONBOARDING_COMPLETED_KEY).should('eq', 'true');

    cy.reload();
    cy.get('.driver-overlay').should('not.exist');
  });
});
