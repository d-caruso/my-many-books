import { mount } from 'cypress/react';
import React from 'react';

const SimpleComponent = () => {
  // Use hardcoded values for now to test basic functionality
  const envInfo = {
    nodeEnv: 'test',
    apiUrl: 'http://localhost:3001'
  };

  return (
    <div data-testid="simple-component">
      <h1>Hello Cypress Component Testing!</h1>
      <p>Environment: {envInfo.nodeEnv}</p>
      <p>API URL: {envInfo.apiUrl}</p>
      <button onClick={() => alert('Button clicked!')}>
        Click me
      </button>
    </div>
  );
};

describe('Basic Component Test', () => {
  it('renders a simple component', () => {
    mount(<SimpleComponent />);
    
    cy.get('[data-testid="simple-component"]').should('be.visible');
    cy.contains('Hello Cypress Component Testing!').should('be.visible');
    cy.contains('Environment: test').should('be.visible');
    cy.contains('API URL: http://localhost:3001').should('be.visible');
  });

  it('handles button clicks', () => {
    // Mock window.alert
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('windowAlert');
    });

    mount(<SimpleComponent />);
    
    cy.get('button').click();
    cy.get('@windowAlert').should('have.been.calledWith', 'Button clicked!');
  });

  it('verifies basic functionality works', () => {
    mount(<SimpleComponent />);
    
    cy.contains('Environment: test').should('be.visible');
    cy.contains('API URL: http://localhost:3001').should('be.visible');
  });
});