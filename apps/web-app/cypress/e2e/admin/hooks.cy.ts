const hookStatsResponse = {
  data: {
    totalHooks: 2,
    activeHooks: 2,
    executionsToday: 12,
    lastReloadedAt: new Date('2025-12-03T10:15:00Z').toISOString(),
  },
};

const initialHooks = [
  {
    id: 101,
    name: 'Audit Logger',
    eventPattern: 'book.*',
    actionType: 'log',
    priority: 5,
    isActive: true,
    lastExecution: new Date('2025-12-03T08:30:00Z').toISOString(),
  },
  {
    id: 102,
    name: 'Failed Login Alert',
    eventPattern: 'auth.login.failed',
    actionType: 'email',
    priority: 10,
    isActive: true,
    lastExecution: new Date('2025-12-03T07:45:00Z').toISOString(),
  },
];

const successExecutions = [
  {
    id: 1,
    eventName: 'book.create.after',
    success: true,
    executionTimeMs: 120,
    executedAt: new Date('2025-12-03T09:00:00Z').toISOString(),
    hookId: 101,
    errorMessage: null,
  },
];

const failureExecutions = [
  {
    id: 2,
    eventName: 'user.login.before',
    success: false,
    executionTimeMs: 80,
    executedAt: new Date('2025-12-03T09:30:00Z').toISOString(),
    hookId: 101,
    errorMessage: 'SMTP timeout',
  },
];

describe('Admin Hooks Management', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/admin/hooks/stats', hookStatsResponse).as('getHookStats');
    cy.intercept('GET', '**/admin/hooks', { data: { hooks: initialHooks } }).as('getHooks');
    cy.intercept('POST', '**/admin/hooks/reload', {
      data: { reloadedAt: new Date().toISOString() },
    }).as('reloadHooks');
    cy.intercept('GET', '**/admin/hooks/executions*', (req) => {
      const url = new URL(req.url);
      const successParam = url.searchParams.get('success');
      if (successParam === 'false') {
        req.reply({ data: { executions: failureExecutions, total: failureExecutions.length } });
        return;
      }
      req.reply({ data: { executions: successExecutions, total: successExecutions.length } });
    }).as('getExecutions');

    cy.login('admin-user', 'secure-password');
    cy.visit('/admin/hooks');
    cy.wait('@getHookStats');
    cy.wait('@getHooks');
  });

  it('manages hooks end-to-end through the admin UI', () => {
    cy.contains('Hooks Administration').should('be.visible');

    cy.get('[data-testid="open-hook-form"]').click();
    cy.get('[data-testid="hook-form-name"]').clear().type('Cypress Audit Trail');
    cy.get('[data-testid="hook-form-description"]').type('Tracks Cypress-driven workflows');
    cy.get('[data-testid="hook-form-event-pattern-input"]')
      .clear()
      .type('book.create.after');
    cy.get('[data-testid="hook-form-action-config"]')
      .clear()
      .type('{\n  "message": "Automated audit payload"\n}');
    cy.get('[data-testid="hook-form-save"]').click();

    cy.get('[data-testid="hooks-grid"]').within(() => {
      cy.contains('Cypress Audit Trail').should('be.visible');
    });

    cy.contains('div', 'Cypress Audit Trail')
      .closest('[role="row"]')
      .within(() => {
        cy.contains('button', 'Edit').click();
      });
    cy.get('[data-testid="hook-form-name"]').clear().type('Cypress Audit Trail v2');
    cy.get('[data-testid="hook-form-save"]').click();
    cy.contains('Cypress Audit Trail v2').should('be.visible');

    cy.contains('div', 'Cypress Audit Trail v2')
      .closest('[role="row"]')
      .within(() => {
        cy.contains('button', 'Delete').click();
      });
    cy.contains('Delete action is not implemented yet').should('be.visible');

    cy.get('[data-testid="reload-hooks-button"]').click();
    cy.contains('Reloading Hooks…').should('be.visible');
    cy.wait('@reloadHooks');
    cy.contains('Reload Hooks').should('be.visible');

    cy.contains('div', 'Audit Logger')
      .closest('[role="row"]')
      .within(() => {
        cy.contains('button', 'View Executions').click();
      });
    cy.url().should('include', '/admin/hooks/101/executions');
    cy.wait('@getExecutions');
    cy.get('[data-testid="hook-executions-grid"]').within(() => {
      cy.contains('book.create.after').should('be.visible');
    });

    cy.get('[data-testid="executions-status-filter"]').click();
    cy.get('li[data-value="failure"]').click();
    cy.wait('@getExecutions');
    cy.get('[data-testid="hook-executions-grid"]').within(() => {
      cy.contains('user.login.before').should('be.visible');
      cy.contains('SMTP timeout').should('be.visible');
    });

    cy.get('[data-testid="executions-back-to-hooks"]').click();
    cy.wait('@getHookStats');
    cy.wait('@getHooks');

    cy.visit('/books');
    cy.addBook({
      title: 'Hook Event Book',
      author: 'QA Automation',
      isbn: '1234567890123',
    });
    cy.contains('Hook Event Book').should('be.visible');

    cy.visit('/admin/hooks');
    cy.wait('@getHookStats');
    cy.wait('@getHooks');
    cy.contains('Hooks Administration').should('be.visible');
  });
});
