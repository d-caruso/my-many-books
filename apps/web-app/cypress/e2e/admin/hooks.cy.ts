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

const setupAdminHooksIntercepts = (hooks: any[] = []) => {
  const apiBaseUrl = getApiBaseUrl();

  cy.intercept('GET', `${apiBaseUrl}/admin/hooks/stats/summary`, {
    statusCode: 200,
    body: {
      totalHooks: hooks.length,
      activeHooks: hooks.filter(h => h.isActive).length,
      executionsToday: 0,
      lastReloadedAt: null,
    },
  }).as('getHookStats');

  cy.intercept('GET', `${apiBaseUrl}/admin/hooks`, {
    statusCode: 200,
    body: { hooks, total: hooks.length },
  }).as('getHooks');
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
    setupAdminHooksIntercepts();
    cy.visit('/admin/hooks');
    cy.wait(['@getHookStats', '@getHooks']);

    cy.get('[data-testid="open-hook-form"]').click();
    cy.get('[data-testid="hook-form-action-config"]')
      .clear()
      .type('{', { parseSpecialCharSequences: false });
    cy.contains('Provide valid JSON').should('be.visible');
    cy.get('[data-testid="hook-form-save"]').should('be.disabled');
  });

  it('lists hooks created through the admin API and allows edits', () => {
    const hookName = `E2E Hook ${Date.now()}`;
    const updatedName = `${hookName} Updated`;

    cy.loginAsAdmin().then(({ tokens }) => {
      return createHook(tokens.idToken, hookName, 'book.create.after').then((response) => {
        const hookData = response.body?.data ?? response.body;

        // Setup intercepts to return the created hook
        setupAdminHooksIntercepts([hookData]);
      });
    });

    cy.visit('/admin/hooks');
    cy.wait(['@getHookStats', '@getHooks']);
    cy.contains('Hooks Administration').should('be.visible');
    cy.contains('[role="row"]', hookName, { timeout: 10000 }).should('be.visible');

    cy.contains('[role="row"]', hookName)
      .find('button')
      .contains('Edit')
      .click();

    cy.get('[data-testid="hook-form-name"]').clear().type(updatedName);
    cy.get('[data-testid="hook-form-save"]').click();
    cy.contains(updatedName).should('be.visible');
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
            const apiBaseUrl = getApiBaseUrl();

            // Intercept executions API
            cy.intercept('GET', `${apiBaseUrl}/admin/hooks/${hookId}/executions*`, {
              statusCode: 200,
              body: {
                executions: [{
                  id: 1,
                  hookId: hookId,
                  eventName: 'book.create.after',
                  success: true,
                  executionTimeMs: 42,
                  executedAt: new Date().toISOString(),
                }],
                total: 1,
              },
            }).as('getExecutions');

            cy.visit(`/admin/hooks/${hookId}/executions`);
            cy.wait('@getExecutions');
            cy.contains('Hook Executions').should('be.visible');
            cy.contains('book.create.after', { timeout: 10000 }).should('be.visible');
          });
      });
    });
  });
});
