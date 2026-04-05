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

  // Cards that have a video configured (mediaBaseName set in howToContent.ts)
  const cardsWithVideo = ['add-book'] as const;
  const cardsWithoutVideo = visibleCardIds.filter(
    (id) => !(cardsWithVideo as readonly string[]).includes(id)
  );

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

  it('renders mini-video blocks only for configured cards and keeps CTA as last card element', () => {
    visitHowToPage();

    // Cards with video configured show a video block
    cardsWithVideo.forEach((id) => {
      cy.get(`[data-testid="how-to-video-${id}"]`).should('exist');
    });

    // Cards without video configured show no video block
    cardsWithoutVideo.forEach((id) => {
      cy.get(`[data-testid="how-to-video-${id}"]`).should('not.exist');
    });

    // CTA is the last element for every visible card regardless of video presence
    visibleCardIds.forEach((id) => {
      cy.get(`[data-testid="how-to-cta-${id}"]`).should('exist');
      cy.get(`[data-testid="how-to-card-${id}"] .MuiCardContent-root`).then(($content) => {
        expect($content[0].lastElementChild?.getAttribute('data-testid')).to.equal(`how-to-cta-container-${id}`);
      });
    });

    cy.get('[data-testid="how-to-card-change-password"]').should('not.exist');
    cy.get('[data-testid="how-to-video-change-password"]').should('not.exist');
  });

  it('shows mini-video player for configured cards and keeps CTA navigation working', () => {
    visitHowToPage();

    // Video player should be rendered for add-book card (even if src doesn't exist yet)
    cy.get('[data-testid="how-to-video-add-book-element"]').should('exist');

    // CTA must remain functional alongside the video
    cy.get('[data-testid="how-to-cta-add-book"]').click({ scrollBehavior: 'center' });
    cy.location('pathname').should('eq', '/');
    cy.location('search').should('eq', '?mode=add');
  });
});
