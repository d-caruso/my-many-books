describe('How To - Phase 3 (Mini videos)', () => {
  const visibleCardIds = [
    'add-book',
    'modify-book',
    'delete-book',
    'scanner',
    'assign-authors-categories',
    'add-authors-categories',
    'modify-delete-authors-categories',
  ] as const;

  beforeEach(() => {
    cy.loginAsUser();
  });

  const dismissAboutDialog = () => {
    cy.get('[role="dialog"][aria-labelledby="about-dialog-title"]', { timeout: 10000 })
      .should('be.visible');
    cy.contains('[role="dialog"] button', /^OK$/).click();
    cy.get('[role="dialog"][aria-labelledby="about-dialog-title"]').should('not.exist');
  };

  const visitHowToPage = () => {
    cy.visit('/how-to');
    dismissAboutDialog();
  };

  it('renders mini-video blocks and keeps CTA as last card element', () => {
    visitHowToPage();

    visibleCardIds.forEach((id) => {
      cy.get(`[data-testid="how-to-video-${id}"]`).should('exist');
      cy.get(`[data-testid="how-to-cta-${id}"]`).should('exist');

      cy.get(`[data-testid="how-to-card-${id}"] .MuiCardContent-root`).then(($content) => {
        expect($content[0].lastElementChild?.getAttribute('data-testid')).to.equal(`how-to-cta-container-${id}`);
      });
    });

    cy.get('[data-testid="how-to-card-change-password"]').should('not.exist');
    cy.get('[data-testid="how-to-video-change-password"]').should('not.exist');
  });

  it('shows mini-video fallback on media error and keeps CTA navigation working', () => {
    visitHowToPage();

    cy.get('[data-testid="how-to-video-add-book-element"]')
      .should('exist')
      .then(($video) => {
        $video[0].dispatchEvent(new Event('error'));
      });

    cy.get('[data-testid="how-to-video-add-book-fallback"]').should('be.visible');
    cy.get('[data-testid="how-to-cta-add-book"]').click({ scrollBehavior: 'center' });
    cy.location('pathname').should('eq', '/');
    cy.location('search').should('eq', '?mode=add');
  });
});
