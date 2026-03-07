describe('How To - Phase 1 (Quick Steps)', () => {
  beforeEach(() => {
    cy.loginAsUser();
  });

  it('shows all tutorial cards with quick steps only', () => {
    cy.visit('/how-to');

    cy.contains('h1', 'How to').should('be.visible');
    cy.get('[data-testid="how-to-card-change-password"]').should('not.exist');
    cy.get('[data-testid^="how-to-card-"]').should('have.length', 7);

    cy.get('[data-testid^="how-to-card-"]').each(($card) => {
      cy.wrap($card).find('ol li').its('length').should('be.gte', 3).and('be.lte', 5);
    });

    cy.contains('button', 'Try it now').should('not.exist');
    cy.get('video').should('not.exist');
  });
});
