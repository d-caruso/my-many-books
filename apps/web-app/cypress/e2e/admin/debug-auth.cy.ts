describe('Debug E2E Authentication', () => {
  beforeEach(() => {
    cy.resetDatabase(); // Now resets AND seeds in one call
  });

  it('should login as admin and capture page state', () => {
    // Login as admin
    cy.loginAsAdmin();

    // Log the current URL
    cy.url().then(url => {
      cy.log('Current URL after login: ' + url);
    });

    // Log the page title
    cy.title().then(title => {
      cy.log('Page title: ' + title);
    });

    // Try to visit admin hooks page
    cy.visit('/admin/hooks');

    // Wait a bit for page to load
    cy.wait(2000);

    // Log the URL again
    cy.url().then(url => {
      cy.log('URL after visiting /admin/hooks: ' + url);
    });

    // Get the body text content and log it
    cy.get('body').invoke('text').then(text => {
      cy.log('Body text (first 500 chars): ' + text.substring(0, 500));
    });

    // Check if we're on the auth page
    cy.url().then(url => {
      if (url.includes('/auth')) {
        cy.log('ERROR: Still on auth page!');
      } else {
        cy.log('SUCCESS: Not on auth page');
      }
    });

    // This will always fail but will take a screenshot
    cy.get('[data-testid="debug-marker-that-does-not-exist"]', { timeout: 1000 }).should('exist');
  });

  it('should check if admin hooks route exists', () => {
    cy.loginAsAdmin();

    // Make a direct API request to check if hooks endpoint works
    cy.loginAsAdmin().then(({ tokens }) => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:3001/api/v1/admin/hooks',
        headers: {
          Authorization: `Bearer ${tokens.idToken}`,
        },
        failOnStatusCode: false,
      }).then(response => {
        cy.log('Admin hooks API status: ' + response.status);
        cy.log('Admin hooks API body: ' + JSON.stringify(response.body).substring(0, 200));
      });
    });

    // This will fail but take a screenshot
    cy.get('[data-testid="debug-marker-2"]', { timeout: 1000 }).should('exist');
  });
});
