const getApiBaseUrl = () => Cypress.env('apiBaseUrl') as string;

const buildHookPayload = (name: string, eventPattern: string) => ({
  name,
  description: 'E2E hook payload',
  eventPattern,
  actionType: 'log',
  actionConfig: {
    level: 'info',
    prefix: 'E2E',
  },
  isActive: true,
  priority: 5,
});

const createHook = (token: string, name: string, eventPattern: string) => {
  return cy.request({
    method: 'POST',
    url: `${getApiBaseUrl()}/admin/hooks`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: buildHookPayload(name, eventPattern),
  });
};

const reloadHooks = (token: string) => {
  return cy.request({
    method: 'POST',
    url: `${getApiBaseUrl()}/admin/hooks/reload`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const createBook = (token: string, isbnCode: string, title: string) => {
  return cy.request({
    method: 'POST',
    url: `${getApiBaseUrl()}/books`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      isbnCode,
      title,
    },
  });
};

describe('Admin hooks (E2E)', () => {
  beforeEach(() => {
    cy.resetDatabase(); // Resets and seeds database
  });

  it('blocks non-admin access to hooks', () => {
    cy.loginAsUser();
    cy.visit('/admin/hooks');
    cy.contains('Access Denied').should('be.visible');
  });

  it('shows validation feedback for invalid action config', () => {
    cy.loginAsAdmin();
    cy.visit('/admin/hooks');

    cy.get('[data-testid="open-hook-form"]', { timeout: 10000 }).click();
    cy.get('[data-testid="hook-form-action-config"]')
      .clear()
      .type('{', { parseSpecialCharSequences: false });
    cy.contains('Provide valid JSON').should('be.visible');
    cy.get('[data-testid="hook-form-save"]').should('be.disabled');
  });

  it('lists hooks created through the admin API and allows edits', () => {
    const hookName = `E2E Hook ${Date.now()}`;
    const updatedName = `${hookName} Updated`;
    let hookId: number;

    // Intercept ALL network requests to debug
    cy.intercept('**', (req) => {
      cy.log(`REQUEST: ${req.method} ${req.url}`);
    });

    cy.loginAsAdmin().then(({ tokens }) => {
      return createHook(tokens.idToken, hookName, 'book.create.after').then((response) => {
        hookId = response.body?.data?.id ?? response.body?.id;
        cy.log(`Created hook with ID: ${hookId}`);
      });
    });

    cy.visit('/admin/hooks');
    cy.contains('Hooks Administration', { timeout: 10000 }).should('be.visible');
    cy.contains('[role="row"]', hookName, { timeout: 10000 }).should('be.visible');

    // Find and click edit button
    cy.contains('[role="row"]', hookName)
      .find('button')
      .contains('Edit')
      .click();

    // Wait for form and verify it opened
    cy.get('[data-testid="hook-form-name"]', { timeout: 5000 })
      .should('be.visible')
      .invoke('val')
      .then((val) => {
        cy.log(`Current form value: ${val}`);
      });

    // Clear and type new name
    cy.get('[data-testid="hook-form-name"]')
      .clear()
      .type(updatedName)
      .invoke('val')
      .should('eq', updatedName);

    cy.log(`Updated form to: ${updatedName}`);

    // Intercept the specific PUT request
    cy.intercept('PUT', `**/admin/hooks/${hookId}`).as('updateHook');

    // Check save button state and click
    cy.get('[data-testid="hook-form-save"]')
      .should('be.visible')
      .should('not.be.disabled')
      .click();

    cy.log('Clicked save button');

    // Wait for PUT request and log response
    cy.wait('@updateHook', { timeout: 10000 }).then((interception) => {
      cy.log(`PUT Response Status: ${interception.response?.statusCode}`);
      cy.log(`PUT Response Body: ${JSON.stringify(interception.response?.body)}`);
    });

    // Close form and reload
    cy.get('body').type('{esc}');
    cy.wait(1000);
    cy.reload();
    cy.contains('Hooks Administration', { timeout: 10000 }).should('be.visible');

    // Take screenshot before assertion
    cy.screenshot('before-assertion');

    // Verify updated name appears
    cy.contains('[role="row"]', updatedName, { timeout: 10000 }).should('be.visible');
  });

  it('records executions when book creation triggers a hook', () => {
    const hookName = `E2E Execution ${Date.now()}`;
    const bookTitle = `Hook Trigger ${Date.now()}`;
    const isbnCode = '9780132350884';

    cy.loginAsAdmin().then(({ tokens }) => {
      return createHook(tokens.idToken, hookName, 'book.create.after').then((response) => {
        const hookId = response.body?.data?.id ?? response.body?.id;
        expect(hookId).to.be.a('number');

        return reloadHooks(tokens.idToken)
          .then(() => createBook(tokens.idToken, isbnCode, bookTitle))
          .then(() => {
            cy.visit(`/admin/hooks/${hookId}/executions`);
            cy.contains('Hook Executions', { timeout: 10000 }).should('be.visible');
            cy.contains('book.create.after', { timeout: 10000 }).should('be.visible');
          });
      });
    });
  });
});
