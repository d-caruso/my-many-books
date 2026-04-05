describe('How To - Phase 2 (Try it now)', () => {
  const ctaCases = [
    { id: 'add-book', pathname: '/', search: '?mode=add' },
    { id: 'modify-book', pathname: '/', search: '' },
    { id: 'delete-book', pathname: '/', search: '' },
    { id: 'scanner', pathname: '/scanner', search: '' },
    { id: 'assign-authors-categories', pathname: '/', search: '?mode=add' },
    { id: 'add-authors-categories', pathname: '/', search: '?mode=add' },
    { id: 'modify-delete-authors-categories', pathname: '/', search: '?mode=add' },
  ] as const;

  beforeEach(() => {
    cy.loginAsUser();
  });

  const dismissAboutDialog = () => {
    cy.get('[role="dialog"][aria-labelledby="about-dialog-title"]', { timeout: 5000 })
      .then(($dialog) => {
        if ($dialog.length > 0) {
          cy.contains('[role="dialog"] button', /^OK$/).click();
          cy.get('[role="dialog"][aria-labelledby="about-dialog-title"]').should('not.exist');
        }
      });
  };

  const visitHowToPage = () => {
    cy.visit('/how-to');
    dismissAboutDialog();
  };

  const visitProtectedPath = (path: string) => {
    cy.visit(path);
    dismissAboutDialog();
  };

  it('renders CTA for visible cards and deep-links to expected routes', () => {
    visitHowToPage();

    cy.get('[data-testid="how-to-card-change-password"]').should('not.exist');
    cy.get('button[data-testid^="how-to-cta-"]').should('have.length', ctaCases.length);

    ctaCases.forEach(({ id, pathname, search }) => {
      visitHowToPage();
      cy.get(`[data-testid="how-to-cta-${id}"]`)
        .should('be.visible')
        .click({ scrollBehavior: 'center' });
      cy.location('pathname').should('eq', pathname);
      cy.location('search').should('eq', search);
    });
  });

  it('navigates to /how-to from desktop navigation', () => {
    cy.viewport(1280, 800);
    visitProtectedPath('/');

    cy.contains('button', /^How to$/).click();
    cy.location('pathname').should('eq', '/how-to');
    cy.get('h1').should('be.visible');
  });

  it('navigates to /how-to from mobile user menu', () => {
    cy.viewport('iphone-6');
    visitProtectedPath('/');

    cy.get('button[aria-label="User menu"]').click();
    cy.contains('[role="menuitem"]', /^How to$/).click();
    cy.location('pathname').should('eq', '/how-to');
    cy.get('h1').should('be.visible');
  });
});
