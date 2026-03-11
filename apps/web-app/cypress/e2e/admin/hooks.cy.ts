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

    cy.get('body').find('#about-dialog-title').should('not.exist');
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

    // Set up intercept for ANY PUT to hooks (we'll verify hookId later)
    cy.intercept('PUT', '**/admin/hooks/*').as('updateHook');

    cy.loginAsAdmin()
      .then(({ tokens }) => {
        return createHook(tokens.idToken, hookName, 'book.create.after');
      });

    cy.visit('/admin/hooks');

    cy.log(`Looking for hook: ${hookName}`);
    cy.contains('Hooks Administration', { timeout: 10000 }).should('be.visible');
    cy.contains('[role="row"]', hookName, { timeout: 10000 }).should('be.visible');

    // Find and click edit button
    cy.log('Clicking edit button');
    cy.contains('[role="row"]', hookName)
      .find('button')
      .contains('Edit')
      .click();

    // Wait for form and verify it opened
    cy.log('Verifying form opened');
    cy.get('[data-testid="hook-form-name"]', { timeout: 5000 }).should('be.visible');

    // Log all form field values for debugging
    cy.get('[data-testid="hook-form-name"]').invoke('val').then((val) => {
      cy.log(`Form name value: ${val}`);
    });

    // Update the name
    cy.log('Updating hook name in form');
    cy.get('[data-testid="hook-form-name"]')
      .clear()
      .type(updatedName)
      .should('have.value', updatedName);

    // Verify save button state before clicking
    cy.log('Checking save button state');
    cy.get('[data-testid="hook-form-save"]').then(($btn) => {
      cy.log(`Save button disabled: ${$btn.prop('disabled')}`);
      cy.log(`Save button visible: ${$btn.is(':visible')}`);
    });

    // Click save button
    cy.log(`Saving with new name: ${updatedName}`);
    cy.get('[data-testid="hook-form-save"]')
      .should('be.visible')
      .should('not.be.disabled')
      .click()
      .then(() => {
        cy.log('Save button clicked successfully');
      });

    // Wait for PUT request and verify it succeeded
    cy.wait('@updateHook', { timeout: 10000 }).then((interception) => {
      // Verify the response was successful
      expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
    });

    // Wait for form to close
    cy.log('Waiting for form to close');
    cy.get('[data-testid="hook-form-name"]', { timeout: 5000 }).should('not.exist');

    // Reload page to ensure we're seeing fresh data from server
    cy.log('Reloading page to verify persistence');
    cy.reload();
    cy.contains('Hooks Administration', { timeout: 10000 }).should('be.visible');

    // Verify updated name appears in the table
    cy.log(`Verifying updated name appears: ${updatedName}`);
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
